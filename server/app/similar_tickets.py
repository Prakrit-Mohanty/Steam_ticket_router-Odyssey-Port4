# A small stand-in for what a real company would have: a history of past
# resolved tickets. In production this would be a real database searched
# with embeddings (a more advanced similarity technique); we use simple
# keyword overlap here so the tool-calling mechanism itself is easy to see.
PAST_TICKETS = [
    {"text": "I got double charged for a game bundle and want a refund", "category": "Billing & Refunds", "priority": "High"},
    {"text": "My payment failed twice but I was still charged both times", "category": "Billing & Refunds", "priority": "High"},
    {"text": "Can I get a refund for a game I bought by accident an hour ago?", "category": "Billing & Refunds", "priority": "Medium"},
    {"text": "I can't log in, it keeps saying my password is wrong even after resetting it", "category": "Account & Login", "priority": "High"},
    {"text": "Someone logged into my account from another country and changed my email", "category": "Account & Login", "priority": "High"},
    {"text": "Two-factor authentication codes aren't arriving on my phone", "category": "Account & Login", "priority": "High"},
    {"text": "My download is stuck at 87% and has been for an hour", "category": "Game Library & Downloads", "priority": "Medium"},
    {"text": "A game I purchased isn't showing up in my library at all", "category": "Game Library & Downloads", "priority": "High"},
    {"text": "The game keeps crashing every time I load into a match", "category": "Technical Performance", "priority": "High"},
    {"text": "My frame rate dropped significantly after the last patch", "category": "Technical Performance", "priority": "Medium"},
    {"text": "A player is spamming slurs in chat and I want to report them", "category": "Community & Moderation", "priority": "Medium"},
    {"text": "I suspect someone is cheating with wallhacks in ranked matches", "category": "Community & Moderation", "priority": "Medium"},
    {"text": "It would be great if wishlists could be shared with friends", "category": "Feature Request", "priority": "Low"},
    {"text": "Do you have any plans to support cloud saves for offline games?", "category": "Feature Request", "priority": "Low"},
]

STOP_WORDS = {"a", "an", "the", "is", "it", "and", "to", "my", "i", "for", "of", "in", "on", "with", "at"}


def _score(query: str, candidate: str) -> int:
    q_words = {w.strip(".,!?").lower() for w in query.split()} - STOP_WORDS
    c_words = {w.strip(".,!?").lower() for w in candidate.split()} - STOP_WORDS
    return len(q_words & c_words)


def find_similar_tickets(query: str, top_n: int = 3):
    scored = [(_score(query, t["text"]), t) for t in PAST_TICKETS]
    scored = [s for s in scored if s[0] > 0]
    scored.sort(key=lambda s: s[0], reverse=True)
    return [t for _, t in scored[:top_n]]


# This is the "menu" we hand to the model - the exact format OpenAI/Groq's
# API expects for describing an available function: its name, what it does
# in plain English, and what arguments it takes.
TOOLS_SPEC = [
    {
        "type": "function",
        "function": {
            "name": "find_similar_tickets",
            "description": "Search past resolved support tickets for ones with similar wording, to see how they were categorized and prioritized before.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The current ticket's text to search for similar past tickets.",
                    }
                },
                "required": ["query"],
            },
        },
    }
]