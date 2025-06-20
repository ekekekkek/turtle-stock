from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional, List
from app.services.stock_service import stock_service
from app.schemas.stock import StockQuote, StockInfo, StockHistory, StockSearchResult

router = APIRouter()

@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    """Get real-time stock quote"""
    quote = await stock_service.get_stock_quote(symbol)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock quote not found for {symbol}"
        )
    return quote

@router.get("/{symbol}/info", response_model=StockInfo)
async def get_stock_info(symbol: str):
    """Get detailed stock information"""
    info = await stock_service.get_stock_info(symbol)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock info not found for {symbol}"
        )
    return info

@router.get("/{symbol}/history", response_model=StockHistory)
async def get_stock_history(
    symbol: str,
    period: str = Query("1d", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1m", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)")
):
    """Get historical stock data"""
    history = await stock_service.get_stock_history(symbol, period, interval)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Historical data not found for {symbol}"
        )
    return history

@router.get("/search", response_model=List[StockSearchResult])
async def search_stocks(q: str = Query(..., description="Search query for stock symbol or company name")):
    """Search for stocks by symbol or company name"""
    if len(q) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters long"
        )
    
    results = await stock_service.search_stocks(q)
    return results

@router.get("/trending", response_model=List[StockQuote])
async def get_trending_stocks():
    """Get trending stocks"""
    trending = await stock_service.get_trending_stocks()
    return trending 