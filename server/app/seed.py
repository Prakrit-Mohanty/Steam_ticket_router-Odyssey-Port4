from dotenv import load_dotenv
load_dotenv()

from .database import Base, engine, SessionLocal
from .models import Department, Staff

DEPARTMENTS_AND_STAFF = {
    "Payments Team": [("Rachel Kim", "Manager"), ("Diego Torres", "Senior"), ("Amy Chen", "Junior")],
    "Account Security Team": [("Marcus Webb", "Manager"), ("Priya Nair", "Senior"), ("Jordan Lee", "Junior")],
    "Platform Engineering": [("Elena Rossi", "Manager"), ("Sam Okafor", "Senior"), ("Taylor Wu", "Junior")],
    "Technical Support": [("Grace Park", "Manager"), ("Liam O'Brien", "Senior"), ("Noah Ahmed", "Junior")],
    "Trust & Safety": [("Olivia Bennett", "Manager"), ("Carlos Ruiz", "Senior"), ("Mia Johnson", "Junior")],
    "Product Team": [("Ethan Brooks", "Manager"), ("Sofia Martins", "Senior"), ("Ben Carter", "Junior")],
    "Customer Success": [("Ava Thompson", "Manager"), ("Ryan Patel", "Senior"), ("Zoe Davis", "Junior")],
}


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Department).count() > 0:
            print("Departments already seeded, skipping.")
            return

        for dept_name, staff_list in DEPARTMENTS_AND_STAFF.items():
            department = Department(name=dept_name)
            db.add(department)
            db.flush()  # writes the INSERT and gives us department.id, without fully committing yet
            for name, role in staff_list:
                db.add(Staff(name=name, role=role, department_id=department.id))

        db.commit()
        print("Seeded departments and staff.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()