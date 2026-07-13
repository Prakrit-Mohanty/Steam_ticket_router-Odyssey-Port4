import time

from .llm_client import get_llm
from .prompt import build_messages
from .schema import parse_and_validate, ClassificationError

MAX_INPUT_CHARS = 6000


class LLMCallError(Exception):
    def __init__(self, message, cause=None):
        super().__init__(message)
        self.cause = cause


def _call_model(messages):
    llm = get_llm()
    try:
        completion = llm["client"].chat.completions.create(
            model=llm["model"],
            messages=messages,
            temperature=0.2,
            max_tokens=300,
        )
        text = completion.choices[0].message.content
        return {"text": text, "provider": llm["provider"], "model": llm["model"]}
    except Exception as e:
        raise LLMCallError(f'Call to {llm["provider"]} ({llm["model"]}) failed: {e}', cause=e)


def classify_ticket(raw_text: str) -> dict:
    started_at = time.time()

    # Edge case: empty / whitespace-only input - reject before ever calling the LLM
    trimmed = (raw_text or "").strip()
    if not trimmed:
        err = ClassificationError("Ticket text is empty.", stage="input_validation")
        err.status = 400
        raise err

    # Edge case: extremely long input - truncate rather than fail or blow the token budget
    ticket_text = trimmed
    truncated = False
    if len(ticket_text) > MAX_INPUT_CHARS:
        ticket_text = ticket_text[:MAX_INPUT_CHARS]
        truncated = True

    messages = build_messages(ticket_text)
    first = _call_model(messages)

    retried = False
    try:
        result = parse_and_validate(first["text"])
    except ClassificationError as first_err:
        # One corrective retry: tell the model exactly what it got wrong.
        retried = True
        repair_messages = messages + [
            {"role": "assistant", "content": first["text"]},
            {
                "role": "user",
                "content": f"That response was invalid: {first_err} Respond again with ONLY the corrected JSON object, nothing else.",
            },
        ]
        second = _call_model(repair_messages)
        result = parse_and_validate(second["text"])  # if this also fails, it propagates up - handled by the route

    elapsed_ms = round((time.time() - started_at) * 1000)
    result["meta"] = {
        "provider": first["provider"],
        "model": first["model"],
        "processing_time_ms": elapsed_ms,
        "retried": retried,
        "truncated_input": truncated,
    }
    return result