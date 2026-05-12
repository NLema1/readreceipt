import logging
import re
import unicodedata
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Optional

import anthropic

from readreceipt.classifier import Classification, ClassifierError
from readreceipt.differ import compute_content_hash, compute_diff, should_skip_llm
from readreceipt.scraper import ParsedArticle
from readreceipt.storage import (
    Article,
    Change,
    Version,
    get_latest_version,
    session_scope,
)


_PUNCT_AND_DASH_RE = re.compile(r"[\s\W_]+")


def _normalize_headline_for_substance(s: str) -> str:
    """Collapse a headline to its substantive letter/digit signature.

    Two headlines that produce the same signature differ only in cosmetic
    ways (whitespace, punctuation, dash style, capitalization, glyph form).
    A signature mismatch means at least one alphanumeric character differs.
    """
    # NFKC folds typographic variants (en-dash, em-dash, smart quotes) to
    # canonical forms; we still strip them next, so this mainly catches
    # NBSPs and ligature edge cases.
    s = unicodedata.normalize("NFKC", s or "")
    return _PUNCT_AND_DASH_RE.sub("", s).lower()


def _headline_change_is_substantive(old: str, new: str) -> bool:
    """True if the headlines differ by more than cosmetic punctuation /
    whitespace / capitalization. False for en-dash-for-hyphen swaps, smart-
    quote normalization, comma additions, and similar."""
    return _normalize_headline_for_substance(old) != _normalize_headline_for_substance(new)


log = logging.getLogger(__name__)


class ScrapeOutcome(Enum):
    FETCH_FAILED = "fetch_failed"
    FIRST_VERSION = "first_version"
    UNCHANGED = "unchanged"
    PRE_FILTERED = "pre_filtered"
    CLASSIFIED = "classified"
    CLASSIFIER_FAILED = "classifier_failed"


FetchFn = Callable[[str], Optional[str]]
ParseFn = Callable[[str], Optional[ParsedArticle]]
ClassifyFn = Callable[..., Classification]


def _classify_with_retry(
    classifier: ClassifyFn, *, old_headline, old_body, new_headline, new_body
) -> Optional[Classification]:
    for _ in range(2):
        try:
            return classifier(
                old_headline=old_headline, old_body=old_body,
                new_headline=new_headline, new_body=new_body,
            )
        except (ClassifierError, anthropic.APIError):
            continue
    return None


# Threshold (in characters) below which an "addition" change_type is treated
# as a small fact append and capped at severity 2. ~25 words ≈ 150 chars at
# typical English word lengths.
_SMALL_ADDITION_CHAR_THRESHOLD = 150


def _apply_post_classification_rules(
    classification: Optional[Classification],
    *,
    old_headline: str,
    new_headline: str,
    old_body: str,
    new_body: str,
) -> Optional[Classification]:
    """Server-side overrides applied after the LLM has classified a change.

    Rules:
    1. If the headline differs SUBSTANTIVELY (more than whitespace,
       punctuation, capitalization, or dash-style cosmetics), force
       change_type to 'headline_change' and ensure severity >= 2. A
       cosmetic-only headline diff is NOT enough to override the model —
       the prompt now treats those as copy_edit.
    2. If change_type is 'addition' and the net body length grew by less than
       _SMALL_ADDITION_CHAR_THRESHOLD characters, clamp severity to 2. Small
       fact appends (a sentence completing a thought) shouldn't trigger the
       VIBE SHIFT treatment that severity 3+ implies.
    """
    if classification is None:
        return None

    change_type = classification.change_type
    severity = classification.severity
    summary = classification.summary

    if _headline_change_is_substantive(old_headline, new_headline):
        change_type = "headline_change"
        severity = max(severity, 2)

    if change_type == "addition":
        net_added = max(0, len(new_body) - len(old_body))
        if net_added < _SMALL_ADDITION_CHAR_THRESHOLD:
            severity = min(severity, 2)

    return Classification(
        change_type=change_type, severity=severity, summary=summary
    )


def scrape_one_article(
    *,
    engine,
    article_id: int,
    fetch: FetchFn,
    parse: ParseFn,
    classifier: ClassifyFn,
) -> ScrapeOutcome:
    now = datetime.now(timezone.utc)

    with session_scope(engine) as s:
        article = s.get(Article, article_id)
        if article is None:
            return ScrapeOutcome.FETCH_FAILED
        url = article.url

    html = fetch(url)
    if not html:
        log.info("fetch failed for article_id=%s url=%s", article_id, url)
        with session_scope(engine) as s:
            article = s.get(Article, article_id)
            article.last_checked = now
        return ScrapeOutcome.FETCH_FAILED

    parsed = parse(html)
    if parsed is None:
        log.info(
            "parse returned None (interstitial or empty body) "
            "for article_id=%s url=%s",
            article_id,
            url,
        )
        with session_scope(engine) as s:
            article = s.get(Article, article_id)
            article.last_checked = now
        return ScrapeOutcome.FETCH_FAILED

    new_hash = compute_content_hash(parsed.headline, parsed.body_text)

    with session_scope(engine) as s:
        latest = get_latest_version(s, article_id)
        if latest is None:
            v1 = Version(
                article_id=article_id, scraped_at=now,
                headline=parsed.headline, body_text=parsed.body_text,
                content_hash=new_hash,
            )
            s.add(v1)
            article = s.get(Article, article_id)
            article.last_checked = now
            article.current_headline = parsed.headline
            return ScrapeOutcome.FIRST_VERSION

        if latest.content_hash == new_hash:
            article = s.get(Article, article_id)
            article.last_checked = now
            return ScrapeOutcome.UNCHANGED

        diff = compute_diff(latest.body_text, parsed.body_text)
        headline_changed = latest.headline.strip() != parsed.headline.strip()
        skip_llm = should_skip_llm(
            diff,
            old_hash=latest.content_hash,
            new_hash=new_hash,
            headline_changed=headline_changed,
        )
        latest_id = latest.id
        old_headline = latest.headline
        old_body = latest.body_text

    classification: Optional[Classification] = None
    if not skip_llm:
        classification = _classify_with_retry(
            classifier,
            old_headline=old_headline, old_body=old_body,
            new_headline=parsed.headline, new_body=parsed.body_text,
        )
        classification = _apply_post_classification_rules(
            classification,
            old_headline=old_headline,
            new_headline=parsed.headline,
            old_body=old_body,
            new_body=parsed.body_text,
        )

    with session_scope(engine) as s:
        article = s.get(Article, article_id)
        article.last_checked = now
        article.current_headline = parsed.headline

        current_latest = get_latest_version(s, article_id)
        if current_latest is not None and current_latest.content_hash == new_hash:
            return ScrapeOutcome.UNCHANGED

        new_version = Version(
            article_id=article_id, scraped_at=now,
            headline=parsed.headline, body_text=parsed.body_text,
            content_hash=new_hash,
        )
        s.add(new_version)
        s.flush()

        if skip_llm:
            return ScrapeOutcome.PRE_FILTERED

        if classification is None:
            s.add(Change(
                article_id=article_id,
                from_version_id=latest_id,
                to_version_id=new_version.id,
                change_type="other",
                severity=0,
                summary="classifier failed",
                classified_at=datetime.now(timezone.utc),
            ))
            return ScrapeOutcome.CLASSIFIER_FAILED

        s.add(Change(
            article_id=article_id,
            from_version_id=latest_id,
            to_version_id=new_version.id,
            change_type=classification.change_type,
            severity=classification.severity,
            summary=classification.summary,
            classified_at=datetime.now(timezone.utc),
        ))
        return ScrapeOutcome.CLASSIFIED
