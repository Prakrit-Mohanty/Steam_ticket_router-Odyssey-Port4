from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .auth import (
    ADMIN_USERNAME,
    authenticate_admin,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    VALID_REFRESH_JTIS,
)

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.username == ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="That username is reserved")

    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    user = User(username=payload.username, password_hash=hash_password(payload.password), role="user")
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.username, role="user", user_id=user.id)
    refresh_token, _ = create_refresh_token(user.username, role="user", user_id=user.id)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "role": "user"}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    if authenticate_admin(payload.username, payload.password):
        access_token = create_access_token(payload.username, role="admin", user_id=None)
        refresh_token, _ = create_refresh_token(payload.username, role="admin", user_id=None)
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "role": "admin"}

    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(user.username, role="user", user_id=user.id)
    refresh_token, _ = create_refresh_token(user.username, role="user", user_id=user.id)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "role": "user"}


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    jti = data.get("jti")
    if jti not in VALID_REFRESH_JTIS:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked or already used")

    VALID_REFRESH_JTIS.discard(jti)

    subject = data["sub"]
    role = data.get("role", "user")
    user_id = data.get("user_id")

    access_token = create_access_token(subject, role=role, user_id=user_id)
    new_refresh_token, _ = create_refresh_token(subject, role=role, user_id=user_id)
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer", "role": role}


@router.post("/logout")
def logout(payload: LogoutRequest):
    try:
        data = decode_token(payload.refresh_token)
        VALID_REFRESH_JTIS.discard(data.get("jti"))
    except HTTPException:
        pass
    return {"ok": True}