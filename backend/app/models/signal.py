from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base

class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)

    close = Column(Float)
    high_20d = Column(Float)
    sma_50d = Column(Float)
    sma_200d = Column(Float)
    high_52w = Column(Float)
    atr = Column(Float)
    signal_triggered = Column(Integer, default=0)  # 1 if all 4 conditions met

    # Relationships
    user = relationship("User") 