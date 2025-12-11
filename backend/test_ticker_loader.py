#!/usr/bin/env python3
"""
Test script for ticker loader and stock list initialization
Run this to verify the ticker scraper works locally
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.ticker_loader import load_or_scrape_tickers
from app.services.signal_service import SignalService

def test_ticker_loader():
    """Test the ticker loader"""
    print("=" * 60)
    print("Testing Ticker Loader")
    print("=" * 60)
    
    try:
        sp500, nasdaq100 = load_or_scrape_tickers()
        print(f"\n✅ Successfully loaded tickers:")
        print(f"   S&P 500: {len(sp500)} tickers")
        print(f"   Nasdaq-100: {len(nasdaq100)} tickers")
        print(f"   Total unique: {len(set(sp500 + nasdaq100))} tickers")
        
        # Show first few tickers
        print(f"\n📊 First 10 S&P 500 tickers: {sp500[:10]}")
        print(f"📊 First 10 Nasdaq-100 tickers: {nasdaq100[:10]}")
        
        return True
    except Exception as e:
        print(f"\n❌ Error loading tickers: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_signal_service_initialization():
    """Test signal service stock list initialization"""
    print("\n" + "=" * 60)
    print("Testing Signal Service Initialization")
    print("=" * 60)
    
    try:
        signal_service = SignalService()
        print(f"\n✅ Signal service initialized successfully")
        print(f"   Total symbols: {len(signal_service.all_symbols)}")
        print(f"   S&P 500 symbols: {len(signal_service.sp500_symbols)}")
        print(f"   Nasdaq symbols: {len(signal_service.nasdaq_symbols)}")
        
        # Show first few symbols
        print(f"\n📊 First 20 symbols: {signal_service.all_symbols[:20]}")
        
        if len(signal_service.all_symbols) < 100:
            print(f"\n⚠️  WARNING: Only {len(signal_service.all_symbols)} symbols loaded!")
            print("   This might indicate the scraper failed and fell back to default list.")
        else:
            print(f"\n✅ Good! Loaded {len(signal_service.all_symbols)} symbols (expected ~600+)")
        
        return True
    except Exception as e:
        print(f"\n❌ Error initializing signal service: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_single_stock_fetch():
    """Test fetching data for a single stock"""
    print("\n" + "=" * 60)
    print("Testing Single Stock Data Fetch (AAPL)")
    print("=" * 60)
    
    try:
        signal_service = SignalService()
        print(f"\nFetching data for AAPL...")
        
        ohlcv = signal_service.fetch_ohlcv("AAPL", days=252)
        
        if ohlcv and ohlcv.get('c'):
            data_points = len(ohlcv['c'])
            print(f"✅ Successfully fetched {data_points} data points for AAPL")
            print(f"   Latest close: ${ohlcv['c'][-1]:.2f}")
            
            # Test indicator calculation
            high_20d, sma_50d, sma_200d, high_52w, atr = signal_service.calculate_indicators(ohlcv)
            print(f"\n📊 Indicators calculated:")
            print(f"   20d High: ${high_20d:.2f}" if high_20d else "   20d High: N/A")
            print(f"   50d SMA: ${sma_50d:.2f}" if sma_50d else "   50d SMA: N/A")
            print(f"   200d SMA: ${sma_200d:.2f}" if sma_200d else "   200d SMA: N/A")
            print(f"   52w High: ${high_52w:.2f}" if high_52w else "   52w High: N/A")
            print(f"   ATR: ${atr:.2f}" if atr else "   ATR: N/A")
            
            return True
        else:
            print(f"❌ Failed to fetch data for AAPL")
            return False
            
    except Exception as e:
        print(f"\n❌ Error fetching stock data: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n🧪 Testing Ticker Loader and Stock Analysis\n")
    
    results = []
    
    # Test 1: Ticker loader
    results.append(("Ticker Loader", test_ticker_loader()))
    
    # Test 2: Signal service initialization
    results.append(("Signal Service Init", test_signal_service_initialization()))
    
    # Test 3: Single stock fetch
    results.append(("Single Stock Fetch", test_single_stock_fetch()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    print(f"\n{'✅ All tests passed!' if all_passed else '❌ Some tests failed'}\n")

