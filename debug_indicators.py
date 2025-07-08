#!/usr/bin/env python3
"""
Debug script to test technical indicators for multiple symbols
"""
import sys
import os
import time

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_symbols():
    """Test technical indicators for various symbols"""
    
    # Test symbols - mix of well-known and potentially problematic
    test_symbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',  # Major tech
        'SPY', 'QQQ', 'VTI',  # ETFs
        'BRK.B', 'JNJ', 'PG',  # Large caps
        'GME', 'AMC',  # Meme stocks (might have issues)
        'BTC-USD', 'ETH-USD',  # Crypto (might not work)
        'INVALID', 'XYZ123',  # Invalid symbols
    ]
    
    print("Testing Technical Indicators for Multiple Symbols")
    print("=" * 60)
    
    results = []
    
    for symbol in test_symbols:
        print(f"\n{'='*20} Testing {symbol} {'='*20}")
        
        try:
            from app.services.stock_service import stock_service
            
            # Test enhanced quote
            start_time = time.time()
            quote = stock_service.get_enhanced_stock_quote(symbol)
            end_time = time.time()
            
            if quote:
                sma_200d = quote.get('sma_200d')
                high_52w = quote.get('high_52w')
                sma_50d = quote.get('sma_50d')
                high_20d = quote.get('high_20d')
                atr = quote.get('atr')
                price = quote.get('price')
                
                print(f"✅ {symbol} quote retrieved in {end_time - start_time:.2f}s")
                print(f"  Price: ${price:.2f}" if price else "  Price: N/A")
                print(f"  200d SMA: ${sma_200d:.2f}" if sma_200d else "  200d SMA: N/A")
                print(f"  52w High: ${high_52w:.2f}" if high_52w else "  52w High: N/A")
                print(f"  50d SMA: ${sma_50d:.2f}" if sma_50d else "  50d SMA: N/A")
                print(f"  20d High: ${high_20d:.2f}" if high_20d else "  20d High: N/A")
                print(f"  ATR: ${atr:.2f}" if atr else "  ATR: N/A")
                
                # Check for issues
                issues = []
                if not sma_200d:
                    issues.append("200d SMA missing")
                if not high_52w:
                    issues.append("52w High missing")
                if not sma_50d:
                    issues.append("50d SMA missing")
                if not high_20d:
                    issues.append("20d High missing")
                if not atr:
                    issues.append("ATR missing")
                
                if issues:
                    print(f"  ⚠️  Issues: {', '.join(issues)}")
                else:
                    print(f"  ✅ All indicators present")
                
                results.append({
                    'symbol': symbol,
                    'success': True,
                    'issues': issues,
                    'indicators': {
                        'sma_200d': sma_200d,
                        'high_52w': high_52w,
                        'sma_50d': sma_50d,
                        'high_20d': high_20d,
                        'atr': atr
                    }
                })
                
            else:
                print(f"❌ {symbol}: No quote returned")
                results.append({
                    'symbol': symbol,
                    'success': False,
                    'issues': ['No quote returned'],
                    'indicators': {}
                })
                
        except Exception as e:
            print(f"❌ {symbol}: Error - {e}")
            results.append({
                'symbol': symbol,
                'success': False,
                'issues': [str(e)],
                'indicators': {}
            })
        
        # Small delay to avoid overwhelming APIs
        time.sleep(0.5)
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f"Total symbols tested: {len(results)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")
    
    if failed:
        print(f"\nFailed symbols:")
        for result in failed:
            print(f"  {result['symbol']}: {', '.join(result['issues'])}")
    
    # Check for missing indicators in successful results
    missing_200d = [r for r in successful if not r['indicators'].get('sma_200d')]
    missing_52w = [r for r in successful if not r['indicators'].get('high_52w')]
    
    if missing_200d:
        print(f"\nSymbols missing 200d SMA: {[r['symbol'] for r in missing_200d]}")
    if missing_52w:
        print(f"\nSymbols missing 52w High: {[r['symbol'] for r in missing_52w]}")
    
    if not missing_200d and not missing_52w:
        print("\n✅ All successful symbols have both 200d SMA and 52w High!")

def test_data_fetching():
    """Test the data fetching process directly"""
    print(f"\n{'='*60}")
    print("TESTING DATA FETCHING PROCESS")
    print(f"{'='*60}")
    
    try:
        from app.services.signal_service import signal_service
        
        test_symbol = 'AAPL'
        print(f"Testing data fetching for {test_symbol}...")
        
        # Test the fetch_ohlcv method directly
        ohlcv = signal_service.fetch_ohlcv(test_symbol)
        
        if ohlcv:
            print(f"✅ OHLCV data fetched for {test_symbol}")
            print(f"  Data points: {len(ohlcv.get('c', []))}")
            print(f"  Date range: {ohlcv.get('from')} to {ohlcv.get('to')}")
            
            # Test calculate_indicators directly
            indicators = signal_service.calculate_indicators(ohlcv)
            print(f"  Indicators calculated: {indicators}")
        else:
            print(f"❌ No OHLCV data for {test_symbol}")
            
    except Exception as e:
        print(f"❌ Error testing data fetching: {e}")
        import traceback
        traceback.print_exc()

def test_extended_data_fetching():
    """Test fetching more data to see if we can get 252 days"""
    print(f"\n{'='*60}")
    print("TESTING EXTENDED DATA FETCHING")
    print(f"{'='*60}")
    
    try:
        from app.services.signal_service import signal_service
        
        test_symbols = ['AAPL', 'MSFT', 'SPY']
        
        for symbol in test_symbols:
            print(f"\nTesting {symbol} with different data ranges:")
            
            # Test with different day ranges
            for days in [252, 300, 365, 400]:
                print(f"  Requesting {days} days...")
                ohlcv = signal_service.fetch_ohlcv(symbol, days)
                
                if ohlcv:
                    data_points = len(ohlcv.get('c', []))
                    print(f"    Received {data_points} data points")
                    
                    if data_points >= 252:
                        print(f"    ✅ Success! Got enough data for 200d SMA and 52w High")
                        break
                    else:
                        print(f"    ❌ Still not enough data")
                else:
                    print(f"    ❌ No data returned")
                
                time.sleep(0.5)  # Small delay between requests
                
    except Exception as e:
        print(f"❌ Error testing extended data fetching: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Debugging Technical Indicators")
    print("=" * 60)
    
    # Test data fetching process
    test_data_fetching()
    
    # Test extended data fetching
    test_extended_data_fetching()
    
    # Test multiple symbols
    test_symbols() 