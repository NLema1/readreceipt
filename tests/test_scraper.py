from readreceipt.scraper import extract_headline, parse_article


SAMPLE_HTML = """
<html><head>
<meta property="og:title" content="Fed signals rate cut">
<title>NYT - Fed signals rate cut</title>
</head><body>
<article>
<h1>Fed signals rate cut</h1>
<p>The Federal Reserve signaled on Wednesday that it would cut rates next month.</p>
<p>Markets responded positively to the news, with the S&amp;P 500 rising 1.2 percent.</p>
</article>
</body></html>
"""


def test_extract_headline_from_og_title():
    h = extract_headline(SAMPLE_HTML)
    assert h == "Fed signals rate cut"


def test_extract_headline_falls_back_to_title():
    html = "<html><head><title>Just a title</title></head><body></body></html>"
    h = extract_headline(html)
    assert h == "Just a title"


def test_extract_headline_returns_empty_when_missing():
    html = "<html><head></head><body></body></html>"
    h = extract_headline(html)
    assert h == ""


def test_parse_article_returns_headline_and_body():
    parsed = parse_article(SAMPLE_HTML)
    assert parsed.headline == "Fed signals rate cut"
    assert "Federal Reserve" in parsed.body_text
    assert "Markets responded" in parsed.body_text


def test_parse_article_returns_none_when_body_empty():
    html = "<html><head><meta property='og:title' content='X'></head><body></body></html>"
    parsed = parse_article(html)
    assert parsed is None


def test_parse_article_strips_aside_sidebar():
    html = """
    <html><head><meta property="og:title" content="Story"></head><body>
    <article>
      <h1>Story</h1>
      <p>The actual article body sentence one.</p>
      <p>The actual article body sentence two.</p>
    </article>
    <aside class="up-next">
      <h2>UP NEXT</h2>
      <ul><li>Sidebar Video Title One</li><li>Sidebar Video Title Two</li></ul>
    </aside>
    </body></html>
    """
    parsed = parse_article(html)
    assert "actual article body" in parsed.body_text
    assert "Sidebar Video Title" not in parsed.body_text


def test_parse_article_strips_class_marked_related():
    html = """
    <html><head><meta property="og:title" content="X"></head><body>
    <article>
      <p>Body paragraph that should remain in output.</p>
    </article>
    <div class="related-stories">
      <p>Promotional sidebar content that should disappear.</p>
    </div>
    </body></html>
    """
    parsed = parse_article(html)
    assert "Body paragraph" in parsed.body_text
    assert "Promotional sidebar" not in parsed.body_text


def test_parse_article_truncates_at_marker_in_extracted_text():
    html = """
    <html><head><meta property="og:title" content="X"></head><body>
    <article>
      <p>The first real paragraph of the article.</p>
      <p>The second real paragraph of the article.</p>
      <p>UP NEXT</p>
      <p>Sidebar Item One</p>
      <p>Sidebar Item Two</p>
    </article>
    </body></html>
    """
    parsed = parse_article(html)
    assert "first real paragraph" in parsed.body_text
    assert "second real paragraph" in parsed.body_text
    assert "Sidebar Item" not in parsed.body_text


def test_strip_boilerplate_keeps_legitimate_content():
    from readreceipt.scraper import strip_boilerplate
    html = "<html><body><article><p>Keep me</p></article></body></html>"
    out = strip_boilerplate(html)
    assert "Keep me" in out


def test_trim_after_markers_only_trims_at_line_boundary():
    from readreceipt.scraper import trim_after_markers
    text = (
        "The Fed signaled a change, and up next quarter the market may shift again.\n"
        "This sentence should survive because 'up next' is mid-sentence.\n"
        "UP NEXT\n"
        "Sidebar Item One"
    )
    out = trim_after_markers(text)
    assert "up next quarter the market may shift" in out
    assert "should survive" in out
    assert "Sidebar Item" not in out


import httpx
import pytest

from readreceipt.scraper import fetch_url


def test_fetch_url_returns_text_on_200(monkeypatch):
    def handler(request):
        return httpx.Response(200, text="<html>ok</html>")
    transport = httpx.MockTransport(handler)
    real_get = httpx.get

    def fake_get(url, **kwargs):
        kwargs["transport"] = transport
        with httpx.Client(transport=transport) as client:
            return client.get(url, **{k: v for k, v in kwargs.items() if k != "transport"})

    monkeypatch.setattr(httpx, "get", fake_get)
    assert fetch_url("https://example.com/x") == "<html>ok</html>"


def test_fetch_url_returns_none_on_5xx(monkeypatch):
    def handler(request):
        return httpx.Response(503)
    transport = httpx.MockTransport(handler)

    def fake_get(url, **kwargs):
        with httpx.Client(transport=transport) as client:
            return client.get(url, **{k: v for k, v in kwargs.items() if k != "transport"})

    monkeypatch.setattr(httpx, "get", fake_get)
    assert fetch_url("https://example.com/x") is None


def test_fetch_url_returns_none_on_timeout(monkeypatch):
    def handler(request):
        raise httpx.ConnectTimeout("simulated timeout")
    transport = httpx.MockTransport(handler)

    def fake_get(url, **kwargs):
        with httpx.Client(transport=transport) as client:
            return client.get(url, **{k: v for k, v in kwargs.items() if k != "transport"})

    monkeypatch.setattr(httpx, "get", fake_get)
    assert fetch_url("https://example.com/x") is None
