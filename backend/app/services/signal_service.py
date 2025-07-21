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
            print(f"DEBUG: Fetching {days} days of data for {symbol} from Yahoo Finance")
            
            # Add small delay to prevent overwhelming Yahoo Finance
            time.sleep(0.1)
            
            # Calculate date range
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            print(f"DEBUG: Date range for {symbol}: {start_date.date()} to {end_date.date()}")
            
            # Get data from Yahoo Finance with better error handling
            ticker = yf.Ticker(symbol)
            
            # Try to get info first to validate the symbol
            try:
                info = ticker.info
                if not info or 'regularMarketPrice' not in info:
                    print(f"WARNING: Invalid symbol or no data available for {symbol} on Yahoo Finance")
                    return None
                print(f"DEBUG: {symbol} info validated successfully")
            except Exception as e:
                print(f"WARNING: Could not validate symbol {symbol} on Yahoo Finance: {e}")
                return None
            
            # Get historical data
            print(f"DEBUG: Fetching historical data for {symbol}...")
            hist = ticker.history(start=start_date, end=end_date, interval='1d')
            
            if hist.empty:
                print(f"WARNING: No data returned from Yahoo Finance for {symbol}")
                return None
            
            print(f"DEBUG: {symbol} - Retrieved {len(hist)} data points")
            
            # Convert to Finnhub format
            timestamps = [int(dt.timestamp()) for dt in hist.index]
            opens = hist['Open'].tolist()
            highs = hist['High'].tolist()
            lows = hist['Low'].tolist()
            closes = hist['Close'].tolist()
            volumes = hist['Volume'].tolist()
            
            result = {
                's': 'ok',
                't': timestamps,
                'o': opens,
                'h': highs,
                'l': lows,
                'c': closes,
                'v': volumes,
                'symbol': symbol
            }
            
            print(f"DEBUG: {symbol} - Data conversion completed, returning {len(closes)} close prices")
            return result
            
        except Exception as e:
            print(f"ERROR: Error fetching data from Yahoo Finance for {symbol}: {e}")
            return None

    def initialize_stock_lists(self):
        try:
            from app.utils.ticker_loader import load_or_scrape_tickers
            self.sp500_symbols, self.nasdaq_symbols = load_or_scrape_tickers()
            self.all_symbols = list(set(self.sp500_symbols + self.nasdaq_symbols))
            print(f"Loaded {len(self.sp500_symbols)} S&P 500 and {len(self.nasdaq_symbols)} Nasdaq-100 tickers.")
        except Exception as e:
            print(f"Error initializing stock lists: {e}")
            self.all_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX']
    
    def fetch_ohlcv(self, symbol: str, days: int = 400):
        """Fetch daily OHLCV data using Yahoo Finance (no rate limits)"""
        print(f"Fetching {days} days of data for {symbol} from Yahoo Finance")
        return self._get_ohlcv_from_yahoo(symbol, days)

    def calculate_indicators(self, ohlcv):
        closes = np.array(ohlcv['c'])
        highs = np.array(ohlcv['h'])
        lows = np.array(ohlcv['l'])
        
        symbol = ohlcv.get('symbol', 'unknown')
        data_length = len(closes)
        
        print(f"DEBUG: Calculating indicators for {symbol} with {data_length} days of data")
        
        # Check if we have enough data for all indicators
        if data_length < 252:
            print(f"WARNING: Not enough data to calculate 52w high and 200d SMA for {symbol} (len={data_length})")
        if data_length < 200:
            print(f"WARNING: Not enough data to calculate 200d SMA for {symbol} (len={data_length})")
        if data_length < 50:
            print(f"WARNING: Not enough data to calculate 50d SMA for {symbol} (len={data_length})")
        if data_length < 20:
            print(f"WARNING: Not enough data to calculate 20d high for {symbol} (len={data_length})")
        if data_length < 15:
            print(f"WARNING: Not enough data to calculate ATR for {symbol} (len={data_length})")
        
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
        
        print(f"DEBUG: {symbol} indicators - 20d High: {high_20d}, 50d SMA: {sma_50d}, 200d SMA: {sma_200d}, 52w High: {high_52w}, ATR: {atr}")
        
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
                
                # Create ONE signal per stock (not per user)
                # We'll use user_id=0 to indicate this is a market-wide signal
                signal = Signal(
                    user_id=0,  # 0 indicates market-wide signal
                    symbol=symbol,
                    date=today,
                    close=close,
                    high_20d=high_20d or 0,
                    sma_50d=sma_50d or 0,
                    sma_200d=sma_200d or 0,
                    high_52w=high_52w or 0,
                    atr=atr or 0,
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
        print(f"Generated {len(signals)} market signals")
        return signals

    def get_user_signals_from_analysis(self, db: Session, user: User):
        """Get signals for a specific user from the latest market analysis"""
        today = datetime.now(timezone.utc).date()
        
        # Check if we have analysis for today (market-wide signals with user_id=0)
        signals = db.query(Signal).filter(
            Signal.user_id == 0,  # Market-wide signals
            Signal.date == today
        ).order_by(Signal.signal_triggered.desc(), Signal.symbol).all()
        
        if not signals:
            # If no analysis for today, generate it
            print("No daily analysis found, generating now...")
            self.generate_daily_market_analysis(db)
            signals = db.query(Signal).filter(
                Signal.user_id == 0,  # Market-wide signals
                Signal.date == today
            ).order_by(Signal.signal_triggered.desc(), Signal.symbol).all()
        
        return signals

    def get_unique_stocks_count(self, db: Session):
        """Get the count of unique stocks analyzed today"""
        today = datetime.now(timezone.utc).date()
        unique_stocks = db.query(Signal.symbol).filter(
            Signal.user_id == 0,  # Market-wide signals
            Signal.date == today
        ).distinct().count()
        return unique_stocks

    def generate_signals_for_user(self, db: Session, user: User):
        """Get signals for user from daily market analysis"""
        return self.get_user_signals_from_analysis(db, user)

signal_service = SignalService() 