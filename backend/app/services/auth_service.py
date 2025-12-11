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
import os

# Try to import Firebase Admin SDK (optional - for production token verification)
try:
    import firebase_admin
    from firebase_admin import credentials, auth
    FIREBASE_ADMIN_AVAILABLE = True
except ImportError:
    FIREBASE_ADMIN_AVAILABLE = False
    firebase_admin = None
    auth = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.firebase_app = None
        
        # Initialize Firebase Admin SDK if available and credentials are provided
        if FIREBASE_ADMIN_AVAILABLE:
            try:
                # Check if Firebase is already initialized
                try:
                    self.firebase_app = firebase_admin.get_app()
                    print("DEBUG: Using existing Firebase Admin app")
                except ValueError:
                    # Firebase not initialized yet
                    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                        # Use service account file
                        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                        self.firebase_app = firebase_admin.initialize_app(cred)
                        print("DEBUG: Initialized Firebase Admin with service account file")
                    else:
                        # Try to use default credentials (for production environments like Render)
                        try:
                            self.firebase_app = firebase_admin.initialize_app()
                            print("DEBUG: Initialized Firebase Admin with default credentials")
                        except Exception as e:
                            print(f"DEBUG: Could not initialize Firebase Admin: {e}")
                            print("DEBUG: Will use fallback token verification")
            except Exception as e:
                print(f"DEBUG: Firebase Admin initialization error: {e}")
                print("DEBUG: Will use fallback token verification")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        # Handle empty passwords (for Firebase users)
        if not password:
            return "firebase_user_no_password"
        
        # Bcrypt has a 72-byte limit - truncate if necessary (defensive programming)
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            # Truncate to 72 bytes, ensuring we don't break UTF-8 characters
            truncated_bytes = password_bytes[:72]
            # Remove any incomplete UTF-8 character at the end
            while truncated_bytes and (truncated_bytes[-1] & 0b11000000) == 0b10000000:
                truncated_bytes = truncated_bytes[:-1]
            password = truncated_bytes.decode('utf-8', errors='ignore')
        
        try:
            return pwd_context.hash(password)
        except ValueError as e:
            # If bcrypt still fails, use a fallback hash
            import hashlib
            return hashlib.sha256(password.encode()).hexdigest()

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
        """Verify and decode a JWT token (supports both Firebase ID tokens and legacy JWT tokens)
        Returns the email from the token, or None if verification fails.
        """
        token_data = self.verify_token_full(token)
        return token_data.get('email') if token_data else None
    
    def verify_token_full(self, token: str) -> Optional[dict]:
        """Verify and decode a JWT token, returning full token data including email, name, etc.
        Returns a dict with user information, or None if verification fails.
        """
        print(f"DEBUG: verify_token_full called - FIREBASE_ADMIN_AVAILABLE: {FIREBASE_ADMIN_AVAILABLE}, firebase_app: {self.firebase_app is not None}")
        
        # First, try to verify as Firebase ID token using Admin SDK (proper verification)
        if FIREBASE_ADMIN_AVAILABLE and self.firebase_app:
            try:
                decoded_token = auth.verify_id_token(token)
                email = decoded_token.get('email')
                name = decoded_token.get('name') or decoded_token.get('display_name', '')
                if email:
                    print(f"DEBUG: Successfully verified Firebase token (Admin SDK): {email}")
                    return {
                        'email': email,
                        'name': name,
                        'email_verified': decoded_token.get('email_verified', False),
                        'uid': decoded_token.get('uid')
                    }
                else:
                    print("DEBUG: Firebase token verified but no email in payload")
            except Exception as e:
                print(f"DEBUG: Firebase Admin SDK verification failed: {str(e)}")
                # Fall through to fallback verification
        
        # Fallback: Try to decode as Firebase ID token (for local dev or when Admin SDK not available)
        # This is less secure but works for development
        try:
            parts = token.split('.')
            if len(parts) == 3:
                # Decode the payload to check if it's a Firebase token
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
                
                # Check if it's a Firebase token
                # Firebase tokens have issuer like: https://securetoken.google.com/PROJECT_ID
                iss = payload.get('iss', '')
                is_firebase_token = (
                    'google' in iss.lower() or 
                    'firebase' in iss.lower() or
                    'securetoken' in iss.lower() or
                    'firebase' in payload  # Also check if 'firebase' key exists in payload
                )
                
                if is_firebase_token:
                    # Verify the issuer matches our Firebase project
                    expected_iss = f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}"
                    if iss == expected_iss or settings.FIREBASE_PROJECT_ID in iss:
                        email = payload.get('email')
                        if email:
                            print(f"DEBUG: Successfully extracted email from Firebase token (fallback): {email}")
                            return {
                                'email': email,
                                'name': payload.get('name') or payload.get('display_name', ''),
                                'email_verified': payload.get('email_verified', False),
                                'uid': payload.get('user_id') or payload.get('sub')
                            }
                        else:
                            print("DEBUG: Firebase token found but no email in payload")
                    else:
                        print(f"DEBUG: Token issuer mismatch. Expected project: {settings.FIREBASE_PROJECT_ID}, got: {iss}")
                else:
                    print(f"DEBUG: Token is not a Firebase token (iss: {iss})")
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
            return {
                'email': email,
                'name': '',
                'email_verified': False,
                'uid': None
            }
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
    
    def sync_user_from_firebase(self, db: Session, token: str, username: Optional[str] = None, full_name: Optional[str] = None) -> User:
        """Sync/create user in database from Firebase token.
        If user exists, update their information. If not, create a new user.
        Returns the user object.
        """
        print(f"DEBUG: sync_user_from_firebase called - username: {username}, full_name: {full_name}")
        token_data = self.verify_token_full(token)
        if not token_data or not token_data.get('email'):
            print(f"DEBUG: Token verification failed - token_data: {token_data}")
            raise ValueError("Invalid Firebase token: could not extract email")
        
        email = token_data['email']
        firebase_name = token_data.get('name', '') or token_data.get('display_name', '')
        print(f"DEBUG: Extracted email: {email}, firebase_name: {firebase_name}")
        
        # Use provided name/username or fall back to Firebase data
        final_full_name = full_name or firebase_name or ''
        final_username = username or email.split('@')[0]
        print(f"DEBUG: Final username: {final_username}, final_full_name: {final_full_name}")
        
        # Check if user already exists
        user = self.get_user_by_email(db, email)
        
        if user:
            print(f"DEBUG: User already exists - ID: {user.id}, updating if needed")
            # Update existing user if needed
            if final_full_name and not user.full_name:
                user.full_name = final_full_name
                print(f"DEBUG: Updated full_name to: {final_full_name}")
            if final_username and user.username != final_username:
                # Check if new username is available
                existing_user = db.query(User).filter(User.username == final_username, User.id != user.id).first()
                if not existing_user:
                    user.username = final_username
                    print(f"DEBUG: Updated username to: {final_username}")
            db.commit()
            db.refresh(user)
            print(f"DEBUG: User updated successfully - ID: {user.id}")
            return user
        else:
            print(f"DEBUG: User does not exist, creating new user")
            # Create new user
            # Ensure username is unique
            base_username = final_username
            counter = 1
            while db.query(User).filter(User.username == final_username).first():
                final_username = f"{base_username}{counter}"
                counter += 1
                print(f"DEBUG: Username {base_username} taken, trying: {final_username}")
            
            user_data = UserCreate(
                email=email,
                username=final_username,
                password="",  # No password needed for Firebase users
                full_name=final_full_name
            )
            new_user = self.create_user(db, user_data)
            print(f"DEBUG: New user created successfully - ID: {new_user.id}, Email: {new_user.email}")
            return new_user

auth_service = AuthService() 