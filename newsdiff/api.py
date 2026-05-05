from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import select

from newsdiff.storage import (
    Article,
    Change,
    Version,
    list_articles_with_change_stats,
    session_scope,
)


def _serialize_change(c: Change) -> dict:
    return {
        "id": c.id,
        "from_version_id": c.from_version_id,
        "to_version_id": c.to_version_id,
        "change_type": c.change_type,
        "severity": c.severity,
        "summary": c.summary,
        "classified_at": c.classified_at.isoformat(),
    }


def _serialize_version(v: Version) -> dict:
    return {
        "id": v.id,
        "scraped_at": v.scraped_at.isoformat(),
        "headline": v.headline,
        "body_text": v.body_text,
    }


def _resolve_since(since: Optional[str]) -> Optional[datetime]:
    if since is None:
        return datetime.now(timezone.utc) - timedelta(days=7)
    if since == "all":
        return None
    try:
        return datetime.fromisoformat(since)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid since")


def build_app(*, engine) -> FastAPI:
    app = FastAPI(title="NewsDiff")

    @app.get("/api/articles")
    def list_articles(
        min_severity: int = Query(0, ge=0, le=5),
        outlet: Optional[str] = None,
        since: Optional[str] = None,
    ):
        since_dt = _resolve_since(since)
        with session_scope(engine) as s:
            stats = list_articles_with_change_stats(
                s, min_severity=min_severity, outlet=outlet, since=since_dt
            )
            return [
                {
                    "id": row.article.id,
                    "url": row.article.url,
                    "outlet": row.article.outlet,
                    "headline": row.article.current_headline,
                    "first_seen": row.article.first_seen.isoformat(),
                    "tracking_until": row.article.tracking_until.isoformat(),
                    "change_count": row.change_count,
                    "max_severity": row.max_severity,
                }
                for row in stats
            ]

    @app.get("/api/articles/{article_id}")
    def get_article(article_id: int):
        with session_scope(engine) as s:
            article = s.get(Article, article_id)
            if article is None:
                raise HTTPException(status_code=404, detail="article not found")
            versions = list(s.execute(
                select(Version)
                .where(Version.article_id == article_id)
                .order_by(Version.scraped_at.asc())
            ).scalars())
            changes = list(s.execute(
                select(Change)
                .where(Change.article_id == article_id)
                .order_by(Change.classified_at.desc())
            ).scalars())
            return {
                "id": article.id,
                "url": article.url,
                "outlet": article.outlet,
                "headline": article.current_headline,
                "first_seen": article.first_seen.isoformat(),
                "tracking_until": article.tracking_until.isoformat(),
                "versions": [_serialize_version(v) for v in versions],
                "changes": [_serialize_change(c) for c in changes],
            }

    @app.get("/api/changes/recent")
    def recent_changes(
        min_severity: int = Query(0, ge=0, le=5),
        outlet: Optional[str] = None,
        since: Optional[str] = None,
        limit: int = Query(100, ge=1, le=500),
    ):
        since_dt = _resolve_since(since)
        with session_scope(engine) as s:
            stmt = (
                select(Change, Article)
                .join(Article, Article.id == Change.article_id)
                .where(Change.severity >= min_severity)
                .order_by(Change.classified_at.desc())
                .limit(limit)
            )
            if outlet:
                stmt = stmt.where(Article.outlet == outlet)
            if since_dt:
                stmt = stmt.where(Change.classified_at >= since_dt)
            rows = list(s.execute(stmt))
            return [
                {
                    **_serialize_change(c),
                    "article": {
                        "id": a.id,
                        "headline": a.current_headline,
                        "outlet": a.outlet,
                    },
                }
                for (c, a) in rows
            ]

    return app
