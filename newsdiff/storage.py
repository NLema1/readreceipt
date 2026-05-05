from contextlib import contextmanager
from datetime import datetime

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
    url: Mapped[str] = mapped_column(String(2048), nullable=False, index=True)
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


def make_session_factory(engine):
    return sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


@contextmanager
def session_scope(engine):
    factory = make_session_factory(engine)
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
