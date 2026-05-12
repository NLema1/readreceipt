from urllib.parse import urlparse, urlunparse


LIVE_BLOG_PATH_PATTERNS = ("/live/", "/live-updates/", "/live-blog/")

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


def canonicalize_url(url: str) -> str:
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return urlunparse((scheme, netloc, path, "", "", ""))


def is_live_blog_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return any(pattern in path for pattern in LIVE_BLOG_PATH_PATTERNS)


def should_skip_url(url: str) -> bool:
    if is_live_blog_url(url):
        return True
    path = urlparse(url).path.lower()
    return any(pattern in path for pattern in NON_ARTICLE_PATH_PATTERNS)
