from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import Ticket
from .classifier import classify_ticket, LLMCallError
from .schema import ClassificationError
from .routing import assign_staff
from .teams import RESOLUTION_ESTIMATE
from .auth import get_current_user

router = APIRouter()


class TicketCreateRequest(BaseModel):
    text: str


class BulkTicketCreateRequest(BaseModel):
    tickets: List[str]


def _create_one_ticket(db: Session, text: str, submitted_by_id: int = None) -> Ticket:
    result = classify_ticket(text)

    department, staff = assign_staff(db, result["assigned_team"], result["priority"])

    ticket = Ticket(
        text=text,
        work_item_description=result["work_item_description"],
        category=result["category"],
        priority=result["priority"],
        reasoning=result["reasoning"],
        confidence=result["confidence"],
        department_id=department.id if department else None,
        assigned_staff_id=staff.id if staff else None,
        submitted_by_id=submitted_by_id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def _serialize_ticket(t: Ticket) -> dict:
    return {
        "id": t.id,
        "ticket_number": f"TCK-{t.id:04d}",
        "text": t.text,
        "work_item_description": t.work_item_description,
        "category": t.category,
        "priority": t.priority,
        "estimated_resolution": RESOLUTION_ESTIMATE.get(t.priority, "Unknown"),
        "reasoning": t.reasoning,
        "confidence": t.confidence,
        "department": t.department.name if t.department else None,
        "assigned_team": t.department.name if t.department else None,
        "assigned_to": t.assigned_staff.name if t.assigned_staff else None,
        "assigned_role": t.assigned_staff.role if t.assigned_staff else None,
        "submitted_by": t.submitted_by_user.username if t.submitted_by_user else "admin",
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        "updated_by": t.updated_by,
    }


@router.post("/tickets")
def create_ticket(
    payload: TicketCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        ticket = _create_one_ticket(db, payload.text, submitted_by_id=current_user["user_id"])
        return _serialize_ticket(ticket)
    except ClassificationError as e:
        raise HTTPException(status_code=getattr(e, "status", 422), detail=str(e))
    except LLMCallError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/tickets/bulk")
def create_tickets_bulk(
    payload: BulkTicketCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    results = []
    for text in payload.tickets:
        try:
            ticket = _create_one_ticket(db, text, submitted_by_id=current_user["user_id"])
            results.append(_serialize_ticket(ticket))
        except (ClassificationError, LLMCallError) as e:
            results.append({"text": text, "error": str(e)})
    return {"results": results}


@router.get("/tickets")
def list_tickets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(Ticket).order_by(Ticket.created_at.desc())
    if current_user["role"] != "admin":
        query = query.filter(Ticket.submitted_by_id == current_user["user_id"])
    return [_serialize_ticket(t) for t in query.all()]


@router.get("/tickets/{ticket_id}")
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user["role"] != "admin" and ticket.submitted_by_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You don't have access to this ticket")
    return _serialize_ticket(ticket)