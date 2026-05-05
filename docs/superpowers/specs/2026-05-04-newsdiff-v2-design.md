# NewsDiff v2 — Design

**Status:** Approved design, ready for implementation planning.
**Date:** 2026-05-04

## Goal

Track changes to published news articles over time, classify each change with an LLM, and surface only meaningful edits (fact changes, quote walk-backs, headline reframes) — not typos or layout tweaks.

This is a real-product attempt: deployed publicly, intended for outside users, intended to be iterated on based on feedback.

## Why

NewsDiffs (2012) captured diffs but drowned users in noise. LLMs now make automated significance-ranking cheap and viable, so we can show only the edits that matter.

## MVP Scope

- Auto-track three outlets via RSS: **Guardian, BBC, NPR**
- (NYT and WaPo are excluded: paywalls would force ToS violations or partial-content workarounds.)
- Snapshot articles every 30 minutes for the first 24 hours after first publish, then every 2 hours through day 7
- Detect content changes, classify with Claude Haiku 4.5
- Two-pane web app: article list (left) + change timeline (right), dark mode only
- Deployed to Railway with Postgres

## Non-Goals (v1)

- User accounts, authentication, personalization
- Email / push alerts
- Browser extension
- More than three outlets
- Image/video change tracking
- User-submitted feeds via UI
- Dark/light theme switching (dark only)
- URL-based deep links to articles or changes (selection lives in component state)

## Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy
- **Database:** Postgres in production (Railway-provisioned), SQLite locally (`DATABASE_URL` swap)
- **Scraper:** `feedparser` (RSS) + `trafilatura` (article body extraction). Headline pulled separately from `og:title` meta tag.
- **Diffing:** `difflib` (stdlib)
- **LLM:** Anthropic SDK, model `claude-haiku-4-5`, JSON mode, system-prompt caching
- **Scheduler:** APScheduler, in-process inside the FastAPI app
- **Frontend:** React + Vite + Tailwind CSS
- **Diff viewer:** `react-diff-viewer-continued`, word-level
- **Deploy:** Railway. Frontend built at image build time and served as static files by FastAPI.

## Architecture Overview

Single Python web service. APScheduler runs inside the same process as the FastAPI app on a 5-minute tick. Each tick performs RSS discovery and re-scrapes due articles. Frontend is a separate Vite build, copied into the backend image and served from `/`.

```
RSS feeds  ──┐
             ├──►  scheduler tick (5 min)  ──►  scrape → diff → pre-filter → classifier → DB
URL list   ──┘                                                                            │
                                                                                          ▼
                                                                                    Postgres
                                                                                          │
              ┌───────────────────── HTTP ───────────────────────────────────────────────┘
              ▼
         FastAPI  ──►  React frontend (polling every 30s)
```

### Single-instance assumption

APScheduler in-process means the deployment is single-instance for v1. If we ever scale to 2+ web instances:

- Scrape jobs would run twice (one per instance) — duplicate work, duplicate LLM cost.
- Cheapest fix: a `scheduler_lock` row in Postgres acquired with a 10-minute TTL.

Out of scope for v1, mentioned here so future-us doesn't accidentally horizontally scale.

## Data Model

Three tables.

### `articles`
| column | type | notes |
|---|---|---|
| `id` | pk | |
| `url` | text, unique | canonicalized — query params and fragments stripped |
| `outlet` | enum | `guardian` \| `bbc` \| `npr` |
| `first_seen` | timestamp | first time URL appeared in any RSS feed |
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
| `body_text` | text | trafilatura output, plain text only — no raw HTML |
| `content_hash` | text | SHA-256 of `headline + "\n" + body_text`, used by the pre-filter fast path |

### `changes`
| column | type | notes |
|---|---|---|
| `id` | pk | |
| `article_id` | fk → articles | |
| `from_version_id` | fk → versions | |
| `to_version_id` | fk → versions | |
| `change_type` | enum | `headline_change` \| `fact_change` \| `quote_change` \| `source_removed` \| `addition` \| `deletion` \| `other` |
| `severity` | int | 1–5 from the classifier; `0` is a sentinel reserved for the classifier-failure fallback row (see Classifier section) |
| `summary` | text | classifier's one-sentence description |
| `classified_at` | timestamp | |

