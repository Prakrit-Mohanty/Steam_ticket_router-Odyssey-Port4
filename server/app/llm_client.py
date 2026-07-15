import os
from openai import OpenAI

_cached = None


def _build_client(provider: str):
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        client = OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return {"client": client, "model": model, "provider": "openai"}

    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return None
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        return {"client": client, "model": model, "provider": "groq"}

    return None


def get_llm():
    global _cached
    if _cached is not None:
        return _cached

    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    llm = _build_client(provider)
    if llm is None:
        raise RuntimeError(
            f'LLM_PROVIDER="{provider}" but its API key is missing from .env, or the provider name is unknown.'
        )
    _cached = llm
    return _cached


def get_fallback_llm():
    """The *other* provider, used only if the primary one fails mid-request.
    Returns None if that provider has no API key configured - then there's
    simply nothing to fall back to, and the original error is raised instead."""
    primary_provider = get_llm()["provider"]
    other_provider = "groq" if primary_provider == "openai" else "openai"
    return _build_client(other_provider)