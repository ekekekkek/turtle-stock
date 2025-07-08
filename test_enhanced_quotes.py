#!/usr/bin/env python3
"""
Test script to verify enhanced quotes functionality
"""
import sys
import os
import requests
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_enhanced_quotes():
    """Test the enhanced quote method directly"""
    
    # Test the enhanced quote method directly
    print("Testing enhanced quote method...")
    try:
        from app.services.stock_service import stock_service
        
        # Test with a known stock
        symbol = "AAPL"
        quote = stock_service.get_enhanced_stock_quote(symbol)
        
        if quote:
            print(f"✅ Enhanced quote for {symbol}:")
            print(f"  Price: ${quote.get('price', 0):.2f}")
            
            # Handle None values for technical indicators
            sma_200d = quote.get('sma_200d')
            high_52w = quote.get('high_52w')
            sma_50d = quote.get('sma_50d')
            high_20d = quote.get('high_20d')
            atr = quote.get('atr')
            
            print(f"  200d SMA: ${sma_200d:.2f}" if sma_200d else "  200d SMA: N/A")
            print(f"  52w High: ${high_52w:.2f}" if high_52w else "  52w High: N/A")
            print(f"  50d SMA: ${sma_50d:.2f}" if sma_50d else "  50d SMA: N/A")
            print(f"  20d High: ${high_20d:.2f}" if high_20d else "  20d High: N/A")
            print(f"  ATR: ${atr:.2f}" if atr else "  ATR: N/A")
            
            # Check if technical indicators are not None and not zero
            if sma_200d and sma_200d > 0 and high_52w and high_52w > 0:
                print("✅ Technical indicators are being calculated correctly!")
                return True
            else:
                print("❌ Technical indicators are still zero or None")
                return False
        else:
            print("❌ No quote returned")
            return False
            
    except Exception as e:
        print(f"❌ Error testing enhanced quotes: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoint():
    """Test the API endpoint (requires authentication)"""
    print("\nTesting API endpoint...")
    try:
        # This would require authentication, so we'll just test the endpoint exists
        response = requests.get("http://localhost:8000/docs")
        if response.status_code == 200:
            print("✅ API server is running and accessible")
            return True
        else:
            print("❌ API server not responding")
            return False
    except Exception as e:
        print(f"❌ Error testing API endpoint: {e}")
        return False

if __name__ == "__main__":
    print("Testing Enhanced Quotes Functionality")
    print("=" * 40)
    
    # Test the enhanced quote method
    method_success = test_enhanced_quotes()
    
    # Test the API endpoint
    api_success = test_api_endpoint()
    
    print("\n" + "=" * 40)
    if method_success and api_success:
        print("✅ All tests passed! Enhanced quotes are working.")
    else:
        print("❌ Some tests failed. Check the output above.") 