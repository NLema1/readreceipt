from dataclasses import dataclass
from typing import Any, Optional

import anthropic


MODEL = "claude-haiku-4-5"
MAX_BODY_CHARS = 24_000

CHANGE_TYPES = {
    "headline_change",
    "fact_change",
    "quote_change",
    "source_removed",
    "addition",
    "deletion",
    "other",
}

SYSTEM_PROMPT = """\
You are classifying edits to news articles. Given two versions of the same \
article (old and new), call the classify_change tool with a JSON object \
describing the most significant change. Be conservative with severity — most \
edits are minor cleanups.

Severity scale:
  1 — cosmetic (formatting, link fix, image swap)
  2 — minor wording, no meaning change
  3 — meaningful rewording, added context, softening
  4 — fact change, quote change, source removed, headline reframed
  5 — substantive correction, retraction, major reversal
"""

CLASSIFY_TOOL = {
    "name": "classify_change",
    "description": "Record the most significant difference between two versions of a news article.",
    "input_schema": {
        "type": "object",
        "required": ["change_type", "severity", "summary"],
        "properties": {
            "change_type": {
                "type": "string",
                "enum": sorted(CHANGE_TYPES),
            },
            "severity": {
                "type": "integer",
                "minimum": 1,
                "maximum": 5,
            },
            "summary": {
                "type": "string",
                "description": "One sentence describing what changed and why it might matter.",
            },
        },
    },
}


class ClassifierError(Exception):
    pass


@dataclass(frozen=True)
class Classification:
    change_type: str
    severity: int
    summary: str


def validate_classification(payload: dict[str, Any]) -> Classification:
    try:
        change_type = payload["change_type"]
        severity = payload["severity"]
        summary = payload["summary"]
    except KeyError as exc:
        raise ClassifierError(f"missing field: {exc}") from exc

    if change_type not in CHANGE_TYPES:
        raise ClassifierError(f"unknown change_type: {change_type}")
    if not isinstance(severity, int) or not 1 <= severity <= 5:
        raise ClassifierError(f"severity out of range: {severity}")
    if not isinstance(summary, str) or not summary.strip():
        raise ClassifierError("summary must be a non-empty string")

    return Classification(
        change_type=change_type, severity=severity, summary=summary.strip()
    )


def _truncate(s: str) -> str:
    if len(s) <= MAX_BODY_CHARS:
        return s
    return s[:MAX_BODY_CHARS] + "\n[...truncated]"


def _build_user_text(
    old_headline: str, old_body: str, new_headline: str, new_body: str
) -> str:
    return (
        "OLD VERSION\n"
        f"Headline: {old_headline}\n\n"
        f"Body:\n{_truncate(old_body)}\n\n"
        "---\n\n"
        "NEW VERSION\n"
        f"Headline: {new_headline}\n\n"
        f"Body:\n{_truncate(new_body)}\n\n"
        "Call the classify_change tool with the most significant change."
    )


def classify_change(
    *,
    client: anthropic.Anthropic,
    old_headline: str,
    old_body: str,
    new_headline: str,
    new_body: str,
) -> Classification:
    user_text = _build_user_text(old_headline, old_body, new_headline, new_body)

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=[CLASSIFY_TOOL],
        tool_choice={"type": "tool", "name": "classify_change"},
        messages=[{"role": "user", "content": user_text}],
    )

    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "classify_change":
            return validate_classification(block.input)

    raise ClassifierError("model did not call classify_change tool")


def make_client(api_key: Optional[str]) -> anthropic.Anthropic:
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required")
    return anthropic.Anthropic(api_key=api_key)
