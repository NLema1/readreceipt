from datetime import datetime, timedelta, timezone

import pytest

from newsdiff.storage import (
    Article,
    Change,
    Version,
    create_engine_and_tables,
    session_scope,
)


@pytest.fixture
def engine():
    return create_engine_and_tables("sqlite:///:memory:")


def test_insert_article(engine):
    with session_scope(engine) as s:
        a = Article(
            url="https://example.com/a",
            outlet="guardian",
            first_seen=datetime.now(timezone.utc),
            last_checked=datetime.now(timezone.utc),
            tracking_until=datetime.now(timezone.utc) + timedelta(days=7),
            current_headline="Hello",
        )
        s.add(a)
        s.flush()
        assert a.id is not None


def test_insert_version_and_change(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a = Article(
            url="https://example.com/b",
            outlet="ap",
            first_seen=now,
            last_checked=now,
            tracking_until=now + timedelta(days=7),
            current_headline="H",
        )
        s.add(a)
        s.flush()
        v1 = Version(
            article_id=a.id,
            scraped_at=now,
            headline="H",
            body_text="body v1",
            content_hash="abc",
        )
        v2 = Version(
            article_id=a.id,
            scraped_at=now + timedelta(minutes=30),
            headline="H2",
            body_text="body v2",
            content_hash="def",
        )
        s.add_all([v1, v2])
        s.flush()
        c = Change(
            article_id=a.id,
            from_version_id=v1.id,
            to_version_id=v2.id,
            change_type="headline_change",
            severity=4,
            summary="headline changed",
            classified_at=now + timedelta(minutes=31),
        )
        s.add(c)
        s.flush()
        assert c.id is not None


def test_url_unique_constraint(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        s.add(
            Article(
                url="https://example.com/dup",
                outlet="reuters",
                first_seen=now,
                last_checked=now,
                tracking_until=now + timedelta(days=7),
                current_headline="x",
            )
        )
    with pytest.raises(Exception):
        with session_scope(engine) as s:
            s.add(
                Article(
                    url="https://example.com/dup",
                    outlet="reuters",
                    first_seen=now,
                    last_checked=now,
                    tracking_until=now + timedelta(days=7),
                    current_headline="x",
                )
            )


from newsdiff.storage import (
    get_article_by_url,
    get_latest_version,
    upsert_article,
    list_articles_with_change_stats,
)


def test_upsert_article_creates_then_returns_existing(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a1 = upsert_article(
            s, url="https://example.com/c", outlet="guardian", now=now
        )
        assert a1.id is not None
    with session_scope(engine) as s:
        a2 = upsert_article(
            s, url="https://example.com/c", outlet="guardian", now=now
        )
        assert a2.id == a1.id


def test_get_latest_version_returns_none_when_empty(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a = upsert_article(s, url="https://example.com/d", outlet="ap", now=now)
        s.flush()
        assert get_latest_version(s, a.id) is None


def test_get_latest_version_returns_most_recent(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a = upsert_article(s, url="https://example.com/e", outlet="ap", now=now)
        s.flush()
        s.add_all([
            Version(article_id=a.id, scraped_at=now, headline="h",
                    body_text="b1", content_hash="1"),
            Version(article_id=a.id, scraped_at=now + timedelta(hours=1),
                    headline="h", body_text="b2", content_hash="2"),
        ])
        s.flush()
        latest = get_latest_version(s, a.id)
        assert latest.body_text == "b2"


def test_list_articles_includes_change_count(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a = upsert_article(s, url="https://example.com/f", outlet="ap", now=now)
        s.flush()
        v1 = Version(article_id=a.id, scraped_at=now, headline="h",
                     body_text="b1", content_hash="1")
        v2 = Version(article_id=a.id, scraped_at=now + timedelta(hours=1),
                     headline="h", body_text="b2", content_hash="2")
        s.add_all([v1, v2])
        s.flush()
        s.add(Change(
            article_id=a.id, from_version_id=v1.id, to_version_id=v2.id,
            change_type="fact_change", severity=4, summary="x",
            classified_at=now + timedelta(hours=1, minutes=1),
        ))
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, min_severity=0)
        assert len(rows) == 1
        assert rows[0].change_count == 1
        assert rows[0].max_severity == 4
