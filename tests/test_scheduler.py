from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from readreceipt.discovery import FeedSpec
from readreceipt.scheduler import run_tick
from readreceipt.storage import (
    Article,
    create_engine_and_tables,
    session_scope,
    upsert_article,
)


@pytest.fixture
def engine():
    return create_engine_and_tables("sqlite:///:memory:")


def test_tick_runs_discovery_then_rescrapes(engine):
    feeds = [FeedSpec(outlet="guardian", url="https://feed")]
    discover = MagicMock(return_value=[1])
    scrape_one = MagicMock(return_value="ok")

    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        a = upsert_article(s, url="https://example.com/a", outlet="guardian", now=now)
        a.last_checked = now - timedelta(hours=1)
        s.flush()
    with patch("readreceipt.scheduler.discover_new_articles", discover):
        run_tick(engine=engine, feeds=feeds, scrape_one=scrape_one)

    discover.assert_called_once_with(engine, feeds)
    assert scrape_one.call_count >= 1
