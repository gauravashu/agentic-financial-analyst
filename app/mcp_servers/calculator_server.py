from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Financial Calculator")


@mcp.tool()
def calculate(expression: str) -> str:
    """
    Calculate a mathematical expression.
    """

    try:
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)

    except Exception as e:
        return f"Calculation error: {str(e)}"


if __name__ == "__main__":
    mcp.run()