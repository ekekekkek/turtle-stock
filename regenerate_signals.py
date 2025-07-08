#!/usr/bin/env python3
"""
Script to regenerate signals with the new 400-day data fetch
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def regenerate_signals():
    """Clear old signals and regenerate with new data"""
    try:
        from app.services.signal_service import signal_service
        from app.core.database import SessionLocal
        from app.models.signal import Signal
        from datetime import datetime, timezone
        
        print("Regenerating signals with 400-day data fetch...")
        
        # Get database session
        db = SessionLocal()
        
        try:
            # Clear all existing signals
            print("Clearing existing signals...")
            db.query(Signal).delete()
            db.commit()
            print("✅ Cleared all existing signals")
            
            # Generate new signals with 400-day data
            print("Generating new signals...")
            signals = signal_service.generate_daily_market_analysis(db)
            
            print(f"✅ Generated {len(signals)} new signals")
            
            # Verify some signals have proper 200d SMA and 52w High
            today = datetime.now(timezone.utc).date()
            sample_signals = db.query(Signal).filter(Signal.date == today).limit(5).all()
            
            print("\nSample signals with new data:")
            for signal in sample_signals:
                print(f"  {signal.symbol}: 200d SMA=${signal.sma_200d:.2f}, 52w High=${signal.high_52w:.2f}")
            
            if any(s.sma_200d > 0 and s.high_52w > 0 for s in sample_signals):
                print("\n✅ Signals now have proper 200d SMA and 52w High values!")
            else:
                print("\n❌ Signals still have zero values - check the logs above")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error regenerating signals: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Signal Regeneration Script")
    print("=" * 40)
    regenerate_signals() 