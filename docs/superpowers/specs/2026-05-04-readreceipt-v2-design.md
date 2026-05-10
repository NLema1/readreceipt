# Readreceipt — Design

**Status:** Live in production at readreceipt.io.
**Original draft:** 2026-05-04 (as "ReadReceipt v1" / `newsdiff-v2`)
**Last updated:** 2026-05-10 — reflects current production state.

## Goal

Track changes to published news articles over time, classify each change with an LLM, and surface only meaningful edits (fact changes, quote walk-backs, headline reframes) — not typos or layout tweaks.

Real product, deployed publicly, iterated on based on use.

## Why

NewsDiffs (2012) captured diffs but drowned users in noise. LLMs now make automated significance-ranking cheap and viable, so we can show only the edits that matter. Readreceipt is the modern take on that idea, with an editorial-broadsheet UI instead of a developer-debug UI.

## Changelog since 2026-05-04

Everything below the changelog has been rewritten to reflect what's actually shipped.

| Area | What changed |
|---|---|
| **Outlets** | 11 outlets (Guardian, BBC, NPR, Al Jazeera, ProPublica, NBC, CBS, The Hill, USA Today, Fox, NY Post). Sky News removed (Akamai blocks all fetches); Sky's archived rows still in DB but no longer surfaced. |
| **Discovery** | Beyond RSS: also handles XML sitemaps (USA Today via `news-sitemap.xml`). URL filter rejects non-article paths (`/sounds/`, `/video/`, `/podcast/`, `/programmes/`, `/iplayer/`, `/weather/`, etc.) at the discovery step. |
| **Scraping** | `_fetchable_url()` per-outlet URL rewrites — The Hill is fetched via its `/amp/` variant to bypass the bot wall. NY Post footer cruft (social-follow strip, signup CTAs) stripped via `trim_after_markers` + `trim_trailing_chrome`. |
| **Data model** | Added `evaluations` table for the eval-pipeline output. Existing tables unchanged. |
| **API** | New `/api/stats` endpoint for server-side aggregates (counts + per-outlet + per-type sums) so the dashboard isn't capped by `/api/changes/recent`'s 500-row limit. |
| **Frontend** | Complete redesign to "Readreceipt 2.0" — Instrument Serif + Inter + JetBrains Mono on cream paper, multi-page React Router app (`/` Landing, `/feed` Feed, `/article/:id` Detail, `/search` Search, `/stats` Stats), global ⌘K palette, mobile bottom-tab layout. |
| **Backend SPA fallback** | `SPAStaticFiles` subclass returns `index.html` on 404 so direct URL hits to non-root client routes work. |
| **CLI** | Added `--purge-non-articles`, `--purge-outlet`, plus `RUN_CLEANUP_ON_BOOT` env-var trigger so management commands can be run from the Railway web UI without local CLI access. |
| **Theme** | Dark-mode-only is gone — the live site is light-mode-only (cream paper, ink text). |

## Scope (current)

- 11 outlets via RSS + sitemap (see Discovery section)
- Snapshot articles every 30 minutes for the first 24 hours after first publish, then every 2 hours through day 7
- Detect content changes, classify with Claude Haiku 4.5
- Five-page editorial-style web app (Landing, Feed, Article timeline, Search, Stats)
- Deployed to Railway with Postgres

## Non-Goals

- User accounts, authentication, personalization
- Email / push alerts
- Browser extension
- Image/video change tracking
- User-submitted feeds via UI
- Light/dark theme switching (light-on-cream only)

## Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.x
- **Database:** Postgres in production (Railway-provisioned), SQLite locally (`DATABASE_URL` swap)
- **Scraper:** `feedparser` (RSS) + `trafilatura` (article body extraction). XML-sitemap fallback for outlets without RSS. Headline pulled separately from `og:title`.
- **Diffing:** `difflib` (stdlib) for body; custom word-level LCS in `frontend/src/lib/format.js` for headline diffs
- **LLM:** Anthropic SDK, model `claude-haiku-4-5`, JSON mode, system-prompt caching
- **Scheduler:** APScheduler, in-process inside the FastAPI app
- **Frontend:** React 18 + Vite + Tailwind CSS + `react-router-dom`. Instrument Serif + Inter + JetBrains Mono from Google Fonts.
- **Deploy:** Railway. Frontend built at image build time and served as static files by FastAPI.

## Architecture Overview

Single Python web service. APScheduler runs inside the same process as the FastAPI app on a 5-minute tick. Each tick performs feed discovery (RSS or sitemap) and re-scrapes due articles. Frontend is a separate Vite build, copied into the backend image and served from `/` via a SPA-aware static-files mount.

```
RSS feeds  ──┐
             ├──►  scheduler tick (5 min)  ──►  scrape → diff → pre-filter → classifier → DB
sitemaps   ──┘                                                                            │
                                                                                          ▼
                                                                                    Postgres
                                                                                          │
              ┌───────────────────── HTTP ───────────────────────────────────────────────┘
              ▼
         FastAPI  ──►  React SPA (/ /feed /article/:id /search /stats, polling every 30s)
```

### Single-instance assumption

APScheduler in-process means the deployment is single-instance. If we ever scale to 2+ web instances:

- Scrape jobs would run twice (one per instance) — duplicate work, duplicate LLM cost.
- Cheapest fix: a `scheduler_lock` row in Postgres acquired with a 10-minute TTL.

Still out of scope; not a real problem at current load.

## Data Model

Four tables.

### `articles`
| column | type | notes |
|---|---|---|
| `id` | pk | |
| `url` | text, unique | canonicalized — query params and fragments stripped |
| `outlet` | string | one of 11 outlet slugs |
| `first_seen` | timestamp | first time URL appeared in any RSS/sitemap feed |
| `last_checked` | timestamp | last scrape attempt (success or failure) |
| `tracking_until` | timestamp | `first_seen + 7 days` |
| `current_headline` | text | denormalized — latest version's headline. Lets the article list render in one SELECT instead of SELECT + JOIN-MAX-on-versions per row. |

### `versions`
| column | type | notes |
|---|---|---|
| `id` | pk | |
| `article_id` | fk → articles | |
| `scraped_at` | timestamp | |
| `headline` | text | from `og:title` |
| `body_text` | text | trafilatura output, plain text only — chrome/footers stripped |
| `content_hash` | text | SHA-256 of `headline + "\n" + body_text`, used by the pre-filter fast path |

### `changes`
| column | type | notes |
|---|---|---|
| `id` | pk | |
| `article_id` | fk → articles | |
| `from_version_id` | fk → versions | |
| `to_version_id` | fk → versions | |
| `change_type` | enum | `headline_change` \| `fact_change` \| `quote_change` \| `source_removed` \| `addition` \| `deletion` \| `temporal_update` \| `routine_update` \| `other` |
| `severity` | int | 1–5 from the classifier; `0` is a sentinel reserved for the classifier-failure fallback row |
| `summary` | text | classifier's one-sentence description |
| `classified_at` | timestamp | |

### `evaluations`
Eval-pipeline output: external evaluator (Gemini, GPT, human) judging Haiku's classifications.

| column | type | notes |
|---|---|---|
| `id` | pk | |
| `change_id` | fk → changes | the change being evaluated. **No `ON DELETE CASCADE`** — any code that deletes Changes must delete Evaluations first. |
| `evaluator` | string | e.g. `"gemini-2.5-pro"`, `"gpt-4o"`, `"human:nate"` |
| `prompt_version` | string | |
| `severity` | int | the evaluator's call |
| `change_type` | enum | the evaluator's call |
| `reasoning` | text | the evaluator's free-text rationale |
| `agrees_with_haiku` | bool | derived |
| `evaluated_at` | timestamp | |

