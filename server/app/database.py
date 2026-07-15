import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/smart_ticket_router")

engine = create_engine(
    DATABASE_URL,
    pool_size=5,       # keep 5 connections open and ready to reuse
    max_overflow=10,   # allow up to 10 extra temporary connections under heavy load (e.g. a burst of 15 tickets)
    pool_pre_ping=True,  # verify a connection is still alive before handing it out, avoiding rare stale-connection errors
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()