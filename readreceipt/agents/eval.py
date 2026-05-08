import os
import asyncio
from readreceipt import config
from fastmcp import Client
from fastmcp.utilities.json_schema import compress_schema
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

EVAL_PROMPT = """You are an independent evaluator of news article edits. You have tools available — use them, do not describe them.

Evaluate change_id={change_id}.

Process:
- Read the change with get_change_detail.
- Form your own judgment based on the before/after content. Ignore any prior haiku_classification.
- Submit your verdict with submit_mcp_evaluation, using evaluator="{evaluator}" and prompt_version="{prompt_version}".

Severity scale:
1 - Trivial (typo, formatting)
2 - Minor (small clarification)
3 - Moderate (wording shifts emphasis)
4 - Significant (factual correction, source change)
5 - Major (story-altering revision)

Change types: {change_types}

Do not write code blocks. Do not show example tool outputs. Do not narrate your reasoning step by step. Use the tools directly and submit one evaluation."""

async def run_batch():
    async with mcp_client:
        # 1. Fetch and Map Tools
        mcp_tools_result = await mcp_client.list_tools_mcp()
        gemini_tools = [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=tool.name,
                        description=tool.description,
                        parameters=compress_schema(tool.inputSchema, prune_additional_properties=True)
                    )
                    for tool in mcp_tools_result.tools
                ]
            )
        ]

        # 2. Identify changes that need eyes
        result = await mcp_client.call_tool("list_unevaluated_changes", {"evaluator": MODEL})
        change_ids = result.data  # Adjust based on your MCP return type

        for change_id in change_ids:
            try:
                # --- The Critical Missing Piece ---
                prompt = EVAL_PROMPT.format(
                    change_id=change_id,
                    change_types=", ".join(sorted(CHANGE_TYPES)),
                    evaluator=MODEL,
                    prompt_version=PROMPT_VERSION,
                )

                # 3. Start a fresh chat for this specific change
                chat = client.aio.chats.create(
                    model=MODEL,
                    config=types.GenerateContentConfig(
                        tools=gemini_tools, 
                        temperature=0.7
                    ),
                )
                
                response = await chat.send_message(prompt)

                # 4. Handle the back-and-forth (Tool Orchestration)
                while response.function_calls:
                    function_response_parts = []

                    for fc in response.function_calls:
                        try:
                            # Execute the tool via MCP
                            tool_result = await mcp_client.call_tool(
                                fc.name, dict(fc.args)
                            )
                            
                            # Standard MCP tools often return data in a .content list
                            # If your server returns raw data in .data, keep it as is.
                            # Usually: tool_output = tool_result.content[0].text
                            tool_output = tool_result.data 

                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=fc.name,
                                    response={"result": tool_output},
                                )
                            )
                        except Exception as tool_error:
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=fc.name,
                                    response={"error": str(tool_error)},
                                )
                            )

                    # Send the tool findings back to Gemini to get the verdict
                    response = await chat.send_message(function_response_parts)
    
                print(f"[{change_id}] Evaluation Submitted.")
                await asyncio.sleep(1) # Rate limit padding for the Palantir-tier speed ;)

            except Exception as e:
                print(f"Failed change {change_id}: {e}")

if __name__ == "__main__":
    asyncio.run(run_batch())
