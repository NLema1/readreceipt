import logging
from datetime import datetime, timezone
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler

from readreceipt.discovery import FeedSpec, discover_new_articles
from readreceipt.storage import articles_due_for_rescrape, session_scope


log = logging.getLogger(__name__)


def run_tick(*, engine, feeds: list[FeedSpec], scrape_one: Callable[[int], object]) -> None:
    try:
        new_ids = discover_new_articles(engine, feeds)
    except Exception:
        log.exception("discovery failed")
        new_ids = []

    for article_id in new_ids:
        try:
            scrape_one(article_id)
        except Exception:
            log.exception("first scrape failed for article %s", article_id)

    with session_scope(engine) as s:
        due = articles_due_for_rescrape(s, now=datetime.now(timezone.utc))
        due_ids = [a.id for a in due]

    for article_id in due_ids:
        try:
            scrape_one(article_id)
        except Exception:
            log.exception("rescrape failed for article %s", article_id)


def start_scheduler(*, engine, feeds: list[FeedSpec], scrape_one: Callable[[int], object]) -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        lambda: run_tick(engine=engine, feeds=feeds, scrape_one=scrape_one),
        trigger="interval",
        minutes=5,
        id="readreceipt_tick",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    return scheduler
