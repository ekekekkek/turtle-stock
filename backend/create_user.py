#!/usr/bin/env python3
"""
Script to create users or reset passwords
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

def create_user():
    """Create a new user or reset password"""
    try:
        from app.core.database import SessionLocal
        from app.models.user import User
        from passlib.context import CryptContext
        
        # Initialize password context
        pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
        
        # Get database session
        db = SessionLocal()
        
        try:
            print("🔐 User Management Script")
            print("=" * 40)
            
            # Check existing users
            existing_users = db.query(User).all()
            print(f"📊 Found {len(existing_users)} existing users:")
            for user in existing_users:
                print(f"   - {user.email}")
            
            print("\nOptions:")
            print("1. Create new user")
            print("2. Reset password for existing user")
            print("3. List all users")
            
            choice = input("\nEnter your choice (1-3): ").strip()
            
            if choice == "1":
                # Create new user
                email = input("Enter email: ").strip()
                password = input("Enter password: ").strip()
                
                # Check if user already exists
                if db.query(User).filter(User.email == email).first():
                    print("❌ User already exists!")
                    return
                
                # Create new user
                hashed_password = pwd_context.hash(password)
                new_user = User(
                    email=email,
                    hashed_password=hashed_password,
                    is_active=True
                )
                
                db.add(new_user)
                db.commit()
                print(f"✅ User {email} created successfully!")
                
            elif choice == "2":
                # Reset password
                email = input("Enter email to reset password: ").strip()
                user = db.query(User).filter(User.email == email).first()
                
                if not user:
                    print("❌ User not found!")
                    return
                
                new_password = input("Enter new password: ").strip()
                user.hashed_password = pwd_context.hash(new_password)
                db.commit()
                print(f"✅ Password for {email} reset successfully!")
                
            elif choice == "3":
                # List all users
                print("\n📋 All Users:")
                for user in existing_users:
                    print(f"   - {user.email} (Active: {user.is_active})")
                    
            else:
                print("❌ Invalid choice!")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_user() 