from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
import base64
import json

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        # Bcrypt has a 72-byte limit - truncate if necessary (defensive programming)
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            # Truncate to 72 bytes, ensuring we don't break UTF-8 characters
            truncated_bytes = password_bytes[:72]
            # Remove any incomplete UTF-8 character at the end
            while truncated_bytes and (truncated_bytes[-1] & 0b11000000) == 0b10000000:
                truncated_bytes = truncated_bytes[:-1]
            password = truncated_bytes.decode('utf-8', errors='ignore')
        return pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[str]:
        """Verify and decode a JWT token (supports both Firebase ID tokens and legacy JWT tokens)"""
        # First, try to decode as Firebase ID token (JWT format)
        # Firebase tokens are JWTs with 3 parts: header.payload.signature
        try:
            parts = token.split('.')
            if len(parts) == 3:
                # Decode the payload (without verification for now)
                # In production, you should verify the signature using Firebase's public keys
                payload_part = parts[1]
                # Add padding if needed
                padding = len(payload_part) % 4
                if padding:
                    payload_part += '=' * (4 - padding)
                payload_bytes = base64.urlsafe_b64decode(payload_part)
                payload = json.loads(payload_bytes.decode('utf-8'))
                
                print(f"DEBUG: Decoded token payload keys: {list(payload.keys())}")
                print(f"DEBUG: Token issuer (iss): {payload.get('iss')}")
                print(f"DEBUG: Token email: {payload.get('email')}")
                
                # Check if it's a Firebase token (has 'firebase' in the payload or 'iss' contains 'firebase')
                if 'iss' in payload and 'firebase' in payload['iss']:
                    email = payload.get('email')
                    if email:
                        print(f"DEBUG: Successfully extracted email from Firebase token: {email}")
                        return email
                    else:
                        print("DEBUG: Firebase token found but no email in payload")
                else:
                    print(f"DEBUG: Token is not a Firebase token (iss: {payload.get('iss')})")
        except Exception as e:
            # Not a Firebase token, try legacy JWT token
            print(f"DEBUG: Error decoding Firebase token: {str(e)}")
            pass
        
        # Try legacy JWT token verification
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            email: str = payload.get("sub")
            if email is None:
                return None
            return email
        except JWTError:
            return None

    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(self, db: Session, user: UserCreate) -> User:
        """Create a new user"""
        # For Firebase users, password might be empty
        if user.password:
            hashed_password = self.get_password_hash(user.password)
        else:
            # Firebase users don't have passwords - use a placeholder
            hashed_password = "firebase_user_no_password"
        
        db_user = User(
            email=user.email,
            username=user.username,
            hashed_password=hashed_password,
            full_name=user.full_name
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

auth_service = AuthService() 