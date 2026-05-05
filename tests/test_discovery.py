from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from newsdiff.discovery import FeedEntry, FeedSpec, discover_new_articles, load_feeds
from newsdiff.storage import Article, create_engine_and_tables, session_scope


@pytest.fixture
def engine():
    return create_engine_and_tables("sqlite:///:memory:")


def test_load_feeds_parses_yaml(tmp_path):
    p = tmp_path / "feeds.yaml"
    p.write_text(
        "- outlet: guardian\n"
        "  url: https://www.theguardian.com/us-news/rss\n"
        "- outlet: ap\n"
        "  url: https://feeds.apnews.com/rss/topnews\n"
    )
    feeds = load_feeds(str(p))
    assert len(feeds) == 2
    assert feeds[0] == FeedSpec(outlet="guardian", url="https://www.theguardian.com/us-news/rss")


def test_discover_inserts_new_articles(engine):
    feeds = [FeedSpec(outlet="guardian", url="https://feed/1")]
    fake_entries = [
        FeedEntry(url="https://www.theguardian.com/x?utm=rss", outlet="guardian"),
        FeedEntry(url="https://www.theguardian.com/y", outlet="guardian"),
    ]

    with patch("newsdiff.discovery._fetch_feed", return_value=fake_entries):
        new_ids = discover_new_articles(engine, feeds)

    assert len(new_ids) == 2
    with session_scope(engine) as s:
        articles = s.query(Article).order_by(Article.url).all()
        assert articles[0].url == "https://www.theguardian.com/x"
        assert articles[1].url == "https://www.theguardian.com/y"


def test_discover_skips_existing_articles(engine):
    feeds = [FeedSpec(outlet="guardian", url="https://feed/1")]
    fake_entries = [FeedEntry(url="https://www.theguardian.com/x", outlet="guardian")]

    with patch("newsdiff.discovery._fetch_feed", return_value=fake_entries):
        first = discover_new_articles(engine, feeds)
        second = discover_new_articles(engine, feeds)

    assert len(first) == 1
    assert len(second) == 0


def test_discover_swallows_feed_failure(engine):
    feeds = [FeedSpec(outlet="guardian", url="https://broken")]

    with patch("newsdiff.discovery._fetch_feed", side_effect=Exception("boom")):
        new_ids = discover_new_articles(engine, feeds)

    assert new_ids == []
