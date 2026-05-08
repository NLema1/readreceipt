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
        mcp_tools = await mcp_client.list_tools_mcp()

        # 2. Map them in one clean list comprehension
        gemini_tools = [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=tool.name,
                        description=tool.description,
                        # Gemini's SDK is picky: 'parameters' must be a dict or a specific Type object
                        parameters=tool.inputSchema 
                    )
                    for tool in mcp_tools.tools
                ]
            )
        ]

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
                chat = client.aio.chats.create(
                model=MODEL,
                config=types.GenerateContentConfig(tools=gemini_tools),
                )
                response = await chat.send_message(prompt)
                while response.function_calls:
                # We'll collect the results of all requested tool calls
                # and send them back to Gemini in one batch.
                    function_response_parts = []

                     #Execute each tool call Gemini requested.
                    for fc in response.function_calls:
                        try:
                            # Run the tool via MCP. fc.name is the tool name,
                            # dict(fc.args) converts Gemini's args object to a
                            # plain dict that MCP expects.
                            tool_result = await mcp_client.call_tool(
                                fc.name, dict(fc.args)
                            )
                            # Wrap the tool's result as a function_response Part
                            # that we'll send back to Gemini.
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=fc.name,
                                    response={"result": tool_result.data},
                                )
                            )
                        except Exception as tool_error:
                            # If the tool itself errored, send the error back to
                            # Gemini instead of crashing. Gemini can decide what
                            # to do (retry, skip, etc.).
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=fc.name,
                                    response={"error": str(tool_error)},
                                )
                            )

                    # Step 8: Send all tool results back to Gemini.
                    # Gemini reads them, then either:
                    #   - requests another tool call (loop continues), or
                    #   - emits a final text response with no function_calls
                    #     (loop exits).
                    response = await chat.send_message(function_response_parts)
    
                print(f"[{change_id}] OK")
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Failed change {change_id}: {e}")

if __name__ == "__main__":
    asyncio.run(run_batch())
