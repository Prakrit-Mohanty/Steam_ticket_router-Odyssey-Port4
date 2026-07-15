import json
import re
from pydantic import BaseModel, Field, field_validator, ValidationError
from .teams import CATEGORIES, PRIORITIES, TEAM_MAP, RESOLUTION_ESTIMATE

from .teams import CATEGORIES, PRIORITIES, TEAM_MAP


class ClassificationError(Exception):
    def __init__(self, message, stage=None, details=None):
        super().__init__(message)
        self.stage = stage
        self.details = details


class RawClassification(BaseModel):
    category: str
    priority: str
    work_item_description: str = Field(min_length=1, max_length=300)
    reasoning: str = Field(min_length=1, max_length=500)
    confidence: float = Field(ge=0, le=1)
    

    @field_validator("category")
    @classmethod
    def category_must_be_known(cls, v):
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}, got {v!r}")
        return v

    @field_validator("priority")
    @classmethod
    def priority_must_be_known(cls, v):
        if v not in PRIORITIES:
            raise ValueError(f"priority must be one of {PRIORITIES}, got {v!r}")
        return v


def _clean_raw_text(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start:end + 1]
    return cleaned


def parse_and_validate(raw_text: str) -> dict:
    cleaned = _clean_raw_text(raw_text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        raise ClassificationError("Model did not return valid JSON.", stage="json_parse", details={"raw": raw_text})

    try:
        result = RawClassification.model_validate(parsed)
    except ValidationError as e:
        raise ClassificationError("Model JSON was missing/invalid fields.", stage="schema_validation", details={"issues": e.errors(), "raw": parsed})

    return {
        "category": result.category,
        "priority": result.priority,
        "work_item_description": result.work_item_description,
        "assigned_team": TEAM_MAP[result.category],
        "estimated_resolution": RESOLUTION_ESTIMATE[result.priority],
        "reasoning": result.reasoning,
        "confidence": result.confidence,
    }