from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models import Base

class Portfolio(Base):
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    company_name = Column(String)
    total_shares = Column(Float, default=0)
    average_price = Column(Float, default=0)
    stop_loss_price = Column(Float, default=0)  # Stop loss price per share
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="portfolios")
    transactions = relationship("PortfolioTransaction", back_populates="portfolio", cascade="all, delete-orphan")

class PortfolioTransaction(Base):
    __tablename__ = "portfolio_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    transaction_type = Column(String, nullable=False)  # 'buy' or 'sell'
    shares = Column(Float, nullable=False)
    price_per_share = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")

class TradeHistory(Base):
    __tablename__ = "trade_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    initial_value = Column(Float, nullable=False)  # Total value when bought
    end_value = Column(Float, nullable=False)      # Total value when sold
    net_value = Column(Float, nullable=False)      # end_value - initial_value
    shares = Column(Float, nullable=False)         # Number of shares traded
    buy_price = Column(Float, nullable=False)      # Price per share when bought
    sell_price = Column(Float, nullable=False)     # Price per share when sold
    buy_date = Column(DateTime(timezone=True), nullable=False)
    sell_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="trade_history") 