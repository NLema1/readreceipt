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
You classify edits between two versions of a news article. Most edits to \
mature articles are copy edits — rephrasings, word substitutions, or sentence \
cleanup that do not change what the article asserts. Default to a copy-edit \
classification unless you can point to a specific fact, claim, attribution, \
quote, or interpretive frame that shifted.

THE MEANING-PRESERVATION TEST

Before picking severity or change_type, identify the specific spans that \
changed. Then, using the surrounding article text as context — what is the \
article about, who is being described, what is being asserted — ask: would a \
careful reader come away with a different conclusion about any verifiable \
claim (number, name, date, location, attribution, sequence of events, direct \
quote) or about the framing the article endorses?

If no, the change preserves meaning. Set meaning_preserved=true, \
change_type="other", severity 1 or 2.

If yes, the change shifts meaning. Set meaning_preserved=false and pick the \
most specific change_type and an appropriate severity.

DO NOT pattern-match on apparent polarity flips ("contrary" vs. "does", \
removal of "not", word swaps that look opposite) without parsing what those \
words grammatically refer to in the article. Two phrasings with opposite \
surface form often mean the same thing once you resolve what they modify.

CHANGE TYPES (only used when meaning shifts):
- headline_change — the headline now frames the story differently or asserts \
a different fact
- fact_change — a verifiable claim differs (number, name, date, location, \
attribution, sequence)
- quote_change — a direct quotation is altered, added, or removed
- source_removed — an attributed source is removed or replaced
- addition — substantive new information is introduced (paragraph, claim, \
context)
- deletion — substantive information is removed
- other — a meaningful change that fits none of the above

SEVERITY:
1 — cosmetic only (whitespace, punctuation, link, image swap). Requires \
meaning_preserved=true.
2 — copy edit, no meaning change (rephrasing, word substitution, sentence \
reorder, ambiguity reduction). Requires meaning_preserved=true.
3 — meaning shift in a non-essential element (added context, softened tone, \
reframed emphasis). Requires meaning_preserved=false.
4 — meaning shift in a key fact, quote, or attribution. Requires \
meaning_preserved=false.
5 — substantive correction, retraction, or major reversal. Requires \
meaning_preserved=false.

CALIBRATION EXAMPLES

Example A — copy edit:
  Old: "despite considerable evidence to the contrary"
  New: "despite considerable evidence that it does"
  In an article about US non-acknowledgment of Israeli nuclear weapons, both \
phrasings refer to evidence that Israel does have nukes. The grammatical \
referent is the non-acknowledgment, not Israel's possession. Meaning is \
preserved.
  → meaning_preserved=true, change_type="other", severity=2,
    summary="Rephrased an ambiguous clause more directly; meaning unchanged."

Example B — fact change:
  Old: "The president said the deal is final."
  New: "The president said the deal is dead."
  Same speaker, same sentence shell, but the asserted claim flipped from \
agreement to collapse.
  → meaning_preserved=false, change_type="quote_change", severity=4,
    summary="Quoted statement reversed: deal characterized as dead instead \
of final."
"""

CLASSIFY_TOOL = {
    "name": "classify_change",
    "description": "Record the most significant difference between two versions of a news article.",
    "input_schema": {
        "type": "object",
        "required": ["meaning_preserved", "change_type", "severity", "summary"],
        "properties": {
            "meaning_preserved": {
                "type": "boolean",
                "description": (
                    "True if the change is a copy edit (rephrasing, word "
                    "substitution, cleanup) that does not alter any "
                    "verifiable claim, framing, or interpretation. False if "
                    "a careful reader could draw a different conclusion "
                    "about any fact, attribution, quote, or framing."
                ),
            },
            "change_type": {
                "type": "string",
                "enum": sorted(CHANGE_TYPES),
                "description": (
                    "Use 'other' when meaning_preserved is true. Otherwise "
                    "pick the most specific category that fits."
                ),
            },
            "severity": {
                "type": "integer",
                "minimum": 1,
                "maximum": 5,
                "description": (
                    "1-2 only when meaning is preserved. 3+ requires a "
                    "specific identified meaning shift."
                ),
            },
            "summary": {
                "type": "string",
                "description": (
                    "One sentence describing what changed and why it might "
                    "matter. If a copy edit, say so plainly."
                ),
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

    meaning_preserved = payload.get("meaning_preserved")
    if meaning_preserved is True and severity > 2:
        severity = 2
    if meaning_preserved is False and severity < 2:
        severity = 2

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
        "Apply the meaning-preservation test using the full article above as "
        "context, then call classify_change."
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
