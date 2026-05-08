import os
import asyncio
from readreceipt import config
from fastmcp import Client
from google import genai
from google.genai import types


cfg = config.load()
if not cfg.gemini_api_key or not cfg.mcp_auth_token or not cfg.mcp_server_url:
    raise RuntimeError(
        "eval agent requires GEMINI_API_KEY, MCP_AUTH_TOKEN, MCP_SERVER_URL"
    )

GEMINI_API_KEY= cfg.gemini_api_key
MCP_AUTH_TOKEN= cfg.mcp_auth_token
MCP_SERVER_URL= cfg.mcp_server_url



# Automatically uses the GEMINI_API_KEY environment variable
client = genai.Client(api_key=GEMINI_API_KEY)

mcp_client = Client(MCP_SERVER_URL, auth=MCP_AUTH_TOKEN)

MODEL = "gemini-2.5-flash"

CHANGE_TYPES = {
    "headline_change",
    "fact_change",
    "quote_change",
    "source_removed",
    "addition",
    "deletion",
    "temporal_update",
    "routine_update",
    "other",
}

PROMPT_VERSION = "v1"

EVAL_PROMPT = """You are an independent evaluator of news article edits.

Your job is to form your own classification of how significant a change is, separate from any prior classification.

You are evaluating change_id={change_id}.

Steps:
1. Call get_change_detail with change_id={change_id} to read the change. The response will include a "haiku_classification" field showing another model's prior verdict. IGNORE that field when forming your own judgment. Form your verdict from the before/after content alone.
2. Decide on:
   - severity (1-5, see scale below)
   - change_type (must be exactly one of: {change_types})
   - reasoning (2-4 sentences explaining your judgment)
3. Call submit_mcp_evaluation with your verdict. Use:
   - evaluator="{evaluator}"
   - prompt_version="{prompt_version}"
   - change_id={change_id}
   - your severity, change_type, and reasoning

Severity scale:
1 - Trivial. Typo, formatting, no semantic difference.
2 - Minor. Small clarification, no factual change.
3 - Moderate. Wording change that shifts emphasis or tone.
4 - Significant. Factual correction, source change, removed/added context.
5 - Major. Story-altering revision (changed conclusion, removed allegation, swapped subject of claim).

Change type definitions:
- headline_change: edits to the article title
- fact_change: a factual claim was modified
- quote_change: a direct quotation was added, removed, or altered
- source_removed: a named source or attribution was removed
- addition: meaningful new content added
- deletion: meaningful content removed
- temporal_update: time/date references updated as the story develops
- routine_update: minor maintenance edit
- other: doesn't fit any category above

Be skeptical and independent. Do not anchor to any prior classifier's verdict. Different evaluators legitimately disagree on edge cases — that disagreement is the value of independent evaluation."""


async def run_batch():
    # find unevaluated changes
    # loop through them
    # for each, send to Gemini with MCP tools attached
    # log results
    async with mcp_client:
        session = mcp_client.session
        result = await mcp_client.call_tool("list_unevaluated_changes", {"evaluator": MODEL})
        change_ids = result.data  # or .structured_content, check docs

        for change_id in change_ids:
            try:
                prompt = EVAL_PROMPT.format(
                    change_id=change_id,
                    change_types=", ".join(sorted(CHANGE_TYPES)),
                    evaluator=MODEL,
                    prompt_version=PROMPT_VERSION,
                )
            #calling gemini for each change
                response = await client.aio.models.generate_content(
                    model=MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                            tools=[mcp_client]))
                print(f"[{change_id}] response.text: {response.text[:300] if response.text else 'EMPTY'}")
                print(f"[{change_id}] function_calls: {response.function_calls}")
                print(f"[{change_id}] OK")
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Failed change {change_id}: {e}")

if __name__ == "__main__":
    asyncio.run(run_batch())
