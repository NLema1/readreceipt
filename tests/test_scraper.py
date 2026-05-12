from readreceipt.scraper import (
    _is_chrome_line,
    detect_interstitial,
    extract_headline,
    filter_chrome_lines,
    parse_article,
)


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


def test_detect_interstitial_cloudflare_challenge():
    body = (
        "Client Challenge\n"
        "JavaScript is disabled in your browser.\n"
        "Please enable JavaScript to proceed.\n"
        "Ray ID: 8a1b2c3d4e5f6789"
    )
    assert detect_interstitial(body) is not None


def test_detect_interstitial_js_required_short_body():
    body = "Please enable JavaScript to view this content."
    assert detect_interstitial(body) is not None


def test_detect_interstitial_captcha():
    body = "Are you human? Verify you are not a robot to continue."
    assert detect_interstitial(body) is not None


def test_detect_interstitial_access_denied():
    body = "Access Denied\n403 Forbidden\nYour access has been blocked."
    assert detect_interstitial(body) is not None


def test_detect_interstitial_geographic_block():
    body = "This content is not available in your region."
    assert detect_interstitial(body) is not None


def test_detect_interstitial_subscription_wall():
    body = "Subscribe to continue reading. This is a subscriber-only article."
    assert detect_interstitial(body) is not None


def test_detect_interstitial_skips_long_real_article_quoting_pattern():
    # A real 5000-char article that happens to mention "JavaScript is disabled"
    # in prose should NOT be flagged.
    body = (
        "The browser maker said in a statement that JavaScript is disabled "
        "by default in private browsing mode for some users. "
    ) * 50
    assert len(body) > 1500
    assert detect_interstitial(body) is None


def test_detect_interstitial_clean_short_body_no_markers():
    body = "A short legitimate article about local news."
    assert detect_interstitial(body) is None


def test_chrome_line_flags_all_caps_related_headline():
    assert _is_chrome_line(
        "BROOKLYN ATTACK LEAVES 3 INJURED, SUSPECT WEARING IRANIAN FLAG SHIRT ARRESTED BY NYPD"
    )


def test_chrome_line_flags_short_all_caps_link_card():
    assert _is_chrome_line(
        "FOX NEWS CHANNEL OUTDRAWS ABC, NBC IN WEEKDAY PRIMETIME DURING APRIL"
    )


def test_chrome_line_flags_npr_newsletter_promo():
    assert _is_chrome_line(
        "Stay up to date with our Up First newsletter sent every weekday morning."
    )


def test_chrome_line_flags_app_download_promo():
    assert _is_chrome_line("Download the BBC News app to read more.")


def test_chrome_line_keeps_single_word_section_label():
    # Single-word ALL-CAPS labels are too common as legitimate section
    # markers (OPINION, ANALYSIS, BREAKING) to strip.
    assert not _is_chrome_line("OPINION")
    assert not _is_chrome_line("ANALYSIS")


def test_chrome_line_keeps_normal_prose():
    assert not _is_chrome_line(
        "DETROIT — Cade Cunningham scored 23 points and the Pistons "
        "ended an NBA record-tying 12-game postseason losing streak."
    )
    assert not _is_chrome_line(
        "The Federal Reserve signaled on Wednesday that it would cut rates."
    )


def test_chrome_line_keeps_quote_with_caps():
    # All-caps within a longer mixed-case line is fine.
    assert not _is_chrome_line(
        "She told reporters: 'NOT TODAY, AND NOT TOMORROW EITHER. NEVER.'"
    )


def test_chrome_line_flags_bare_advertisement_marker():
    # NY Post (and others) put the literal word "Advertisement" on its own
    # line where a banner ad sits. Trafilatura captures it and ad slot
    # rearrangement between scrapes creates fake "changes".
    assert _is_chrome_line("Advertisement")
    assert _is_chrome_line("ADVERTISEMENT")
    assert _is_chrome_line("advertisement")
    assert _is_chrome_line("Sponsored")
    assert _is_chrome_line("Sponsored Content")


def test_chrome_line_keeps_advertisement_in_prose():
    # The bare-marker rule only fires when "Advertisement" is the whole line.
    assert not _is_chrome_line(
        "Advertisement campaigns now make up a third of the company's revenue."
    )
    assert not _is_chrome_line(
        "The new policy bans tobacco advertisement in all sports broadcasts."
    )


def test_filter_chrome_lines_strips_ad_markers_only():
    body = (
        "Residents were furious about the project.\n"
        "Advertisement\n"
        "The county investigation found the data center was to blame.\n"
        "Advertisement\n"
        "QTS told The Post it paid all retroactive charges.\n"
    )
    out = filter_chrome_lines(body)
    assert "Advertisement" not in out
    assert "Residents were furious" in out
    assert "QTS told The Post" in out


def test_filter_chrome_lines_drops_only_chrome():
    text = (
        "The Federal Reserve signaled it would cut rates next month.\n"
        "BROOKLYN ATTACK LEAVES 3 INJURED, SUSPECT ARRESTED BY NYPD\n"
        "Markets responded positively to the news.\n"
        "Stay up to date with our Up First newsletter sent every weekday morning.\n"
        "More analysis is expected later this week."
    )
    out = filter_chrome_lines(text)
    assert "Federal Reserve" in out
    assert "Markets responded" in out
    assert "More analysis" in out
    assert "BROOKLYN ATTACK" not in out
    assert "Up First newsletter" not in out


def test_parse_article_rejects_cloudflare_page():
    html = """
    <html><head>
    <meta property="og:title" content="Just a moment...">
    <title>Just a moment...</title>
    </head><body>
    <article>
    <h1>Client Challenge</h1>
    <p>JavaScript is disabled in your browser.</p>
    <p>Please enable JavaScript to proceed.</p>
    <p>Ray ID: abc123</p>
    </article>
    </body></html>
    """
    parsed = parse_article(html)
    assert parsed is None


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
