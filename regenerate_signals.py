#!/usr/bin/env python3
"""
Script to regenerate signals with the new market-wide approach (no duplicates)
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def regenerate_signals():
    """Clear old signals and regenerate with new market-wide approach"""
    try:
        from app.services.signal_service import signal_service
        from app.core.database import SessionLocal
        from app.models.signal import Signal
        from datetime import datetime, timezone
        
        print("Regenerating signals with market-wide approach (no duplicates)...")
        
        # Get database session
        db = SessionLocal()
        
        try:
            # Clear all existing signals
            print("Clearing existing signals...")
            db.query(Signal).delete()
            db.commit()
            print("✅ Cleared all existing signals")
            
            # Generate new signals with market-wide approach
            print("Generating new market-wide signals...")
            signals = signal_service.generate_daily_market_analysis(db)
            
            print(f"✅ Generated {len(signals)} market-wide signals")
            
            # Verify signals are market-wide (user_id = 0)
            today = datetime.now(timezone.utc).date()
            sample_signals = db.query(Signal).filter(Signal.date == today).limit(5).all()
            
            print("\nSample signals with new approach:")
            for signal in sample_signals:
                print(f"  {signal.symbol}: user_id={signal.user_id}, 200d SMA=${signal.sma_200d:.2f}, 52w High=${signal.high_52w:.2f}")
            
            # Check for unique stocks
            unique_stocks = db.query(Signal.symbol).filter(Signal.date == today).distinct().count()
            total_signals = db.query(Signal).filter(Signal.date == today).count()
            
            print(f"\n📊 Summary:")
            print(f"  Unique stocks: {unique_stocks}")
            print(f"  Total signals: {total_signals}")
            print(f"  Duplicates eliminated: {total_signals - unique_stocks}")
            
            if unique_stocks == total_signals:
                print("\n✅ Perfect! No duplicates - each stock has exactly one signal.")
            else:
                print(f"\n❌ Still have duplicates: {total_signals - unique_stocks} extra signals")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error regenerating signals: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    regenerate_signals() 