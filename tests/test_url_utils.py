from readreceipt.url_utils import canonicalize_url, is_live_blog_url


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


def test_is_live_blog_matches_live_segment():
    assert is_live_blog_url("https://www.theguardian.com/world/live/2026/may/05/news")


def test_is_live_blog_matches_live_updates_segment():
    assert is_live_blog_url("https://example.com/news/live-updates/foo")


def test_is_live_blog_matches_live_blog_segment():
    assert is_live_blog_url("https://example.com/news/live-blog/foo")


def test_is_live_blog_case_insensitive():
    assert is_live_blog_url("https://example.com/News/LIVE/foo")


def test_is_live_blog_rejects_normal_article():
    assert not is_live_blog_url("https://example.com/news/some-article")


def test_is_live_blog_does_not_match_unrelated_words():
    assert not is_live_blog_url("https://example.com/health/olive-oil-study")
    assert not is_live_blog_url("https://example.com/world/alive-and-well")
