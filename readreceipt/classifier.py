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
    "temporal_update",
    "routine_update",
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
context that adds a new claim or shifts framing)
- deletion — substantive information is removed
- temporal_update — verb tense or time-reference changes that track real-world \
progression on a developing story (e.g., "will arrive" → "arrived", \
"is expected to" → "has", "earlier today" → "yesterday"). The underlying \
event is the same; only the time-relative phrasing changed. Almost always \
severity 1-2.
- routine_update — new sentences or paragraphs added to a developing story \
that report subsequent ordinary events without altering any prior claim \
(e.g., a press conference now happened, a flight landed, a vote count was \
released). Distinguished from "addition" by the absence of any new \
interpretive frame, contested claim, or unattributed assertion. Almost \
always severity 1-2.
- other — a meaningful change that fits none of the above

SEVERITY:
1 — cosmetic only (whitespace, punctuation, link, image swap, abbreviation \
expansion or contraction, typo fix). Requires meaning_preserved=true.
2 — copy edit, no meaning change (rephrasing, word substitution, sentence \
reorder, ambiguity reduction, temporal_update, routine_update). \
meaning_preserved is usually true; for temporal_update / routine_update the \
underlying event reality has progressed, but the article's claims have not \
been contradicted, so meaning_preserved=false with severity 2 is also valid.
3 — meaning shift in a non-essential element (added context, softened tone, \
reframed emphasis). Requires meaning_preserved=false.
4 — meaning shift in a key fact, quote, or attribution. Requires \
meaning_preserved=false.
5 — substantive correction, retraction, or major reversal. Requires \
meaning_preserved=false.

DO NOT AGGREGATE INDEPENDENT CHANGES

When a single diff contains multiple separate changes, evaluate each \
independently and return the severity of the highest single change, not the \
sum. Three small changes do not stack into one large change unless they \
collectively alter the article's meaning. If the changes are independent \
(e.g., one typo fix in paragraph 1, one tense update in paragraph 4, one \
abbreviation in paragraph 7), return the severity of the most significant \
one, pick the change_type matching that one, and briefly mention the others \
in the summary.

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

Example C — number change:
  Old: "killed at least 12 people"
  New: "killed at least 17 people"
  A casualty count was revised upward. Both versions share the same hedge \
("at least") and the same event, but the floor of the asserted number has \
moved. This is a verifiable factual claim that has changed.
  → meaning_preserved=false, change_type="fact_change", severity=4,
    summary="Casualty count revised from at least 12 to at least 17."

Example D — copy edit voice swap:
  Old: "The bill was rejected by the committee."
  New: "The committee rejected the bill."
  Same actors, same outcome, just active voice instead of passive. The reader \
draws no different conclusion. This is style cleanup.
  → meaning_preserved=true, change_type="other", severity=2,
    summary="Passive-to-active voice rewrite; same actors and outcome."

Example E — added context, no claim shift:
  Old: "The agency will review the policy next quarter."
  New: "The agency, which has reviewed three similar policies since 2024, \
will review the policy next quarter."
  The new sentence adds background detail that does not change the central \
assertion (a planned review). The added clause is verifiable but not the \
focus of the edit.
  → meaning_preserved=false, change_type="addition", severity=3,
    summary="Added historical context about prior agency reviews; central \
claim unchanged."

Example F — source attribution removed:
  Old: "according to two officials familiar with the negotiations"
  New: (clause removed)
  An attributed source was stripped, leaving the assertion unsourced. A \
careful reader would weight the surrounding claim differently without the \
attribution. This is editorially meaningful regardless of whether the \
underlying fact is the same.
  → meaning_preserved=false, change_type="source_removed", severity=3,
    summary="Removed attribution to two officials, leaving the claim \
unsourced."

Example G — copy edit synonym swap:
  Old: "released a statement strongly criticizing the proposal"
  New: "issued a statement strongly criticizing the proposal"
  "Released" and "issued" are interchangeable in this context. No actor, \
