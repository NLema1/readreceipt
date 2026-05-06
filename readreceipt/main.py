import logging
import os

from anthropic import Anthropic
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from readreceipt import config
from readreceipt.api import build_app
from readreceipt.classifier import classify_change
from readreceipt.discovery import load_feeds
from readreceipt.pipeline import scrape_one_article
from readreceipt.scheduler import start_scheduler
from readreceipt.scraper import fetch_url, parse_article
from readreceipt.storage import create_engine_and_tables


logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


cfg = config.load()
engine = create_engine_and_tables(cfg.database_url)
app: FastAPI = build_app(engine=engine)


_scheduler = None


def _make_scrape_one():
    if not cfg.anthropic_api_key:
        log.warning("ANTHROPIC_API_KEY not set — classifier calls will fail.")
        client = None
    else:
        client = Anthropic(api_key=cfg.anthropic_api_key)

    def _classifier(*, old_headline, old_body, new_headline, new_body):
        if client is None:
            from readreceipt.classifier import ClassifierError
            raise ClassifierError("no API key configured")
        return classify_change(
            client=client,
            old_headline=old_headline, old_body=old_body,
            new_headline=new_headline, new_body=new_body,
        )

    def _scrape_one(article_id: int):
        return scrape_one_article(
            engine=engine, article_id=article_id,
            fetch=fetch_url, parse=parse_article, classifier=_classifier,
        )

    return _scrape_one


@app.on_event("startup")
def _on_startup():
    global _scheduler
    feeds = load_feeds("feeds.yaml")
    scrape_one = _make_scrape_one()
    _scheduler = start_scheduler(engine=engine, feeds=feeds, scrape_one=scrape_one)
    log.info("scheduler started with %d feeds", len(feeds))


@app.on_event("shutdown")
def _on_shutdown():
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)


_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")
