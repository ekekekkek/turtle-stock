from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioTransaction
from app.schemas.portfolio import (
    PortfolioCreate, PortfolioResponse, PortfolioWithTransactions,
    TransactionCreate, TransactionResponse
)
from app.services.stock_service import stock_service
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[PortfolioWithTransactions])
def get_user_portfolio(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's portfolio"""
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    return portfolios

@router.post("/stocks", response_model=PortfolioResponse)
async def add_stock_to_portfolio(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add stock to portfolio or buy more shares"""
    # Get stock info to validate symbol
    stock_info = await stock_service.get_stock_info(transaction.symbol)
    if not stock_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {transaction.symbol} not found"
        )
    
    # Check if portfolio already exists for this stock
    portfolio = db.query(Portfolio).filter(
        Portfolio.user_id == current_user.id,
        Portfolio.symbol == transaction.symbol.upper()
    ).first()
    
    if portfolio:
        # Add transaction to existing portfolio
        db_transaction = PortfolioTransaction(
            portfolio_id=portfolio.id,
            transaction_type=transaction.transaction_type,
            shares=transaction.shares,
            price_per_share=transaction.price_per_share,
            total_amount=transaction.shares * transaction.price_per_share,
            transaction_date=transaction.transaction_date,
            notes=transaction.notes
        )
        db.add(db_transaction)
        
        # Update portfolio totals
        all_transactions = db.query(PortfolioTransaction).filter(
            PortfolioTransaction.portfolio_id == portfolio.id
        ).all()
        
        total_shares = sum(t.shares for t in all_transactions)
        total_cost = sum(t.shares * t.price_per_share for t in all_transactions)
        portfolio.total_shares = total_shares
        portfolio.average_price = total_cost / total_shares if total_shares > 0 else 0
        portfolio.company_name = stock_info.get("name", "")
        
    else:
        # Create new portfolio
        portfolio = Portfolio(
            user_id=current_user.id,
            symbol=transaction.symbol.upper(),
            company_name=stock_info.get("name", ""),
            total_shares=transaction.shares,
            average_price=transaction.price_per_share
        )
        db.add(portfolio)
        db.flush()  # Get the portfolio ID
        
        # Add transaction
        db_transaction = PortfolioTransaction(
            portfolio_id=portfolio.id,
            transaction_type=transaction.transaction_type,
            shares=transaction.shares,
            price_per_share=transaction.price_per_share,
            total_amount=transaction.shares * transaction.price_per_share,
            transaction_date=transaction.transaction_date,
            notes=transaction.notes
        )
        db.add(db_transaction)
    
    db.commit()
    db.refresh(portfolio)
    return portfolio

@router.get("/stocks/{symbol}", response_model=PortfolioWithTransactions)
def get_portfolio_stock(
    symbol: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific stock from user's portfolio"""
    portfolio = db.query(Portfolio).filter(
        Portfolio.user_id == current_user.id,
        Portfolio.symbol == symbol.upper()
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {symbol} not found in portfolio"
        )
    
    return portfolio

@router.put("/stocks/{symbol}", response_model=PortfolioResponse)
def update_portfolio_stock(
    symbol: str,
    portfolio_update: PortfolioCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update portfolio stock information"""
    portfolio = db.query(Portfolio).filter(
        Portfolio.user_id == current_user.id,
        Portfolio.symbol == symbol.upper()
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {symbol} not found in portfolio"
        )
    
    portfolio.company_name = portfolio_update.company_name
    db.commit()
    db.refresh(portfolio)
    return portfolio

@router.delete("/stocks/{symbol}")
def remove_stock_from_portfolio(
    symbol: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove stock from portfolio"""
    portfolio = db.query(Portfolio).filter(
        Portfolio.user_id == current_user.id,
        Portfolio.symbol == symbol.upper()
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {symbol} not found in portfolio"
        )
    
    db.delete(portfolio)
    db.commit()
    return {"message": f"Stock {symbol} removed from portfolio"}

@router.get("/performance")
async def get_portfolio_performance(
    period: str = "1y",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get portfolio performance over time"""
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    
    performance_data = []
    total_invested = 0
    total_current = 0
    
    for portfolio in portfolios:
        # Get current stock price
        quote = await stock_service.get_stock_quote(portfolio.symbol)
        if quote:
            current_value = portfolio.total_shares * quote["price"]
            invested_value = portfolio.total_shares * portfolio.average_price
            gain_loss = current_value - invested_value
            gain_loss_percent = (gain_loss / invested_value * 100) if invested_value > 0 else 0
            
            performance_data.append({
                "symbol": portfolio.symbol,
                "shares": portfolio.total_shares,
                "average_price": portfolio.average_price,
                "current_price": quote["price"],
                "invested_value": invested_value,
                "current_value": current_value,
                "gain_loss": gain_loss,
                "gain_loss_percent": gain_loss_percent
            })
            
            total_invested += invested_value
            total_current += current_value
    
    total_gain_loss = total_current - total_invested
    total_gain_loss_percent = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
    
    return {
        "holdings": performance_data,
        "summary": {
            "total_invested": total_invested,
            "total_current": total_current,
            "total_gain_loss": total_gain_loss,
            "total_gain_loss_percent": total_gain_loss_percent
        }
    } 