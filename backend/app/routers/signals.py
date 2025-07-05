from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.signal import SignalResponse
from app.models.signal import Signal
from app.services.signal_service import signal_service
from app.models.market_analysis_status import MarketAnalysisStatus

router = APIRouter()

@router.post("/generate", response_model=List[SignalResponse])
def generate_signals(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate daily market analysis and return signals for the current user."""
    try:
        # This will either use existing analysis or generate new one
        signals = signal_service.get_user_signals_from_analysis(db, current_user)
        return signals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signals: {str(e)}")

@router.post("/analyze-market")
def analyze_market(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Force a new daily market analysis (admin function)."""
    try:
        signals = signal_service.generate_daily_market_analysis(db)
        return {"message": f"Market analysis completed. Generated {len(signals)} signals."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze market: {str(e)}")

@router.get("/", response_model=List[SignalResponse])
def get_signals(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all signals for the current user, most recent first."""
    try:
        signals = db.query(Signal).filter(
            Signal.user_id == current_user.id
        ).order_by(Signal.date.desc(), Signal.symbol).all()
        return signals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch signals: {str(e)}")

@router.get("/today", response_model=List[SignalResponse])
def get_today_signals(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get today's signals for the current user from daily market analysis."""
    try:
        signals = signal_service.get_user_signals_from_analysis(db, current_user)
        return signals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch today's signals: {str(e)}")

@router.get("/buy-signals", response_model=List[SignalResponse])
def get_buy_signals(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get only BUY signals for the current user from today's analysis."""
    try:
        signals = signal_service.get_user_signals_from_analysis(db, current_user)
        # Filter for only BUY signals (signal_triggered = 1)
        buy_signals = [signal for signal in signals if signal.signal_triggered == 1]
        return buy_signals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch buy signals: {str(e)}")

@router.post("/admin/force-analyze")
def admin_force_analyze(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Admin-only: Force a new daily market analysis (for debugging)."""
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Admin privileges required.")
    try:
        signals = signal_service.generate_daily_market_analysis(db)
        return {"message": f"Admin forced market analysis. Generated {len(signals)} signals."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to force analyze market: {str(e)}")

@router.get("/status")
def get_analysis_status(db: Session = Depends(get_db)):
    status = db.query(MarketAnalysisStatus).first()
    return {"last_run": status.last_run.isoformat() if status and status.last_run else None} 