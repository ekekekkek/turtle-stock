from app.core.database import SessionLocal
from app.models.user import User

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python promote_admin.py user_email")
        sys.exit(1)
    email = sys.argv[1]
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"User with email {email} not found.")
        sys.exit(1)
    user.is_admin = True
    db.commit()
    print(f"User {email} promoted to admin.")
    db.close() 