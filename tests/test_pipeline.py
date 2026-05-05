from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from readreceipt.classifier import Classification
from readreceipt.scraper import ParsedArticle
from readreceipt.storage import (
    Change,
    Version,
    create_engine_and_tables,
    session_scope,
    upsert_article,
)
from readreceipt.pipeline import ScrapeOutcome, scrape_one_article


@pytest.fixture
def engine():
    return create_engine_and_tables("sqlite:///:memory:")


@pytest.fixture
def article_id(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a = upsert_article(s, url="https://example.com/x", outlet="guardian", now=now)
        return a.id


def _fake_fetch(html):
    return lambda url: html


def _fake_parse(parsed):
    return lambda html: parsed


def test_first_scrape_inserts_v1_and_no_change(engine, article_id):
    parsed = ParsedArticle(headline="H", body_text="Body version 1.")
    fetch = MagicMock(return_value="<html/>")
    parse = MagicMock(return_value=parsed)
    classifier = MagicMock()

    outcome = scrape_one_article(
        engine=engine, article_id=article_id,
        fetch=fetch, parse=parse, classifier=classifier,
    )

    assert outcome == ScrapeOutcome.FIRST_VERSION
    classifier.assert_not_called()
    with session_scope(engine) as s:
        versions = s.query(Version).filter_by(article_id=article_id).all()
        assert len(versions) == 1
        changes = s.query(Change).filter_by(article_id=article_id).all()
        assert len(changes) == 0


def test_unchanged_hash_takes_fast_path(engine, article_id):
    parsed = ParsedArticle(headline="H", body_text="Body.")
    fetch = MagicMock(return_value="<html/>")
    parse = MagicMock(return_value=parsed)
    classifier = MagicMock()

    scrape_one_article(engine=engine, article_id=article_id,
                      fetch=fetch, parse=parse, classifier=classifier)
    outcome = scrape_one_article(engine=engine, article_id=article_id,
                                fetch=fetch, parse=parse, classifier=classifier)

    assert outcome == ScrapeOutcome.UNCHANGED
    classifier.assert_not_called()
    with session_scope(engine) as s:
        versions = s.query(Version).filter_by(article_id=article_id).all()
        assert len(versions) == 1


def test_pre_filter_rejects_skips_classifier(engine, article_id):
    fetch = MagicMock(return_value="<html/>")
    parse = MagicMock(side_effect=[
        ParsedArticle(headline="H", body_text="Body."),
        ParsedArticle(headline="H", body_text="Body!"),
    ])
    classifier = MagicMock()

    scrape_one_article(engine=engine, article_id=article_id,
                      fetch=fetch, parse=parse, classifier=classifier)
    outcome = scrape_one_article(engine=engine, article_id=article_id,
                                fetch=fetch, parse=parse, classifier=classifier)

    assert outcome == ScrapeOutcome.PRE_FILTERED
    classifier.assert_not_called()
    with session_scope(engine) as s:
        assert s.query(Version).filter_by(article_id=article_id).count() == 2
        assert s.query(Change).filter_by(article_id=article_id).count() == 0


def test_real_change_calls_classifier_and_writes_change(engine, article_id):
    fetch = MagicMock(return_value="<html/>")
    parse = MagicMock(side_effect=[
        ParsedArticle(headline="Old", body_text="The Fed signaled a rate cut Wednesday."),
        ParsedArticle(headline="New", body_text="The Fed signaled a rate hold Wednesday, surprising markets."),
    ])
    classifier = MagicMock(return_value=Classification(
        change_type="headline_change", severity=4, summary="reframed",
    ))

    scrape_one_article(engine=engine, article_id=article_id,
                      fetch=fetch, parse=parse, classifier=classifier)
    outcome = scrape_one_article(engine=engine, article_id=article_id,
                                fetch=fetch, parse=parse, classifier=classifier)

    assert outcome == ScrapeOutcome.CLASSIFIED
    classifier.assert_called_once()
    with session_scope(engine) as s:
        changes = s.query(Change).filter_by(article_id=article_id).all()
        assert len(changes) == 1
        assert changes[0].change_type == "headline_change"
        assert changes[0].severity == 4


def test_classifier_failure_writes_other_severity_zero(engine, article_id):
    from readreceipt.classifier import ClassifierError
    fetch = MagicMock(return_value="<html/>")
    parse = MagicMock(side_effect=[
        ParsedArticle(headline="Old", body_text="The Fed signaled a rate cut Wednesday."),
        ParsedArticle(headline="New", body_text="The Fed signaled a rate hold Wednesday, surprising markets."),
    ])
    classifier = MagicMock(side_effect=ClassifierError("boom"))

    scrape_one_article(engine=engine, article_id=article_id,
                      fetch=fetch, parse=parse, classifier=classifier)
    outcome = scrape_one_article(engine=engine, article_id=article_id,
                                fetch=fetch, parse=parse, classifier=classifier)

    assert outcome == ScrapeOutcome.CLASSIFIER_FAILED
    assert classifier.call_count == 2
    with session_scope(engine) as s:
        changes = s.query(Change).filter_by(article_id=article_id).all()
        assert len(changes) == 1
        assert changes[0].change_type == "other"
        assert changes[0].severity == 0


def test_fetch_failure_returns_failed(engine, article_id):
    fetch = MagicMock(return_value=None)
    parse = MagicMock()
    classifier = MagicMock()
    outcome = scrape_one_article(engine=engine, article_id=article_id,
                                fetch=fetch, parse=parse, classifier=classifier)
    assert outcome == ScrapeOutcome.FETCH_FAILED
    parse.assert_not_called()
    classifier.assert_not_called()


def test_classifier_recovers_after_one_retry(engine, article_id):
    from readreceipt.classifier import ClassifierError
    fetch = MagicMock(return_value="<html/>")
    parse = MagicMock(side_effect=[
        ParsedArticle(headline="Old", body_text="The Fed signaled a rate cut Wednesday."),
        ParsedArticle(headline="New", body_text="The Fed signaled a rate hold Wednesday, surprising markets."),
    ])
    classifier = MagicMock(side_effect=[
        ClassifierError("transient"),
        Classification(change_type="fact_change", severity=4, summary="rate flipped"),
    ])

    scrape_one_article(engine=engine, article_id=article_id,
                      fetch=fetch, parse=parse, classifier=classifier)
    outcome = scrape_one_article(engine=engine, article_id=article_id,
                                fetch=fetch, parse=parse, classifier=classifier)

    assert outcome == ScrapeOutcome.CLASSIFIED
    assert classifier.call_count == 2
    with session_scope(engine) as s:
        changes = s.query(Change).filter_by(article_id=article_id).all()
        assert len(changes) == 1
        assert changes[0].change_type == "fact_change"
