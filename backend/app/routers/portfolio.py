from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioTransaction, TradeHistory
from app.schemas.portfolio import (
    PortfolioCreate, PortfolioResponse, PortfolioWithTransactions,
    UserSettings, UserSettingsResponse, PositionSizeRequest, PositionSizeResponse,
    SellStockRequest, TradeHistoryResponse, PortfolioPerformanceResponse
)
from app.services.stock_service import stock_service
from fastapi.responses import JSONResponse

router = APIRouter()

def _update_all_holdings_stop_loss(user_id: int, db: Session):
    """Update stop loss prices for all holdings based on distributed risk"""
    from app.models.portfolio import Portfolio
    from app.models.portfolio import PortfolioTransaction
    
    # Get all holdings for the user
    holdings = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    
    # Calculate distributed risk
    distributed_risk = stock_service.calculate_distributed_risk(user_id, db)
    if not distributed_risk:
        return
    
    # Update each holding's stop loss price
    for holding in holdings:
        if holding.symbol in distributed_risk:
            stock_risk_amount = distributed_risk[holding.symbol]
            if holding.total_shares > 0:
                # Calculate new stop loss price based on distributed risk
                new_stop_loss_price = holding.average_price - (stock_risk_amount / holding.total_shares)
                holding.stop_loss_price = new_stop_loss_price
    
    db.commit()

@router.get("/", response_model=List[PortfolioWithTransactions])
def get_user_portfolio(
    current_user: User = Depends(get_current_active_user),
    db: Session      = Depends(get_db),
):
    """
    Get the full portfolio *with* its transactions.
    """
    return (
        db.query(Portfolio)
          .options(joinedload(Portfolio.transactions))
          .filter(Portfolio.user_id == current_user.id)
          .all()
    )

@router.post("/stocks", response_model=PortfolioResponse)
def add_stock_to_portfolio(
    item:           PortfolioCreate,
    current_user:   User    = Depends(get_current_active_user),
    db:             Session = Depends(get_db),
) -> PortfolioResponse:
    """Buy shares of a stock (adds transaction, creates or updates holding)"""
    # Defensive check for None values
    if (
        current_user.risk_tolerance is not None and current_user.capital is not None
        and current_user.risk_tolerance > 0 and current_user.capital > 0
    ):
        # 1) Validate symbol & fetch company name (synchronous call)
        info = stock_service.get_stock_info(item.symbol)
        if not info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock {item.symbol} not found"
            )

        # 2) See if we already hold this symbol
        holding = (
            db.query(Portfolio)
              .filter(
                Portfolio.user_id == current_user.id,
                Portfolio.symbol  == item.symbol.upper()
              )
              .first()
        )

        # 3) Calculate stop loss price based on distributed risk across all stocks
        stop_loss_price = 0
        
        # Calculate distributed risk across all stocks
        distributed_risk = stock_service.calculate_distributed_risk(current_user.id, db, item.symbol.upper())
        if not distributed_risk or item.symbol.upper() not in distributed_risk:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to calculate distributed risk"
            )
        
        # Get risk amount for this specific stock
        stock_risk_amount = distributed_risk[item.symbol.upper()]
        
        # Calculate stop loss price based on distributed risk
        stop_loss_price = item.price - (stock_risk_amount / item.shares)

        # 4) Build the transaction record
        txn = PortfolioTransaction(
            portfolio_id     = holding.id if holding else None,
            transaction_type = "buy",
            shares           = item.shares,
            price_per_share  = item.price,
            total_amount     = item.shares * item.price,
            transaction_date = item.date
        )

        if holding:
            # — Attach new txn and recalc aggregates —
            db.add(txn)
            all_txns = (
                db.query(PortfolioTransaction)
                  .filter(PortfolioTransaction.portfolio_id == holding.id)
                  .all()
            )
            total_shares = sum(t.shares for t in all_txns)
            total_cost   = sum(t.total_amount for t in all_txns)

            holding.total_shares  = total_shares
            holding.average_price = (total_cost / total_shares) if total_shares else 0
            holding.company_name  = info["name"]
            holding.stop_loss_price = stop_loss_price
            
            # Update stop loss prices for all existing holdings based on new distributed risk
            _update_all_holdings_stop_loss(current_user.id, db)

        else:
            # — Create new holding first —
            holding = Portfolio(
                user_id       = current_user.id,
                symbol        = item.symbol.upper(),
                company_name  = info["name"],
                total_shares  = item.shares,
                average_price = item.price,
                stop_loss_price = stop_loss_price
            )
            db.add(holding)
            db.flush()  # now holding.id exists

            txn.portfolio_id = holding.id
            db.add(txn)

        db.commit()
        
        # Update stop loss prices for all holdings based on new distributed risk
        _update_all_holdings_stop_loss(current_user.id, db)
        
        db.refresh(holding)
        return holding
    else:
        # Handle the case where values are missing or invalid
        return JSONResponse(status_code=400, content={"detail": "Please set your risk tolerance and capital in your profile before adding stocks."})

