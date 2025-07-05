from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.services.auth_service import auth_service
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token, UserUpdate
from app.models.user import User

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
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
    return auth_service.create_user(db=db, user=user)

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = auth_service.authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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