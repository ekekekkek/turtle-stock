# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.routers import auth, stocks, portfolio, watchlist, market

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    print("Starting up Turtle Stock Platform...")
    Base.metadata.create_all(bind=engine)
    yield
    # --- shutdown ---
    print("Shutting down Turtle Stock Platform...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS must come before including any routers ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,   # pulled from your .env via pydantic
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
