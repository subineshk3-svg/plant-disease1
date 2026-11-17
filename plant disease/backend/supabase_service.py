"""
AgriScan AI - Supabase Backend Integration Service
Provides unified database, authentication, storage, and realtime interface
with seamless automatic fallback to local SQLite and disk storage.
"""

import os
import io
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime

try:
    from supabase import create_client, Client
    HAVE_SUPABASE_LIB = True
except ImportError:
    HAVE_SUPABASE_LIB = False
    Client = Any

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_config() -> Dict[str, str]:
    """Retrieves Supabase configuration from environment variables."""
    return {
        "url": os.environ.get("SUPABASE_URL", "").strip(),
        "anon_key": os.environ.get("SUPABASE_ANON_KEY", "").strip(),
        "service_role_key": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        "bucket": os.environ.get("SUPABASE_STORAGE_BUCKET", "plant-images").strip()
    }


def is_supabase_enabled() -> bool:
    """Returns True if Supabase URL and a valid key are configured."""
    cfg = get_supabase_config()
    return bool(HAVE_SUPABASE_LIB and cfg["url"] and (cfg["service_role_key"] or cfg["anon_key"]))


def get_supabase_client() -> Optional[Client]:
    """Returns initialized Supabase client with anon key for user-level calls."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    cfg = get_supabase_config()
    if not is_supabase_enabled():
        return None

    try:
        key = cfg["anon_key"] or cfg["service_role_key"]
        _supabase_client = create_client(cfg["url"], key)
        return _supabase_client
    except Exception as e:
        print(f"[Supabase Service] Failed to initialize client: {e}")
        return None


def get_supabase_admin_client() -> Optional[Client]:
    """Returns initialized Supabase client with service role key for backend elevated ops."""
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client

    cfg = get_supabase_config()
    if not is_supabase_enabled():
        return None

    try:
        key = cfg["service_role_key"] or cfg["anon_key"]
        _supabase_admin_client = create_client(cfg["url"], key)
        return _supabase_admin_client
    except Exception as e:
        print(f"[Supabase Service] Failed to initialize admin client: {e}")
        return None


# ---------------- SUPABASE AUTHENTICATION ----------------

def supabase_auth_signup(email: str, password: str, metadata: dict) -> Optional[Dict[str, Any]]:
    """Registers user via Supabase Auth."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        res = client.auth.sign_up({
            "email": email.strip().lower(),
            "password": password,
            "options": {
                "data": metadata
            }
        })
        if res.user:
            return {
                "id": str(res.user.id),
                "email": res.user.email,
                "session": {
                    "access_token": res.session.access_token if res.session else None,
                    "refresh_token": res.session.refresh_token if res.session else None
                }
            }
        return None
    except Exception as e:
        print(f"[Supabase Auth] Sign up error: {e}")
        raise e


def supabase_auth_login(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticates user via Supabase Auth."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        res = client.auth.sign_in_with_password({
            "email": email.strip().lower(),
            "password": password
        })
        if res.user and res.session:
            return {
                "id": str(res.user.id),
                "email": res.user.email,
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
                "user_metadata": res.user.user_metadata or {}
            }
        return None
    except Exception as e:
        print(f"[Supabase Auth] Login error: {e}")
        raise e


