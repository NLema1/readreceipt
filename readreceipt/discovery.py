import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone

import feedparser
import httpx
import yaml

from readreceipt.storage import session_scope, upsert_article
from readreceipt.url_utils import canonicalize_url, should_skip_url


log = logging.getLogger(__name__)


@dataclass(frozen=True)
class FeedSpec:
    outlet: str
    url: str


@dataclass(frozen=True)
class FeedEntry:
    url: str
    outlet: str


def load_feeds(path: str) -> list[FeedSpec]:
    with open(path) as f:
        data = yaml.safe_load(f) or []
    return [FeedSpec(outlet=item["outlet"], url=item["url"]) for item in data]


_SITEMAP_UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    )
}


def _fetch_feed(spec: FeedSpec) -> list[FeedEntry]:
    if "sitemap" in spec.url.lower():
        return _fetch_sitemap(spec)
    parsed = feedparser.parse(spec.url)
    return [
        FeedEntry(url=entry.link, outlet=spec.outlet)
        for entry in parsed.entries
        if hasattr(entry, "link") and entry.link
    ]


def _fetch_sitemap(spec: FeedSpec) -> list[FeedEntry]:
    """Discover article URLs from a Google-news-style XML sitemap. Used for
    outlets that have killed their RSS feeds (USA Today)."""
    resp = httpx.get(spec.url, headers=_SITEMAP_UA, timeout=15.0, follow_redirects=True)
    resp.raise_for_status()
    urls = [m.strip() for m in re.findall(r"<loc>([^<]+)</loc>", resp.text)]
    return [FeedEntry(url=u, outlet=spec.outlet) for u in urls if u]


def discover_new_articles(engine, feeds: list[FeedSpec]) -> list[int]:
    new_ids: list[int] = []
    now = datetime.now(timezone.utc)
    for spec in feeds:
        try:
            entries = _fetch_feed(spec)
        except Exception:
            log.exception("feed fetch failed for %s", spec.url)
            continue

        for entry in entries:
            canonical = canonicalize_url(entry.url)
            if should_skip_url(canonical):
                log.info("skipping non-article URL: %s", canonical)
                continue
            with session_scope(engine) as s:
                from readreceipt.storage import get_article_by_url
                if get_article_by_url(s, canonical) is not None:
                    continue
                article = upsert_article(
                    s, url=canonical, outlet=entry.outlet, now=now
                )
                new_ids.append(article.id)
    return new_ids
