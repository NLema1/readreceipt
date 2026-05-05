import argparse
import logging
import sys
from typing import Optional

import feedparser
from sqlalchemy import delete, select

from readreceipt import config
from readreceipt.discovery import FeedSpec, load_feeds
from readreceipt.storage import (
    Article,
    Change,
    Version,
    create_engine_and_tables,
    session_scope,
)
from readreceipt.url_utils import is_live_blog_url


def _fetch_feed_for_dry_run(url: str) -> list[str]:
    parsed = feedparser.parse(url)
    return [e.link for e in parsed.entries if hasattr(e, "link")]


def _do_dry_run(feeds: list[FeedSpec]) -> None:
    print("DRY RUN — no DB writes, no LLM calls")
    for spec in feeds:
        print(f"\n[{spec.outlet}] {spec.url}")
        try:
            urls = _fetch_feed_for_dry_run(spec.url)
        except Exception as exc:
            print(f"  fetch failed: {exc}")
            continue
        for url in urls:
            print(f"  • {url}")


def _do_purge_live_blogs(engine, *, dry_run: bool) -> None:
    with session_scope(engine) as s:
        all_articles = s.execute(select(Article)).scalars().all()
        targets = [a for a in all_articles if is_live_blog_url(a.url)]
        target_ids = [a.id for a in targets]

        print(f"Found {len(targets)} live-blog article(s):")
        for a in targets:
            print(f"  - [{a.outlet}] {a.url}")

        if dry_run:
            print("DRY RUN — no rows deleted.")
            return
        if not target_ids:
            return

        n_changes = s.execute(
            delete(Change).where(Change.article_id.in_(target_ids))
        ).rowcount
        n_versions = s.execute(
            delete(Version).where(Version.article_id.in_(target_ids))
        ).rowcount
        n_articles = s.execute(
            delete(Article).where(Article.id.in_(target_ids))
        ).rowcount
        print(
            f"Deleted {n_articles} article(s), "
            f"{n_versions} version(s), {n_changes} change(s)."
        )


def main(argv: Optional[list[str]] = None) -> None:
    parser = argparse.ArgumentParser(prog="readreceipt")
    parser.add_argument("--dry-run", action="store_true", help="discover only, no DB or LLM (or preview --purge-live-blogs without deleting)")
    parser.add_argument("--feeds", default="feeds.yaml")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument(
        "--purge-live-blogs",
        action="store_true",
        help="delete tracked articles whose URL matches /live/, /live-updates/, or /live-blog/",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)

    if args.purge_live_blogs:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_purge_live_blogs(engine, dry_run=args.dry_run)
        return

    feeds = load_feeds(args.feeds)

    if args.dry_run:
        _do_dry_run(feeds)
        return

    cfg = config.load()
    print(f"Database URL: {cfg.database_url}")
    print(f"Environment:  {cfg.environment}")
    print(f"Loaded {len(feeds)} feeds.")
    print("Use the FastAPI server (uvicorn readreceipt.main:app) to run the full pipeline.")


if __name__ == "__main__":
    main(sys.argv[1:])
