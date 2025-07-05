import finnhub
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import Signal, Watchlist, User
from app.core.config import settings
import numpy as np
import requests
from app.models.market_analysis_status import MarketAnalysisStatus

_fh = finnhub.Client(api_key=settings.FINNHUB_API_KEY)

class SignalService:
    def __init__(self):
        # S&P 500 and Nasdaq stocks - we'll fetch these dynamically
        self.sp500_symbols = []
        self.nasdaq_symbols = []
        self.all_symbols = []
        
        # Initialize stock lists
        self.initialize_stock_lists()
    
    def initialize_stock_lists(self):
        """Initialize S&P 500 and Nasdaq-100 stock lists"""
        try:
            # Full S&P 500 list (as of 2024, static)
            self.sp500_symbols = [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ', 'JPM', 'V', 'PG', 'HD', 'MA', 'PFE', 'ABBV', 'AVGO', 'KO', 'PEP', 'COST', 'TMO', 'ACN', 'DHR', 'NEE', 'LLY', 'ABT', 'TXN', 'VZ', 'NKE', 'ADBE', 'HON', 'NFLX', 'PM', 'INTC', 'IBM', 'UNP', 'RTX', 'QCOM', 'AMD', 'T', 'INTU', 'AMGN', 'ISRG', 'SPY', 'VOO', 'IVV', 'QQQ', 'VTI', 'IWM', 'VEA', 'VWO', 'BND', 'GLD', 'SLV',
                # ... (add all S&P 500 tickers here, truncated for brevity)
            ]
            # Nasdaq-100 list (as of 2024, static)
            self.nasdaq_symbols = [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'ADBE', 'PYPL', 'INTC', 'AMD', 'CSCO', 'QCOM', 'AVGO', 'TXN', 'MU', 'KLAC', 'LRCX', 'AMAT', 'ADI', 'ASML', 'SNPS', 'CDNS', 'MCHP', 'MRVL', 'WDAY', 'ZM', 'TEAM', 'OKTA', 'CRWD', 'ZS', 'PLTR', 'SNOW', 'DDOG', 'NET', 'SQ', 'SHOP', 'ROKU', 'TTD', 'PINS', 'SNAP', 'UBER', 'LYFT', 'DASH', 'ABNB', 'GOOG', 'REGN', 'VRTX', 'SBUX', 'MDLZ', 'CSX', 'ADP', 'ISRG', 'GILD', 'BKNG', 'MAR', 'MNST', 'CTAS', 'AEP', 'KDP', 'XEL', 'PCAR', 'FAST', 'CDW', 'PAYX', 'ROST', 'IDXX', 'WBA', 'EXC', 'EA', 'BIDU', 'NTES', 'JD', 'PDD', 'BMRN', 'ALGN', 'SIRI', 'VRSK', 'CGEN', 'ILMN', 'SGEN', 'BIIB', 'INCY', 'TCOM', 'CHTR', 'DLTR', 'MELI', 'CPRT', 'CTSH', 'DXCM', 'FISV', 'LULU', 'ORLY', 'TTWO', 'WBD', 'ZS', 'CRWD', 'DDOG', 'DOCU', 'OKTA', 'SNOW', 'TEAM', 'VRSN', 'ANSS', 'ASML', 'CDNS', 'CERN', 'FTNT', 'MCHP', 'MPWR', 'PTC', 'SWKS', 'TER', 'TXN', 'XLNX', 'ZM'
                # ... (add all Nasdaq-100 tickers here, truncated for brevity)
            ]
            # Combine and remove duplicates
            self.all_symbols = list(set(self.sp500_symbols + self.nasdaq_symbols))
            print(f"Initialized with {len(self.all_symbols)} unique stocks (S&P 500 + Nasdaq-100)")
        except Exception as e:
            print(f"Error initializing stock lists: {e}")
            # Fallback to basic list
            self.all_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX']
    
    def fetch_ohlcv(self, symbol: str, days: int = 252):
        """Fetch daily OHLCV data for the past N days from Finnhub"""
        try:
            now = int(datetime.now(timezone.utc).timestamp())
            start = now - days * 24 * 3600
            resp = _fh.stock_candles(symbol, 'D', start, now)
            if resp.get('s') != 'ok':
                return None
            return resp
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None

    def calculate_indicators(self, ohlcv):
        closes = np.array(ohlcv['c'])
        highs = np.array(ohlcv['h'])
        lows = np.array(ohlcv['l'])
        # 20-day high
        high_20d = float(np.max(closes[-20:])) if len(closes) >= 20 else None
        # 50-day SMA
        sma_50d = float(np.mean(closes[-50:])) if len(closes) >= 50 else None
        # 200-day SMA
        sma_200d = float(np.mean(closes[-200:])) if len(closes) >= 200 else None
        # 52-week high
        high_52w = float(np.max(closes[-252:])) if len(closes) >= 252 else None
        # ATR (14-day)
        tr = np.maximum(highs[1:] - lows[1:], np.abs(highs[1:] - closes[:-1]), np.abs(lows[1:] - closes[:-1]))
        atr = float(np.mean(tr[-14:])) if len(tr) >= 14 else None
        return high_20d, sma_50d, sma_200d, high_52w, atr

    def check_signal_conditions(self, close, high_20d, sma_50d, sma_200d, high_52w):
        """Check if stock meets signal conditions"""
        cond1 = close >= high_20d if high_20d else False
        cond2 = close > sma_50d if sma_50d else False
        cond3 = sma_50d > sma_200d if sma_50d and sma_200d else False
        cond4 = close >= 0.97 * high_52w if high_52w else False
        return cond1 and cond2 and cond3 and cond4

    def calculate_position_size(self, close, stop_loss, risk_tolerance, capital):
        """Calculate position size based on risk management"""
        if not stop_loss or stop_loss <= 0:
            return 0
        risk = (risk_tolerance or 1) / 100
        risk_per_share = close - stop_loss
        if risk_per_share <= 0:
            return 0
        return int(capital * risk / risk_per_share)

    def update_last_run(self, db: Session):
        status = db.query(MarketAnalysisStatus).first()
        now = datetime.now(timezone.utc)
        if not status:
            status = MarketAnalysisStatus(last_run=now)
            db.add(status)
        else:
            status.last_run = now
        db.commit()

    def generate_daily_market_analysis(self, db: Session):
        """Generate daily analysis for all S&P 500 and Nasdaq stocks"""
        today = datetime.now(timezone.utc).date()
        
        # Check if analysis already done for today
        existing_signals = db.query(Signal).filter(Signal.date == today).first()
        if existing_signals:
            print(f"Market analysis already completed for {today}")
            return []
        
        print(f"Starting daily market analysis for {len(self.all_symbols)} stocks...")
        signals = []
        successful_analysis = 0
        
        for symbol in self.all_symbols:
            try:
                print(f"Analyzing {symbol}...")
                ohlcv = self.fetch_ohlcv(symbol)
                if not ohlcv or len(ohlcv['c']) < 252:
                    print(f"Skipping {symbol}: insufficient data")
                    continue
                
                high_20d, sma_50d, sma_200d, high_52w, atr = self.calculate_indicators(ohlcv)
                close = ohlcv['c'][-1]
                
                # Check signal conditions
                signal_triggered = self.check_signal_conditions(close, high_20d, sma_50d, sma_200d, high_52w)
                
                # Calculate stop loss
                stop_loss = close - 2 * atr if atr else None
                
                print(f"{symbol}: Close=${close:.2f}, Signal={'BUY' if signal_triggered else 'HOLD'}")
                
                # Create signal for all users
                for user in db.query(User).all():
                    # Calculate personalized position size based on user's risk tolerance and capital
                    user_position_size = self.calculate_position_size(
                        close, stop_loss, user.risk_tolerance, user.capital
                    )
                    
                    signal = Signal(
                        user_id=user.id,
                        symbol=symbol,
                        date=today,
                        close=close,
                        high_20d=high_20d or 0,
                        sma_50d=sma_50d or 0,
                        sma_200d=sma_200d or 0,
                        high_52w=high_52w or 0,
                        atr=atr or 0,
                        stop_loss=stop_loss or 0,
                        position_size=user_position_size,
                        signal_triggered=int(signal_triggered)
                    )
                    signals.append(signal)
                    db.add(signal)
                
                successful_analysis += 1
                
            except Exception as e:
                print(f"Error processing {symbol}: {e}")
                continue
        
        db.commit()
        self.update_last_run(db)
        print(f"Completed daily analysis: {successful_analysis}/{len(self.all_symbols)} stocks analyzed")
        print(f"Generated {len(signals)} signals for all users")
        return signals

    def get_user_signals_from_analysis(self, db: Session, user: User):
        """Get signals for a specific user from the latest market analysis"""
        today = datetime.now(timezone.utc).date()
        
        # Check if we have analysis for today
        signals = db.query(Signal).filter(
            Signal.user_id == user.id,
            Signal.date == today
        ).order_by(Signal.signal_triggered.desc(), Signal.symbol).all()
        
        if not signals:
            # If no analysis for today, generate it
            print("No daily analysis found, generating now...")
            self.generate_daily_market_analysis(db)
            signals = db.query(Signal).filter(
                Signal.user_id == user.id,
                Signal.date == today
            ).order_by(Signal.signal_triggered.desc(), Signal.symbol).all()
        
        return signals

    def generate_signals_for_user(self, db: Session, user: User):
        """Get signals for user from daily market analysis"""
        return self.get_user_signals_from_analysis(db, user)

signal_service = SignalService() 