### Indexes
- `articles(url)` unique
- `articles(tracking_until)` — for "still being tracked" filter
- `versions(article_id, scraped_at DESC)` — for "latest version" lookup
- `changes(article_id, classified_at DESC)` — timeline rendering
- `changes(severity, classified_at DESC)` — `min_severity` filter on the recent-changes feed
- `evaluations(change_id)` — eval lookup

### What's *not* modeled
- No `outlets` table — outlet slugs are hardcoded in `feeds.yaml` (backend) and `OUTLETS` (frontend).
- No soft-delete columns — articles past `tracking_until` simply stop being scraped; their rows persist.
- No raw HTML — only extracted body text.

## Discovery & Scraping Pipeline

A single APScheduler job runs every **5 minutes**. Each tick does two things in order.

### 1. Discovery pass

For each feed in `feeds.yaml`:
- **RSS feeds**: `feedparser.parse(url)`, extract `entry.link` from each entry.
- **Sitemaps** (detected when "sitemap" appears in the URL): plain HTTP fetch + regex extract `<loc>` elements. Used for outlets that killed their RSS feeds (USA Today).

For each candidate URL:
1. Canonicalize (strip query string + fragment, lowercase scheme/host, drop trailing slash).
2. Reject via `should_skip_url()` — covers live-blog patterns (`/live/`, `/live-updates/`, `/live-blog/`) and non-article patterns (`/sounds/`, `/audio/`, `/podcast`, `/programmes/`, `/iplayer/`, `/video/`, `/videos/`, `/weather/`).
3. If not already in `articles`, insert a new row and enqueue an immediate scrape.

### 2. Re-scrape pass

Query articles where `tracking_until > now` AND `last_checked` is older than its threshold.

Threshold logic, computed in SQL:
- Article age (now − `first_seen`) < 24h → re-scrape if `last_checked` > 30 min ago.
- Article age ≥ 24h → re-scrape if `last_checked` > 2h ago.

### Per-article scrape flow

```
fetch URL  →  trafilatura body + og:title headline
           →  strip outlet chrome (NY Post footer, etc.)
           →  compute content_hash
           →  load latest version for this article
           ┌  no prior version  → insert v1, return (no diff, no LLM)
           │  hash matches      → update last_checked, return (fast path)
           └  hash differs      → run pre-filter
                                  ┌ pre-filter rejects → insert version, no change row, no LLM
                                  └ pre-filter passes  → insert version, call classifier, insert change row
```

### Per-outlet URL rewrites at fetch time

`_fetchable_url(url)` in `scraper.py` rewrites URLs that need outlet-specific handling. Current rules:

- **The Hill**: 403'd on canonical article URLs (Varnish + PerimeterX). Rewrite to `<url>/amp/` which serves the same content cleanly. Canonical URL stored in DB stays unchanged so the public "Open original ↗" link still hits the regular page.

### Pre-filter rules
Skip the LLM if any one matches:
1. `content_hash` unchanged (covered by the fast path).
2. After whitespace normalization, the diff is empty.
3. Diff is fewer than 20 characters total.
4. Diff consists only of punctuation / quotation-mark changes.

### Footer / chrome stripping

After trafilatura extraction:
- `trim_after_markers` truncates body at known section markers (RELATED, MORE FROM, POST NEWS, etc.)
- `filter_chrome_lines` drops boilerplate lines (newsletter promos, social-follow strips, "Sign up here" CTAs)
- `trim_trailing_chrome` walks back from the end of the body, dropping known section labels (California Post, Page Six, Home delivery, Post News) until it hits real content

### URL canonicalization
- Strip the entire query string and fragment.
- Lowercase the scheme and host.
- Trailing slash normalized off (except for bare-host paths).

### `feeds.yaml` (current — 11 outlets, 14 feeds)