### Indexes
- `articles(url)` unique
- `articles(tracking_until)` — for "still being tracked" filter
- `versions(article_id, scraped_at DESC)` — for "latest version" lookup
- `changes(article_id, classified_at DESC)` — timeline rendering
- `changes(severity, classified_at DESC)` — `min_severity` filter on the recent-changes feed

### What's *not* modeled
- No `outlets` table — three hardcoded enum values is fine.
- No soft-delete columns — articles past `tracking_until` simply stop being scraped; their rows persist.
- No raw HTML — only extracted body text.

## Scraping Pipeline & Scheduler

A single APScheduler job runs every **5 minutes**. Each tick does two things in order.

### 1. Discovery pass
- Fetch every RSS feed in `feeds.yaml`.
- For each entry: canonicalize URL (strip query params and fragments) → if not in `articles`, insert a new row and enqueue an immediate scrape.

### 2. Re-scrape pass
- Query articles where `tracking_until > now` AND `last_checked` is older than its threshold.
- Threshold logic, computed in SQL:
  - Article age (now − `first_seen`) < 24h → re-scrape if `last_checked` > 30 min ago.
  - Article age ≥ 24h → re-scrape if `last_checked` > 2h ago.

A 5-minute tick (rather than 30) means new RSS items get picked up quickly and the cadence logic lives in the query, not in the scheduler.

### Per-article scrape flow

```
fetch URL  →  trafilatura body + og:title headline
           →  compute content_hash
           →  load latest version for this article
           ┌  no prior version  → insert v1, return (no diff, no LLM)
           │  hash matches      → update last_checked, return (fast path)
           └  hash differs      → run pre-filter
                                  ┌ pre-filter rejects → insert version, no change row, no LLM
                                  └ pre-filter passes  → insert version, call classifier, insert change row
```

### Pre-filter rules
Skip the LLM if any one matches:
1. `content_hash` unchanged (covered by the fast path).
2. After whitespace normalization, the diff is empty.
3. Diff is fewer than 20 characters total.
4. Diff consists only of punctuation / quotation-mark changes.

### URL canonicalization
- Strip the entire query string and fragment.
- Lowercase the scheme and host.
- Trailing slash normalized off (except for bare-host paths).

This collapses tracking-param duplicates that RSS feeds frequently emit.

