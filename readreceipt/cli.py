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
from readreceipt.url_utils import is_live_blog_url, should_skip_url


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
    _purge_by_predicate(engine, is_live_blog_url, label="live-blog", dry_run=dry_run)


def _do_purge_non_articles(engine, *, dry_run: bool) -> None:
    _purge_by_predicate(engine, should_skip_url, label="non-article", dry_run=dry_run)


def _do_purge_outlets(engine, outlets: list[str], *, dry_run: bool) -> None:
    """Delete all articles, versions, and changes for the named outlets."""
    with session_scope(engine) as s:
        targets = (
            s.execute(select(Article).where(Article.outlet.in_(outlets)))
            .scalars()
            .all()
        )
        target_ids = [a.id for a in targets]

        print(f"Found {len(targets)} article(s) across outlets {outlets}:")
        # Print a small sample so the user can sanity-check before deleting.
        for a in targets[:8]:
            print(f"  - [{a.outlet}] {a.url}")
        if len(targets) > 8:
            print(f"  ... and {len(targets) - 8} more")

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


def _purge_by_predicate(engine, predicate, *, label: str, dry_run: bool) -> None:
    """Delete articles matching a URL predicate. Operates in batches and
    flushes stdout aggressively so progress is visible in deploy logs even
    when the orchestrator buffers heavily."""
    import sys

    def announce(msg: str) -> None:
        print(msg, flush=True)

    with session_scope(engine) as s:
        all_articles = s.execute(select(Article)).scalars().all()
        targets = [a for a in all_articles if predicate(a.url)]
        target_ids = [a.id for a in targets]

        announce(f"Found {len(targets)} {label} article(s):")
        # Print first 25 + last 5 as a sample so the log doesn't drown.
        sample_head = targets[:25]
        sample_tail = targets[-5:] if len(targets) > 30 else []
        for a in sample_head:
            announce(f"  - [{a.outlet}] {a.url}")
        if sample_tail:
            announce(f"  ... ({len(targets) - len(sample_head) - len(sample_tail)} more) ...")
            for a in sample_tail:
                announce(f"  - [{a.outlet}] {a.url}")

        if dry_run:
            announce("DRY RUN — no rows deleted.")
            return
        if not target_ids:
            return

        # Delete in chunks so a single huge IN clause doesn't trip up Postgres
        # and so we get progress logging between chunks.
        BATCH = 100
        n_changes = n_versions = n_articles = 0
        try:
            for i in range(0, len(target_ids), BATCH):
                chunk = target_ids[i : i + BATCH]
                announce(f"  ... batch {i // BATCH + 1}: deleting {len(chunk)} article(s)")
                n_changes += s.execute(
                    delete(Change).where(Change.article_id.in_(chunk))
                ).rowcount or 0
                n_versions += s.execute(
                    delete(Version).where(Version.article_id.in_(chunk))
                ).rowcount or 0
                n_articles += s.execute(
                    delete(Article).where(Article.id.in_(chunk))
                ).rowcount or 0
                # Flush each batch so partial progress survives a crash.
                s.commit()
        except Exception as exc:
            announce(f"  ERROR mid-purge: {exc!r}")
            sys.stdout.flush()
            raise

        announce(
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
        "--purge-non-articles",
        action="store_true",
        help="delete tracked articles that aren't editorial — live blogs, BBC Sounds, podcasts, audio/video, weather, programme guides",
    )
    parser.add_argument(
        "--purge-outlet",
        action="append",
        default=None,
        metavar="OUTLET",
        help="delete every article (plus its versions and changes) for the given outlet slug; repeatable",
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

    if args.purge_non_articles:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_purge_non_articles(engine, dry_run=args.dry_run)
        return

    if args.purge_outlet:
        cfg = config.load()
        engine = create_engine_and_tables(cfg.database_url)
        _do_purge_outlets(engine, args.purge_outlet, dry_run=args.dry_run)
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
