const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function handle(res) {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || `Request failed with ${res.status}`);
  }
  return body;
}

export async function classifyOne(text) {
  const res = await fetch(`${API_URL}/api/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return handle(res);
}

export async function draftReply(text, category, priority) {
  const res = await fetch(`${API_URL}/api/draft-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, category, priority }),
  });
  return handle(res);
}