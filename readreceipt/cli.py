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


def _do_purge_everything(engine, *, dry_run: bool) -> None:
    with session_scope(engine) as s:
        articles = s.execute(select(Article)).scalars().all()
        versions = s.execute(select(Version)).scalars().all()
        changes = s.execute(select(Change)).scalars().all()
        print(
            f"Will delete EVERYTHING: {len(articles)} article(s), "
            f"{len(versions)} version(s), {len(changes)} change(s). "
            f"Discovery will repopulate the article table on the next tick."
        )
        if dry_run:
            print("DRY RUN — no rows deleted.")
            return
        n_changes = s.execute(delete(Change)).rowcount
        n_versions = s.execute(delete(Version)).rowcount
        n_articles = s.execute(delete(Article)).rowcount
        print(
            f"Deleted: {n_articles} article(s), {n_versions} version(s), "
            f"{n_changes} change(s). Next 5-min tick will re-discover from RSS."
        )


def _do_reset_all_history(engine, *, dry_run: bool) -> None:
    with session_scope(engine) as s:
        n_articles = s.execute(select(Article)).scalars().all()
        n_versions = s.execute(select(Version)).scalars().all()
        n_changes = s.execute(select(Change)).scalars().all()
        print(
            f"Will reset history across all {len(n_articles)} article(s): "
            f"drop {len(n_versions)} version(s) and {len(n_changes)} "
            f"change(s). Article rows preserved."
        )
        if dry_run:
            print("DRY RUN — no rows deleted.")
            return
        deleted_changes = s.execute(delete(Change)).rowcount
        deleted_versions = s.execute(delete(Version)).rowcount
        print(
            f"Cleared history: {deleted_changes} change(s), "
            f"{deleted_versions} version(s). Articles preserved; next tick "
            f"will capture a fresh first version for every tracked article."
        )


def _do_purge_polluted_history(engine, *, dry_run: bool) -> None:
    from readreceipt.scraper import detect_interstitial

    with session_scope(engine) as s:
        all_versions = s.execute(select(Version)).scalars().all()
        bad_article_ids: set[int] = set()
        sample_markers: dict[int, str] = {}
        for v in all_versions:
            marker = detect_interstitial(v.body_text)
            if marker:
                bad_article_ids.add(v.article_id)
                sample_markers.setdefault(v.article_id, marker)

        if not bad_article_ids:
            print("Found 0 articles with interstitial-pattern versions.")
            return

        ids = list(bad_article_ids)
        articles = (
            s.execute(select(Article).where(Article.id.in_(ids)))
            .scalars()
            .all()
        )
        print(
            f"Found {len(articles)} article(s) with at least one polluted "
            f"(interstitial) version:"
        )
        for a in articles:
            print(
                f"  - [{a.outlet}] matched={sample_markers.get(a.id)!r}  {a.url}"
            )

        if dry_run:
            print("DRY RUN — no rows deleted.")
            return

        n_changes = s.execute(
            delete(Change).where(Change.article_id.in_(ids))
        ).rowcount
        n_versions = s.execute(
            delete(Version).where(Version.article_id.in_(ids))
        ).rowcount
        print(
            f"Cleared history: {n_changes} change(s), "
            f"{n_versions} version(s). Articles preserved; next tick will "
            f"capture a fresh first version."
        )


def _do_reset_history_for_outlets(
    engine, *, outlets: list[str], dry_run: bool
) -> None:
    with session_scope(engine) as s:
        targets = (
            s.execute(select(Article).where(Article.outlet.in_(outlets)))
            .scalars()
            .all()
        )
        ids = [a.id for a in targets]
        print(
            f"Found {len(targets)} article(s) in outlet(s) {outlets}; "
            f"will reset their version + change history."
        )
        if dry_run:
            print("DRY RUN — no rows deleted.")
            return
        if not ids:
            return
        n_changes = s.execute(
            delete(Change).where(Change.article_id.in_(ids))
        ).rowcount
        n_versions = s.execute(
            delete(Version).where(Version.article_id.in_(ids))
        ).rowcount
        print(
            f"Cleared history: {n_changes} change(s), "
            f"{n_versions} version(s). Articles preserved; next tick will "
            f"capture a fresh first version with the cleaned scraper."
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
    parser.add_argument(
        "--reset-outlet-history",
        action="append",
        default=None,
        help="for the given outlet slug, drop its versions and changes (articles preserved); repeatable",
    )
    parser.add_argument(
        "--purge-polluted-history",
        action="store_true",
        help="reset history for any article that has a Version matching a bot-protection / paywall interstitial pattern",
    )
    parser.add_argument(
        "--reset-all-history",
        action="store_true",
        help="wipe ALL versions and changes across every article (article rows preserved)",
    )
    parser.add_argument(
        "--purge-everything",
        action="store_true",
        help="delete ALL articles, versions, and changes — discovery will repopulate from RSS on next tick",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)

    if args.purge_live_blogs:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_purge_live_blogs(engine, dry_run=args.dry_run)
        return

    if args.reset_outlet_history:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_reset_history_for_outlets(
            engine, outlets=args.reset_outlet_history, dry_run=args.dry_run
        )
        return

    if args.purge_polluted_history:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_purge_polluted_history(engine, dry_run=args.dry_run)
        return

    if args.reset_all_history:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_reset_all_history(engine, dry_run=args.dry_run)
        return

    if args.purge_everything:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_purge_everything(engine, dry_run=args.dry_run)
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