```yaml
- outlet: guardian
  url: https://www.theguardian.com/us-news/rss
- outlet: guardian
  url: https://www.theguardian.com/world/rss
- outlet: bbc
  url: https://feeds.bbci.co.uk/news/rss.xml
- outlet: bbc
  url: https://feeds.bbci.co.uk/news/world/rss.xml
- outlet: npr
  url: https://feeds.npr.org/1001/rss.xml
- outlet: npr
  url: https://feeds.npr.org/1004/rss.xml
- outlet: aljazeera
  url: https://www.aljazeera.com/xml/rss/all.xml
- outlet: propublica
  url: https://feeds.propublica.org/propublica/main
- outlet: nbc
  url: https://feeds.nbcnews.com/nbcnews/public/news
- outlet: cbs
  url: https://www.cbsnews.com/latest/rss/main
- outlet: thehill
  url: https://thehill.com/feed/
- outlet: usatoday
  url: https://www.usatoday.com/news-sitemap.xml      # sitemap, not RSS
- outlet: fox
  url: https://moxie.foxnews.com/google-publisher/latest.xml
- outlet: nypost
  url: https://nypost.com/feed/
```

**Sky News was previously included; removed because Akamai 403s every fetch path we tried (direct, AMP, Googlebot UA). Its archived articles remain in the DB.**

### Error handling
- **Scrape failure** (timeout, 404, trafilatura returns empty, 403) → log with status code, bump `last_checked`, move on. Tick keeps going.
- **Classifier failure** (network error, invalid JSON, schema-invalid output) → retry once with the same input. If still failing, write a `change` row with `change_type='other'`, `severity=0`, `summary='classifier failed'`.
- **RSS/sitemap feed failure** → skip that feed for this tick, log, retry next tick.

## Classifier

- **Model:** `claude-haiku-4-5`
- **Mode:** JSON output (Anthropic SDK structured output)
- **No multi-step / extended thinking** — single-shot is sufficient.
- **No batching API** — fresh classifications visible quickly matters more than the marginal cost saving.

### Prompt structure

```
System: You are classifying edits to news articles. Given two versions
of the same article (old and new), return a JSON object describing the
most significant change. Be conservative with severity — most edits
are minor cleanups.

Severity scale:
  1 — cosmetic (formatting, link fix, image swap)
  2 — minor wording, no meaning change
  3 — meaningful rewording, added context, softening
  4 — fact change, quote change, source removed, headline reframed
  5 — substantive correction, retraction, major reversal

User: <old version: headline + body>
      <new version: headline + body>
      Return JSON.
```

### Body truncation
Versions are sent to the LLM as headline + body text. Body is hard-capped at **24,000 characters** per version (≈ 6,000 tokens, conservatively). News articles almost never exceed this; long-form pieces (rare in our outlets) get tail-truncated.

### Output schema (enforced)
```json
{
  "change_type": "headline_change | fact_change | quote_change | source_removed | addition | deletion | temporal_update | routine_update | other",
  "severity": 1,
  "summary": "one sentence describing what changed and why it might matter"
}
```

### Prompt caching
The system prompt is cached via `cache_control`. The user-message content varies per call and is not cached. Meaningful ~30% input-cost reduction at current volume.

### Cost projection
- ~200–400 new articles/day across 11 outlets.
- Most scrapes hit the hash-unchanged fast path. Real content deltas: ~5–15% of scrapes.
- Realistic LLM volume: 200–500 calls/day.
- Comfortably under the $2/day budget at Haiku pricing.

## API

Read-only. There are no user-write actions.

| endpoint | description |
|---|---|
| `GET /api/articles` | List of tracked articles with `change_count` and `max_severity` denormalized. Sorted by most recent change desc. Supports `min_severity`, `outlet`, `since`, `q` (text search), `url` (canonicalize-and-find), repeatable `change_type=`. |
| `GET /api/articles/{id}` | One article with full version history and change history. Includes each version's body so the frontend can render diffs without a second round-trip. |
| `GET /api/changes/recent` | Flat feed of changes across all articles. Supports `min_severity`, `outlet`, `since`, `limit` (default 100, max 500). |
| `GET /api/stats` | **Server-side aggregates** so the dashboard isn't capped by the recent-changes 500-row limit. Returns `{ articles, versions, edits, vibe_shifts, by_outlet[], by_type[] }`. |

