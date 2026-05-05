from readreceipt.url_utils import canonicalize_url


def test_strips_query_string():
    url = "https://example.com/article?utm_source=twitter&ref=feed"
    assert canonicalize_url(url) == "https://example.com/article"


def test_strips_fragment():
    url = "https://example.com/article#section-2"
    assert canonicalize_url(url) == "https://example.com/article"


def test_lowercases_scheme_and_host():
    url = "HTTPS://Example.COM/Article"
    assert canonicalize_url(url) == "https://example.com/Article"


def test_strips_trailing_slash_on_path():
    url = "https://example.com/article/"
    assert canonicalize_url(url) == "https://example.com/article"


def test_keeps_root_slash():
    url = "https://example.com/"
    assert canonicalize_url(url) == "https://example.com/"


def test_strips_query_and_fragment_together():
    url = "https://example.com/a/b?x=1#y"
    assert canonicalize_url(url) == "https://example.com/a/b"
