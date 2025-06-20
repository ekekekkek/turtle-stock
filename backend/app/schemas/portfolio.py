from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PortfolioBase(BaseModel):
    symbol: str
    company_name: Optional[str] = None

class PortfolioCreate(PortfolioBase):
    pass

class PortfolioUpdate(BaseModel):
    company_name: Optional[str] = None

class PortfolioResponse(PortfolioBase):
    id: int
    user_id: int
    total_shares: float
    average_price: float
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