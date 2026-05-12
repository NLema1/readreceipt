import re
from urllib.parse import urlparse, urlunparse


# A URL is a live blog if its path contains either:
#   - a bare "/live/" segment (Guardian-style: /world/live/2026/...)
#   - "live-updates", "live-blog", or "liveblog" at a slug-word boundary
#     (after a `/` or `-`, ending at `-`, `/`, or end-of-path).
# The boundary check matters for outlets like The Hill that fold the marker
# into the slug — e.g. /homenews/5871514-live-updates-trump-2 — while still
# rejecting unrelated substrings like /olive-oil-study or /alive-and-well.
_LIVE_BLOG_RE = re.compile(
    r"(?:^|/)live/"
    r"|(?:^|[/-])(?:live-updates|live-blog|liveblog)(?=[-/]|$)",
    re.IGNORECASE,
)

# Paths that are not editorial articles — BBC Sounds, podcasts, video players,
# weather pages, TV programme guides. Discovery skips these and the cleanup
# CLI can purge any that snuck in earlier.
NON_ARTICLE_PATH_PATTERNS = (
    "/sounds/",
    "/audio/",
    "/podcast",     # matches /podcast/ and /podcasts/
    "/programmes/", # BBC TV programmes
    "/iplayer/",    # BBC iPlayer
    "/video/",
    "/videos/",
    "/weather/",
)

# Affiliate / promotional listicles and deals pages. These look like articles
# to a feed parser but are catalog content (rotating prices, swapped product
# blocks) — they generate constant noisy "edits" with no editorial meaning.
# URL-segment match only; we don't keyword-scan headlines because political
# words like "deal" / "buy" / "gift" collide too easily with real news.
PROMOTIONAL_PATH_PATTERNS = (
    "/story/shopping/",            # USA Today shopping/deals/tickets section
    "/story/money/home-services/", # USA Today home-services affiliate
    "/recommends/",                # generic Reviewed / recommends
    "/reviewed/",                  # generic outlet "Reviewed" verticals
    "/coupons/",
    "/promo-codes/",
)


def is_promotional_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return any(pattern in path for pattern in PROMOTIONAL_PATH_PATTERNS)


def canonicalize_url(url: str) -> str:
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return urlunparse((scheme, netloc, path, "", "", ""))


def is_live_blog_url(url: str) -> bool:
    return bool(_LIVE_BLOG_RE.search(urlparse(url).path))


def should_skip_url(url: str) -> bool:
    if is_live_blog_url(url):
        return True
    if is_promotional_url(url):
        return True
    path = urlparse(url).path.lower()
    return any(pattern in path for pattern in NON_ARTICLE_PATH_PATTERNS)
