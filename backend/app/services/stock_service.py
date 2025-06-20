import yfinance as yf
import pandas as pd
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class StockService:
    def __init__(self):
        self.timeout = settings.YAHOO_FINANCE_TIMEOUT

    async def get_stock_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time stock quote"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get current price and basic info
            current_price = info.get('currentPrice', 0)
            previous_close = info.get('previousClose', 0)
            change = current_price - previous_close if previous_close else 0
            change_percent = (change / previous_close * 100) if previous_close else 0
            
            return {
                "symbol": symbol.upper(),
                "price": current_price,
                "change": change,
                "change_percent": change_percent,
                "volume": info.get('volume', 0),
                "market_cap": info.get('marketCap'),
                "high": info.get('dayHigh'),
                "low": info.get('dayLow'),
                "open": info.get('open'),
                "previous_close": previous_close,
                "timestamp": datetime.now()
            }
        except Exception as e:
            logger.error(f"Error fetching stock quote for {symbol}: {str(e)}")
            return None

    async def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get detailed stock information"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                "symbol": symbol.upper(),
                "name": info.get('longName', info.get('shortName', '')),
                "sector": info.get('sector'),
                "industry": info.get('industry'),
                "description": info.get('longBusinessSummary'),
                "website": info.get('website'),
                "employees": info.get('fullTimeEmployees'),
                "country": info.get('country')
            }
        except Exception as e:
            logger.error(f"Error fetching stock info for {symbol}: {str(e)}")
            return None

    async def get_stock_history(self, symbol: str, period: str = "1d", interval: str = "1m") -> Optional[Dict[str, Any]]:
        """Get historical stock data"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                return None
            
            # Convert to list of dictionaries
            data = []
            for index, row in hist.iterrows():
                data.append({
                    "timestamp": index.isoformat(),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume'])
                })
            
            return {
                "symbol": symbol.upper(),
                "period": period,
                "interval": interval,
                "data": data
            }
        except Exception as e:
            logger.error(f"Error fetching stock history for {symbol}: {str(e)}")
            return None

    async def search_stocks(self, query: str) -> List[Dict[str, Any]]:
        """Search for stocks by symbol or company name"""
        try:
            # Use yfinance's search functionality
            search_results = yf.Tickers(query)
            results = []
            
            for ticker in search_results.tickers:
                try:
                    info = ticker.info
                    results.append({
                        "symbol": info.get('symbol', ''),
                        "name": info.get('longName', info.get('shortName', '')),
                        "exchange": info.get('exchange'),
                        "type": info.get('quoteType')
                    })
                except:
                    continue
            
            return results[:10]  # Limit to 10 results
        except Exception as e:
            logger.error(f"Error searching stocks for {query}: {str(e)}")
            return []

    async def get_trending_stocks(self) -> List[Dict[str, Any]]:
        """Get trending stocks (popular stocks)"""
        try:
            # Popular stock symbols
            popular_symbols = [
                "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX",
                "AMD", "INTC", "CRM", "ADBE", "PYPL", "UBER", "LYFT", "SPOT"
            ]
            
            trending = []
            for symbol in popular_symbols[:8]:  # Limit to 8 stocks
                quote = await self.get_stock_quote(symbol)
                if quote:
                    trending.append(quote)
            
            return trending
        except Exception as e:
            logger.error(f"Error fetching trending stocks: {str(e)}")
            return []

    async def get_market_overview(self) -> Dict[str, Any]:
        """Get market overview with major indices"""
        try:
            indices = {
                "sp500": "^GSPC",
                "nasdaq": "^IXIC", 
                "dow_jones": "^DJI"
            }
            
            overview = {
                "timestamp": datetime.now()
            }
            
            for index_name, symbol in indices.items():
                quote = await self.get_stock_quote(symbol)
                if quote:
                    overview[index_name] = quote
            
            return overview
        except Exception as e:
            logger.error(f"Error fetching market overview: {str(e)}")
            return {"timestamp": datetime.now()}

stock_service = StockService() 