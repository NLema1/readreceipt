from unittest.mock import MagicMock, patch

from newsdiff.cli import main


def test_dry_run_does_not_create_db(tmp_path, capsys, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/should_not_exist.db")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")

    fake_feeds = [{"outlet": "guardian", "url": "https://feed"}]
    feeds_path = tmp_path / "feeds.yaml"
    import yaml
    feeds_path.write_text(yaml.safe_dump(fake_feeds))

    with patch("newsdiff.cli._fetch_feed_for_dry_run", return_value=["https://example.com/a"]):
        main(["--dry-run", "--feeds", str(feeds_path)])

    out = capsys.readouterr().out
    assert "DRY RUN" in out
    assert "https://example.com/a" in out
    assert not (tmp_path / "should_not_exist.db").exists()
