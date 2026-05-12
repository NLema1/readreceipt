import hashlib
import re
import string
from dataclasses import dataclass
from difflib import ndiff


@dataclass(frozen=True)
class Diff:
    char_count: int
    is_whitespace_only: bool
    is_punctuation_only: bool


_WS_RE = re.compile(r"\s+")
_PUNCT = set(string.punctuation + "“”‘’—–…")


def compute_content_hash(headline: str, body: str) -> str:
    payload = f"{headline}\n{body}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _normalize_ws(s: str) -> str:
    return _WS_RE.sub(" ", s).strip()


def compute_diff(old: str, new: str) -> Diff:
    if old == new:
        return Diff(char_count=0, is_whitespace_only=True, is_punctuation_only=True)

    if _normalize_ws(old) == _normalize_ws(new):
        return Diff(char_count=0, is_whitespace_only=True, is_punctuation_only=True)

    changed_chars: list[str] = []
    for token in ndiff(old, new):
        if token.startswith("+ ") or token.startswith("- "):
            changed_chars.append(token[2])

    char_count = len(changed_chars)
    is_punct_only = char_count > 0 and all(
        ch in _PUNCT or ch.isspace() for ch in changed_chars
    )

    return Diff(
        char_count=char_count,
        is_whitespace_only=False,
        is_punctuation_only=is_punct_only,
    )


def should_skip_llm(
    diff: Diff,
    *,
    old_hash: str,
    new_hash: str,
    headline_changed: bool = False,
) -> bool:
    # Headline edits are categorically meaningful — always classify them,
    # even when the body diff is empty (the body-only Diff would otherwise
    # report is_whitespace_only=True and skip the LLM).
    if headline_changed:
        return False
    if old_hash == new_hash:
        return True
    if diff.is_whitespace_only:
        return True
    if diff.char_count < 20:
        return True
    if diff.is_punctuation_only:
        return True
    return False
