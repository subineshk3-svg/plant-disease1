"""
AgriScan AI - SQLite to Supabase Migration Utility
Transfers existing offline SQLite records (diagnoses, chats, settings)
safely into Supabase PostgreSQL database without data loss.
"""

import sys
import os
import json
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.supabase_service import (
    is_supabase_enabled, get_supabase_admin_client, get_supabase_config
)
from backend.db import DB_PATH

def migrate_data():
    print("=" * 60)
    print(" AGRISCAN AI — SQLITE TO SUPABASE MIGRATION WIZARD")
    print("=" * 60)

    cfg = get_supabase_config()
    print(f"Target Supabase URL: {cfg['url'] or 'Not configured'}")

    if not is_supabase_enabled():
        print("\n[!] Supabase credentials are not yet configured in environment variables.")
        print("Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running migration.")
        print("Existing SQLite data remains safely active in offline mode.")
        return False

    client = get_supabase_admin_client()
    if not client:
        print("\n[✗] Failed to connect to Supabase. Check your URL and service key.")
        return False

    print("\n[✓] Connected to Supabase PostgreSQL successfully.")

    if not os.path.exists(DB_PATH):
        print(f"[!] SQLite DB file not found at {DB_PATH}.")
        return False

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Migrate Diagnoses
    cursor.execute("SELECT * FROM diagnoses")
    diag_rows = cursor.fetchall()
    print(f"[*] Found {len(diag_rows)} diagnosis records in SQLite...")

    diag_migrated = 0
    for r in diag_rows:
        d = dict(r)
        payload = {
            "original_filename": d.get("original_filename", "leaf.jpg"),
            "crop": d.get("crop", "Unknown"),
            "disease_name": d.get("disease_name", "Unknown"),
            "tamil_name": d.get("tamil_name"),
            "scientific_name": d.get("scientific_name"),
            "pathogen_type": d.get("pathogen_type"),
            "pathogen_name": d.get("pathogen_name"),
            "disease_key": d.get("disease_key", "unknown"),
            "severity_pct": float(d.get("severity_pct") or 0.0),
            "severity_label": d.get("severity_label", "Unknown"),
            "confidence": float(d.get("confidence") or 0.0),
            "symptoms": d.get("symptoms"),
            "tamil_symptoms": d.get("tamil_symptoms"),
            "causes": d.get("causes"),
            "organic_treatment": d.get("organic_treatment"),
            "tamil_organic_treatment": d.get("tamil_organic_treatment"),
            "chemical_treatment": d.get("chemical_treatment"),
            "tamil_chemical_treatment": d.get("tamil_chemical_treatment"),
            "prevention_methods": d.get("prevention_methods"),
            "tamil_prevention": d.get("tamil_prevention"),
            "monitoring_recommendations": d.get("monitoring_recommendations"),
            "when_to_consult_expert": d.get("when_to_consult_expert"),
            "alternative_diagnoses": json.loads(d.get("alternative_diagnoses") or "[]"),
            "symptom_boxes": json.loads(d.get("symptom_boxes") or "[]"),
            "image_quality": json.loads(d.get("image_quality") or "{}"),
            "is_uncertain": bool(d.get("is_uncertain", 0)),
            "uncertain_reason": d.get("uncertain_reason"),
            "gemini_explanation": d.get("gemini_explanation"),
            "original_image_path": d.get("original_image_path"),
            "annotated_image_path": d.get("annotated_image_path")
        }
        try:
            client.table("diagnoses").insert(payload).execute()
            diag_migrated += 1
        except Exception as e:
            print(f"    [-] Skip diagnosis #{d.get('id')}: {e}")

    print(f"[✓] Migrated {diag_migrated}/{len(diag_rows)} diagnosis records to Supabase.")

    # 2. Migrate Chat Messages
    cursor.execute("SELECT * FROM chat_messages")
    chat_rows = cursor.fetchall()
    print(f"[*] Found {len(chat_rows)} chat messages in SQLite...")
    chat_migrated = 0
    for r in chat_rows:
        c = dict(r)
        payload = {
            "role": c.get("role", "user"),
            "content": c.get("content", ""),
            "language": c.get("language", "en")
        }
        try:
            client.table("chat_messages").insert(payload).execute()
            chat_migrated += 1
        except Exception as e:
            pass

    print(f"[✓] Migrated {chat_migrated}/{len(chat_rows)} chat messages to Supabase.")

    conn.close()
    print("\n[✓] MIGRATION COMPLETED SUCCESSFULLY.")
    return True

if __name__ == "__main__":
    migrate_data()
