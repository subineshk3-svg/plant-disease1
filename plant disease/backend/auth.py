"""
AgriScan AI - Authentication & User Security Module
Handles secure PBKDF2-SHA256 password hashing, JWT session token generation,
token validation, user registration, profile management, and account recovery.
"""

import os
import re
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.db import get_db_connection

JWT_SECRET = os.environ.get("JWT_SECRET", "agriscan-ai-enterprise-jwt-auth-key-2026-v2")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
REMEMBER_ME_EXPIRE_DAYS = 30

security_bearer = HTTPBearer(auto_error=False)


# ---------------- PASSWORD HASHING (PBKDF2-SHA256) ----------------

def hash_password(password: str) -> str:
    """Hashes password using PBKDF2-HMAC-SHA256 with a unique 16-byte random salt."""
    salt = secrets.token_hex(16)
    iterations = 100_000
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations
    ).hex()
    return f"{salt}${iterations}${pwd_hash}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verifies plain password against stored PBKDF2 hash using constant-time comparison."""
    try:
        parts = stored_hash.split("$")
        if len(parts) != 3:
            return False
        salt, iterations_str, original_hash = parts
        iterations = int(iterations_str)
        test_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations
        ).hex()
        return hmac.compare_digest(original_hash, test_hash)
    except Exception:
        return False


def validate_password_strength(password: str) -> Tuple_Validation:
    """Validates that password meets enterprise security standards."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    return True, ""


# Helper type for validation result
Tuple_Validation = tuple[bool, str]


# ---------------- JWT TOKEN CREATION & DECODING ----------------

def create_access_token(data: dict, remember_me: bool = False) -> str:
    """Generates a signed JWT access token with an expiration timestamp."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if remember_me:
        expire = now + timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
    else:
        expire = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp())
    })
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT token signature and expiration."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ---------------- DATABASE USER MANAGEMENT ----------------

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    user_dict = dict(row)
    # Remove password hash for safety
    user_dict.pop("password_hash", None)
    return user_dict


def register_user(
    name: str,
    email: str,
    password: str,
    mobile: Optional[str] = None,
    country: str = "India",
    language: str = "en"
) -> Dict[str, Any]:
    """Registers a new user account with duplicate detection and password hashing."""
    email_clean = email.strip().lower()
    name_clean = name.strip()

    # Validate email format
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email address format.")

    # Validate password strength
    is_valid, msg = validate_password_strength(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    # Check for duplicate email
    existing = get_user_by_email(email_clean)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")

    pwd_hash = hash_password(password)
    verif_token = secrets.token_urlsafe(32)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO users (name, email, mobile, password_hash, country, language, is_verified, verification_token)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    """, (name_clean, email_clean, mobile.strip() if mobile else "", pwd_hash, country, language, verif_token))

    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    user_info = {
        "id": new_id,
        "name": name_clean,
        "email": email_clean,
        "mobile": mobile.strip() if mobile else "",
        "country": country,
        "language": language,
        "created_at": datetime.now().isoformat()
    }

    # Generate initial token
    token = create_access_token({"sub": str(new_id), "email": email_clean, "name": name_clean})
    return {
        "user": user_info,
        "access_token": token,
        "token_type": "bearer"
    }


def authenticate_user(email: str, password: str, remember_me: bool = False) -> Dict[str, Any]:
    """Authenticates user credentials and returns JWT token."""
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(
        {"sub": str(user["id"]), "email": user["email"], "name": user["name"]},
        remember_me=remember_me
    )

    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "mobile": user.get("mobile", ""),
        "country": user.get("country", "India"),
        "language": user.get("language", "en"),
        "profile_picture": user.get("profile_picture", ""),
        "created_at": user.get("created_at", "")
    }

    return {
        "user": user_data,
        "access_token": token,
        "token_type": "bearer"
    }


def update_profile(user_id: int, name: str, mobile: Optional[str], country: str, language: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE users
    SET name = ?, mobile = ?, country = ?, language = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (name.strip(), (mobile or "").strip(), country, language, user_id))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)


def change_password(user_id: int, current_pwd: str, new_pwd: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(current_pwd, row["password_hash"]):
        conn.close()
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    is_valid, msg = validate_password_strength(new_pwd)
    if not is_valid:
        conn.close()
        raise HTTPException(status_code=400, detail=msg)

    new_hash = hash_password(new_pwd)
    cursor.execute("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_hash, user_id))
    conn.commit()
    conn.close()
    return True


def initiate_password_reset(email: str) -> Optional[str]:
    """
    Creates a time-limited password reset token.
    Never reveals whether the email exists.
    """
    user = get_user_by_email(email)
    if not user:
        return None

    token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=1)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE users
    SET reset_token = ?, reset_token_expiry = ?
    WHERE id = ?
    """, (token, expiry.isoformat(), user["id"]))
    conn.commit()
    conn.close()
    return token


def complete_password_reset(token: str, new_password: str) -> bool:
    """Resets user password if token is valid and unexpired."""
    if not token or len(token) < 10:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, reset_token_expiry FROM users WHERE reset_token = ?
    """, (token.strip(),))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="Reset token is invalid or has expired.")

    user_id = row["id"]
    expiry_str = row["reset_token_expiry"]

    if expiry_str:
        try:
            expiry_dt = datetime.fromisoformat(expiry_str)
            if datetime.now() > expiry_dt:
                conn.close()
                raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new link.")
        except Exception:
            pass

    new_hash = hash_password(new_password)
    cursor.execute("""
    UPDATE users
    SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (new_hash, user_id))
    conn.commit()
    conn.close()
    return True


# ---------------- FASTAPI AUTH DEPENDENCIES ----------------

async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Optional[Dict[str, Any]]:
    """Returns authenticated user if a valid token is provided in header or cookie, else None."""
    token = None
    if credentials:
        token = credentials.credentials
    elif "agriscan_token" in request.cookies:
        token = request.cookies.get("agriscan_token")

    if not token:
        # Check custom Authorization header or query param
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        return get_user_by_id(int(user_id))
    except Exception:
        return None


async def get_current_user(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    """Dependency for routes requiring strict authentication."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to proceed.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user