@router.get("/stocks/{symbol}", response_model=PortfolioWithTransactions)
def get_portfolio_stock(
    symbol:         str,
    current_user:   User    = Depends(get_current_active_user),
    db:             Session = Depends(get_db),
) -> PortfolioWithTransactions:
    """Get one stock's holding + transactions"""
    holding = (
        db.query(Portfolio)
          .filter(
            Portfolio.user_id == current_user.id,
            Portfolio.symbol  == symbol.upper()
          )
          .first()
    )
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No holding for {symbol}"
        )
    return holding

@router.put("/stocks/{symbol}", response_model=PortfolioResponse)
def update_portfolio_stock(
    symbol:         str,
    update:         PortfolioCreate,
    current_user:   User    = Depends(get_current_active_user),
    db:             Session = Depends(get_db),
) -> PortfolioResponse:
    """Only allows changing company_name (expand as needed)"""
    holding = (
        db.query(Portfolio)
          .filter(
            Portfolio.user_id == current_user.id,
            Portfolio.symbol  == symbol.upper()
          )
          .first()
    )
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No holding for {symbol}"
        )
    holding.company_name = update.company_name or holding.company_name
    db.commit()
    db.refresh(holding)
    return holding

@router.delete("/stocks/{symbol}")
def remove_stock_from_portfolio(
    symbol:         str,
    current_user:   User    = Depends(get_current_active_user),
    db:             Session = Depends(get_db),
):
    """Delete an entire holding (and cascade its transactions)"""
    holding = (
        db.query(Portfolio)
          .filter(
            Portfolio.user_id == current_user.id,
            Portfolio.symbol  == symbol.upper()
          )
          .first()
    )
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No holding for {symbol}"
        )
    db.delete(holding)
    db.commit()
    
    # Recalculate stop loss prices for all remaining holdings after deletion
    _update_all_holdings_stop_loss(current_user.id, db)
    
    return {"message": f"{symbol.upper()} removed from portfolio"}

@router.get("/performance", response_model=PortfolioPerformanceResponse)
def get_portfolio_performance(
    period:         str     = "1y",
    current_user:   User    = Depends(get_current_active_user),
    db:             Session = Depends(get_db),
):
    """Calculate P/L for each holding and overall summary"""
    holdings = (
        db.query(Portfolio)
          .filter(Portfolio.user_id == current_user.id)
          .all()
    )

    summary = {"holdings": [], "summary": {}}
    total_invested = total_current = 0.0

    for h in holdings:
        quote = stock_service.get_stock_quote(h.symbol)
        if not quote:
            continue

        invested = h.total_shares * h.average_price
        current  = h.total_shares * quote["price"]
        gain     = current - invested

        summary["holdings"].append({
            "symbol":             h.symbol,
            "shares":             h.total_shares,
            "average_price":      h.average_price,
            "current_price":      quote["price"],
            "invested_value":     invested,
            "current_value":      current,
            "gain_loss":          gain,
            "gain_loss_percent":  (gain / invested * 100) if invested else 0,
            "stop_loss_price":    h.stop_loss_price,
        })
        total_invested += invested
        total_current  += current

    total_gain = total_current - total_invested
    summary["summary"] = {
        "total_invested":          total_invested,
        "total_current":           total_current,
        "total_gain_loss":         total_gain,
        "total_gain_loss_percent": (total_gain / total_invested * 100) if total_invested else 0,
    }

    # Use defaults if None
    capital = current_user.capital if current_user.capital is not None else 10000
    risk = current_user.risk_tolerance if current_user.risk_tolerance is not None else 1
    user_settings = UserSettingsResponse(
        capital=capital,
        risk_tolerance=risk,
        max_loss_limit=capital * (risk / 100)
    )

    # Get trade history
    trade_history = (
        db.query(TradeHistory)
          .filter(TradeHistory.user_id == current_user.id)
          .order_by(TradeHistory.sell_date.desc())
          .all()
    )

    return PortfolioPerformanceResponse(
        holdings=summary["holdings"],
        summary=summary["summary"],
        trade_history=trade_history,
        user_settings=user_settings
    )

# New endpoints for enhanced portfolio features