### `feeds.yaml`

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
```

(Exact feed URLs to be confirmed during Phase 1 step 2; the structure is stable.)

### Error handling
- **Scrape failure** (timeout, 404, trafilatura returns empty) → log, bump `last_checked`, move on. Tick keeps going.
- **Classifier failure** (network error, invalid JSON, schema-invalid output) → retry once with the same input. If still failing, write a `change` row with `change_type='other'`, `severity=0`, `summary='classifier failed'`. We still know *something* changed; we just couldn't characterize it.
- **RSS feed failure** → skip that feed for this tick, log, retry next tick.

### `--dry-run` CLI flag
Runs discovery + re-scrape passes in memory. Prints what *would* happen. Writes nothing to the DB. Makes no LLM calls.

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
Versions are sent to the LLM as headline + body text. Body is hard-capped at **24,000 characters** per version (≈ 6,000 tokens, conservatively). News articles almost never exceed this; long-form pieces (rare in our outlets) get tail-truncated. We use a character cap rather than a token cap to avoid running a tokenizer in the hot path.

### Output schema (enforced)
```json
{
  "change_type": "headline_change | fact_change | quote_change | source_removed | addition | deletion | other",
  "severity": 1,
  "summary": "one sentence describing what changed and why it might matter"
}
```

### Validation
Parse JSON. If `change_type` isn't one of the seven enum values, or `severity` isn't an integer 1–5, treat as classifier failure and run the retry-once / fallback flow above.

### Prompt caching
The system prompt is cached via `cache_control`. The user-message content (the two version blocks) varies per call and is not cached. At ~200–400 calls/day this is meaningful: ~30% input-cost reduction.

### Cost discipline
- Pre-filter eliminates the bulk of checks before the model is touched.
- We classify only on real content deltas that survive the pre-filter — typically 5–15% of scrapes.
- We never re-classify a `change` row. Once written, it is frozen history.

### Cost projection
- ~200 new articles/day across three outlets.
- ~84 scrape attempts per article over its 7-day tracking window.
- Most scrapes hit the hash-unchanged fast path. Real content deltas: ~5–15% of scrapes.
- Realistic LLM volume: 200–400 calls/day.
- Comfortably under the $2/day budget at Haiku pricing.

## API

Read-only. There are no user-write actions in v1.

| endpoint | description |
|---|---|
| `GET /api/articles` | List of tracked articles with `change_count` and `max_severity` denormalized. Sorted by most recent change desc. |
| `GET /api/articles/{id}` | One article with full version history and change history. Includes each version's body so the frontend can render diffs without a second round-trip. |
| `GET /api/changes/recent` | Flat feed of changes across all articles. Useful for a future "recent meaningful changes" view; cheap to expose now. |

### Query params (all three endpoints)
- `min_severity` — int, default 0
- `outlet` — `guardian` \| `bbc` \| `npr`, default all
- `since` — ISO timestamp, default 7 days ago

### Pagination
Not in v1. ~200 articles/day × 7 days = ~1,400 active rows fits in a single response. Add pagination if/when it becomes a problem.

## Frontend

Dark mode only.

### Theme
- Background: near-black
- Panels: dark gray
- Text: light gray
- Tailwind dark utilities (`darkMode: 'class'`, applied to `<html>` at boot)

### Layout

Two-pane shell. `App.jsx` owns the selected-article state.

```
┌────────────────────────────────────────────────────────────┐
│  NewsDiff                                          [filter]│
├──────────────────────────┬─────────────────────────────────┤
│                          │   "Fed signals rate cut"        │
│  ● Guardian              │                                 │
│    "Fed signals..."      │   ○  Now                        │
│    2 changes             │   │                             │
│                          │   ●  2h ago — headline_change · 4│
│  ● BBC                   │   │       "rate cut" → "rate hold"│
│    "Senate vote..."      │   │                             │
│    1 change              │   •  4h ago — quote_change · 2  │
│                          │   │                             │
│  ● NPR                   │   ●  6h ago — fact_change · 5   │
│    "Climate report..."   │   │                             │
│    5 changes             │   ○  9h ago — first published   │
└──────────────────────────┴─────────────────────────────────┘
```

### Components
- `App.jsx` — shell, owns selected-article state.
- `ArticleList.jsx` — left pane. Each row: outlet badge, headline, change count, max-severity dot.
- `Timeline.jsx` — right pane. Vertical 1-pixel line top to bottom of the panel; dots aligned on it.
- `ChangeNode.jsx` — single timeline node. Click expands inline.
- `DiffViewer.jsx` — wraps `react-diff-viewer-continued`, word-level. Headline diff on top, body diff below, in one component.
- `FilterBar.jsx` — three controls.

### Timeline visual
- **One thin vertical line** (1px, mid-gray) runs top-to-bottom of the timeline panel.
- Each event is a **filled circle centered on the line**.
- **Color encodes `change_type`**:
  - `headline_change` — blue
  - `fact_change` — red
  - `quote_change` — purple
  - `source_removed` — orange
  - `addition` — teal
  - `deletion` — pink
  - `other` — gray
- **Size encodes `severity`**:
  - sev 1 — 6px
  - sev 2 — 9px
  - sev 3 — 12px
  - sev 4 — 16px
  - sev 5 — 20px
- **"Now" node** at top: hollow ring, no severity, no category.
- **"First published" node** at bottom: hollow ring.
- Click a solid dot → row expands inline below it to show the diff. The vertical line continues uninterrupted to the right of the expanded content so the spine is preserved.
- A small **legend** at the top of the timeline panel: one row of seven colored dots with category labels. Collapsible.

### Article list dot
Same color/size system. The row's dot uses the color of the article's most recent significant change-type and the size of its max severity. Visual consistency across panes.

### Filter bar
- **Min-severity slider**, 0–5. Default min = 2 (hides cosmetic noise).
- **Outlet multi-select** — Guardian / BBC / NPR.
- **Time window** — 24h / 7d / all.

### Polling
- `/api/articles` polled every 30s.
- `/api/articles/{id}` polled every 60s when an article is selected.
- Both pause when the tab is hidden (`document.visibilitychange`).

### Empty states
- No articles tracked yet → "Watching feeds. New articles will appear here as they publish."
- Article selected but no changes → "No meaningful edits detected yet." (with subtle "first published" timestamp).
- Filter excludes everything → "No changes match your filters." with a clear-filters button.

## Build Order

### Phase 1 — Backend pipeline (CLI-testable)
1. Scaffold: venv, `requirements.txt`, `.env.example`, `feeds.yaml`, project layout (`scraper.py`, `storage.py`, `differ.py`, `classifier.py`, `scheduler.py`, `api.py`, `main.py`).
2. Scraper for **Guardian** first. Verify trafilatura body + `og:title` headline extraction look clean. URL canonicalization helper.
3. SQLAlchemy schema + storage layer. SQLite locally, Postgres via `DATABASE_URL`.
4. Differ + pre-filter rules. Unit tests for the four pre-filter conditions.
5. Classifier: Anthropic SDK, JSON mode, cached system prompt. Schema validation, retry-once on failure, fallback `change_type='other'` row.
6. APScheduler 5-min job. Run locally for ~1 hour against Guardian only to confirm full discover → scrape → diff → classify → store loop works.
7. Add BBC and NPR. Re-verify trafilatura on each.

### Phase 2 — API
8. FastAPI endpoints with query params.
9. `curl` each endpoint; confirm JSON shape matches frontend needs.

### Phase 3 — Frontend
10. Vite + React + Tailwind. Dark mode by default.
11. Two-pane layout shell.
12. `ArticleList` wired to `/api/articles`, with the per-row color/size dot.
13. `Timeline` with vertical line and colored/sized dots. Hollow-ring bookends. Collapsible legend.
14. `ChangeNode` inline expand → `DiffViewer` (word-level).
15. `FilterBar` (severity slider default 2, outlet multi-select, time window).

### Phase 4 — Polish
16. Visibility-pause polling.
17. Empty states (three flavors above).
18. Loading + error states.
19. Spacing, typography, hover states pass.

### Phase 5 — Deploy
20. `Dockerfile` (multi-stage: build frontend, copy `dist/` into Python image, FastAPI serves it).
21. `railway.toml`.
22. `README.md` (local dev, env vars, deploy instructions).
23. GitHub push.
24. Railway: connect repo, provision Postgres, set `ANTHROPIC_API_KEY` and `ENVIRONMENT=prod`. Deploy.
25. Verify live: feeds scraping, articles appearing, at least one classified change.

## Environment Variables

| name | required | notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | from console.anthropic.com |
| `DATABASE_URL` | yes in prod | Railway provides automatically; locally defaults to SQLite at `./newsdiff.db` |
| `ENVIRONMENT` | optional | `dev` \| `prod`, controls log verbosity and a few ergonomic toggles |

## Success Criteria

- Runs on Railway for 7 consecutive days without crashing.
- Catches at least one real, meaningful edit (severity ≥ 3) during that week.
- Pre-filter eliminates ≥ 50% of post-hash-mismatch diffs before the LLM is called.
- LLM cost stays under $2/day at MVP scope.

## Risks & Open Concerns

- **trafilatura quality on BBC and NPR** is unverified. If extraction is dirty (boilerplate, navigation crud), we'll either need site-specific selectors or a fallback extractor. Phase 1 step 7 is the gate.
- **AP and Reuters were excluded after a live verification spike** revealed that AP no longer publishes public RSS at the URL we tried (DNS does not resolve), and Reuters dropped public RSS entirely. BBC and NPR are confirmed working alternatives with full body extraction and reliable RSS endpoints.
- **RSS feed coverage.** Outlets sometimes only publish a subset of articles to RSS. We'll see what we see; v1 doesn't try to be comprehensive.
- **Single-instance scheduler** is fine for v1 but is a known scaling cliff (see Architecture Overview).
- **No retroactive archive.** We only see edits to articles published *after* deployment. Historical articles are invisible to us. This is intentional for MVP.
