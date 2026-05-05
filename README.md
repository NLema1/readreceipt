# NewsDiff

Track meaningful edits to news articles from Guardian, BBC, and NPR.

## How it works

A scheduler polls RSS feeds every 5 minutes, snapshots each article over a 7-day window (every 30 min for the first 24h, every 2h after), diffs successive versions, and asks Claude Haiku 4.5 to classify and rate the significance of each change. The web UI shows a per-article timeline of meaningful edits.

## Local development

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env to set ANTHROPIC_API_KEY

uvicorn newsdiff.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

The Vite dev server proxies `/api/*` to the FastAPI server on `:8000`.

### Tests

```bash
pytest
```

### Dry-run

```bash
python -m newsdiff.cli --dry-run
```

Discovers feeds without writing to the database or making LLM calls. Useful for sanity-checking new feeds.

## Deploy (Railway)

1. Push this repo to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add a Postgres plugin. Railway sets `DATABASE_URL` automatically.
4. Set `ANTHROPIC_API_KEY` and `ENVIRONMENT=prod` in the Railway service variables.
5. Deploy. Railway builds the Dockerfile and runs `uvicorn newsdiff.main:app`.
6. Open the deployed URL — the frontend is served at `/`, the API under `/api/`.

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | from console.anthropic.com |
| `DATABASE_URL` | prod only | `sqlite:///./newsdiff.db` | Railway provides this |
| `ENVIRONMENT` | no | `dev` | `dev` or `prod` |

## Architecture

See `docs/superpowers/specs/2026-05-04-newsdiff-v2-design.md` for the full design.
