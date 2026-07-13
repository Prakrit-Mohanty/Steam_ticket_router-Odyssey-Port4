from dotenv import load_dotenv
load_dotenv()

from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .classifier import classify_ticket, LLMCallError
from .schema import ClassificationError

app = FastAPI(title="Smart Ticket Router")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassifyRequest(BaseModel):
    text: str


class TicketItem(BaseModel):
    id: Optional[int] = None
    text: str


class BatchRequest(BaseModel):
    tickets: List[TicketItem]


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/classify")
def classify(payload: ClassifyRequest):
    try:
        return classify_ticket(payload.text)
    except ClassificationError as e:
        raise HTTPException(status_code=getattr(e, "status", 422), detail=str(e))
    except LLMCallError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/classify-batch")
def classify_batch(payload: BatchRequest):
    results = []
    for ticket in payload.tickets:
        try:
            result = classify_ticket(ticket.text)
            results.append({"id": ticket.id, "text": ticket.text, **result})
        except (ClassificationError, LLMCallError) as e:
            results.append({"id": ticket.id, "text": ticket.text, "error": str(e)})
    return {"results": results}