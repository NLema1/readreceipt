from dataclasses import dataclass
from typing import Any, Optional

import anthropic


MODEL = "claude-haiku-4-5"
MAX_BODY_CHARS = 24_000

CHANGE_TYPES = {
    "headline_change",
    "fact_change",
    "quote_change",
    "attribution_update",
    "source_removed",
    "addition",
    "deletion",
    "correction",
    "copy_edit",
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
change_type="copy_edit" (or the more specific cosmetic / cleanup category \
where it applies), severity 1 or 2.

If yes, the change shifts meaning. Set meaning_preserved=false and pick the \
most specific change_type and an appropriate severity.

DO NOT pattern-match on apparent polarity flips ("contrary" vs. "does", \
removal of "not", word swaps that look opposite) without parsing what those \
words grammatically refer to in the article. Two phrasings with opposite \
surface form often mean the same thing once you resolve what they modify.

POLARITY / ADDITION-VS-REPLACEMENT CHECK

Before classifying as quote_change, deletion, source_removed, or a \
replacement of any kind, verify whether the original content is still \
present elsewhere in the new version. If it has been moved (a paragraph \
reordered, a quote relocated to a different position, a name now appearing \
two paragraphs later), the change is an addition or relocation — not a \
replacement. A "removed" quote that still appears somewhere in the new body \
is not a quote_change. A "removed" source that still appears in another \
clause is not source_removed. When in doubt, search the entire new body for \
the original content before declaring it gone.

CHANGE TYPES (only used when meaning shifts):
- headline_change — the headline now frames the story differently or asserts \
a different fact. Only use when the headline edit is itself meaningful \
(reframe, fact change, tonal shift). Pure cosmetic headline edits \
(punctuation, capitalization, typo fix) are copy_edit, not headline_change.
- fact_change — a verifiable claim differs (number, name, date, location, \
attribution, sequence)
- quote_change — a direct quotation by the same speaker is altered to say \
something different. Pure relocation does not count.
- attribution_update — a source is added, substituted, or strengthened \
(e.g., "officials said" → "officials told The Post said"; bare claim now \
attributed to a named source). Use this when an attribution APPEARS or \
SHIFTS; use source_removed when an attribution DISAPPEARS.
- source_removed — an attributed source is removed, leaving the claim \
unsourced.
- addition — substantive new information is introduced (paragraph, claim, \
context that adds a new claim or shifts framing)
- deletion — substantive information is removed and does not appear \
anywhere else in the new version
- correction — an explicit factual correction, retraction, or reversal of a \
previously published claim. Use ONLY when the outlet is fixing a prior \
factual error (statute name fixed, casualty number revised after sourcing \
changed, a sentence retracted, an editor's note acknowledging the prior \
version was wrong). Reframes, tonal shifts, and aggressive headline \
intensifications are NOT corrections — they are headline_change or \
addition/deletion at lower severity.
- copy_edit — rephrasing, synonym swap, voice swap (active↔passive), \
sentence reordering, ambiguity reduction, typo fix, punctuation, \
capitalization standardization, em-dash/quote-glyph cleanup, duplicate-line \
removal, audio-note or production-note cleanup, abbreviation \
expansion/contraction. The article's claims are unchanged. \
meaning_preserved=true.
- temporal_update — verb tense or time-reference changes that track \
real-world progression on a developing story (e.g., "will arrive" → \
"arrived", "earlier today" → "yesterday"). The underlying event is the \
same; only the time-relative phrasing changed.
- routine_update — new sentences or paragraphs added to a developing story \
that report subsequent ordinary events without altering any prior claim \
(e.g., a press conference now happened, a flight landed, a vote count was \
released). Distinguished from "addition" by the absence of any new \
interpretive frame, contested claim, or unattributed assertion.
- other — a meaningful change that fits none of the above. Should be rare; \
prefer the specific types when they apply.

SEVERITY — ANCHORED TO THE PUBLISHED RUBRIC

S·1 Cosmetic — whitespace, punctuation, link or image swap, capitalization \
or em-dash standardization, typo fix, duplicate-line cleanup, audio/byline \
boilerplate removal. Requires meaning_preserved=true. Pair with change_type \
copy_edit (or temporal_update for pure tense fixes that don't reflect \
real-world progression).

S·2 Copy edit — rephrasing with no meaning shift, synonym swap, voice swap, \
sentence reorder for clarity, ambiguity reduction, abbreviation \
expansion/contraction, routine subsequent-event additions on a developing \
story. meaning_preserved usually true. Pair with copy_edit, temporal_update, \
or routine_update.

S·3 Reframe — added context, softened tone, shifted emphasis, modal \
tightening (could → will), characterization adjusted, headline tonal shift \
without a new core fact. meaning_preserved=false. Typical change_type: \
headline_change (when reframe is in the headline), addition (when reframe \
is via added context), or other.

S·4 Fact / quote — a verifiable claim, attribution, direct quote, name, \
number, date, location, or sequence of events has MOVED. The reader would \
draw a different factual conclusion. Pair with fact_change, quote_change, \
attribution_update, or source_removed.

S·5 Correction — RESERVED for explicit corrections, retractions, or factual \
reversals where the outlet is fixing a prior factual error. Editor's note \
language, "previously stated", "corrected to", explicit walk-backs. A \
strong headline reframe or aggressive tonal shift is NOT S·5 — that's S·3 \
headline_change. A casualty-count revision is S·4 fact_change unless framed \
as a correction of a prior reported number. When in doubt between S·4 and \
S·5, choose S·4 unless you can name the specific prior claim being \
retracted.

DO NOT AGGREGATE INDEPENDENT CHANGES

When a single diff contains multiple separate changes, evaluate each \
independently and return the severity, change_type, and summary of the \
single most significant change — not the aggregate. Three small changes \
do not stack into one large change unless they collectively alter the \
article's meaning. If the changes are independent (e.g., one typo fix in \
paragraph 1, one tense update in paragraph 4, one abbreviation in paragraph \
7), return the severity of the most significant one, pick the change_type \
matching that one, and briefly mention the others in the summary as \
secondary context. The receipt should reflect what a reader would notice as \
the headline change, not the sum of janitorial edits.

CALIBRATION EXAMPLES

Example A — copy edit:
  Old: "despite considerable evidence to the contrary"
  New: "despite considerable evidence that it does"
  In an article about US non-acknowledgment of Israeli nuclear weapons, both \
phrasings refer to evidence that Israel does have nukes. The grammatical \
referent is the non-acknowledgment, not Israel's possession. Meaning is \
preserved.
  → meaning_preserved=true, change_type="copy_edit", severity=2,
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
  → meaning_preserved=true, change_type="copy_edit", severity=2,
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
  → meaning_preserved=true, change_type="copy_edit", severity=2,
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
  → meaning_preserved=true, change_type="copy_edit", severity=1,
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

HEADLINE PRIORITY

If the headline text has changed in a meaningful way (reframe, fact change, \
tonal shift, claim adjusted), the change_type is headline_change regardless \
of what else changed in the body, because the headline is what most readers \
see. A meaningful single-word swap in the headline ("rebuked" → "attacked", \
"weighs" → "moves to", "could" → "will") outweighs any number of body copy \
edits.

If the headline text differs only cosmetically (typo fix, capitalization, \
en-dash for hyphen, punctuation, glyph standardization) the change is \
copy_edit, not headline_change. The "headline priority" rule is about \
editorial substance, not about every byte of text in the title element.

SMALL APPEND RULE

A short factual append to an existing sentence or paragraph (under ~25 \
words / 150 characters of net new content) is severity 2 addition. It does \
not warrant severity 3+ unless it introduces a new source, removes existing \
framing, or shifts the article's central claim. A single biographical fact \
or specific achievement appended to a characterization is the canonical \
example — it sharpens what was already said, it doesn't change it.

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

Example M — headline tonal shift (body also changed):
  Old headline: "Norwegian government rebuked over decision to reopen North \
Sea gasfields"
  New headline: "Norwegian government attacked over decision to reopen North \
Sea gasfields"
  Body diff: minor compound-word standardization ("gas fields" → "gasfields", \
"oil field" → "oilfield") and one word insertion ("the disruption" → "the \
current disruption").
  The headline word swap "rebuked" → "attacked" intensifies the framing from \
measured criticism to aggressive opposition. Body changes are minor copy \
edits. Per the headline priority rule, change_type is headline_change, and \
the tonal intensification justifies severity 3.
  → meaning_preserved=false, change_type="headline_change", severity=3,
    summary="Headline tone intensified from 'rebuked' to 'attacked'; minor \
copy edits in body."

Example N — small biographical fact appended:
  Old: "Turner had been finding other things to do for years. He was \
relentlessly competitive and an accomplished yachtsman."
  New: "Turner had been finding other things to do for years. He was \
relentlessly competitive and an accomplished yachtsman — he won the America's \
Cup sailing competition in 1977."
  A 12-word append that adds one specific achievement to an existing \
characterization. The article's framing is unchanged; no new source or \
perspective was introduced. Per the small-append rule, this is severity 2.
  → meaning_preserved=false, change_type="addition", severity=2,
    summary="Added specific achievement (America's Cup 1977); \
characterization unchanged."

Example O — explicit correction (the rare S·5):
  Old: "The bill cleared the Communications Act subcommittee on Tuesday."
  New: "The bill cleared the Communications Decency Act subcommittee on \
Tuesday. (This story has been corrected to fix the statute name.)"
  An editor's note explicitly flags this as a correction to a prior factual \
error. The fix itself is small (one statute-name word added) but it is \
framed as a correction of a prior misstatement. This is exactly the case \
S·5 is reserved for.
  → meaning_preserved=false, change_type="correction", severity=5,
    summary="Corrected statute name (Communications Act → Communications \
Decency Act); flagged by editor's note."

Example P — attribution added, not removed:
  Old: "Three people were injured in the gunfire."
  New: "Three people were injured in the gunfire, a criminal complaint \
said."
  An attribution clause was appended where there was none before, \
strengthening the sourcing of an existing claim. The claim itself is \
unchanged. Use attribution_update, not source_removed (nothing was \
removed) and not addition (no new claim was introduced).
  → meaning_preserved=false, change_type="attribution_update", severity=3,
    summary="Added attribution to a criminal complaint, strengthening an \
existing claim."

Example Q — relocation, not deletion:
  Old: "[paragraph 4] The senator declined to comment. [paragraph 8] \
'I have not seen the report,' she added later."
  New: "[paragraph 4] The senator initially declined to comment, but later \
said, 'I have not seen the report.'"
  The original quote ("I have not seen the report") still appears in the \
new version — it was merged into the earlier paragraph. Nothing was \
removed; content was relocated and tightened. This is copy_edit, not \
quote_change or deletion. Before classifying as a removal of any kind, \
verify the original content is genuinely gone from the new body.
  → meaning_preserved=true, change_type="copy_edit", severity=2,
    summary="Relocated and tightened a follow-up quote; underlying content \
unchanged."

Example R — cosmetic headline edit (does NOT force headline_change):
  Old headline: "Senate votes 51-49 to advance bill"
  New headline: "Senate votes 51–49 to advance bill"
  The only difference is a typographic en-dash replacing a hyphen in the \
vote count. No fact, frame, or tone has changed. Despite the rule that \
meaningful headline edits dominate, a cosmetic headline edit is still \
cosmetic.
  → meaning_preserved=true, change_type="copy_edit", severity=1,
    summary="Replaced hyphen with en-dash in headline vote count; no \
meaning change."
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


