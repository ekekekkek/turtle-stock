from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Turtle Stock Platform"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://turtle-stock.web.app",
        "https://turtle-stock.firebaseapp.com"
    ]
    
    # Database
    DATABASE_URL: str = "sqlite:///./turtle_stock.db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Finnhub
    FINNHUB_API_KEY: str = "d1k2a5pr01ql1h3a7h5gd1k2a5pr01ql1h3a7h60"
    FINNHUB_BASE_URL: str = "https://finnhub.io/api/v1"

    # Redis (for caching)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str = "turtle-stock"
    # Optional: Path to Firebase service account JSON (for production)
    # If not set, will use default credentials or verify tokens without Admin SDK
    FIREBASE_CREDENTIALS_PATH: str = ""
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings() 