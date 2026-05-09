import logging
import re
from dataclasses import dataclass
from typing import Optional

import httpx
import trafilatura
from bs4 import BeautifulSoup


log = logging.getLogger(__name__)


@dataclass(frozen=True)
class ParsedArticle:
    headline: str
    body_text: str


# Bot-protection / interstitial / paywall pages that masquerade as article HTML.
# Detected only when body length is short (< INTERSTITIAL_MAX_BODY_CHARS), since
# real articles can quote any of these phrases as part of legitimate prose.
INTERSTITIAL_MAX_BODY_CHARS = 1500

_INTERSTITIAL_PATTERNS = (
    # Cloudflare bot protection
    re.compile(r"client\s+challenge", re.IGNORECASE),
    re.compile(r"checking\s+your\s+browser", re.IGNORECASE),
    re.compile(r"DDoS\s+protection\s+by\s+Cloudflare", re.IGNORECASE),
    re.compile(r"\bray\s+id\b\s*[:#]", re.IGNORECASE),
    re.compile(r"cf-browser-verification", re.IGNORECASE),
    re.compile(r"cf_chl_jschl_tk", re.IGNORECASE),
    # Generic JS-required walls
    re.compile(r"javascript\s+is\s+disabled", re.IGNORECASE),
    re.compile(r"please\s+enable\s+javascript", re.IGNORECASE),
    re.compile(r"javascript\s+is\s+required", re.IGNORECASE),
    # CAPTCHA
    re.compile(r"are\s+you\s+human\??", re.IGNORECASE),
    re.compile(r"verify\s+you\s+are\s+(?:not\s+)?a\s+robot", re.IGNORECASE),
    re.compile(r"please\s+complete\s+the\s+captcha", re.IGNORECASE),
    # Access denied
    re.compile(r"\baccess\s+denied\b", re.IGNORECASE),
    re.compile(r"403\s+forbidden", re.IGNORECASE),
    re.compile(r"your\s+access\s+has\s+been\s+blocked", re.IGNORECASE),
    # Geographic blocks
    re.compile(r"not\s+available\s+in\s+your\s+region", re.IGNORECASE),
    re.compile(r"content\s+not\s+available\s+in\s+your\s+country", re.IGNORECASE),
    # Subscription / paywall walls
    re.compile(r"subscribe\s+to\s+continue", re.IGNORECASE),
    re.compile(r"sign\s+in\s+to\s+(?:read|continue)", re.IGNORECASE),
    re.compile(r"subscriber-?only\s+(article|content|story)", re.IGNORECASE),
)


def detect_interstitial(body: str) -> Optional[str]:
    """If `body` looks like a bot-protection / paywall / error interstitial,
    return the matched marker text. Otherwise return None.

    Pattern matching is gated by body length: real articles can quote any of
    these phrases mid-prose, but those articles are >> INTERSTITIAL_MAX_BODY_CHARS.
    A short body containing one of these markers is virtually never an article.
    """
    if len(body) >= INTERSTITIAL_MAX_BODY_CHARS:
        return None
    for pattern in _INTERSTITIAL_PATTERNS:
        m = pattern.search(body)
        if m:
            return m.group(0)
    return None


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
    # NY Post footer block — first line is always "Post News: Facebook, ...",
    # followed by California-edition signups, app/newsletter CTAs, etc.
    "POST NEWS",
    # WaPo / generic — sometimes appears at the foot
    "MOST READ",
)

