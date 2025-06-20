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
async def add_stock_to_watchlist(
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
    stock_info = await stock_service.get_stock_info(watchlist_item.symbol)
    if not stock_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {watchlist_item.symbol} not found"
        )
    
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
async def get_watchlist_quotes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current quotes for all stocks in watchlist"""
    watchlist = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    
    quotes = []
    for item in watchlist:
        quote = await stock_service.get_stock_quote(item.symbol)
        if quote:
            quotes.append({
                **quote,
                "company_name": item.company_name
            })
    
    return quotes 