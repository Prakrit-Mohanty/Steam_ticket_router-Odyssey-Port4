# Smart Ticket Router
Port·04 — The Senate of Gods — "The Translator"

An AI-powered support ticket triage tool for a Steam-style game platform. Every submitted ticket is classified, prioritized, and routed to a real department and staff member, then persisted to a database with a ticket number, full history, and an estimated resolution time — plus a tool-calling agent, an auto-draft reply feature, and a live "you vs AI" speed/accuracy comparison.

## Architecture

The frontend never talks to the AI provider directly — only the backend does, since that's the only place an API key should ever live. Groq mimics OpenAI's API shape, so the backend reuses the same `openai` Python package for both providers, just pointed at a different URL depending on one setting in `.env`. Every classified ticket is written to a Postgres database via SQLAlchemy, with connection pooling so multiple tickets (e.g. a batch of 15) can be submitted at once without exhausting database connections.

## Features

- **Single ticket classification** — paste any support message, get back category, priority, a staff-facing work item summary, reasoning, and a confidence score.
- **Persistent ticket database** — every submitted ticket is saved to Postgres with an auto-generated ticket number (`TCK-0001`, etc.), full audit fields (`created_at`, `updated_at`, `updated_by`), and is browsable later in the "All Tickets" view.
- **Priority-based staff routing** — tickets aren't just routed to a team, they're routed to a specific person: High priority → that department's Manager, Medium → Senior, Low → Junior. This lookup is deterministic code, never left to the LLM.
- **Bulk ticket submission** — submit many tickets in one request (tested with 15 at once); each is classified and routed independently, with per-ticket errors isolated so one bad ticket doesn't fail the whole batch.
- **Estimated resolution time** — each ticket gets a rough SLA-style estimate (e.g. "Under 4 hours" for High priority) based on its priority tier.
- **All Tickets list + detail view** — browse every ticket ever submitted, click into full detail: department, assigned staff member and role, priority, confidence, reasoning, last updated, and who/what last updated it.
- **Tool-calling agent** — for ambiguous tickets, the model can call `find_similar_tickets` to check how similar past tickets were actually categorized before answering, grounding its reasoning instead of guessing cold.
- **Auto-draft reply** — a second, more lenient AI call drafts a suggested customer response after classification (always meant for a human to review before sending).
- **Guardrail** — a fast, non-AI check rejects gibberish/symbol-only input (e.g. `.......`) before ever calling the LLM, returning an instant clarification request instead.
- **Provider failsafe** — if the primary LLM provider fails (rate limit, timeout, connection drop, outage), the backend retries with backoff, then automatically fails over to the secondary provider (OpenAI ↔ Groq) so a single provider going down mid-demo doesn't take the tool down.
- **Batch demo** — runs 20 sample tickets (including the 3 required edge cases plus a wrong-language one) through the live classifier with a progress bar and results table.
- **You vs AI challenge** — manually classify, prioritize, and route the same 20 tickets yourself (team and specific assignee included), timed — then the AI does the same 20, and results are compared side by side with bar graphs.

## Setup

### Database

```bash
createdb smart_ticket_router
```

In `server/.env`, set:
DATABASE_URL=postgresql://localhost/smart_ticket_router

### Backend

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip3 install fastapi "uvicorn[standard]" python-dotenv openai sqlalchemy psycopg2-binary
cp .env.example .env   # then paste in your GROQ_API_KEY and DATABASE_URL
python -m app.seed     # creates tables, seeds departments + staff (safe to re-run)
uvicorn app.main:app --reload --port 4000
```

Get a free Groq key at console.groq.com/keys for day-to-day testing. Swap `LLM_PROVIDER=openai` and fill in `OPENAI_API_KEY` in `.env` when it's time for your real demo — Groq stays configured as the automatic fallback provider.

Health check: `http://127.0.0.1:4000/api/health`. Interactive API docs: `http://127.0.0.1:4000/docs`.

### Frontend

```bash
cd client
npm install
npm run dev
```

Opens on `http://localhost:5173`, talks to the backend at `http://localhost:4000` by default.

**Both servers need to be running at the same time** for the app to work — one terminal for `uvicorn`, one for `npm run dev`.

## API endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/classify` | Stateless classification — returns category/priority/team/reasoning, doesn't touch the database |
| `POST /api/draft-reply` | Drafts a suggested customer reply for a given ticket + classification |
| `POST /api/tickets` | Classifies **and persists** a ticket — returns a real ticket number, department, and assigned staff member |
| `POST /api/tickets/bulk` | Same as above, for a list of ticket texts in one request |
| `GET /api/tickets` | Lists every persisted ticket |
| `GET /api/tickets/{id}` | Full detail for one ticket |
| `GET /api/health` | Health check |

## How JSON reliability is enforced

1. **Prompt design** (`server/app/prompt.py`) — closed enums for category/priority, explicit "JSON only" instruction, few-shot examples covering angry/vague/ambiguous tickets.
2. **Clean → parse → validate** (`server/app/schema.py`) — strips stray markdown fences, `json.loads()`, then a Pydantic model checks every field exists and is the right type/enum.
3. **One corrective retry** (`server/app/classifier.py`) — if validation fails, the model gets its own broken output plus the exact error and one chance to fix it. If that also fails, a clean error is returned instead of a crash.
4. **Deterministic team + staff assignment** (`server/app/teams.py`, `server/app/routing.py`) — the LLM only picks the category and priority; which team, and which specific staff member (Manager/Senior/Junior by priority), is looked up from fixed rules in code, removing organizational decisions from the model entirely.

## Edge cases handled

| Case | Where | Behavior |
|---|---|---|
| Gibberish / symbol-only input | `guardrail.py` | Rejected before any LLM call, instant clarification request |
| Angry / all-caps tone | prompt few-shot | Judges the underlying issue, not the tone |
| Very short / vague message | prompt few-shot | Valid JSON, `General Inquiry`, low confidence rather than a wild guess |
| Ambiguous ticket (fits 2+ categories) | prompt few-shot + tool-calling agent | Picks one, reasoning explains why; may check similar past tickets first |
| Empty input | `classifier.py` | Rejected before calling the LLM, clean 400 |
| Very long input | `classifier.py` | Truncated to 6000 chars, flagged in response |
| Wrong language | tested in `sampleTickets.js` (#19) | Understands non-English input correctly (verified with a Spanish ticket → correctly classified as Account & Login), though reasoning is returned in English since that's the prompt's language |
| API/network failure (single call) | `classifier.py` + `main.py` | Caught, returns a clean error — server keeps running |
| LLM provider outage or rate limit | `llm_client.py` + `classifier.py` | Retries with backoff, then automatically fails over to the other configured provider before giving up |
