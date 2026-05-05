from unittest.mock import MagicMock

import pytest

from newsdiff.classifier import (
    Classification,
    ClassifierError,
    classify_change,
    validate_classification,
)


def test_validate_classification_accepts_valid():
    c = validate_classification({
        "change_type": "headline_change",
        "severity": 4,
        "summary": "Headline reframed.",
    })
    assert isinstance(c, Classification)
    assert c.change_type == "headline_change"
    assert c.severity == 4


def test_validate_classification_rejects_unknown_type():
    with pytest.raises(ClassifierError):
        validate_classification({
            "change_type": "weird_thing",
            "severity": 3,
            "summary": "x",
        })


def test_validate_classification_rejects_out_of_range_severity():
    with pytest.raises(ClassifierError):
        validate_classification({
            "change_type": "fact_change",
            "severity": 7,
            "summary": "x",
        })
    with pytest.raises(ClassifierError):
        validate_classification({
            "change_type": "fact_change",
            "severity": 0,
            "summary": "x",
        })


def test_classify_change_calls_anthropic_and_returns_classification():
    fake_block = MagicMock()
    fake_block.type = "tool_use"
    fake_block.name = "classify_change"
    fake_block.input = {
        "change_type": "fact_change",
        "severity": 4,
        "summary": "Number changed from 1.2% to 1.5%.",
    }
    fake_response = MagicMock()
    fake_response.content = [fake_block]

    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_response

    result = classify_change(
        client=fake_client,
        old_headline="Inflation rose 1.2%",
        old_body="The CPI rose 1.2% last month.",
        new_headline="Inflation rose 1.5%",
        new_body="The CPI rose 1.5% last month.",
    )
    assert result.change_type == "fact_change"
    assert result.severity == 4
    fake_client.messages.create.assert_called_once()


def test_classify_change_truncates_long_bodies():
    long_body = "x" * 100_000
    fake_block = MagicMock()
    fake_block.type = "tool_use"
    fake_block.name = "classify_change"
    fake_block.input = {
        "change_type": "addition",
        "severity": 2,
        "summary": "Added paragraph.",
    }
    fake_response = MagicMock()
    fake_response.content = [fake_block]
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_response

    classify_change(
        client=fake_client,
        old_headline="h", old_body=long_body,
        new_headline="h", new_body=long_body + "x",
    )
    args, kwargs = fake_client.messages.create.call_args
    user_text = kwargs["messages"][0]["content"]
    assert len(user_text) < 60_000
