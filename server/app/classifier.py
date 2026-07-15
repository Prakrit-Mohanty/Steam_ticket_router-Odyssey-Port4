import json
import time

from .llm_client import get_llm, get_fallback_llm
from openai import RateLimitError, APIConnectionError, APITimeoutError
from .prompt import build_messages
from .schema import parse_and_validate, ClassificationError, _clean_raw_text
from .similar_tickets import find_similar_tickets, TOOLS_SPEC
from .guardrail import looks_like_gibberish
from .reply_prompt import build_reply_messages

MAX_INPUT_CHARS = 6000
MAX_TOOL_ROUNDS = 3  # safety cap so the model can't loop calling tools forever


class LLMCallError(Exception):
    def __init__(self, message, cause=None):
        super().__init__(message)
        self.cause = cause


MAX_RETRIES = 2
RETRY_BASE_DELAY = 2  # seconds; doubles each retry (2s, then 4s)


def _call_once(llm, messages, tools):
    kwargs = dict(model=llm["model"], messages=messages, temperature=0.2, max_tokens=400)
    if tools:
        kwargs["tools"] = tools
    completion = llm["client"].chat.completions.create(**kwargs)
    return completion.choices[0].message


def _call_model(messages, tools=None):
    llm = get_llm()
    last_error = None

    # Retry the primary provider a couple times - covers transient blips
    # like rate limits or a dropped connection.
    for attempt in range(MAX_RETRIES + 1):
        try:
            message = _call_once(llm, messages, tools)
            return message, llm["provider"], llm["model"]
        except (RateLimitError, APIConnectionError, APITimeoutError) as e:
            last_error = e
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BASE_DELAY * (2 ** attempt))
        except Exception as e:
            last_error = e
            break  # not a transient error - no point retrying the same provider

    # Primary provider is still down - fail over to the other configured
    # provider once, so a single provider outage doesn't take the demo down.
    fallback = get_fallback_llm()
    if fallback:
        try:
            message = _call_once(fallback, messages, tools)
            return message, fallback["provider"], fallback["model"]
        except Exception as e:
            last_error = e

    raise LLMCallError(f"Call to {llm['provider']} ({llm['model']}) failed: {last_error}", cause=last_error)


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

    if looks_like_gibberish(ticket_text):
        err = ClassificationError(
            "This doesn't look like a real support message. Please describe your issue in a few words.",
            stage="guardrail",
        )
        err.status = 400
        raise err

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
        message, provider, model = _call_model(messages, tools=TOOLS_SPEC)
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

def draft_reply(ticket_text: str, category: str, priority: str) -> dict:
    messages = build_reply_messages(ticket_text, category, priority)
    message, provider, model = _call_model(messages)  # no tools needed here
    cleaned = _clean_raw_text(message.content or "")
    try:
        parsed = json.loads(cleaned)
        reply = parsed.get("reply", "").strip()
    except json.JSONDecodeError:
        # A draft reply is low-stakes - a human reviews it before sending - so
        # if it didn't return clean JSON, fall back to showing the raw text
        # rather than erroring out entirely. This is intentionally more
        # lenient than classify_ticket, where malformed output is unacceptable.
        reply = (message.content or "").strip()
    return {"reply": reply, "meta": {"provider": provider, "model": model}}