from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from newsdiff.api import build_app
from newsdiff.storage import (
    Change,
    Version,
    create_engine_and_tables,
    session_scope,
    upsert_article,
)


@pytest.fixture
def engine():
    return create_engine_and_tables("sqlite:///:memory:")


@pytest.fixture
def client(engine):
    app = build_app(engine=engine)
    return TestClient(app)


def _seed(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a = upsert_article(s, url="https://example.com/a", outlet="guardian", now=now)
        a.current_headline = "Hello world"
        s.flush()
        v1 = Version(article_id=a.id, scraped_at=now,
                     headline="Hello world", body_text="Body v1.", content_hash="1")
        v2 = Version(article_id=a.id, scraped_at=now + timedelta(hours=1),
                     headline="Hello world!", body_text="Body v2.", content_hash="2")
        s.add_all([v1, v2])
        s.flush()
        s.add(Change(
            article_id=a.id, from_version_id=v1.id, to_version_id=v2.id,
            change_type="headline_change", severity=4, summary="emphasis added",
            classified_at=now + timedelta(hours=1, minutes=1),
        ))
        return a.id


def test_get_articles_returns_list(client, engine):
    aid = _seed(engine)
    r = client.get("/api/articles")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    row = body[0]
    assert row["id"] == aid
    assert row["headline"] == "Hello world"
    assert row["change_count"] == 1
    assert row["max_severity"] == 4
    assert row["outlet"] == "guardian"


def test_get_articles_min_severity_filter(client, engine):
    _seed(engine)
    r = client.get("/api/articles?min_severity=5")
    assert r.json() == []


def test_get_article_detail(client, engine):
    aid = _seed(engine)
    r = client.get(f"/api/articles/{aid}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == aid
    assert len(body["versions"]) == 2
    assert len(body["changes"]) == 1
    assert body["changes"][0]["change_type"] == "headline_change"


def test_get_article_404(client):
    r = client.get("/api/articles/9999")
    assert r.status_code == 404


def test_get_changes_recent(client, engine):
    _seed(engine)
    r = client.get("/api/changes/recent?min_severity=3")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["change_type"] == "headline_change"


def test_get_articles_q_filters_by_headline_substring(client, engine):
    aid = _seed(engine)
    r_match = client.get("/api/articles?min_severity=0&q=hello")
    assert len(r_match.json()) == 1
    r_miss = client.get("/api/articles?min_severity=0&q=banana")
    assert r_miss.json() == []


def test_get_articles_url_filter_exact_match(client, engine):
    _seed(engine)
    r_match = client.get("/api/articles?min_severity=0&url=https://example.com/a")
    assert len(r_match.json()) == 1
    r_miss = client.get("/api/articles?min_severity=0&url=https://example.com/missing")
    assert r_miss.json() == []
