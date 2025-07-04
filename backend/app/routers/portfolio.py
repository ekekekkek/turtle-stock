from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioTransaction
from app.schemas.portfolio import PortfolioCreate, PortfolioResponse, PortfolioWithTransactions
from app.services.stock_service import stock_service

router = APIRouter()

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

    # 3) Build the transaction record
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

    else:
        # — Create new holding first —
        holding = Portfolio(
            user_id       = current_user.id,
            symbol        = item.symbol.upper(),
            company_name  = info["name"],
            total_shares  = item.shares,
            average_price = item.price
        )
        db.add(holding)
        db.flush()  # now holding.id exists

        txn.portfolio_id = holding.id
        db.add(txn)

    db.commit()
    db.refresh(holding)
    return holding

@router.get("/stocks/{symbol}", response_model=PortfolioWithTransactions)
def get_portfolio_stock(
    symbol:         str,
    current_user:   User    = Depends(get_current_active_user),
    db:             Session = Depends(get_db),
) -> PortfolioWithTransactions:
    """Get one stock’s holding + transactions"""
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
    return {"message": f"{symbol.upper()} removed from portfolio"}

@router.get("/performance")
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

    return summary
