# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timezone
import pytz

from app.core.config import settings
from app.core.database import engine, SessionLocal
from app.models import Base
from app.routers import auth, stocks, portfolio, watchlist, market
from app.routers.signals import router as signals_router

# APScheduler imports
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from app.services.signal_service import signal_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None

def daily_market_job():
    """Daily market analysis job with comprehensive error handling"""
    logger.info("[Scheduler] Starting daily market analysis...")
    start_time = datetime.now()
    
    db = SessionLocal()
    try:
        # Check if analysis already exists for today
        from app.models.signal import Signal
        today = datetime.now(timezone.utc).date()
        existing_signals = db.query(Signal).filter(Signal.date == today).first()
        
        if existing_signals:
            logger.info(f"[Scheduler] Analysis already completed for {today}")
            return
        
        # Run the analysis
        signals = signal_service.generate_daily_market_analysis(db)
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info(f"[Scheduler] Daily market analysis completed successfully!")
        logger.info(f"[Scheduler] Generated {len(signals)} signals in {duration:.2f} seconds")
        
    except Exception as e:
        logger.error(f"[Scheduler] Error during daily market analysis: {str(e)}")
        logger.exception("Full traceback:")
    finally:
        db.close()

def job_listener(event):
    """Listen for job execution events"""
    if event.exception:
        logger.error(f"[Scheduler] Job failed: {event.exception}")
        logger.error(f"[Scheduler] Job traceback: {event.traceback}")
    else:
        logger.info(f"[Scheduler] Job executed successfully: {event.job_id}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    global scheduler
    logger.info("Starting up Turtle Stock Platform...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize and start scheduler
    try:
        scheduler = BackgroundScheduler(
            timezone=pytz.timezone('US/Eastern'),
            job_defaults={'max_instances': 1, 'coalesce': True}
        )
        
        # Add job listener for monitoring
        scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)
        
        # Primary run: After market close (5:00 PM ET)
        scheduler.add_job(
            daily_market_job, 
            CronTrigger(hour=17, minute=0, timezone='US/Eastern'),
            id='daily_market_analysis',
            name='Daily Market Analysis - After Close',
            replace_existing=True
        )
        
        # Backup run: Market open (9:30 AM ET) - in case after-hours run fails
        scheduler.add_job(
            daily_market_job, 
            CronTrigger(hour=9, minute=30, timezone='US/Eastern'),
            id='daily_market_analysis_backup',
            name='Daily Market Analysis - Market Open (Backup)',
            replace_existing=True
        )
        
        # Weekend cleanup job (Saturday at 2:00 AM ET)
        scheduler.add_job(
            lambda: logger.info("[Scheduler] Weekend cleanup job executed"),
            CronTrigger(day_of_week='sat', hour=2, minute=0, timezone='US/Eastern'),
            id='weekend_cleanup',
            name='Weekend Cleanup',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("✅ Scheduler started successfully!")
        logger.info("📅 Jobs scheduled:")
        for job in scheduler.get_jobs():
            logger.info(f"   - {job.name}: {job.next_run_time}")
            
    except Exception as e:
        logger.error(f"Failed to start scheduler: {str(e)}")
        logger.exception("Scheduler startup error:")
    
    yield
    
    # --- shutdown ---
    logger.info("Shutting down Turtle Stock Platform...")
    if scheduler:
        try:
            scheduler.shutdown()
            logger.info("✅ Scheduler shut down successfully")
        except Exception as e:
            logger.error(f"Error shutting down scheduler: {str(e)}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS must come before including any routers ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,                   # allow Authorization header / cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API routes, all prefixed with your version string ---
app.include_router(auth.router,      prefix=f"{settings.API_V1_STR}/auth",      tags=["Authentication"])
app.include_router(stocks.router,    prefix=f"{settings.API_V1_STR}/stocks",    tags=["Stocks"])
app.include_router(portfolio.router, prefix=f"{settings.API_V1_STR}/portfolio", tags=["Portfolio"])
app.include_router(watchlist.router, prefix=f"{settings.API_V1_STR}/watchlist", tags=["Watchlist"])
app.include_router(market.router,    prefix=f"{settings.API_V1_STR}/market",    tags=["Market"])
app.include_router(signals_router,   prefix=f"{settings.API_V1_STR}/signals",   tags=["Signals"])

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
