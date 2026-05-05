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
        with session_scope(engine) as s:
            article = s.get(Article, article_id)
            article.last_checked = now
        return ScrapeOutcome.FETCH_FAILED

    parsed = parse(html)
    if parsed is None:
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
        skip_llm = should_skip_llm(diff, old_hash=latest.content_hash, new_hash=new_hash)
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
