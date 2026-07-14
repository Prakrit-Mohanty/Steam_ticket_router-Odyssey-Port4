# Smart Ticket Router

Port·04 — The Senate of Gods — "The Translator"

An AI-powered support ticket triage tool for a Steam-style game platform. Reads a raw support message and returns structured JSON: category, priority, assigned team, reasoning, and a confidence score — plus a tool-calling agent, an auto-draft reply feature, and a live "you vs AI" speed/accuracy comparison.

## Architecture
The frontend never talks to the AI provider directly — only the backend does, since that's the only place an API key should ever live. Groq mimics OpenAI's API shape, so the backend reuses the same `openai` Python package for both providers, just pointed at a different URL depending on one setting in `.env`.

## Features

- **Single ticket classification** — paste any support message, get back category, priority, assigned team, reasoning, and a confidence score.
- **Tool-calling agent** — for ambiguous tickets, the model can call `find_similar_tickets` to check how similar past tickets were actually categorized before answering, grounding its reasoning instead of guessing cold.
- **Auto-draft reply** — a second, more lenient AI call drafts a suggested customer response after classification (always meant for a human to review before sending).
- **Guardrail** — a fast, non-AI check rejects gibberish/symbol-only input (e.g. `.......`) before ever calling the LLM, returning an instant clarification request instead.
- **Batch demo** — runs 20 sample tickets (including the 3 required edge cases plus a wrong-language one) through the live classifier with a progress bar and results table.
- **You vs AI challenge** — manually sort the same 20 tickets yourself, timed, then the AI sorts them too; compares total time and category agreement side by side with bar graphs.

## Setup

### Backend

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip3 install fastapi "uvicorn[standard]" python-dotenv openai
cp .env.example .env   # then paste in your GROQ_API_KEY
uvicorn app.main:app --reload --port 4000
```

Get a free Groq key at console.groq.com/keys for day-to-day testing. Swap `LLM_PROVIDER=openai` and fill in `OPENAI_API_KEY` in `.env` when it's time for your real demo.

Health check: `http://127.0.0.1:4000/api/health`. Interactive API docs: `http://127.0.0.1:4000/docs`.

### Frontend

```bash
cd client
npm install
npm run dev
```

Opens on `http://localhost:5173`, talks to the backend at `http://localhost:4000` by default.

**Both servers need to be running at the same time** for the app to work — one terminal for `uvicorn`, one for `npm run dev`.

## How JSON reliability is enforced

1. **Prompt design** (`server/app/prompt.py`) — closed enums for category/priority, explicit "JSON only" instruction, few-shot examples covering angry/vague/ambiguous tickets.
2. **Clean → parse → validate** (`server/app/schema.py`) — strips stray markdown fences, `json.loads()`, then a Pydantic model checks every field exists and is the right type/enum.
3. **One corrective retry** (`server/app/classifier.py`) — if validation fails, the model gets its own broken output plus the exact error and one chance to fix it. If that also fails, a clean error is returned instead of a crash.
4. **Deterministic team assignment** (`server/app/teams.py`) — the LLM only picks the category; `assigned_team` is looked up from a fixed map in code, removing one source of inconsistency.

## Edge cases handled

| Case | Where | Behavior |
|---|---|---|
| Gibberish / symbol-only input | `guardrail.py` | Rejected before any LLM call, instant clarification request |
| Angry / all-caps tone | prompt few-shot | Judges the underlying issue, not the tone |
| Very short / vague message | prompt few-shot | Valid JSON, `General Inquiry`, low confidence rather than a wild guess |
| Ambiguous ticket (fits 2+ categories) | prompt few-shot + tool-calling agent | Picks one, reasoning explains why; may check similar past tickets first |
| Empty input | `classifier.py` | Rejected before calling the LLM, clean 400 |
| Very long input | `classifier.py` | Truncated to 6000 chars, flagged in response |
| Wrong language | tested in `sampleTickets.js` (#19) | Classified natively in that language, no special-casing needed |
| API/network failure | `classifier.py` + `main.py` | Caught, returns a clean error — server keeps running |

## Talking points for the mentor demo

- **"Explain this like I'm a PM"**: the model is given strict formatting rules and examples, then its output is double-checked in code before we trust it — ask nicely, then verify, not ask and hope.
- **"Why this approach?"**: closed enums + few-shot examples + schema validation, because open-ended prompts are where models drift into invalid JSON.
- **"Where is it most likely to be wrong?"**: genuinely ambiguous tickets and very short messages with no real signal — exactly what the confidence score and the tool-calling agent are designed to catch.
- **"What did you figure out that wasn't in the instructions?"**: that letting the LLM also pick the team added unnecessary inconsistency, so it was moved to a deterministic lookup; also that the model sometimes calls the similar-tickets tool even when it isn't strictly needed — a real, observed example of AI unreliability, not a hypothetical.
- **"What would you do differently?"**: replace the keyword-overlap similarity search in `similar_tickets.py` with embeddings for more accurate semantic matching.

## A note on the 2-week grading window

Commit history is graded — a spread of commits across the sprint scores better than one big commit the night before. Commit in small chunks as you extend this, rather than all at once.

