import hashlib

from readreceipt.differ import (
    Diff,
    compute_content_hash,
    compute_diff,
    should_skip_llm,
)


def test_content_hash_stable():
    h1 = compute_content_hash("Headline", "Body text.")
    h2 = compute_content_hash("Headline", "Body text.")
    assert h1 == h2
    assert len(h1) == 64


def test_content_hash_changes_with_input():
    h1 = compute_content_hash("Headline", "Body text.")
    h2 = compute_content_hash("Headline", "Body text!")
    assert h1 != h2


def test_compute_diff_identical():
    d = compute_diff("same", "same")
    assert d.char_count == 0
    assert d.is_whitespace_only is True
    assert d.is_punctuation_only is True


def test_compute_diff_whitespace_only():
    d = compute_diff("hello world", "hello  world")
    assert d.is_whitespace_only is True


def test_compute_diff_punctuation_only():
    d = compute_diff("hello, world", "hello world.")
    assert d.is_punctuation_only is True


def test_compute_diff_real_change():
    d = compute_diff("rate cut", "rate hold")
    assert d.is_whitespace_only is False
    assert d.is_punctuation_only is False
    assert d.char_count > 0


def test_should_skip_llm_hash_match():
    d = compute_diff("a", "a")
    assert should_skip_llm(d, old_hash="x", new_hash="x") is True


def test_should_skip_llm_tiny_change():
    d = compute_diff("hello world", "hello worlds")
    assert should_skip_llm(d, old_hash="x", new_hash="y") is True


def test_should_skip_llm_punctuation_only():
    d = compute_diff("hello, world", "hello world.")
    assert should_skip_llm(d, old_hash="x", new_hash="y") is True


def test_should_skip_llm_real_change():
    d = compute_diff(
        "The Fed signaled a rate cut on Wednesday afternoon.",
        "The Fed signaled a rate hold on Wednesday afternoon, surprising markets.",
    )
    assert should_skip_llm(d, old_hash="x", new_hash="y") is False
