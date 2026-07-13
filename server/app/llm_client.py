import os
from openai import OpenAI

_cached = None

def get_llm():
    global _cached
    if _cached is not None:
        return _cached

    provider = os.getenv("LLM_PROVIDER", "groq").lower()

    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("LLM_PROVIDER=openai but OPENAI_API_KEY is missing from .env")
        client = OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        _cached = {"client": client, "model": model, "provider": "openai"}
        return _cached

    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("LLM_PROVIDER=groq but GROQ_API_KEY is missing from .env")
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        _cached = {"client": client, "model": model, "provider": "groq"}
        return _cached

    raise RuntimeError(f'Unknown LLM_PROVIDER "{provider}". Use "groq" or "openai".')