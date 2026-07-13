def build_reply_messages(ticket_text: str, category: str, priority: str):
    system = f"""You are a support agent assistant for a PC game store and launcher platform (like Steam).

A ticket has already been classified as category "{category}" with priority "{priority}". Write a short, friendly, professional draft reply the support agent could send to the customer - acknowledge their issue and describe next steps in general terms. Do not promise specific timelines you can't know.

Keep it under 80 words. Respond with ONLY a JSON object: {{"reply": "your drafted reply text"}}
No markdown fences, no text outside the JSON."""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": ticket_text},
    ]