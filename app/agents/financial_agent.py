import asyncio

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_ollama import ChatOllama
from langchain_mcp_adapters.client import MultiServerMCPClient

from app.rag.rag_tool import search_financial_reports


# =========================================================
# RAG TOOL
# =========================================================

@tool("search_financial_reports")
def search_financial_reports_tool(query: str) -> str:
    """
    Search local financial reports using the RAG pipeline.
    """
    return search_financial_reports(query)


# =========================================================
# LLM
# =========================================================

llm = ChatOllama(
    model="qwen3:4b",
    temperature=0,
    reasoning=False,
)


# =========================================================
# MCP CLIENT
# =========================================================

mcp_client = MultiServerMCPClient(
    {
        "calculator": {
            "command": "uv",
            "args": [
                "run",
                "python",
                "app/mcp_servers/calculator_server.py",
            ],
            "transport": "stdio",
        },
        "stock": {
            "command": "uv",
            "args": [
                "run",
                "python",
                "app/mcp_servers/stock_server.py",
            ],
            "transport": "stdio",
        },
    }
)


# =========================================================
# TOOL CACHE
# =========================================================

_loaded_tools = None
_tools_lock = asyncio.Lock()


async def get_financial_tools():
    """
    Load MCP tools only once and reuse them.
    """

    global _loaded_tools

    if _loaded_tools is not None:
        return _loaded_tools

    async with _tools_lock:

        if _loaded_tools is not None:
            return _loaded_tools

        print("\n=== LOADING MCP TOOLS ===")

        mcp_tools = await mcp_client.get_tools()

        _loaded_tools = (
            mcp_tools
            + [search_financial_reports_tool]
        )

        print("\n=== TOOLS LOADED ===")

        for tool_item in _loaded_tools:
            print(f"- {tool_item.name}")

        return _loaded_tools


# =========================================================
# CLEAN LLM RESPONSE
# =========================================================

def clean_response(text: str) -> str:

    if not text:
        return ""

    text = str(text)

    if "</think>" in text:
        text = text.split(
            "</think>",
            1
        )[1]

    if "<think>" in text:
        text = text.split(
            "<think>",
            1
        )[0]

    return text.strip()


# =========================================================
# CLEAN MCP TOOL RESULT
# =========================================================

def clean_tool_result(result) -> str:
    """
    Convert MCP/LangChain tool output into clean text.

    Example MCP response:

    [
        {
            "type": "text",
            "text": "22500.0",
            "id": "..."
        }
    ]

    Becomes:

    22500.0
    """

    # -----------------------------------------
    # Normal string
    # -----------------------------------------

    if isinstance(result, str):

        return result.strip()


    # -----------------------------------------
    # MCP list response
    # -----------------------------------------

    if isinstance(result, list):

        text_parts = []

        for item in result:

            if isinstance(item, dict):

                # Standard MCP text content
                if item.get("type") == "text":

                    text_parts.append(
                        str(
                            item.get(
                                "text",
                                ""
                            )
                        )
                    )

                # Generic text dictionary
                elif "text" in item:

                    text_parts.append(
                        str(
                            item["text"]
                        )
                    )

            else:

                text_parts.append(
                    str(item)
                )

        return "\n".join(
            part.strip()
            for part in text_parts
            if part and part.strip()
        ).strip()


    # -----------------------------------------
    # Dictionary response
    # -----------------------------------------

    if isinstance(result, dict):

        if "text" in result:

            return str(
                result["text"]
            ).strip()

        return str(result).strip()


    # -----------------------------------------
    # Other response types
    # -----------------------------------------

    return str(result).strip()


# =========================================================
# TOOL DISPLAY NAMES
# =========================================================

TOOL_DISPLAY_NAMES = {

    "calculate":
        "Calculator",

    "get_stock_price":
        "Stock Data",

    "search_financial_reports":
        "Financial RAG",
}


# =========================================================
# MAIN FINANCIAL AGENT
# =========================================================

