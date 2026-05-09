import logging
import os

from anthropic import Anthropic
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

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


def _maybe_run_boot_cleanup():
    """Run a one-shot maintenance command at boot if RUN_CLEANUP_ON_BOOT is set.

    Lets you trigger CLI cleanups from a Railway env var instead of needing
    the Railway CLI + a public DB URL on a laptop. Set the env var, redeploy,
    watch the logs, then unset and redeploy again.

    Supported values:
      - "purge_non_articles"           — drop video/audio/podcast/weather URLs
      - "purge_live_blogs"             — drop /live/ /live-updates/ /live-blog/
      - "purge_outlet:sky"             — drop one outlet (comma-separated for many)
      - "reset_outlet_history:nypost"  — wipe versions+changes for an outlet,
                                         keeping article rows so the next poll
                                         re-snapshots them with current scraper
    """
    raw = os.environ.get("RUN_CLEANUP_ON_BOOT", "").strip()
    if not raw:
        return
    log.warning("RUN_CLEANUP_ON_BOOT=%r — running cleanup before serving", raw)
    log.warning("⚠️  REMEMBER to unset RUN_CLEANUP_ON_BOOT after this deploy "
                "or it will run again on every restart.")
    try:
        from readreceipt.cli import (
            _do_purge_non_articles,
            _do_purge_live_blogs,
            _do_purge_outlets,
            _do_reset_history_for_outlets,
        )
        if raw == "purge_non_articles":
            _do_purge_non_articles(engine, dry_run=False)
        elif raw == "purge_live_blogs":
            _do_purge_live_blogs(engine, dry_run=False)
        elif raw.startswith("purge_outlet:"):
            outlets = [o.strip() for o in raw.split(":", 1)[1].split(",") if o.strip()]
            _do_purge_outlets(engine, outlets, dry_run=False)
        elif raw.startswith("reset_outlet_history:"):
            outlets = [o.strip() for o in raw.split(":", 1)[1].split(",") if o.strip()]
            _do_reset_history_for_outlets(engine, outlets=outlets, dry_run=False)
        else:
            log.error("RUN_CLEANUP_ON_BOOT=%r: unknown command, skipping", raw)
            return
        log.warning("✅ Cleanup %r complete — UNSET the env var now.", raw)
    except Exception:
        log.exception("Cleanup %r failed", raw)


@app.on_event("startup")
def _on_startup():
    global _scheduler
    # Run any boot-triggered cleanup BEFORE the scheduler starts touching rows.
    _maybe_run_boot_cleanup()
    feeds = load_feeds("feeds.yaml")
    scrape_one = _make_scrape_one()
    _scheduler = start_scheduler(engine=engine, feeds=feeds, scrape_one=scrape_one)
    log.info("scheduler started with %d feeds", len(feeds))


@app.on_event("shutdown")
def _on_shutdown():
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)


class SPAStaticFiles(StaticFiles):
    """StaticFiles that falls back to index.html for unknown paths so the
    React Router can handle direct URL hits (/feed, /article/123, etc.)."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    app.mount("/", SPAStaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")