target, or stance has changed.
  → meaning_preserved=true, change_type="other", severity=2,
    summary="Synonym swap (released → issued); meaning unchanged."

Example H — headline reframe:
  Old: "Senate weighs new restrictions on hedge funds"
  New: "Senate moves to restrict hedge funds"
  The first headline frames the story as deliberation; the second frames it \
as forward motion. A reader infers different stages of progress, even if the \
underlying article body did not change. This is a framing shift in the \
headline specifically.
  → meaning_preserved=false, change_type="headline_change", severity=3,
    summary="Headline reframed from deliberation (\\"weighs\\") to action \
(\\"moves to\\"); implies further progress than before."

Example I — punctuation only:
  Old: "However, the spokesperson denied the claim."
  New: "However the spokesperson denied the claim."
  A comma was removed. The sentence parses identically. This is below the \
threshold of editorial significance and should normally have been filtered \
before reaching you, but if it does reach you, treat it as cosmetic.
  → meaning_preserved=true, change_type="other", severity=1,
    summary="Comma removed after introductory adverb; no meaning change."

Example J — borderline:
  Old: "Critics worry the policy could harm small businesses."
  New: "Critics warn the policy will harm small businesses."
  "Could" → "will" tightens the modal claim from possibility to certainty. \
"Worry" → "warn" shifts the action from a private feeling to a public \
warning. Both lean toward stronger assertion. This is a meaning shift at \
the level of stance — the article is now claiming critics are more confident \
than before.
  → meaning_preserved=false, change_type="other", severity=3,
    summary="Modal tightened from possibility to certainty; critics' stance \
characterized as more confident."

GUIDANCE ON BORDERLINE CASES

When a change could plausibly read either as copy edit or as meaning shift, \
err toward copy edit unless you can name the specific verifiable claim or \
framing that has changed. Vague unease about a wording difference is not \
sufficient to flag it as a meaning shift.

When the headline changes but the body does not, evaluate the headline \
change on its own. A headline reframe is editorially meaningful even if no \
body fact moved, because the headline is what most readers see.

When a body change adds or removes a paragraph, ask whether the central \
claim of the article has changed, or only the supporting context. \
Addition/deletion of supporting context is severity 2-3 depending on \
whether the context affected interpretation. Addition/deletion of a central \
claim is severity 4-5.

When a direct quotation changes, distinguish: the same speaker saying \
something different (quote_change, often severity 4) versus paraphrasing \
that preserves meaning (other, severity 2) versus a quotation being moved \
to a different speaker (fact_change, severity 4-5).

Example K — multi-change diff on a developing story:
  Old: "federal police commissioner said the group would reach Australia. \
He refused to had with the request."
  New: "AFP commissioner said the group arrived in Australia. He refused \
to help with the request."
  Three independent changes: (a) abbreviation expansion "federal police \
commissioner" → "AFP commissioner" (style, severity 1); (b) tense update \
"would reach" → "arrived" because the group has now landed (temporal_update, \
severity 2); (c) typo fix "refused to had" → "refused to help" (style, \
severity 1). Each is independently low. None of them flip a verifiable \
claim; the article's overall narrative is identical, just temporally \
caught up.
  → meaning_preserved=false, change_type="temporal_update", severity=2,
    summary="Tense updated to reflect group's arrival; also abbreviation \
swap and typo fix. No claim changed."

Example L — developing-story routine update:
  Old: "Ballots are still being counted in the contested district."
  New: "Ballots are still being counted in the contested district. As of \
6pm, the challenger leads by 1,200 votes with 78% of precincts reporting."
  A new sentence reports an ordinary subsequent event (the count progressed). \
No prior claim was contradicted; the original sentence remains. This is the \
canonical routine_update.
  → meaning_preserved=false, change_type="routine_update", severity=2,
    summary="Added current vote tally as count progressed; no prior claim \
changed."
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
    "cache_control": {"type": "ephemeral"},
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
