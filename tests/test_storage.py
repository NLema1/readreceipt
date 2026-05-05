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
