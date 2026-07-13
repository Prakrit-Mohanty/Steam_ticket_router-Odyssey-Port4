# Smart Ticket Router

An AI-powered support ticket triage tool for a Steam-style game platform. Reads a raw support message and returns structured JSON: category, priority, assigned team, reasoning, and a confidence score.

## Architecture

React frontend -> FastAPI backend -> Groq (free Llama, for testing) or OpenAI (for demo)

The frontend never talks to the AI provider directly - only the backend does, since that's the only place the API key should ever live.

## Backend setup

\`\`\`
cd server
python3 -m venv venv
source venv/bin/activate
pip3 install fastapi "uvicorn[standard]" python-dotenv openai
cp .env.example .env   # then fill in your GROQ_API_KEY
\`\`\`

(more sections coming as the project grows)