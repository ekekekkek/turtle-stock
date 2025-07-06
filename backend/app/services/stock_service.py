import logging
import finnhub
import redis
import json
import time
import yfinance as yf
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)

# initialize Finnhub client
_fh = finnhub.Client(api_key=settings.FINNHUB_API_KEY)

# initialize Redis for caching (future use)
_cache = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Rate limiting
_last_api_call = 0
_min_call_interval = 1.1  # 1.1 seconds between calls to stay under 60/min limit

class StockService:

    def _rate_limit(self):
        """Simple rate limiting to stay under Finnhub free tier limits"""
        global _last_api_call
        current_time = time.time()
        time_since_last = current_time - _last_api_call
        if time_since_last < _min_call_interval:
            sleep_time = _min_call_interval - time_since_last
            time.sleep(sleep_time)
        _last_api_call = time.time()

    def _handle_finnhub_error(self, e, symbol: str, operation: str):
        """Handle Finnhub API errors gracefully"""
        error_msg = str(e)
        if "403" in error_msg or "Forbidden" in error_msg:
            logger.error(f"Finnhub API 403 error for {symbol} ({operation}): Rate limit exceeded or invalid API key")
            return None
        elif "429" in error_msg or "Too Many Requests" in error_msg:
            logger.error(f"Finnhub API rate limit exceeded for {symbol} ({operation})")
            return None
        elif "404" in error_msg or "Not Found" in error_msg:
            logger.warning(f"Stock {symbol} not found on Finnhub ({operation})")
            return None
        else:
            logger.error(f"Finnhub API error for {symbol} ({operation}): {error_msg}")
            return None

    def _get_history_from_yahoo(self, symbol: str, start_ts: int, end_ts: int, resolution: str = "D") -> Optional[Dict[str, Any]]:
        """Get historical data from Yahoo Finance with rate limiting"""
        try:
            # Add small delay to prevent overwhelming Yahoo Finance
            time.sleep(0.1)
            
            # Convert timestamps to datetime
            start_dt = datetime.fromtimestamp(start_ts, timezone.utc)
            end_dt = datetime.fromtimestamp(end_ts, timezone.utc)
            
            # Get data from Yahoo Finance with better error handling
            ticker = yf.Ticker(symbol)
            
            # Try to get info first to validate the symbol
            try:
                info = ticker.info
                if not info or 'regularMarketPrice' not in info:
                    logger.warning(f"Invalid symbol or no data available for {symbol} on Yahoo Finance")
                    return None
            except Exception as e:
                logger.warning(f"Could not validate symbol {symbol} on Yahoo Finance: {e}")
                return None
            
            # Get historical data
            hist = ticker.history(start=start_dt, end=end_dt, interval='1d')
            
            if hist.empty:
                logger.warning(f"No data returned from Yahoo Finance for {symbol}")
                return None
            
            # Convert to Finnhub format
            data = []
            for timestamp, row in hist.iterrows():
                data.append({
                    "timestamp": timestamp.isoformat(),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume']),
                })
            
            logger.info(f"Successfully fetched {len(data)} data points from Yahoo Finance for {symbol}")
            return {
                "symbol": symbol.upper(),
                "resolution": resolution,
                "from": start_ts,
                "to": end_ts,
                "data": data,
            }
        except Exception as e:
            logger.error(f"Yahoo Finance fallback failed for {symbol}: {e}")
            return None

    def get_stock_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time stock quote via Finnhub (preferred for real-time data)"""
        try:
            self._rate_limit()
            q = _fh.quote(symbol)
        except Exception as e:
            return self._handle_finnhub_error(e, symbol, "quote")

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
            self._rate_limit()
            info = _fh.company_profile2(symbol=symbol)
        except Exception as e:
            error_result = self._handle_finnhub_error(e, symbol, "company_profile")
            if error_result is None:
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
        Get historical price candles using Yahoo Finance (primary) with Finnhub fallback.
        Yahoo Finance is preferred for historical data due to no rate limits.
        """
        now = int(datetime.now(timezone.utc).timestamp())
        if end_ts is None:
            end_ts = now
        if start_ts is None:
            start_ts = end_ts - 30 * 24 * 3600  # 30 days ago

        # Try Yahoo Finance first (no rate limits, better for historical data)
        logger.info(f"Fetching historical data for {symbol} from Yahoo Finance")
        yahoo_result = self._get_history_from_yahoo(symbol, start_ts, end_ts, resolution)
        
        if yahoo_result and yahoo_result.get("data"):
            return yahoo_result
        
        # Fallback to Finnhub if Yahoo Finance fails
        logger.info(f"Yahoo Finance failed for {symbol}, trying Finnhub fallback")
        try:
            self._rate_limit()
            resp = _fh.stock_candles(symbol, resolution, start_ts, end_ts)
        except Exception as e:
            error_result = self._handle_finnhub_error(e, symbol, "stock_candles")
            return error_result

        if resp.get("s") != "ok":
            logger.warning(f"Finnhub returned non-OK status for {symbol}")
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

    def calculate_atr(self, symbol: str, window: int = 14) -> Optional[float]:
        """
        Calculate Average True Range (ATR) for volatility measurement
        """
        try:
            # Get more data for ATR calculation (need at least window + 1 days)
            end_ts = int(datetime.now(timezone.utc).timestamp())
            start_ts = end_ts - (window + 10) * 24 * 3600  # Extra days for safety
            
            history = self.get_stock_history(symbol, start_ts, end_ts, "D")
            if not history or len(history["data"]) < window + 1:
                return None

            data = history["data"]
            true_ranges = []

            for i in range(1, len(data)):
                high = data[i]["high"]
                low = data[i]["low"]
                prev_close = data[i-1]["close"]
                
                # True Range = max(high - low, |high - prev_close|, |low - prev_close|)
                tr1 = high - low
                tr2 = abs(high - prev_close)
                tr3 = abs(low - prev_close)
                true_range = max(tr1, tr2, tr3)
                true_ranges.append(true_range)

            if len(true_ranges) < window:
                return None

            # Calculate ATR as simple moving average of true ranges
            atr = sum(true_ranges[-window:]) / window
            return atr

        except Exception as e:
            logger.error("Error calculating ATR for %s: %s", symbol, e)
            return None

    def calculate_position_size(self, symbol: str, capital: float, risk_percent: float, window: int = 14) -> Dict[str, Any]:
        """
        Calculate recommended position size based on volatility and risk management
        """
        try:
            # Get current price
            quote = self.get_stock_quote(symbol)
            if not quote:
                return {"error": "Unable to get current price"}

            current_price = quote["price"]
            
            # Calculate ATR
            atr = self.calculate_atr(symbol, window)
            if not atr:
                return {"error": "Unable to calculate volatility"}

            # Calculate stop loss distance (2 * ATR below entry)
            stop_loss_distance = 2 * atr
            stop_loss_price = current_price - stop_loss_distance

            # Calculate position size based on risk
            risk_amount = capital * (risk_percent / 100)
            position_size = risk_amount / stop_loss_distance

            # Ensure position doesn't exceed capital
            max_position_value = capital
            if position_size * current_price > max_position_value:
                position_size = max_position_value / current_price

            return {
                "symbol": symbol,
                "current_price": current_price,
                "atr": atr,
                "stop_loss_price": stop_loss_price,
                "recommended_shares": round(position_size, 2),
                "position_value": round(position_size * current_price, 2),
                "risk_amount": risk_amount,
                "stop_loss_distance": stop_loss_distance
            }

        except Exception as e:
            logger.error("Error calculating position size for %s: %s", symbol, e)
            return {"error": "Unable to calculate position size"}

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
        Finnhub free tier doesn't have a trending endpoint,
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
