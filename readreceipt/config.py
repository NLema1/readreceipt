import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    database_url: str
    anthropic_api_key: str | None
    environment: str


def load() -> Config:
    load_dotenv()
    return Config(
        database_url=os.getenv("DATABASE_URL", "sqlite:///./readreceipt.db"),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        environment=os.getenv("ENVIRONMENT", "dev"),
    )
