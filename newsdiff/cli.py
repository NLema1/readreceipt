import argparse
import logging
import sys
from typing import Optional

import feedparser

from newsdiff import config
from newsdiff.discovery import FeedSpec, load_feeds


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


def main(argv: Optional[list[str]] = None) -> None:
    parser = argparse.ArgumentParser(prog="newsdiff")
    parser.add_argument("--dry-run", action="store_true", help="discover only, no DB or LLM")
    parser.add_argument("--feeds", default="feeds.yaml")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)

    feeds = load_feeds(args.feeds)

    if args.dry_run:
        _do_dry_run(feeds)
        return

    cfg = config.load()
    print(f"Database URL: {cfg.database_url}")
    print(f"Environment:  {cfg.environment}")
    print(f"Loaded {len(feeds)} feeds.")
    print("Use the FastAPI server (uvicorn newsdiff.main:app) to run the full pipeline.")


if __name__ == "__main__":
    main(sys.argv[1:])
