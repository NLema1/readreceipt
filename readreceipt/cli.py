"""CLI maintenance commands.

A note on deletion order: `evaluations.change_id` has a NOT NULL FK to
`changes.id` with no ON DELETE CASCADE, so every path that deletes Change
rows must first clear the matching Evaluation rows. The helpers below do
this — call them instead of issuing raw deletes.
"""
import argparse
import logging
import sys
from typing import Optional

import feedparser
from sqlalchemy import delete, func, select

from readreceipt import config
from readreceipt.discovery import FeedSpec, load_feeds
from readreceipt.storage import (
    Article,
    Change,
    Evaluation,
    Version,
    create_engine_and_tables,
    session_scope,
)
from readreceipt.url_utils import is_live_blog_url, should_skip_url


# Batched IN-clause size for chunked deletes: small enough to stay well
# under Postgres parameter limits and to surface progress in deploy logs
# between commits.
_PURGE_BATCH_SIZE = 100


def _log(msg: str) -> None:
    """Print and flush — Railway buffers stdout, so long-running loops
    need this for progress to show up in deploy logs in real time."""
    print(msg, flush=True)


def _delete_history_for_articles(s, article_ids):
    """Delete evaluations + changes + versions for the given article ids,
    leaving Article rows intact. Returns {evals, changes, versions} counts."""
    if not article_ids:
        return {"evals": 0, "changes": 0, "versions": 0}
    change_filter = Change.article_id.in_(article_ids)
    n_evals = s.execute(
        delete(Evaluation).where(
            Evaluation.change_id.in_(
                select(Change.id).where(change_filter).scalar_subquery()
            )
        )
    ).rowcount or 0
    n_changes = s.execute(delete(Change).where(change_filter)).rowcount or 0
    n_versions = s.execute(
        delete(Version).where(Version.article_id.in_(article_ids))
    ).rowcount or 0
    return {"evals": n_evals, "changes": n_changes, "versions": n_versions}


def _delete_articles_cascade(s, article_ids):
    """Delete articles and all their history. Returns counts dict."""
    if not article_ids:
        return {"evals": 0, "changes": 0, "versions": 0, "articles": 0}
    counts = _delete_history_for_articles(s, article_ids)
    counts["articles"] = s.execute(
        delete(Article).where(Article.id.in_(article_ids))
    ).rowcount or 0
    return counts


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
        for a in targets[:8]:
            print(f"  - [{a.outlet}] {a.url}")
        if len(targets) > 8:
            print(f"  ... and {len(targets) - 8} more")

        if dry_run:
            print("DRY RUN — no rows deleted.")
            return
        if not target_ids:
            return

        c = _delete_articles_cascade(s, target_ids)
        print(
            f"Deleted {c['articles']} article(s), {c['versions']} version(s), "
            f"{c['changes']} change(s), {c['evals']} evaluation(s)."
        )


def _purge_by_predicate(engine, predicate, *, label: str, dry_run: bool) -> None:
    """Delete articles matching a URL predicate, in batches so a single
    huge IN clause doesn't trip Postgres and so progress is visible."""
    with session_scope(engine) as s:
        all_articles = s.execute(select(Article)).scalars().all()
        targets = [a for a in all_articles if predicate(a.url)]
        target_ids = [a.id for a in targets]

        _log(f"Found {len(targets)} {label} article(s):")
        sample_head = targets[:25]
        sample_tail = targets[-5:] if len(targets) > 30 else []
        for a in sample_head:
            _log(f"  - [{a.outlet}] {a.url}")
        if sample_tail:
            _log(f"  ... ({len(targets) - len(sample_head) - len(sample_tail)} more) ...")
            for a in sample_tail:
                _log(f"  - [{a.outlet}] {a.url}")

        if dry_run:
            _log("DRY RUN — no rows deleted.")
            return
        if not target_ids:
            return

        totals = {"evals": 0, "changes": 0, "versions": 0, "articles": 0}
        try:
            for i in range(0, len(target_ids), _PURGE_BATCH_SIZE):
                chunk = target_ids[i : i + _PURGE_BATCH_SIZE]
                _log(f"  ... batch {i // _PURGE_BATCH_SIZE + 1}: deleting {len(chunk)} article(s)")
                c = _delete_articles_cascade(s, chunk)
                for k in totals:
                    totals[k] += c[k]
                # Commit each batch so partial progress survives a crash.
                s.commit()
        except Exception as exc:
            _log(f"  ERROR mid-purge: {exc!r}")
            raise

        _log(
            f"Deleted {totals['articles']} article(s), {totals['versions']} version(s), "
            f"{totals['changes']} change(s), {totals['evals']} evaluation(s)."
        )


def _do_purge_everything(engine, *, dry_run: bool) -> None:
    with session_scope(engine) as s:
        if dry_run:
            n_articles = s.execute(select(func.count()).select_from(Article)).scalar() or 0
            print(
                f"Will delete EVERYTHING: {n_articles} article(s). "
                f"Discovery will repopulate the article table on the next tick."
            )
            print("DRY RUN — no rows deleted.")
            return
        n_evals = s.execute(delete(Evaluation)).rowcount or 0
        n_changes = s.execute(delete(Change)).rowcount or 0
        n_versions = s.execute(delete(Version)).rowcount or 0
        n_articles = s.execute(delete(Article)).rowcount or 0
        print(
            f"Deleted: {n_articles} article(s), {n_versions} version(s), "
            f"{n_changes} change(s), {n_evals} evaluation(s). "
            f"Next 5-min tick will re-discover from RSS."
        )


