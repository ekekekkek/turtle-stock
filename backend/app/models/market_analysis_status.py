from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from app.models import Base

class MarketAnalysisStatus(Base):
    __tablename__ = "market_analysis_status"
    id = Column(Integer, primary_key=True, index=True)
    last_run = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) 