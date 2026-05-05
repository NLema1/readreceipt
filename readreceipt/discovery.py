import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import feedparser
import yaml

from readreceipt.storage import session_scope, upsert_article
from readreceipt.url_utils import canonicalize_url


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


def _fetch_feed(spec: FeedSpec) -> list[FeedEntry]:
    parsed = feedparser.parse(spec.url)
    return [
        FeedEntry(url=entry.link, outlet=spec.outlet)
        for entry in parsed.entries
        if hasattr(entry, "link") and entry.link
    ]


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
            with session_scope(engine) as s:
                from readreceipt.storage import get_article_by_url
                if get_article_by_url(s, canonical) is not None:
                    continue
                article = upsert_article(
                    s, url=canonical, outlet=entry.outlet, now=now
                )
                new_ids.append(article.id)
    return new_ids
