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


def test_list_articles_change_count_zero_when_no_changes(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        upsert_article(s, url="https://example.com/no-changes", outlet="guardian", now=now)
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, min_severity=0)
        assert len(rows) == 1
        assert rows[0].change_count == 0
        assert rows[0].max_severity == 0


def test_list_articles_min_severity_filter(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a_low = upsert_article(s, url="https://example.com/low", outlet="ap", now=now)
        a_high = upsert_article(s, url="https://example.com/high", outlet="ap", now=now)
        s.flush()
        v_low_1 = Version(article_id=a_low.id, scraped_at=now, headline="h",
                          body_text="b1", content_hash="1")
        v_low_2 = Version(article_id=a_low.id, scraped_at=now + timedelta(hours=1),
                          headline="h", body_text="b2", content_hash="2")
        v_high_1 = Version(article_id=a_high.id, scraped_at=now, headline="h",
                           body_text="b1", content_hash="3")
        v_high_2 = Version(article_id=a_high.id, scraped_at=now + timedelta(hours=1),
                           headline="h", body_text="b2", content_hash="4")
        s.add_all([v_low_1, v_low_2, v_high_1, v_high_2])
        s.flush()
        s.add_all([
            Change(article_id=a_low.id, from_version_id=v_low_1.id,
                   to_version_id=v_low_2.id, change_type="addition", severity=2,
                   summary="x", classified_at=now + timedelta(hours=1)),
            Change(article_id=a_high.id, from_version_id=v_high_1.id,
                   to_version_id=v_high_2.id, change_type="fact_change", severity=5,
                   summary="x", classified_at=now + timedelta(hours=1)),
        ])
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, min_severity=4)
        assert len(rows) == 1
        assert rows[0].article.url == "https://example.com/high"


def test_list_articles_outlet_filter(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        upsert_article(s, url="https://example.com/g", outlet="guardian", now=now)
        upsert_article(s, url="https://example.com/a", outlet="ap", now=now)
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, outlet="ap")
        assert len(rows) == 1
        assert rows[0].article.outlet == "ap"


def test_list_articles_ordered_by_most_recent_change_with_nullslast(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a_old = upsert_article(s, url="https://example.com/old", outlet="ap", now=now)
        a_recent = upsert_article(s, url="https://example.com/recent", outlet="ap", now=now)
        a_no_changes = upsert_article(s, url="https://example.com/none", outlet="ap", now=now)
        s.flush()
        v_old_1 = Version(article_id=a_old.id, scraped_at=now, headline="h",
                          body_text="b1", content_hash="1")
        v_old_2 = Version(article_id=a_old.id, scraped_at=now + timedelta(hours=1),
                          headline="h", body_text="b2", content_hash="2")
        v_rec_1 = Version(article_id=a_recent.id, scraped_at=now, headline="h",
                          body_text="b1", content_hash="3")
        v_rec_2 = Version(article_id=a_recent.id, scraped_at=now + timedelta(hours=1),
                          headline="h", body_text="b2", content_hash="4")
        s.add_all([v_old_1, v_old_2, v_rec_1, v_rec_2])
        s.flush()
        s.add_all([
            Change(article_id=a_old.id, from_version_id=v_old_1.id,
                   to_version_id=v_old_2.id, change_type="addition", severity=3,
                   summary="x", classified_at=now - timedelta(days=1)),
            Change(article_id=a_recent.id, from_version_id=v_rec_1.id,
                   to_version_id=v_rec_2.id, change_type="addition", severity=3,
                   summary="x", classified_at=now),
        ])
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, min_severity=0)
        urls = [r.article.url for r in rows]
        assert urls[0] == "https://example.com/recent"
        assert urls[1] == "https://example.com/old"
        assert urls[2] == "https://example.com/none"


from newsdiff.storage import articles_due_for_rescrape


def test_articles_due_recent_uses_30min_threshold(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        recent = upsert_article(
            s, url="https://example.com/recent", outlet="guardian", now=now
        )
        recent.last_checked = now - timedelta(hours=1)
        s.flush()
    with session_scope(engine) as s:
        due = articles_due_for_rescrape(s, now=now)
        assert any(a.id == recent.id for a in due)


def test_articles_due_old_uses_2h_threshold(engine):
    now = datetime.now(timezone.utc)
    article_first_seen = now - timedelta(days=2)
    with session_scope(engine) as s:
        old = Article(
            url="https://example.com/old", outlet="guardian",
            first_seen=article_first_seen,
            last_checked=now - timedelta(minutes=45),
            tracking_until=article_first_seen + timedelta(days=7),
            current_headline="",
        )
        s.add(old)
        s.flush()
        old_id = old.id
    with session_scope(engine) as s:
        due = articles_due_for_rescrape(s, now=now)
        assert not any(a.id == old_id for a in due)


def test_articles_past_tracking_window_excluded(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        expired = Article(
            url="https://example.com/expired", outlet="ap",
            first_seen=now - timedelta(days=10),
            last_checked=now - timedelta(hours=10),
            tracking_until=now - timedelta(days=3),
            current_headline="",
        )
        s.add(expired)
        s.flush()
    with session_scope(engine) as s:
        due = articles_due_for_rescrape(s, now=now)
        assert not any(a.url.endswith("/expired") for a in due)


def test_list_articles_q_filter_matches_substring_case_insensitive(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a1 = upsert_article(s, url="https://example.com/p1", outlet="bbc", now=now)
        a1.current_headline = "Fed signals rate cut"
        a2 = upsert_article(s, url="https://example.com/p2", outlet="bbc", now=now)
        a2.current_headline = "Climate report released"
        s.flush()
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, q="fed")
        urls = [r.article.url for r in rows]
        assert urls == ["https://example.com/p1"]


def test_list_articles_url_filter_exact_match(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        upsert_article(s, url="https://example.com/exact", outlet="bbc", now=now)
        upsert_article(s, url="https://example.com/other", outlet="bbc", now=now)
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, url="https://example.com/exact")
        urls = [r.article.url for r in rows]
        assert urls == ["https://example.com/exact"]


def test_list_articles_url_filter_no_match_returns_empty(engine):
    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        upsert_article(s, url="https://example.com/a", outlet="bbc", now=now)
    with session_scope(engine) as s:
        rows = list_articles_with_change_stats(s, url="https://example.com/missing")
        assert rows == []
