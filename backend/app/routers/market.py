from fastapi import APIRouter
from app.services.stock_service import stock_service
from app.schemas.stock import MarketOverview

router = APIRouter()

@router.get("/overview", response_model=MarketOverview)
def get_market_overview():
    """Get market overview with major indices"""
    overview = stock_service.get_market_overview()
    return overview

@router.get("/trending")
def get_trending_stocks():
    """Get trending stocks"""
    trending = stock_service.get_trending_stocks()
    return trending 