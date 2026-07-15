from sqlalchemy.orm import Session
from .models import Department, Staff

PRIORITY_TO_ROLE = {
    "High": "Manager",
    "Medium": "Senior",
    "Low": "Junior",
}


def assign_staff(db: Session, department_name: str, priority: str):
    department = db.query(Department).filter(Department.name == department_name).first()
    if not department:
        return None, None

    role = PRIORITY_TO_ROLE.get(priority, "Junior")
    staff = (
        db.query(Staff)
        .filter(Staff.department_id == department.id, Staff.role == role)
        .first()
    )
    return department, staff