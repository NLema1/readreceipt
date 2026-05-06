import re
from dataclasses import dataclass
from typing import Optional

import httpx
import trafilatura
from bs4 import BeautifulSoup


@dataclass(frozen=True)
class ParsedArticle:
    headline: str
    body_text: str


_BOILERPLATE_CLASS_RE = re.compile(
    r"(related|recommended|up-?next|playlist|trending|"
    r"more-?from|read-?more|you-?may-?also-?like|promo|newsletter|subscribe|"
    r"social-?share|share-?bar|social-icons|social-footer|"
    r"comments?-?section|tags?-?list|"
    r"^sidebar$|__sidebar\b|right-sidebar|left-sidebar|"
    r"primary-sidebar|secondary-sidebar|"
    r"menu-item|menu-toggle|menu-wrap|sub-menu|"
    r"\bwidget\b|^widget(__|--|_)|gnswidget|zergnet|"
    r"site-header|site-footer|"
    r"header-nav|header-footer|nav-header|"
    r"footer-nav|footer-legal|footer-more|"
    r"single__(header|footer|sidebar)|"
    r"content-header|article-header|article-footer|"
    r"section-subnav|"
    r"edition-selector|"
    r"universal-promo|"
    # BBC ssrcss-* CSS-in-JS semantic suffixes
    r"LinkHeadline|LinkAnchor|LinkItem|"
    r"MetadataStrip|Masthead|ProductNavigationContainer|"
    r"VisuallyHidden|LogoLink|LogoWrapper)",
    re.IGNORECASE,
)

_TRUNCATE_MARKERS = (
    "UP NEXT",
    "MORE FROM",
    "RELATED",
    "RELATED STORIES",
    "RELATED ARTICLES",
    "RELATED COVERAGE",
    "MORE COVERAGE",
    "YOU MAY ALSO LIKE",
    "RECOMMENDED FOR YOU",
    "SPONSORED CONTENT",
)


def strip_boilerplate(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["aside", "nav", "header", "footer"]):
        tag.decompose()
    for tag in soup.find_all(
        attrs={"role": ["complementary", "navigation", "banner", "search"]}
    ):
        tag.decompose()
    for tag in soup.find_all(class_=_BOILERPLATE_CLASS_RE):
        tag.decompose()
    for tag in soup.find_all(id=_BOILERPLATE_CLASS_RE):
        tag.decompose()
    return str(soup)


def trim_after_markers(text: str) -> str:
    lines = text.split("\n")
    keep: list[str] = []
    for line in lines:
        stripped_upper = line.strip().upper()
        if stripped_upper and any(
            stripped_upper == m or stripped_upper.startswith(m + ":")
            for m in _TRUNCATE_MARKERS
        ):
            break
        keep.append(line)
    return "\n".join(keep).rstrip()


def extract_headline(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        return og["content"].strip()
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    return ""


def parse_article(html: str) -> Optional[ParsedArticle]:
    cleaned_html = strip_boilerplate(html)
    body = trafilatura.extract(cleaned_html, include_comments=False, include_tables=False)
    if not body or not body.strip():
        return None
    body = trim_after_markers(body.strip())
    if not body:
        return None
    return ParsedArticle(
        headline=extract_headline(html),
        body_text=body,
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