### Query params (shared)
- `min_severity` — int, default 0
- `outlet` — one of the 11 slugs (single value; multi-outlet filtering happens client-side)
- `since` — ISO timestamp, or the literal string `"all"`. Default: 7 days ago.
- `change_type` — repeatable, one of the 9 enum values

### SPA fallback

`SPAStaticFiles(StaticFiles)` in `main.py` catches 404s from the static mount and returns `index.html` instead. This lets direct URL hits to client routes (`/feed`, `/article/123`, `/search`, `/stats`) be handled by React Router instead of returning FastAPI's JSON `{"detail":"Not Found"}`. `/api/*` routes are matched before the static mount catches them, so API 404s still propagate normally.

## Frontend

Light-mode-only, editorial broadsheet aesthetic.

### Design system

- **Palette**: cream paper `#FAF7F0`, ink `#14110D`, red `#C8311E`, amber `#B26A00`, green `#2F7A52`, blue `#2A4A6B`.
- **Typography**: Instrument Serif (display + italic accents), Inter (UI body), JetBrains Mono (kickers, timestamps, severity codes).
- **No gradients, no rounded cards with accent-border left bars, no emoji.** Severity color is the only saturated hue and is used sparingly.

### Routes

| route | page | content |
|---|---|---|
| `/` | `Landing` | Hero, sample receipt (real spotlight article), outlet marquee, How-It-Works, severity legend, "On the tape" recent-articles strip, footer. |
| `/feed` | `Feed` | Filter bar (window/sev/type/outlet), outlet tabs with counts, 6-column row list with diff descriptor + sparkline + open-timeline link. |
| `/article/:id` | `Detail` | Masthead with current/original headline diff, 5-stat strip, tabs (Timeline / Diff viewer / All versions / Sources). Timeline events render an inline word-level `Diff` for headline_change rows. Sidebar: cumulative-volatility sparkline, edit composition, source card, version log. |
| `/search` | `Search` | Italic-serif input bound to `q`. Suggested filter chips. Filter rail (outlets checkboxes, min-sev pills, edit-type chips, window selector). URL paste auto-detects + surfaces "Open RR-XXXX →" jump button when API resolves. State syncs to URL search params. |
| `/stats` | `Stats` | Top stat strip, per-outlet bar chart, edit composition (stacked bar + per-type rows from `/api/stats by_type`), 24h volatility bar chart, day×hour heatmap, outlet leaderboard. |

### Shared chrome

- `Layout.jsx` wraps every route — desktop top-nav (Readreceipt logo + Feed/Stats/Search/Method tabs + search box that opens ⌘K palette), mobile bottom tabbar (Home / Feed / Search / Stats).
- `CommandPalette.jsx` — global ⌘K / Ctrl+K overlay. Dark ink background. Live `fetchArticles` (debounced). URL paste shows "URL DETECTED" badge. Empty state surfaces 5 quick filter shortcuts. ↑/↓ navigate, Enter opens, Esc closes.

### Atoms (`src/components/atoms/`)

`Hair`, `Kicker`, `Mono`, `SerifI`, `OutletMark`, `SevDot`, `SevPill`, `TypeTag`, `Diff`, `Sparkline`. Each is a one-file component, consumed by every page.

### Per-outlet logo scaling

`OUTLETS` in `atoms/outlets.js` includes a `scale` multiplier per outlet so square brand marks (NBC peacock 1.4×, The Hill stacked 1.5×, CBS eye 1.25×, BBC blocks 1.05×) read at similar visual weight to wide wordmarks (NY POST 0.85×, ProPublica 0.85×). `OutletMark` multiplies its `height` prop by this scale.

### Responsive

