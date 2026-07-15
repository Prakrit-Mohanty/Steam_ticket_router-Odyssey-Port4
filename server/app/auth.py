import os
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")

# In-memory set of currently valid refresh token IDs ("jti"). Lets us
# invalidate a refresh token on logout/rotation without a database table.
VALID_REFRESH_JTIS = set()

bearer_scheme = HTTPBearer()


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def authenticate_admin(username: str, password: str) -> bool:
    if username != ADMIN_USERNAME:
        return False
    return verify_password(password, ADMIN_PASSWORD_HASH)


def _create_token(subject: str, token_type: str, expires_delta: timedelta, extra_claims: dict = None, jti: str = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra_claims:
        payload.update(extra_claims)
    if jti:
        payload["jti"] = jti
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(subject: str, role: str, user_id: int = None) -> str:
    return _create_token(
        subject, "access", timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims={"role": role, "user_id": user_id},
    )


def create_refresh_token(subject: str, role: str, user_id: int = None):
    jti = str(uuid.uuid4())
    token = _create_token(
        subject, "refresh", timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        extra_claims={"role": role, "user_id": user_id}, jti=jti,
    )
    VALID_REFRESH_JTIS.add(jti)
    return token, jti


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Not an access token")
    return {
        "username": payload["sub"],
        "role": payload.get("role", "user"),
        "user_id": payload.get("user_id"),
    }