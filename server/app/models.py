from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from .database import Base

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    staff = relationship("Staff", back_populates="department")

class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "Manager" | "Senior" | "Junior"
    department_id = Column(Integer, ForeignKey("departments.id"))

    department = relationship("Department", back_populates="staff")

class User(Base):
    """A self-registered account that submits tickets. Separate from Staff
    (your internal support team) and separate from the single shared admin
    login (which lives in .env, not this table)."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")  # always "user" for registered accounts
    created_at = Column(DateTime, default=datetime.utcnow)

    tickets = relationship("Ticket", back_populates="submitted_by_user")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True)
    text = Column(Text, nullable=False)
    work_item_description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    reasoning = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)

    department_id = Column(Integer, ForeignKey("departments.id"))
    department = relationship("Department")

    assigned_staff_id = Column(Integer, ForeignKey("staff.id"))
    assigned_staff = relationship("Staff")

    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_by_user = relationship("User", back_populates="tickets")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String, default="AI System")