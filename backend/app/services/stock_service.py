import logging
import finnhub
import redis
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)

# initialize Finnhub client
_fh = finnhub.Client(api_key=settings.FINNHUB_API_KEY)

# initialize Redis for caching (future use)
_cache = redis.from_url(settings.REDIS_URL, decode_responses=True)

class StockService:

    def get_stock_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time stock quote via Finnhub"""
        try:
            q = _fh.quote(symbol)
        except Exception as e:
            logger.error("Error fetching quote for %s: %s", symbol, e)
            return None

        # Finnhub returns {'c': current, 'pc': prev close, 'dp': pct, 'v': volume}
        if q.get("c") is None:
            logger.warning("No current price data for %s", symbol)
            return None

        return {
            "symbol":         symbol.upper(),
            "price":          q["c"],
            "change":         q["c"] - q.get("pc", 0.0),
            "change_percent": q.get("dp", 0.0),
            "volume":         q.get("v", 0),
            "timestamp":      datetime.now(timezone.utc),
        }

    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """Get basic stock info (company name) via Finnhub"""
        try:
            info = _fh.company_profile2(symbol=symbol)
        except Exception as e:
            logger.error("Error fetching company info for %s: %s", symbol, e)
            return {"symbol": symbol.upper(), "name": symbol.upper()}

        name = info.get("name") or symbol.upper()
        return {"symbol": symbol.upper(), "name": name}

    def get_stock_history(
        self,
        symbol: str,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None,
        resolution: str = "D",
    ) -> Optional[Dict[str, Any]]:
        """
        Get historical price candles via Finnhub.
        By default returns last 30 days of daily candles.
        """
        now = int(datetime.now(timezone.utc).timestamp())
        if end_ts is None:
            end_ts = now
        if start_ts is None:
            start_ts = end_ts - 30 * 24 * 3600  # 30 days ago

        try:
            resp = _fh.stock_candles(symbol, resolution, start_ts, end_ts)
        except Exception as e:
            logger.error("Error fetching history for %s: %s", symbol, e)
            return None

        if resp.get("s") != "ok":
            return None

        # build list of candle dicts
        data = []
        for t, o, h, l, c, v in zip(
            resp["t"], resp["o"], resp["h"], resp["l"], resp["c"], resp["v"]
        ):
            data.append({
                "timestamp": datetime.fromtimestamp(t, timezone.utc).isoformat(),
                "open":      o,
                "high":      h,
                "low":       l,
                "close":     c,
                "volume":    v,
            })

        return {
            "symbol":     symbol.upper(),
            "resolution": resolution,
            "from":       start_ts,
            "to":         end_ts,
            "data":       data,
        }

    def search_stocks(self, query: str) -> List[Dict[str, Any]]:
        """Search for symbols/company names via Finnhub lookup"""
        try:
            resp = _fh.symbol_lookup(query)
        except Exception as e:
            logger.error("Error searching stocks for %s: %s", query, e)
            return []

        results = []
        for item in resp.get("result", []):
            results.append({
                "symbol":      item.get("symbol"),
                "description": item.get("description"),
                "type":        item.get("type"),
            })
        return results[:10]

    def get_trending_stocks(self) -> List[Dict[str, Any]]:
        """
        Finnhub free tier doesn’t have a trending endpoint,
        so use a static list or your most-popular symbols.
        """
        popular = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX"]
        quotes = []
        for sym in popular:
            q = self.get_stock_quote(sym)
            if q:
                quotes.append(q)
        return quotes

    def get_market_overview(self) -> Dict[str, Any]:
        """Get major index quotes via Finnhub"""
        indices = {"sp500": "^GSPC", "nasdaq": "^IXIC", "dow_jones": "^DJI"}
        overview = {"timestamp": datetime.now(timezone.utc)}
        for name, sym in indices.items():
            quote = self.get_stock_quote(sym)
            if quote:
                overview[name] = quote
            else:
                # Return empty quote structure if data not available
                overview[name] = {
                    "symbol": sym,
                    "price": 0.0,
                    "change": 0.0,
                    "change_percent": 0.0,
                    "volume": 0,
                    "market_cap": None,
                    "high": None,
                    "low": None,
                    "open": None,
                    "previous_close": None,
                    "timestamp": datetime.now(timezone.utc)
                }
        return overview

stock_service = StockService()
