from contextlib import contextmanager
from datetime import datetime
from functools import lru_cache

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    sessionmaker,
)


class Base(DeclarativeBase):
    pass


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = (UniqueConstraint("url", name="uq_articles_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    outlet: Mapped[str] = mapped_column(String(32), nullable=False)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_checked: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    tracking_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    current_headline: Mapped[str] = mapped_column(Text, nullable=False, default="")


class Version(Base):
    __tablename__ = "versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    article_id: Mapped[int] = mapped_column(
        ForeignKey("articles.id"), nullable=False, index=True
    )
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    headline: Mapped[str] = mapped_column(Text, nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)


class Change(Base):
    __tablename__ = "changes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    article_id: Mapped[int] = mapped_column(
        ForeignKey("articles.id"), nullable=False, index=True
    )
    from_version_id: Mapped[int] = mapped_column(
        ForeignKey("versions.id"), nullable=False
    )
    to_version_id: Mapped[int] = mapped_column(
        ForeignKey("versions.id"), nullable=False
    )
    change_type: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    classified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )


def create_engine_and_tables(database_url: str):
    engine = create_engine(database_url, future=True)
    Base.metadata.create_all(engine)
    return engine


@lru_cache(maxsize=None)
def _session_factory(engine):
    return sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


def make_session_factory(engine):
    return _session_factory(engine)


@contextmanager
def session_scope(engine):
    factory = _session_factory(engine)
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


from datetime import timedelta
from typing import NamedTuple, Optional

from sqlalchemy import func, select


class ArticleStats(NamedTuple):
    article: Article
    change_count: int
    max_severity: int


def get_article_by_url(session: Session, url: str) -> Optional[Article]:
    return session.execute(select(Article).where(Article.url == url)).scalar_one_or_none()


def upsert_article(
    session: Session, *, url: str, outlet: str, now: datetime
) -> Article:
    existing = get_article_by_url(session, url)
    if existing:
        return existing
    article = Article(
        url=url,
        outlet=outlet,
        first_seen=now,
        last_checked=now,
        tracking_until=now + timedelta(days=7),
        current_headline="",
    )
    session.add(article)
    session.flush()
    return article


def get_latest_version(session: Session, article_id: int) -> Optional[Version]:
    return session.execute(
        select(Version)
        .where(Version.article_id == article_id)
        .order_by(Version.scraped_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def list_articles_with_change_stats(
    session: Session,
    *,
    min_severity: int = 0,
    outlet: Optional[str] = None,
    since: Optional[datetime] = None,
) -> list[ArticleStats]:
    stmt = (
        select(
            Article,
            func.count(Change.id).label("change_count"),
            func.coalesce(func.max(Change.severity), 0).label("max_severity"),
        )
        .outerjoin(Change, Change.article_id == Article.id)
        .group_by(Article.id)
    )
    if min_severity > 0:
        stmt = stmt.having(func.coalesce(func.max(Change.severity), 0) >= min_severity)
    if outlet:
        stmt = stmt.where(Article.outlet == outlet)
    if since:
        stmt = stmt.where(Article.first_seen >= since)
    stmt = stmt.order_by(func.max(Change.classified_at).desc().nullslast())
    rows = session.execute(stmt).all()
    return [
        ArticleStats(article=row[0], change_count=row[1], max_severity=row[2])
        for row in rows
    ]


def articles_due_for_rescrape(session: Session, *, now: datetime) -> list[Article]:
    def _aware(dt: datetime) -> datetime:
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=now.tzinfo)

    candidates = list(session.execute(select(Article)).scalars())
    out = []
    for a in candidates:
        if _aware(a.tracking_until) <= now:
            continue
        age = (now - _aware(a.first_seen)).total_seconds()
        threshold = 1800 if age < 86400 else 7200
        if (now - _aware(a.last_checked)).total_seconds() >= threshold:
            out.append(a)
    return out
