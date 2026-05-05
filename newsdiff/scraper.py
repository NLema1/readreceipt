from dataclasses import dataclass
from typing import Optional

import httpx
import trafilatura
from bs4 import BeautifulSoup


@dataclass(frozen=True)
class ParsedArticle:
    headline: str
    body_text: str


def extract_headline(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        return og["content"].strip()
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    return ""


def parse_article(html: str) -> Optional[ParsedArticle]:
    body = trafilatura.extract(html, include_comments=False, include_tables=False)
    if not body or not body.strip():
        return None
    return ParsedArticle(
        headline=extract_headline(html),
        body_text=body.strip(),
    )


def fetch_url(url: str, *, timeout: float = 15.0) -> Optional[str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0.0.0 Safari/537.36"
        )
    }
    try:
        resp = httpx.get(url, headers=headers, timeout=timeout, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPError:
        return None