def _do_reset_all_history(engine, *, dry_run: bool) -> None:
    with session_scope(engine) as s:
        if dry_run:
            n_articles = s.execute(select(func.count()).select_from(Article)).scalar() or 0
            print(
                f"Will reset history across all {n_articles} article(s); "
                f"article rows preserved."
            )
            print("DRY RUN — no rows deleted.")
            return
        n_evals = s.execute(delete(Evaluation)).rowcount or 0
        n_changes = s.execute(delete(Change)).rowcount or 0
        n_versions = s.execute(delete(Version)).rowcount or 0
        print(
            f"Cleared history: {n_changes} change(s), "
            f"{n_versions} version(s), {n_evals} evaluation(s). "
            f"Articles preserved; next tick will capture a fresh first "
            f"version for every tracked article."
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
            print(f"  - [{a.outlet}] matched={sample_markers.get(a.id)!r}  {a.url}")

        if dry_run:
            print("DRY RUN — no rows deleted.")
            return

        c = _delete_history_for_articles(s, ids)
        print(
            f"Cleared history: {c['changes']} change(s), "
            f"{c['versions']} version(s), {c['evals']} evaluation(s). "
            f"Articles preserved; next tick will capture a fresh first version."
        )


def _do_report_outlet_state(engine, outlets: list[str]) -> None:
    """Read-only audit: per-outlet counts and zombie-state diagnostics.

    Intended for RUN_CLEANUP_ON_BOOT so we can inspect outlets that are
    EXCLUDED_PUBLIC_OUTLETS (and therefore invisible to the public API).
    """
    from datetime import datetime, timezone

    def _aware(dt):
        return dt if dt and dt.tzinfo else (dt.replace(tzinfo=timezone.utc) if dt else None)

    now = datetime.now(timezone.utc)
    with session_scope(engine) as s:
        for outlet in outlets:
            article_id_subq = select(Article.id).where(Article.outlet == outlet).scalar_subquery()

            n_articles = s.execute(
                select(func.count(Article.id)).where(Article.outlet == outlet)
            ).scalar() or 0
            n_versions = s.execute(
                select(func.count(Version.id)).where(Version.article_id.in_(article_id_subq))
            ).scalar() or 0
            n_changes = s.execute(
                select(func.count(Change.id)).where(Change.article_id.in_(article_id_subq))
            ).scalar() or 0
            n_evals = s.execute(
                select(func.count(Evaluation.id)).where(
                    Evaluation.change_id.in_(
                        select(Change.id)
                        .where(Change.article_id.in_(article_id_subq))
                        .scalar_subquery()
                    )
                )
            ).scalar() or 0

            rows = list(s.execute(
                select(Article.first_seen, Article.last_checked, Article.tracking_until)
                .where(Article.outlet == outlet)
            ).all())
            if rows:
                newest_first_seen = max(_aware(r[0]) for r in rows)
                newest_last_checked = max(_aware(r[1]) for r in rows)
                past_tracking = sum(1 for r in rows if _aware(r[2]) <= now)
                zombie_polls = sum(1 for r in rows if _aware(r[1]) > _aware(r[2]))
            else:
                newest_first_seen = newest_last_checked = None
                past_tracking = zombie_polls = 0

            print(f"=== outlet={outlet!r} ===", flush=True)
            print(f"  articles:            {n_articles}", flush=True)
            print(f"  versions:            {n_versions}", flush=True)
            print(f"  changes:             {n_changes}", flush=True)
            print(f"  evaluations:         {n_evals}", flush=True)
            print(f"  newest first_seen:   {newest_first_seen}", flush=True)
            print(f"  newest last_checked: {newest_last_checked}", flush=True)
            print(f"  past tracking_until: {past_tracking} (tracking window expired)", flush=True)
            print(f"  zombie polls (bug):  {zombie_polls} (last_checked > tracking_until — should be 0)", flush=True)
            print("", flush=True)

        orphan_versions = s.execute(
            select(func.count(Version.id)).where(
                ~Version.article_id.in_(select(Article.id))
            )
        ).scalar() or 0
        orphan_changes = s.execute(
            select(func.count(Change.id)).where(
                ~Change.article_id.in_(select(Article.id))
            )
        ).scalar() or 0
        print("=== repo-wide orphan check ===", flush=True)
        print(f"  orphan versions (no parent article): {orphan_versions}", flush=True)
        print(f"  orphan changes  (no parent article): {orphan_changes}", flush=True)


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
        c = _delete_history_for_articles(s, ids)
        print(
            f"Cleared history: {c['changes']} change(s), "
            f"{c['versions']} version(s), {c['evals']} evaluation(s). "
            f"Articles preserved; next tick will "
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
