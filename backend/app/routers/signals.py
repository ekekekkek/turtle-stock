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
from datetime import datetime, timezone

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
    """Get all market-wide signals, most recent first."""
    try:
        signals = db.query(Signal).filter(
            Signal.user_id == 0  # Market-wide signals
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
    """Get only BUY signals from today's market analysis."""
    try:
        signals = signal_service.get_user_signals_from_analysis(db, current_user)
        # Filter for only BUY signals (signal_triggered = 1)
        buy_signals = [signal for signal in signals if signal.signal_triggered == 1]
        return buy_signals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch buy signals: {str(e)}")

@router.get("/unique-stocks-count")
def get_unique_stocks_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the count of unique stocks analyzed today."""
    try:
        count = signal_service.get_unique_stocks_count(db)
        return {"unique_stocks_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unique stocks count: {str(e)}")

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
    """Get the status of market analysis and scheduler."""
    try:
        # Get market analysis status
        status = db.query(MarketAnalysisStatus).first()
        
        # Get scheduler status from main.py
        from main import scheduler
        
        scheduler_info = {}
        if scheduler and scheduler.running:
            jobs = []
            for job in scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger)
                })
            
            scheduler_info = {
                "status": "running",
                "jobs": jobs
            }
        else:
            scheduler_info = {
                "status": "stopped",
                "jobs": []
            }
        
        return {
            "market_analysis": {
                "last_run": status.last_run.isoformat() if status and status.last_run else None,
                "status": "completed" if status and status.last_run else "pending"
            },
            "scheduler": scheduler_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.get("/scheduler/status")
def get_scheduler_status():
    """Get detailed scheduler status and health."""
    try:
        from main import scheduler
        
        if not scheduler:
            return {
                "status": "not_initialized",
                "running": False,
                "jobs": [],
                "error": "Scheduler not initialized"
            }
        
        jobs = []
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
                "active": True
            })
        
        return {
            "status": "running" if scheduler.running else "stopped",
            "running": scheduler.running,
            "jobs": jobs,
            "job_count": len(jobs),
            "timezone": str(scheduler.timezone) if scheduler.timezone else "UTC"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scheduler status: {str(e)}")

@router.post("/scheduler/trigger")
def trigger_manual_analysis(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually trigger market analysis (admin only)."""
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Admin privileges required.")
    
    try:
        signals = signal_service.generate_daily_market_analysis(db)
        return {
            "message": f"Manual market analysis completed. Generated {len(signals)} signals.",
            "signals_count": len(signals),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger analysis: {str(e)}")

@router.post("/tasks/run-daily")
def run_daily_tasks(
    token: str,
    db: Session = Depends(get_db)
):
    """Protected endpoint for running daily tasks via external scheduler (GitHub Actions)."""
    # Simple token-based authentication for external schedulers
    import os
    expected_token = os.getenv("DAILY_TASKS_TOKEN", "default_token_for_dev")
    
    if token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        # Run the daily market analysis
        signals = signal_service.generate_daily_market_analysis(db)
        
        return {
            "message": "Daily tasks completed successfully",
            "signals_generated": len(signals),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run daily tasks: {str(e)}") 