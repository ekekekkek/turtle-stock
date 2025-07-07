from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import date, datetime

class PortfolioBase(BaseModel):
    symbol: str
    company_name: Optional[str] = None


class PortfolioCreate(BaseModel):
    symbol: str
    shares: float
    price: float
    date: date

class PortfolioUpdate(BaseModel):
    company_name: Optional[str] = None

class PortfolioResponse(PortfolioBase):
    id: int
    user_id: int
    total_shares: float
    average_price: float
    stop_loss_price: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    transaction_type: str  # 'buy' or 'sell'
    shares: float
    price_per_share: float
    transaction_date: datetime
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    portfolio_id: int
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

class PortfolioWithTransactions(PortfolioResponse):
    transactions: List[TransactionResponse] = []

# New schemas for enhanced portfolio features
class UserSettings(BaseModel):
    capital: float = Field(..., gt=0, description="Total capital in dollars")
    risk_tolerance: float = Field(..., ge=0, le=100, description="Risk tolerance as percentage")

class UserSettingsResponse(UserSettings):
    max_loss_limit: float

class PositionSizeRequest(BaseModel):
    symbol: str
    capital: float
    risk_percent: float
    window: Optional[int] = 14

class PositionSizeResponse(BaseModel):
    symbol: str
    current_price: float
    atr: float
    stop_loss_price: float
    recommended_shares: float
    position_value: float
    risk_amount: float
    stop_loss_distance: float
    volatility_source: Optional[str] = None
    distributed_risk: Optional[Dict[str, float]] = None

class SellStockRequest(BaseModel):
    shares: float = Field(..., gt=0)
    price_per_share: float = Field(..., gt=0)
    sell_date: date

class TradeHistoryResponse(BaseModel):
    id: int
    symbol: str
    initial_value: float
    end_value: float
    net_value: float
    shares: float
    buy_price: float
    sell_price: float
    buy_date: datetime
    sell_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class PortfolioPerformanceResponse(BaseModel):
    holdings: List[dict]
    summary: dict
    trade_history: List[TradeHistoryResponse]
    user_settings: UserSettingsResponse 