async def ask_financial_agent(query: str):

    print("\n")
    print("=" * 50)
    print("FINANCIAL AGENT")
    print("=" * 50)

    # -----------------------------------------------------
    # Load cached tools
    # -----------------------------------------------------

    tools = await get_financial_tools()

    # -----------------------------------------------------
    # Bind tools
    # -----------------------------------------------------

    model_with_tools = llm.bind_tools(
        tools
    )

    # -----------------------------------------------------
    # System prompt
    # -----------------------------------------------------

    system_message = """
You are an intelligent financial analysis agent.

Available tools:

1. calculate
Use for mathematical and financial calculations.

2. get_stock_price
Use for latest available stock price information.

3. search_financial_reports
Use for questions about financial reports and company documents.

Choose the correct tool based on the user's question.

If a tool is required, call the appropriate tool.

If no tool is required, answer directly.

Do not reveal internal reasoning.
Do not output <think> or </think>.
Keep answers concise and useful.
"""

    # -----------------------------------------------------
    # Messages
    # -----------------------------------------------------

    messages = [
        (
            "system",
            system_message
        ),
        HumanMessage(
            content=query
        ),
    ]

    # -----------------------------------------------------
    # ONE LLM CALL
    # -----------------------------------------------------

    print("\n=== ASKING AI AGENT ===")

    response = await model_with_tools.ainvoke(
        messages
    )

    print("\n=== AI RESPONSE ===")

    print(
        "Tool calls:",
        response.tool_calls
    )

    # =====================================================
    # NO TOOL REQUIRED
    # =====================================================

    if not response.tool_calls:

        answer = clean_response(
            response.content
        )

        print("\n=== DIRECT ANSWER ===")
        print(answer)

        return {
            "answer": answer,
            "tool": None,
            "tool_status": "No tool required",
        }


    # =====================================================
    # TOOL EXECUTION
    # =====================================================

    tool_results = []
    selected_tool_names = []

    for tool_call in response.tool_calls:

        tool_name = tool_call["name"]
        tool_args = tool_call["args"]

        selected_tool_names.append(
            tool_name
        )

        print("\n=== TOOL SELECTED ===")

        print(
            "Tool:",
            tool_name
        )

        print(
            "Arguments:",
            tool_args
        )

        # -------------------------------------------------
        # Find selected tool
        # -------------------------------------------------

        selected_tool = next(
            (
                tool_item
                for tool_item in tools
                if tool_item.name == tool_name
            ),
            None,
        )

        # -------------------------------------------------
        # Tool not found
        # -------------------------------------------------

        if selected_tool is None:

            result = (
                f"Tool '{tool_name}' "
                "was not found."
            )

        else:

            try:

                # -----------------------------------------
                # RAG
                # -----------------------------------------

                if tool_name == "search_financial_reports":

                    result = await asyncio.to_thread(
                        selected_tool.invoke,
                        tool_args
                    )

                # -----------------------------------------
                # MCP tools
                # -----------------------------------------

                else:

                    result = await selected_tool.ainvoke(
                        tool_args
                    )

            except Exception as error:

                result = (
                    f"Tool execution error: "
                    f"{str(error)}"
                )

        # -------------------------------------------------
        # Clean MCP response
        # -------------------------------------------------

        clean_result = clean_tool_result(
            result
        )

        print("\n=== RAW TOOL RESULT ===")
        print(result)

        print("\n=== CLEAN TOOL RESULT ===")
        print(clean_result)

        tool_results.append(
            clean_result
        )


    # =====================================================
    # FINAL ANSWER
    # =====================================================

    # No second LLM call.
    #
    # This improves response speed considerably.
    # =====================================================

    if len(tool_results) == 1:

        final_answer = clean_response(
            tool_results[0]
        )

    else:

        final_answer = "\n\n".join(
            clean_response(result)
            for result in tool_results
        )


    # =====================================================
    # TOOL NAME
    # =====================================================

    display_tools = []

    for tool_name in selected_tool_names:

        display_tools.append(
            TOOL_DISPLAY_NAMES.get(
                tool_name,
                tool_name
            )
        )


    tool_string = ", ".join(
        display_tools
    )


    # =====================================================
    # FINAL LOG
    # =====================================================

    print("\n=== FINAL ANSWER ===")
    print(final_answer)

    print("\n=== TOOL USED ===")
    print(tool_string)

    print("\n")
    print("=" * 50)
    print("FINANCIAL AGENT COMPLETED")
    print("=" * 50)


    # =====================================================
    # API RESPONSE
    # =====================================================

    return {
        "answer": final_answer,
        "tool": ", ".join(
            selected_tool_names
        ),
        "tool_status": "Tool executed successfully",
    }


# =========================================================
# LOCAL TEST
# =========================================================

if __name__ == "__main__":

    result = asyncio.run(
        ask_financial_agent(
            "Calculate 125000 * 0.18"
        )
    )

    print("\n=== RESULT ===")
    print(result)