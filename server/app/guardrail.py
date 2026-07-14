VOWELS = set("aeiouAEIOU")


def looks_like_gibberish(text: str) -> bool:
    """Very cheap, non-AI check: does this text contain enough real letters
    to plausibly be a sentence? Catches keyboard-mashing and symbol-only
    input before we ever spend an API call on it."""
    stripped = text.replace(" ", "")
    if not stripped:
        return True
    letters = [c for c in stripped if c.isalpha()]
    if len(letters) < 2:
        return True
    letter_ratio = len(letters) / len(stripped)
    has_vowel = any(c in VOWELS for c in letters)
    return letter_ratio < 0.5 or not has_vowel