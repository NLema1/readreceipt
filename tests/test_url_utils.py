from readreceipt.url_utils import (
    canonicalize_url,
    is_live_blog_url,
    is_promotional_url,
    should_skip_url,
)


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


def test_is_live_blog_matches_slug_embedded_live_updates():
    # The Hill folds the marker into the slug: /homenews/<id>-live-updates-<rest>.
    assert is_live_blog_url(
        "https://thehill.com/homenews/5871514-live-updates-trump-2"
    )


def test_is_live_blog_matches_slug_embedded_live_blog():
    assert is_live_blog_url(
        "https://example.com/news/123-live-blog-election-night"
    )


def test_is_live_blog_matches_liveblog_one_word():
    assert is_live_blog_url("https://example.com/world/liveblog/foo")


def test_is_live_blog_rejects_live_followed_by_unrelated_slug():
    # "live-music", "live-streaming" are not the live-blog marker.
    assert not is_live_blog_url("https://example.com/arts/live-music-festival")
    assert not is_live_blog_url("https://example.com/tech/123-live-streaming-tips")


def test_is_promotional_url_matches_usatoday_shopping_section():
    # The mattress deal example flagged by the audit.
    assert is_promotional_url(
        "https://www.usatoday.com/story/shopping/deals/memorial-day/2026/05/10/"
        "shop-best-memorial-day-mattress-sales-deals/90021206007"
    )


def test_is_promotional_url_matches_ticket_buying_listicles():
    assert is_promotional_url(
        "https://www.usatoday.com/story/shopping/sports/tickets/2026/05/07/"
        "buy-buffalo-sabres-vs-montreal-canadiens"
    )


def test_is_promotional_url_matches_home_services_affiliate():
    assert is_promotional_url(
        "https://www.usatoday.com/story/money/home-services/2026/05/07/daily-mattress-deals"
    )


def test_is_promotional_url_matches_generic_recommends_or_reviewed():
    assert is_promotional_url("https://example.com/recommends/best-headphones")
    assert is_promotional_url("https://example.com/reviewed/kitchen/blenders")
    assert is_promotional_url("https://example.com/coupons/may-2026")


def test_is_promotional_url_rejects_political_deal_news():
    # "deal" / "buy" / "gift" are loaded political-news words that must
    # not be caught by URL keywords alone. We URL-segment-match only.
    assert not is_promotional_url(
        "https://www.aljazeera.com/news/2026/5/8/as-us-and-iran-weigh-peace-deal-stranded"
    )
    assert not is_promotional_url(
        "https://thehill.com/policy/international/5865439-us-iran-nearing-deal-end-middle"
    )
    assert not is_promotional_url(
        "https://www.theguardian.com/us-news/2026/may/07/trump-walks-back-eu-trade-deal"
    )
    assert not is_promotional_url(
        "https://thehill.com/homenews/administration/5871796-buy-american-trump-push"
    )
    assert not is_promotional_url(
        "https://www.theguardian.com/politics/2026/may/08/nigel-farage-5m-gift-crypto"
    )


def test_should_skip_url_catches_promotional():
    assert should_skip_url(
        "https://www.usatoday.com/story/shopping/deals/memorial-day/mattress"
    )
    assert not should_skip_url(
        "https://www.usatoday.com/story/news/politics/2026/05/07/marco-rubio-gift-pope"
    )
