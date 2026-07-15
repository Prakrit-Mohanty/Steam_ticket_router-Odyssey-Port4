from dotenv import load_dotenv
load_dotenv()

from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .tickets_router import router as tickets_router
from .auth_router import router as auth_router
from .auth import get_current_user

from .classifier import classify_ticket, draft_reply, LLMCallError
from .schema import ClassificationError

app = FastAPI(title="Smart Ticket Router")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth")


class DraftReplyRequest(BaseModel):
    text: str
    category: str
    priority: str

class ClassifyRequest(BaseModel):
    text: str

class TicketItem(BaseModel):
    id: Optional[int] = None
    text: str

class BatchRequest(BaseModel):
    tickets: List[TicketItem]

@app.post("/api/draft-reply")
def draft_reply_endpoint(payload: DraftReplyRequest, current_user: str = Depends(get_current_user)):
    try:
        return draft_reply(payload.text, payload.category, payload.priority)
    except LLMCallError as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/classify")
def classify(payload: ClassifyRequest, current_user: str = Depends(get_current_user)):
    try:
        return classify_ticket(payload.text)
    except ClassificationError as e:
        raise HTTPException(status_code=getattr(e, "status", 422), detail=str(e))
    except LLMCallError as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/api/classify-batch")
def classify_batch(payload: BatchRequest, current_user: str = Depends(get_current_user)):
    results = []
    for ticket in payload.tickets:
        try:
            result = classify_ticket(ticket.text)
            results.append({"id": ticket.id, "text": ticket.text, **result})
        except (ClassificationError, LLMCallError) as e:
            results.append({"id": ticket.id, "text": ticket.text, "error": str(e)})
    return {"results": results}