# Lines matching these patterns are CMS-injected boilerplate (newsletter
# promos, app banners) that trafilatura sometimes pulls into the body.
_BOILERPLATE_LINE_PATTERNS = (
    re.compile(r"stay\s+up\s+to\s+date\s+with\s+(our\s+)?up\s+first", re.IGNORECASE),
    re.compile(r"sign\s+up\s+for\s+(our|the)\s+newsletter", re.IGNORECASE),
    re.compile(r"subscribe\s+to\s+(our|the)\s+newsletter", re.IGNORECASE),
    re.compile(r"newsletter\s+sent\s+every\s+(weekday|day|week)", re.IGNORECASE),
    re.compile(r"download\s+the\s+(?:\w+\s+){1,3}app\b", re.IGNORECASE),
    re.compile(r"follow\s+us\s+on\s+(facebook|twitter|instagram|tiktok)", re.IGNORECASE),
    # Generic CTA lines that show up under outlet footers:
    #   "California Post Newsletters: Sign up here!"  /  "Page Six App: Download here!"
    re.compile(r":\s*sign\s+up\s+here\b", re.IGNORECASE),
    re.compile(r":\s*download\s+here\b", re.IGNORECASE),
    # Social-platform list line: "<prefix>: Facebook, Instagram, TikTok, X, ..."
    # — three+ platform names on one line is a follow-us strip, not body text.
    re.compile(
        r"^[^:]{0,40}(?::|\s)\s*"
        r"(?:facebook|instagram|tiktok|youtube|whatsapp|linkedin|twitter|x)"
        r"(?:[,\s]+(?:facebook|instagram|tiktok|youtube|whatsapp|linkedin|twitter|x)){2,}",
        re.IGNORECASE,
    ),
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


def _is_chrome_line(line: str) -> bool:
    """True if this line looks like a related-story headline / link card / promo
    that trafilatura captured as if it were body content. Conservative: keeps
    legitimate single-word section labels (OPINION, ANALYSIS) and only flags
    multi-word ALL-CAPS lines short enough to be link headlines.
    """
    s = line.strip()
    if not s:
        return False
    # Exact boilerplate patterns (newsletter promos, app banners)
    for pattern in _BOILERPLATE_LINE_PATTERNS:
        if pattern.search(s):
            return True
    # ALL-CAPS short-multi-word line — almost always a related-story headline
    words = s.split()
    if 3 <= len(words) <= 15:
        letters = [c for c in s if c.isalpha()]
        if len(letters) >= 10:
            upper_letters = [c for c in letters if c.isupper()]
            if upper_letters and len(upper_letters) / len(letters) >= 0.85:
                return True
    return False


def filter_chrome_lines(text: str) -> str:
    return "\n".join(line for line in text.split("\n") if not _is_chrome_line(line))


# Lines that look like outlet section/footer labels (e.g. "California Post Opinion",
# "Page Six Hollywood") that trafilatura sometimes captures as trailing body
# content. We only strip these from the END of the body so we don't accidentally
# remove legitimate mid-article paragraphs that happen to start with these words.
_TRAILING_CHROME_PATTERNS = (
    re.compile(r"^california\s+post\b", re.IGNORECASE),
    re.compile(r"^page\s+six\b", re.IGNORECASE),
    re.compile(r"^home\s+delivery\b", re.IGNORECASE),
    re.compile(r"^post\s+news\b", re.IGNORECASE),
)


def trim_trailing_chrome(text: str) -> str:
    lines = text.split("\n")
    while lines:
        last = lines[-1].strip()
        if not last or any(p.match(last) for p in _TRAILING_CHROME_PATTERNS):
            lines.pop()
        else:
            break
    return "\n".join(lines)


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
    body = filter_chrome_lines(body).strip()
    body = trim_trailing_chrome(body).strip()
    if not body:
        return None
    marker = detect_interstitial(body)
    if marker:
        log.warning(
            "rejected interstitial scrape: matched=%r body_len=%d",
            marker,
            len(body),
        )
        return None
    return ParsedArticle(
        headline=extract_headline(html),
        body_text=body,
    )


def _fetchable_url(url: str) -> str:
    """Per-outlet URL rewrites for sites that block direct article fetches.

    The Hill's article URLs are 403'd by their bot wall, but their AMP
    variants render cleanly. We keep the canonical URL in the DB so the
    public link is still the normal article — only the scraper hits AMP.
    """
    if "thehill.com" in url:
        clean = url.rstrip("/")
        if not clean.endswith("/amp"):
            return clean + "/amp/"
    return url


def fetch_url(url: str, *, timeout: float = 15.0) -> Optional[str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0.0.0 Safari/537.36"
        )
    }
    fetch_url_ = _fetchable_url(url)
    try:
        resp = httpx.get(fetch_url_, headers=headers, timeout=timeout, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPStatusError as exc:
        log.warning("fetch %s failed: HTTP %s", fetch_url_, exc.response.status_code)
        return None
    except httpx.HTTPError as exc:
        log.warning("fetch %s failed: %s", fetch_url_, exc)
        return None