def supabase_auth_reset_password(email: str) -> bool:
    """Dispatches password recovery email via Supabase."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        client.auth.reset_password_for_email(email.strip().lower())
        return True
    except Exception as e:
        print(f"[Supabase Auth] Reset password error: {e}")
        return False


# ---------------- SUPABASE STORAGE ----------------

def supabase_upload_image(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> Optional[str]:
    """Uploads file to Supabase Storage bucket and returns public URL."""
    client = get_supabase_admin_client() or get_supabase_client()
    if not client:
        return None

    cfg = get_supabase_config()
    bucket = cfg["bucket"]

    try:
        ext = os.path.splitext(filename)[1].lower() or ".jpg"
        unique_name = f"{uuid.uuid4().hex[:12]}{ext}"
        path = f"uploads/{unique_name}"

        res = client.storage.from_(bucket).upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        # Get Public URL
        public_url = client.storage.from_(bucket).get_public_url(path)
        return public_url
    except Exception as e:
        print(f"[Supabase Storage] File upload error: {e}")
        return None


# ---------------- SUPABASE DATABASE (POSTGRESQL) ----------------

def supabase_save_diagnosis(data: Dict[str, Any]) -> Optional[int]:
    """Persists diagnostic report to Supabase public.diagnoses."""
    client = get_supabase_admin_client() or get_supabase_client()
    if not client:
        return None

    try:
        payload = {
            "original_filename": data.get("original_filename", "leaf.jpg"),
            "crop": data.get("crop", "Unknown"),
            "disease_name": data.get("disease_name", "Unknown"),
            "tamil_name": data.get("tamil_name"),
            "scientific_name": data.get("scientific_name"),
            "pathogen_type": data.get("pathogen_type"),
            "pathogen_name": data.get("pathogen_name"),
            "disease_key": data.get("disease_key", "unknown"),
            "severity_pct": float(data.get("severity_pct", 0.0)),
            "severity_label": data.get("severity_label", "Unknown"),
            "confidence": float(data.get("confidence", 0.0)),
            "symptoms": data.get("symptoms"),
            "tamil_symptoms": data.get("tamil_symptoms"),
            "causes": data.get("causes"),
            "organic_treatment": data.get("organic_treatment"),
            "tamil_organic_treatment": data.get("tamil_organic_treatment"),
            "chemical_treatment": data.get("chemical_treatment"),
            "tamil_chemical_treatment": data.get("tamil_chemical_treatment"),
            "prevention_methods": data.get("prevention_methods"),
            "tamil_prevention": data.get("tamil_prevention"),
            "monitoring_recommendations": data.get("monitoring_recommendations"),
            "when_to_consult_expert": data.get("when_to_consult_expert"),
            "alternative_diagnoses": data.get("alternative_diagnoses", []),
            "symptom_boxes": data.get("symptom_boxes", []),
            "image_quality": data.get("image_quality", {}),
            "is_uncertain": bool(data.get("is_uncertain", False)),
            "uncertain_reason": data.get("uncertain_reason"),
            "gemini_explanation": data.get("gemini_explanation"),
            "original_image_path": data.get("original_image_path"),
            "annotated_image_path": data.get("annotated_image_path"),
        }

        # If user_id is UUID format, attach it
        user_id = data.get("user_id")
        if user_id:
            try:
                uuid.UUID(str(user_id))
                payload["user_id"] = str(user_id)
            except (ValueError, AttributeError):
                # SQLite numeric user_id or demo user
                pass

        res = client.table("diagnoses").insert(payload).execute()
        if res.data and len(res.data) > 0:
            return res.data[0].get("id")
        return None
    except Exception as e:
        print(f"[Supabase DB] Save diagnosis error: {e}")
        return None


def supabase_get_all_diagnoses(user_id: Optional[Any] = None, limit: int = 50, offset: int = 0) -> Optional[List[Dict[str, Any]]]:
    """Fetches diagnoses from Supabase with user isolation."""
    client = get_supabase_admin_client() or get_supabase_client()
    if not client:
        return None

    try:
        query = client.table("diagnoses").select(
            "id, original_filename, crop, disease_name, tamil_name, pathogen_type, "
            "severity_pct, severity_label, confidence, is_uncertain, uncertain_reason, "
            "original_image_path, annotated_image_path, created_at, user_id"
        ).order("id", desc=True).limit(limit).offset(offset)

        if user_id:
            try:
                uuid.UUID(str(user_id))
                query = query.eq("user_id", str(user_id))
            except (ValueError, AttributeError):
                pass

        res = query.execute()
        return res.data
    except Exception as e:
        print(f"[Supabase DB] List diagnoses error: {e}")
        return None


def supabase_get_diagnosis_by_id(diag_id: int) -> Optional[Dict[str, Any]]:
    """Fetches full diagnosis record by ID from Supabase."""
    client = get_supabase_admin_client() or get_supabase_client()
    if not client:
        return None

    try:
        res = client.table("diagnoses").select("*").eq("id", diag_id).single().execute()
        return res.data if res else None
    except Exception as e:
        print(f"[Supabase DB] Get diagnosis by ID error: {e}")
        return None


def supabase_save_chat_message(diagnosis_id: Optional[int], role: str, content: str, language: str = "en", user_id: Optional[Any] = None) -> bool:
    """Saves AI advisory chat message to Supabase."""
    client = get_supabase_admin_client() or get_supabase_client()
    if not client:
        return False

    try:
        payload = {
            "diagnosis_id": diagnosis_id,
            "role": role,
            "content": content,
            "language": language
        }
        if user_id:
            try:
                uuid.UUID(str(user_id))
                payload["user_id"] = str(user_id)
            except (ValueError, AttributeError):
                pass

        client.table("chat_messages").insert(payload).execute()
        return True
    except Exception as e:
        print(f"[Supabase DB] Save chat message error: {e}")
        return False


def supabase_get_chat_history(diagnosis_id: Optional[int] = None, limit: int = 30) -> Optional[List[Dict[str, Any]]]:
    """Retrieves chat messages from Supabase."""
    client = get_supabase_admin_client() or get_supabase_client()
    if not client:
        return None

    try:
        query = client.table("chat_messages").select("role, content, language, created_at").order("id", desc=False).limit(limit)
        if diagnosis_id:
            query = query.eq("diagnosis_id", diagnosis_id)
        res = query.execute()
        return res.data
    except Exception as e:
        print(f"[Supabase DB] Get chat history error: {e}")
        return None
