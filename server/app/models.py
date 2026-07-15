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

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String, default="AI System")