@router.get("/settings", response_model=UserSettingsResponse)
def get_user_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's portfolio settings"""
    return UserSettingsResponse(
        capital=current_user.capital,
        risk_tolerance=current_user.risk_tolerance,
        max_loss_limit=current_user.capital * (current_user.risk_tolerance / 100)
    )

@router.put("/settings", response_model=UserSettingsResponse)
def update_user_settings(
    settings: UserSettings,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update user's portfolio settings and recalculate all stop loss prices"""
    current_user.capital = settings.capital
    current_user.risk_tolerance = settings.risk_tolerance
    db.commit()
    db.refresh(current_user)
    
    # Recalculate stop loss prices for all holdings based on new risk settings
    _update_all_holdings_stop_loss(current_user.id, db)
    
    return UserSettingsResponse(
        capital=current_user.capital,
        risk_tolerance=current_user.risk_tolerance,
        max_loss_limit=current_user.capital * (current_user.risk_tolerance / 100)
    )

@router.post("/position-size", response_model=PositionSizeResponse)
def calculate_position_size(
    request: PositionSizeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Calculate recommended position size based on distributed risk"""
    result = stock_service.calculate_position_size_with_distributed_risk(
        request.symbol, 
        current_user.id,
        db,
        request.capital, 
        request.risk_percent, 
        request.window
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return PositionSizeResponse(**result)

@router.get("/risk-distribution")
def get_risk_distribution(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get current risk distribution across all stocks in portfolio"""
    distributed_risk = stock_service.calculate_distributed_risk(current_user.id, db)
    
    # Get all holdings for context
    holdings = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    holdings_info = []
    
    for holding in holdings:
        holdings_info.append({
            "symbol": holding.symbol,
            "shares": holding.total_shares,
            "average_price": holding.average_price,
            "stop_loss_price": holding.stop_loss_price,
            "risk_amount": distributed_risk.get(holding.symbol, 0)
        })
    
    return {
        "total_capital": current_user.capital,
        "total_risk_percent": current_user.risk_tolerance,
        "total_risk_amount": current_user.capital * (current_user.risk_tolerance / 100),
        "number_of_stocks": len(holdings),
        "risk_per_stock": distributed_risk.get(list(distributed_risk.keys())[0], 0) if distributed_risk else 0,
        "holdings": holdings_info,
        "distributed_risk": distributed_risk
    }

@router.post("/stocks/{symbol}/sell", response_model=TradeHistoryResponse)
def sell_stock(
    symbol: str,
    sell_data: SellStockRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Sell shares of a stock and record the trade"""
    # Get the holding
    holding = (
        db.query(Portfolio)
          .filter(
            Portfolio.user_id == current_user.id,
            Portfolio.symbol == symbol.upper()
          )
          .first()
    )
    
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No holding for {symbol}"
        )
    
    if sell_data.shares > holding.total_shares:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot sell more shares than owned. You have {holding.total_shares} shares."
        )
    
    # Calculate values
    initial_value = holding.average_price * sell_data.shares
    end_value = sell_data.price_per_share * sell_data.shares
    net_value = end_value - initial_value
    
    # Create sell transaction
    sell_txn = PortfolioTransaction(
        portfolio_id=holding.id,
        transaction_type="sell",
        shares=sell_data.shares,
        price_per_share=sell_data.price_per_share,
        total_amount=end_value,
        transaction_date=sell_data.sell_date
    )
    db.add(sell_txn)
    
    # Update holding
    remaining_shares = holding.total_shares - sell_data.shares
    if remaining_shares <= 0:
        # Sell all shares - delete the holding
        db.delete(holding)
    else:
        # Update remaining shares
        holding.total_shares = remaining_shares
        # Recalculate average price if needed (for partial sells)
        if sell_data.shares < holding.total_shares:
            # This is a partial sell, average price stays the same
            pass
    
    # Record trade history
    trade_record = TradeHistory(
        user_id=current_user.id,
        symbol=symbol.upper(),
        initial_value=initial_value,
        end_value=end_value,
        net_value=net_value,
        shares=sell_data.shares,
        buy_price=holding.average_price,
        sell_price=sell_data.price_per_share,
        buy_date=holding.created_at,  # Use creation date as buy date
        sell_date=sell_data.sell_date
    )
    db.add(trade_record)
    
    db.commit()
    
    # Recalculate stop loss prices for all remaining holdings after selling
    _update_all_holdings_stop_loss(current_user.id, db)
    
    db.refresh(trade_record)
    
    return trade_record

@router.get("/trade-history", response_model=List[TradeHistoryResponse])
def get_trade_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's trade history"""
    trades = (
        db.query(TradeHistory)
          .filter(TradeHistory.user_id == current_user.id)
          .order_by(TradeHistory.sell_date.desc())
          .all()
    )
    return trades
