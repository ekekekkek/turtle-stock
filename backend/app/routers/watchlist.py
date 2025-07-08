from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.watchlist import Watchlist
from app.schemas.watchlist import WatchlistCreate, WatchlistResponse
from app.services.stock_service import stock_service

router = APIRouter()

@router.get("/", response_model=List[WatchlistResponse])
def get_user_watchlist(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's watchlist"""
    watchlist = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    return watchlist

@router.post("/stocks", response_model=WatchlistResponse)
def add_stock_to_watchlist(
    watchlist_item: WatchlistCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add stock to watchlist"""
    # Check if stock already in watchlist
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.symbol == watchlist_item.symbol.upper()
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock {watchlist_item.symbol} already in watchlist"
        )
    
    # Get stock info to validate symbol and get company name
    stock_info = stock_service.get_stock_info(watchlist_item.symbol)
    
    # Create watchlist item
    db_watchlist = Watchlist(
        user_id=current_user.id,
        symbol=watchlist_item.symbol.upper(),
        company_name=stock_info.get("name", watchlist_item.company_name)
    )
    db.add(db_watchlist)
    db.commit()
    db.refresh(db_watchlist)
    return db_watchlist

@router.delete("/stocks/{symbol}")
def remove_stock_from_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove stock from watchlist"""
    watchlist_item = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.symbol == symbol.upper()
    ).first()
    
    if not watchlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {symbol} not found in watchlist"
        )
    
    db.delete(watchlist_item)
    db.commit()
    return {"message": f"Stock {symbol} removed from watchlist"}

@router.get("/quotes")
def get_watchlist_quotes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current quotes for all stocks in watchlist with technical indicators"""
    watchlist = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    
    quotes = []
    for item in watchlist:
        # try enhanced lookup with technical indicators...
        quote = stock_service.get_enhanced_stock_quote(item.symbol)
        # ...but if it failed, return a zero‐filled stub instead
        if quote is None:
            from datetime import datetime
            quote = {
                "symbol":         item.symbol,
                "price":          0.0,
                "change":         0.0,
                "change_percent": 0.0,
                "volume":         0,
                "market_cap":     None,
                "high":           None,
                "low":            None,
                "open":           None,
                "previous_close": None,
                "timestamp":      datetime.utcnow(),
                "high_20d":       0.0,
                "sma_50d":        0.0,
                "sma_200d":       0.0,
                "high_52w":       0.0,
                "atr":            0.0
            }
        # always include the stored company_name
        quote["company_name"] = item.company_name
        quotes.append(quote)
    
    return quotes 