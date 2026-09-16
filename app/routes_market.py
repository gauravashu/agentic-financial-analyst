from fastapi import APIRouter, HTTPException, Query
import yfinance as yf

router = APIRouter(prefix="/market", tags=["Market Data"])


@router.get("/{symbol}")
def get_market_data(
    symbol: str,
    period: str = Query("1mo"),
):
    allowed_symbols = {
        "AAPL",
        "MSFT",
        "TSLA",
    }

    symbol = symbol.upper()

    if symbol not in allowed_symbols:
        raise HTTPException(
            status_code=400,
            detail="Only AAPL, MSFT and TSLA are supported.",
        )

    allowed_periods = {
        "1mo",
        "3mo",
        "6mo",
        "1y",
    }

    if period not in allowed_periods:
        raise HTTPException(
            status_code=400,
            detail="Invalid period.",
        )

    try:
        ticker = yf.Ticker(symbol)

        data = ticker.history(
            period=period,
            interval="1d",
            auto_adjust=False,
        )

        if data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No market data found for {symbol}.",
            )

        result = []

        for date, row in data.iterrows():
            result.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                }
            )

        latest = result[-1]

        return {
            "symbol": symbol,
            "period": period,
            "latest": latest,
            "data": result,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Market data error: {str(error)}",
        )