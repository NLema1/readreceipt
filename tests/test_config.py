from readreceipt import config


def test_database_url_defaults_to_sqlite(monkeypatch):
    monkeypatch.setattr(config, "load_dotenv", lambda *a, **kw: False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    cfg = config.load()
    assert cfg.database_url == "sqlite:///./readreceipt.db"


def test_database_url_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://x/y")
    cfg = config.load()
    assert cfg.database_url == "postgresql://x/y"


def test_anthropic_api_key_required(monkeypatch):
    monkeypatch.setattr(config, "load_dotenv", lambda *a, **kw: False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    cfg = config.load()
    assert cfg.anthropic_api_key is None


def test_environment_defaults_to_dev(monkeypatch):
    monkeypatch.setattr(config, "load_dotenv", lambda *a, **kw: False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    cfg = config.load()
    assert cfg.environment == "dev"
