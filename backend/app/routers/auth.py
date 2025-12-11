from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.services.auth_service import auth_service
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token, UserUpdate, UserSync
from app.models.user import User
from typing import Optional

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and return access token"""
    # Note: This endpoint is deprecated - frontend now uses Firebase Authentication
    # Keeping for backward compatibility, but passwords will be truncated if > 72 bytes
    
    # Check if user already exists
    db_user = auth_service.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    new_user = auth_service.create_user(db=db, user=user)
    
    # Generate access token for the new user
    access_token = auth_service.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and return access token
    
    NOTE: This endpoint is deprecated. The frontend now uses Firebase Authentication.
    This endpoint is kept for backward compatibility only.
    """
    print(f"DEBUG: Login attempt for email: {user_credentials.email}")
    
    # Check if user exists
    user = auth_service.get_user_by_email(db, user_credentials.email)
    if not user:
        print(f"DEBUG: User not found in database: {user_credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if this is a Firebase user (they don't have real passwords)
    if user.hashed_password == "firebase_user_no_password":
        print(f"DEBUG: Attempted to login Firebase user via legacy endpoint: {user_credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Firebase Authentication. Please use the Firebase login instead.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Authenticate with password
    user = auth_service.authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        print(f"DEBUG: Password authentication failed for: {user_credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"DEBUG: Successful login for: {user_credentials.email}")
    access_token = auth_service.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user 

@router.get("/settings")
def get_user_settings(current_user: User = Depends(get_current_active_user)):
    """Get current user's risk_tolerance and capital settings."""
    return {
        "risk_tolerance": current_user.risk_tolerance,
        "capital": current_user.capital
    }

@router.put("/settings")
def update_user_settings(
    update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's risk_tolerance and capital settings."""
    if update.risk_tolerance is not None:
        current_user.risk_tolerance = update.risk_tolerance
    if update.capital is not None:
        current_user.capital = update.capital
    db.commit()
    db.refresh(current_user)
    return {
        "risk_tolerance": current_user.risk_tolerance,
        "capital": current_user.capital
    }

@router.post("/sync", response_model=UserResponse)
def sync_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    user_data: Optional[UserSync] = Body(None)
):
    """
    Sync/create user in backend database from Firebase token.
    This endpoint should be called after Firebase registration/login to ensure
    the user exists in the backend SQL database.
    
    Optional body parameters:
    - username: Preferred username (will be made unique if taken)
    - full_name: User's full name
    """
    token = credentials.credentials
    
    # Extract username and full_name from request body if provided
    username = user_data.username if user_data else None
    full_name = user_data.full_name if user_data else None
    
    try:
        user = auth_service.sync_user_from_firebase(
            db=db,
            token=token,
            username=username,
            full_name=full_name
        )
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"DEBUG: Error syncing user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync user"
        ) 