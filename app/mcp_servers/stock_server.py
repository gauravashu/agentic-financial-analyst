from mcp.server.fastmcp import FastMCP
import yfinance as yf

mcp = FastMCP("Stock Data")


@mcp.tool()
def get_stock_price(symbol: str) -> str:
    """
    Get the latest available stock price for a company.
    Example: AAPL, MSFT, TSLA
    """

    try:
        ticker = yf.Ticker(symbol.upper())
        data = ticker.history(period="1d")

        if data.empty:
            return f"No stock data found for {symbol.upper()}."

        latest_price = data["Close"].iloc[-1]

        return (
            f"{symbol.upper()} latest available price: "
            f"${latest_price:.2f}"
        )

    except Exception as e:
        return f"Stock data error: {str(e)}"


if __name__ == "__main__":
    mcp.run()
