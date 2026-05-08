import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    database_url: str
    anthropic_api_key: str | None
    gemini_api_key: str | None
    mcp_auth_token: str | None 
    mcp_server_url: str | None
    environment: str


def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


def load() -> Config:
    load_dotenv()
    return Config(
        database_url=_normalize_db_url(
            os.getenv("DATABASE_URL", "sqlite:///./readreceipt.db")
        ),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        mcp_auth_token=os.getenv("MCP_AUTH_TOKEN"),
        mcp_server_url=os.getenv("MCP_SERVER_URL"),
        environment=os.getenv("ENVIRONMENT", "dev"),
    )
