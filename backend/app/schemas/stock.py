from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class StockQuote(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    market_cap: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    previous_close: Optional[float] = None
    timestamp: datetime

class StockInfo(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    employees: Optional[int] = None
    country: Optional[str] = None

class StockHistory(BaseModel):
    symbol: str
    period: str
    interval: str
    data: List[Dict[str, Any]]

class StockSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: Optional[str] = None
    type: Optional[str] = None

class MarketOverview(BaseModel):
    sp500: Optional[StockQuote] = None
    nasdaq: Optional[StockQuote] = None
    dow_jones: Optional[StockQuote] = None
    timestamp: datetime 