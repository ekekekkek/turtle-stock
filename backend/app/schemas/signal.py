from pydantic import BaseModel
from typing import Optional
from datetime import date

class SignalBase(BaseModel):
    symbol: str
    date: date
    close: float
    high_20d: float
    sma_50d: float
    sma_200d: float
    high_52w: float
    atr: float
    signal_triggered: int

class SignalResponse(SignalBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True 