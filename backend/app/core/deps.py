from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.auth_service import auth_service
from app.models.user import User

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    print(f"DEBUG: Received token (first 20 chars): {token[:20]}...")
    email = auth_service.verify_token(token)
    print(f"DEBUG: Verified email from token: {email}")
    if email is None:
        print("DEBUG: Token verification failed - email is None")
        raise credentials_exception
    
    user = auth_service.get_user_by_email(db, email=email)
    if user is None:
        # User authenticated with Firebase but doesn't exist in our database
        # Auto-create the user with basic info from Firebase token
        # Extract username from email (before @) as default
        username = email.split('@')[0]
        # Check if username is taken, append number if needed
        base_username = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        # Create user in database
        from app.schemas.user import UserCreate
        user_data = UserCreate(
            email=email,
            username=username,
            password="",  # No password needed for Firebase users
            full_name=""
        )
        user = auth_service.create_user(db, user_data)
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user 