import json
import time

from .llm_client import get_llm
from .prompt import build_messages
from .schema import parse_and_validate, ClassificationError
from .similar_tickets import find_similar_tickets, TOOLS_SPEC

MAX_INPUT_CHARS = 6000
MAX_TOOL_ROUNDS = 3  # safety cap so the model can't loop calling tools forever


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
            tools=TOOLS_SPEC,
            temperature=0.2,
            max_tokens=400,
        )
        return completion.choices[0].message, llm["provider"], llm["model"]
    except Exception as e:
        raise LLMCallError(f"Call to {llm['provider']} ({llm['model']}) failed: {e}", cause=e)


def _run_tool(name: str, arguments: dict):
    if name == "find_similar_tickets":
        return find_similar_tickets(arguments.get("query", ""))
    return {"error": f"Unknown tool {name}"}


def classify_ticket(raw_text: str) -> dict:
    started_at = time.time()

    trimmed = (raw_text or "").strip()
    if not trimmed:
        err = ClassificationError("Ticket text is empty.", stage="input_validation")
        err.status = 400
        raise err

    ticket_text = trimmed
    truncated = False
    if len(ticket_text) > MAX_INPUT_CHARS:
        ticket_text = ticket_text[:MAX_INPUT_CHARS]
        truncated = True

    messages = build_messages(ticket_text)
    tool_calls_made = 0
    provider = model = None
    final_text = None

    for _ in range(MAX_TOOL_ROUNDS):
        message, provider, model = _call_model(messages)

        if message.tool_calls:
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [tc.model_dump() for tc in message.tool_calls],
            })
            for tc in message.tool_calls:
                args = json.loads(tc.function.arguments or "{}")
                result = _run_tool(tc.function.name, args)
                tool_calls_made += 1
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })
            continue  # ask again, now that the tool results are in the conversation

        final_text = message.content
        break

    if final_text is None:
        raise LLMCallError("Model kept calling tools and never produced a final answer.")

    retried = False
    try:
        result = parse_and_validate(final_text)
    except ClassificationError as first_err:
        retried = True
        messages.append({"role": "assistant", "content": final_text})
        messages.append({
            "role": "user",
            "content": f"That response was invalid: {first_err} Respond again with ONLY the corrected JSON object, nothing else.",
        })
        message, provider, model = _call_model(messages)
        result = parse_and_validate(message.content)

    elapsed_ms = round((time.time() - started_at) * 1000)
    result["meta"] = {
        "provider": provider,
        "model": model,
        "processing_time_ms": elapsed_ms,
        "retried": retried,
        "truncated_input": truncated,
        "tool_calls_made": tool_calls_made,
    }
    return result