import finnhub
import time
import yfinance as yf
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import Signal, Watchlist, User
from app.core.config import settings
import numpy as np
import requests
from app.models.market_analysis_status import MarketAnalysisStatus

_fh = finnhub.Client(api_key=settings.FINNHUB_API_KEY)

# Rate limiting for signal service
_last_signal_api_call = 0
_min_signal_call_interval = 1.1  # 1.1 seconds between calls

class SignalService:
    def __init__(self):
        # S&P 500 and Nasdaq stocks - we'll fetch these dynamically
        self.sp500_symbols = []
        self.nasdaq_symbols = []
        self.all_symbols = []
        
        # Initialize stock lists
        self.initialize_stock_lists()
    
    def _rate_limit(self):
        """Simple rate limiting to stay under Finnhub free tier limits"""
        global _last_signal_api_call
        current_time = time.time()
        time_since_last = current_time - _last_signal_api_call
        if time_since_last < _min_signal_call_interval:
            sleep_time = _min_signal_call_interval - time_since_last
            time.sleep(sleep_time)
        _last_signal_api_call = time.time()

    def _handle_finnhub_error(self, e, symbol: str, operation: str):
        """Handle Finnhub API errors gracefully"""
        error_msg = str(e)
        if "403" in error_msg or "Forbidden" in error_msg:
            print(f"Finnhub API 403 error for {symbol} ({operation}): Rate limit exceeded or invalid API key")
            return None
        elif "429" in error_msg or "Too Many Requests" in error_msg:
            print(f"Finnhub API rate limit exceeded for {symbol} ({operation})")
            return None
        elif "404" in error_msg or "Not Found" in error_msg:
            print(f"Stock {symbol} not found on Finnhub ({operation})")
            return None
        else:
            print(f"Finnhub API error for {symbol} ({operation}): {error_msg}")
            return None

    def _get_ohlcv_from_yahoo(self, symbol: str, days: int = 252):
        """Fetch daily OHLCV data from Yahoo Finance (no rate limits)"""
        try:
            # Add small delay to prevent overwhelming Yahoo Finance
            time.sleep(0.1)
            
            # Calculate date range
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            # Get data from Yahoo Finance with better error handling
            ticker = yf.Ticker(symbol)
            
            # Try to get info first to validate the symbol
            try:
                info = ticker.info
                if not info or 'regularMarketPrice' not in info:
                    print(f"Invalid symbol or no data available for {symbol} on Yahoo Finance")
                    return None
            except Exception as e:
                print(f"Could not validate symbol {symbol} on Yahoo Finance: {e}")
                return None
            
            # Get historical data
            hist = ticker.history(start=start_date, end=end_date, interval='1d')
            
            if hist.empty:
                print(f"No data returned from Yahoo Finance for {symbol}")
                return None
            
            # Convert to Finnhub format
            timestamps = [int(dt.timestamp()) for dt in hist.index]
            opens = hist['Open'].tolist()
            highs = hist['High'].tolist()
            lows = hist['Low'].tolist()
            closes = hist['Close'].tolist()
            volumes = hist['Volume'].tolist()
            
            return {
                's': 'ok',
                't': timestamps,
                'o': opens,
                'h': highs,
                'l': lows,
                'c': closes,
                'v': volumes
            }
        except Exception as e:
            print(f"Error fetching data from Yahoo Finance for {symbol}: {e}")
            return None

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
        """Fetch daily OHLCV data using Yahoo Finance (no rate limits)"""
        print(f"Fetching {days} days of data for {symbol} from Yahoo Finance")
        return self._get_ohlcv_from_yahoo(symbol, days)

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

    def calculate_position_size(self, close, stop_loss, risk_tolerance, capital, user_id=None, db=None, symbol=None):
        """Calculate position size based on distributed risk management"""
        if close is None or stop_loss is None or risk_tolerance is None or capital is None:
            return 0
        if not stop_loss or stop_loss <= 0:
            return 0
            
        # If we have user_id, db, and symbol, use distributed risk
        if user_id and db and symbol:
            from app.services.stock_service import stock_service
            distributed_risk = stock_service.calculate_distributed_risk(user_id, db, symbol)
            if distributed_risk and symbol.upper() in distributed_risk:
                stock_risk_amount = distributed_risk[symbol.upper()]
                risk_per_share = close - stop_loss
                if risk_per_share <= 0:
                    return 0
                return int(stock_risk_amount / risk_per_share)
        
        # Fallback to original calculation if distributed risk not available
        risk = risk_tolerance / 100
        risk_per_share = close - stop_loss
        if risk_per_share <= 0:
            return 0
        return int(capital * risk / risk_per_share)

    def update_last_run(self, db: Session):
        status = db.query(MarketAnalysisStatus).first()
        # Set last_run to previous market close (4:00 PM ET of previous trading day)
        now = datetime.now(timezone.utc)
        # Calculate previous market close (4:00 PM ET)
        eastern = timezone(timedelta(hours=-5))  # EST/EDT offset; for production use pytz or zoneinfo
        today_et = now.astimezone(eastern).date()
        market_close_et = datetime.combine(today_et, datetime.min.time(), tzinfo=eastern).replace(hour=16)
        if now.astimezone(eastern) < market_close_et:
            # If before today's close, use yesterday
            prev_day = today_et - timedelta(days=1)
            market_close_et = datetime.combine(prev_day, datetime.min.time(), tzinfo=eastern).replace(hour=16)
        # Convert back to UTC
        market_close_utc = market_close_et.astimezone(timezone.utc)
        if not status:
            status = MarketAnalysisStatus(last_run=market_close_utc)
            db.add(status)
        else:
            status.last_run = market_close_utc
        db.commit()

    @staticmethod
    def has_sufficient_data(data, required_days=252, min_coverage=None):
        """Flexible check for sufficient data (default: 170 out of 252 days)"""
        actual_days = len(data)
        # Accept at least 170 days out of 252
        min_days = 170 if min_coverage is None else int(required_days * min_coverage)
        print(f"Actual days: {actual_days}, Required: {required_days}, Minimum accepted: {min_days}")
        return actual_days >= min_days

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
                if not ohlcv or not self.has_sufficient_data(ohlcv['c']):
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
                    # Calculate personalized position size based on distributed risk
                    user_position_size = self.calculate_position_size(
                        close, stop_loss, user.risk_tolerance, user.capital,
                        user.id, db, symbol
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