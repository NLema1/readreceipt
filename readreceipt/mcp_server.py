import os
from fastmcp import FastMCP
from fastmcp.server.auth.providers.jwt import StaticTokenVerifier
from datetime import datetime, timezone
from readreceipt import config
from readreceipt.storage import (
    Article,
    Change,
    Version,
    Evaluation,
    get_change_with_versions,
    session_scope,
    create_engine_only,
    submit_evaluation,
    find_unevaluated_changes
)

cfg = config.load()

if cfg.mcp_auth_token is None:
    raise RuntimeError("MCP_AUTH_TOKEN is required to run the MCP server")

verifier = StaticTokenVerifier(
    tokens= {cfg.mcp_auth_token: {"client_id": "eval-pipeline", "scopes": ["read", "write"]}},
)
engine = create_engine_only(cfg.database_url)


mcp = FastMCP("readreceipt", auth=verifier)


@mcp.tool()
def submit_mcp_evaluation(change_id: int, severity: int, change_type: str, reasoning: str, evaluator: str, prompt_version: str) -> dict:
    """Record an independent evaluation of a Change in the database.

Use this after independently classifying a change (via get_change_detail).
Submits your verdict alongside Haiku's existing one for comparison.

Args:
    change_id: The ID of the Change being evaluated.
    severity: Your independent severity rating (1-5).
    change_type: Your classification of the change category.
    reasoning: Free-text explanation of why you assigned this severity.
    evaluator: Your model identifier (e.g. "gemini-2.5-pro").
    prompt_version: The version of the eval prompt used (e.g. "v1.0").

Returns:
    dict with success flag, evaluation_id, and agrees_with_haiku boolean.
"""
    with session_scope(engine) as session:
        try:
            evaluation = submit_evaluation(
                session,
                change_id=change_id,
                severity=severity,
                change_type=change_type,
                reasoning=reasoning,
                evaluator=evaluator,
                prompt_version=prompt_version,
            )
        except ValueError as e:
            return {"success": False, "error": str(e)}
        
        return {
            "success": True,
            "evaluation_id": evaluation.id,
            "agrees_with_haiku": evaluation.agrees_with_haiku,
            "evaluated_at": evaluation.evaluated_at.isoformat(),
        }
   
@mcp.tool()
def get_change_detail(change_id: int) -> dict:
    """Returns before/after content + Haiku's classification for one change.
    
    Args:
        change_id Identifier of relevant dataset 
    """
    with session_scope(engine) as session:
        result = get_change_with_versions(session, change_id)
        if result is None:
            return {"found": False, "change_id": change_id}
        
        change, from_v, to_v, article = result
        return {
            "found": True,
            "change_id": change.id,
            "article_url": article.url,
            "outlet": article.outlet,
            "classified_at": change.classified_at.isoformat(),
            "haiku_classification": {
                "change_type": change.change_type,
                "severity": change.severity,
                "summary": change.summary,
            },
            "before": {
                "headline": from_v.headline,
                "body_text": from_v.body_text,
                "scraped_at": from_v.scraped_at.isoformat(),
            },
            "after": {
                "headline": to_v.headline,
                "body_text": to_v.body_text,
                "scraped_at": to_v.scraped_at.isoformat(),
            },
        }
    
@mcp.tool()
def list_unevaluated_changes(evaluator: str)-> list[int]:
    """Return change_ids that haven't been evaluated by this evaluator yet.
    
    Use this at the start of an evaluation batch to discover which changes need work.
    Only changes with severity >= 3 are returned. Results are ordered most recent first.

    Args:
        evaluator: Identifier of the evaluator asking, e.g. "gemini-2.5-flash"
        that have NOT yet been evaluated by this evaluator are returned
    Returns:
    List of change_ids (integers) needing evaluation. Empty list if none pending
    """
    with session_scope(engine) as session:
        return find_unevaluated_changes(session, evaluator)



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port)