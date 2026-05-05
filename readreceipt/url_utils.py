from urllib.parse import urlparse, urlunparse


LIVE_BLOG_PATH_PATTERNS = ("/live/", "/live-updates/", "/live-blog/")


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