Each page renders desktop + mobile variants gated by Tailwind's `md:` breakpoint (`hidden md:block` / `md:hidden`). Charts use inline SVG (no Recharts / Chart.js). Mobile uses a fixed bottom tabbar; desktop uses sticky top nav.

### Polling
- `/api/articles` polled every 30s.
- `/api/changes/recent` polled every 30s with `limit=500`.
- `/api/stats` polled every 30s.
- `/api/articles/{id}` polled every 60s when an article is selected.
- All pause when the tab is hidden (`document.visibilitychange`).

## CLI & Boot-Time Cleanup

`readreceipt/cli.py` exposes management commands. Run via Railway CLI (`railway run python -m readreceipt.cli ...`) or via the boot-trigger env var (no install needed — see below).

| flag | what it does |
|---|---|
| `--dry-run` | print what would happen without writing |
| `--purge-live-blogs` | drop articles whose URL matches live-blog patterns |
| `--purge-non-articles` | drop articles whose URL matches non-article patterns (audio, video, podcast, weather, etc.) |
| `--purge-outlet OUTLET` | drop every article for one outlet (repeatable) |
| `--reset-outlet-history OUTLET` | drop versions+changes for an outlet, keep article rows so next poll re-snapshots |
| `--reset-all-history` | wipe all versions+changes |
| `--purge-everything` | wipe everything; discovery repopulates from feeds |
| `--purge-polluted-history` | reset history for articles with bot-protection / paywall interstitial patterns |

All purges delete in the order `evaluations → changes → versions → articles` to respect FK constraints (no `ON DELETE CASCADE` on the eval-pipeline tables).

### Boot-time trigger

`main.py` checks `RUN_CLEANUP_ON_BOOT` on startup. If set, runs the named cleanup once before the scheduler starts. Lets you trigger purges entirely from the Railway web UI:

```
RUN_CLEANUP_ON_BOOT=purge_non_articles
RUN_CLEANUP_ON_BOOT=purge_outlet:sky,fox
RUN_CLEANUP_ON_BOOT=reset_outlet_history:nypost
```

Workflow: set env var → Railway auto-redeploys → check deploy logs for `✅ Cleanup ... complete` → unset env var → redeploy again. Logs print a loud reminder to unset.

## Environment Variables

| name | required | notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | from console.anthropic.com |
| `DATABASE_URL` | yes in prod | Railway provides automatically; locally defaults to SQLite at `./readreceipt.db` |
| `ENVIRONMENT` | optional | `dev` \| `prod`, controls log verbosity |
| `RUN_CLEANUP_ON_BOOT` | optional | one-shot maintenance trigger — see CLI section |

## Success Criteria

- ✅ Runs on Railway without crashing.
- ✅ Catches meaningful edits (severity ≥ 3) daily across all 11 outlets.
- ✅ Pre-filter eliminates ≥ 50% of post-hash-mismatch diffs before the LLM is called.
- ✅ LLM cost stays under $2/day at current scope.

## Open Concerns / Known Gaps

- **Sky News** is unreachable (Akamai). Would need a JS-capable scraper (Playwright) or paid scraping proxy to revive.
- **The Hill** depends on the `/amp/` variant continuing to serve. If they remove or paywall it, we'll need another bypass.
- **USA Today** depends on `/news-sitemap.xml` continuing to publish. If it disappears, we'll need a section-page scraper.
- **`"other"` change type dominates** the type distribution (~62%) — Haiku is putting many edits in the catch-all bucket. Prompt engineering or eval-pipeline feedback may help.
- **Single-instance scheduler** is fine for v1 but is a known scaling cliff.
- **No retroactive archive.** We only see edits to articles published *after* deployment. Historical articles are invisible.
- **Spotlight selection on Landing** picks the highest-volatility article in the last 7 days, which can be dominated by page-chrome churn on edge cases. The discovery filter + chrome-stripping mitigates this; future work might bias toward articles with actual headline changes.
