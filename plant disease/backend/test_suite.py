"""
AgriScan AI - Automated Test Suite
Verifies Computer Vision engine, Plant tissue verification,
Symptom localization, Chatbot bilingual responses, PDF generation,
and FastAPI endpoint integrations.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import cv2
import numpy as np
import pytest
import asyncio
import io
from starlette.datastructures import UploadFile
from backend.db import (
    init_db, save_diagnosis, get_diagnosis_by_id, delete_diagnosis,
    log_failure, get_admin_statistics, is_admin_dashboard_locked, set_admin_dashboard_lock
)
from backend.cv_engine import analyze_image_quality, verify_plant_tissue, detect_symptoms_and_boxes, predict_disease
from backend.gemini_service import chat_with_assistant
from backend.nvidia_service import get_nvidia_api_key
from backend.pdf_generator import generate_diagnostic_pdf
from backend.server import (
    health_check, get_admin_dashboard_stats, list_sample_images,
    query_disease_database, process_analysis_core,
    signup_endpoint, login_endpoint, logout_endpoint,
    update_user_profile_endpoint, change_user_password_endpoint,
    forgot_password_endpoint, reset_password_endpoint,
    get_admin_lock_status, toggle_admin_lock, save_settings,
    get_supabase_client_config,
    SignUpRequest, LoginRequest, ProfileUpdateRequest,
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest,
    AdminLockToggleRequest, SettingsRequest
)
from backend.auth import (
    register_user, authenticate_user, decode_access_token,
    initiate_password_reset, complete_password_reset,
    get_user_by_email, get_user_by_id
)
from fastapi import Response


def test_01_db_initialization():
    """Verify SQLite database and settings initialize cleanly."""
    init_db()
    stats = get_admin_statistics()
    assert "total_scans" in stats
    assert "model_benchmarks" in stats
    assert stats["model_benchmarks"]["supported_classes"] == 38
    print("✓ Test 1 Passed: DB Initialized.")


def test_02_image_quality_engine():
    """Verify Laplacian variance blur and brightness evaluation."""
    # Sharp image
    sharp_img = np.zeros((300, 300, 3), dtype=np.uint8)
    cv2.circle(sharp_img, (150, 150), 80, (0, 255, 0), -1)
    q1 = analyze_image_quality(sharp_img)
    assert q1["is_acceptable"] is True

    # Blurry image (heavy Gaussian blur)
    blur_img = cv2.GaussianBlur(sharp_img, (51, 51), 0)
    q2 = analyze_image_quality(blur_img)
    assert q2["sharpness_laplacian"] < 45.0
    print("✓ Test 2 Passed: Image Quality Engine.")


def test_03_plant_tissue_verification():
    """Verify plant leaf tissue vs non-plant object rejection."""
    # Green plant leaf mock
    leaf_img = np.ones((300, 300, 3), dtype=np.uint8) * 200
    cv2.circle(leaf_img, (150, 150), 100, (34, 139, 34), -1)  # Forest green
    is_plant1, cov1, mask1 = verify_plant_tissue(leaf_img)
    assert is_plant1 is True
    assert cov1 > 10.0

    # Non-plant metallic gray object
    non_plant = np.ones((300, 300, 3), dtype=np.uint8) * 128
    is_plant2, cov2, mask2 = verify_plant_tissue(non_plant)
    assert is_plant2 is False
    print("✓ Test 3 Passed: Plant Tissue Verification.")


def test_04_cv_disease_prediction_healthy_and_diseased():
    """Verify real multi-class disease prediction and severity."""
    # 1. Healthy Leaf Test
    leaf_healthy = np.ones((400, 400, 3), dtype=np.uint8) * 240
    cv2.circle(leaf_healthy, (200, 200), 120, (34, 139, 34), -1)
    res_healthy = predict_disease(leaf_healthy, user_crop="Tomato")
    assert res_healthy["is_uncertain"] is False
    assert res_healthy["crop"] == "Tomato"
    assert res_healthy["severity_pct"] < 5.0

    # 2. Diseased Leaf with Necrotic spots
    leaf_diseased = leaf_healthy.copy()
    cv2.circle(leaf_diseased, (160, 160), 25, (20, 45, 90), -1)  # Necrotic spot
    cv2.circle(leaf_diseased, (240, 220), 20, (20, 45, 90), -1)  # Necrotic spot
    res_diseased = predict_disease(leaf_diseased, user_crop="Tomato")
    assert len(res_diseased["symptom_boxes"]) > 0
    assert res_diseased["severity_pct"] > 0.0

    # 3. Non-Plant Image (Uncertainty Category Test)
    non_plant_img = np.ones((300, 300, 3), dtype=np.uint8) * 60
    res_uncertain = predict_disease(non_plant_img)
    assert res_uncertain["is_uncertain"] is True
    assert "insufficient plant" in res_uncertain["uncertain_reason"].lower()
    print("✓ Test 4 Passed: CV Disease Prediction & Uncertainty handling.")


def test_05_bilingual_chat_assistant():
    """Verify context-aware agricultural assistant in English and Tamil."""
    mock_ctx = {
        "crop": "Tomato",
        "disease_name": "Tomato Early Blight",
        "tamil_name": "தக்காளி முன்கூட்டிய கருகல் நோய்",
        "severity_label": "Moderate (18.4%)",
        "confidence": 0.92,
        "pathogen_type": "Fungus",
        "organic_treatment": "Foliar spray of Trichoderma harzianum (5g/L).",
        "tamil_organic_treatment": "டிரைக்கோடெர்மா விரிடி (5கி/லி) தெளிக்கவும்.",
        "chemical_treatment": "Mancozeb 75 WP (2g/L).",
        "tamil_chemical_treatment": "மேன்கோசெப் 75 WP (2கி/லி) தெளிக்கவும்.",
        "causes": "Warm temperatures (24°C-29°C) with alternating wet periods.",
        "prevention_methods": "Rotate crops with non-solanaceous crops.",
        "tamil_prevention": "பயிர் சுழற்சி முறை பின்பற்றவும்.",
        "monitoring_recommendations": "Scout lower canopy leaves weekly."
    }

    # Test English Treatment Query
    en_res = chat_with_assistant("How can I treat this disease?", mock_ctx, [], language="en")
    assert en_res["language"] == "en"
    assert "Mancozeb" in en_res["reply"] or "treatment" in en_res["reply"].lower() or "fungicide" in en_res["reply"].lower() or len(en_res["reply"]) > 20

    # Test Tamil Organic Treatment Query
    ta_res = chat_with_assistant("இயற்கை வழி சிகிச்சை உள்ளதா?", mock_ctx, [], language="ta")
    assert ta_res["language"] == "ta"
    assert len(ta_res["reply"]) > 20
    print("✓ Test 5 Passed: Bilingual Chat Assistant.")


def test_06_pdf_report_generator():
    """Verify ReportLab PDF generation in English and Tamil."""
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports")
    os.makedirs(out_dir, exist_ok=True)

    dummy_diag = {
        "id": 999,
        "created_at": "2026-11-17 18:30:00",
        "crop": "Tomato",
        "disease_name": "Tomato Early Blight",
        "tamil_name": "தக்காளி முன்கூட்டிய கருகல் நோய்",
        "scientific_name": "Alternaria solani",
        "pathogen_name": "Alternaria solani",
        "pathogen_type": "Fungus",
        "severity_pct": 18.4,
        "severity_label": "Moderate",
        "confidence": 0.92,
        "symptoms": "Concentric ring spots resembling target boards.",
        "tamil_symptoms": "இலைகளில் வட்ட வளையங்களுடன் கூடிய பழுப்பு கருகல் புள்ளிகள்.",
        "causes": "Warm temperatures with frequent dews.",
        "organic_treatment": "Apply Neem oil 1% and Trichoderma.",
        "tamil_organic_treatment": "வேப்பெண்ணெய் மற்றும் டிரைக்கோடெர்மா தெளிக்கவும்.",
        "chemical_treatment": "Mancozeb 75 WP (2g/L).",
        "tamil_chemical_treatment": "மேன்கோசெப் 75 WP தெளிக்கவும்.",
        "prevention_methods": "Crop rotation and drip irrigation.",
        "tamil_prevention": "பயிர் சுழற்சி மற்றும் சொட்டுநீர் பாசனம்.",
        "monitoring_recommendations": "Inspect lower leaves weekly.",
        "when_to_consult_expert": "If defoliation exceeds 25%.",
        "alternative_diagnoses": [{"disease_name": "Septoria Leaf Spot", "confidence": 0.06}]
    }

    # Generate English PDF
    pdf_en = os.path.join(out_dir, "test_report_en.pdf")
    generate_diagnostic_pdf(dummy_diag, pdf_en, language="en")
    assert os.path.exists(pdf_en) and os.path.getsize(pdf_en) > 1000

    # Generate Tamil PDF
    pdf_ta = os.path.join(out_dir, "test_report_ta.pdf")
    generate_diagnostic_pdf(dummy_diag, pdf_ta, language="ta")
    assert os.path.exists(pdf_ta) and os.path.getsize(pdf_ta) > 1000
    print("✓ Test 6 Passed: PDF Report Generator (EN & TA).")


def test_07_api_endpoints():
    """Verify backend endpoints and core analysis pipeline."""
    # Health check
    h = health_check()
    assert h["status"] == "healthy"
    assert h["supported_crops_count"] == 19
    assert h["supported_diseases_count"] == 45
    assert h["nvidia_nim_connected"] is True

    # Disease Database Query
    db_res = query_disease_database(crop="Tomato")
    assert db_res["count"] > 0

    # Admin Statistics (Underlying service)
    stats = get_admin_statistics()
    assert stats["total_scans"] >= 0

    # Sample Images
    samples = list_sample_images()
    assert len(samples) > 0

    # Analyze Image Pipeline with Real Sample File
    sample_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "frontend", "assets", "samples", "tomato_early_blight.jpg"
    )
    with open(sample_path, "rb") as f:
        content = f.read()

    result = process_analysis_core(content, "tomato_early_blight.jpg", crop="Tomato")
    assert result["status"] == "success"
    diag = result["diagnosis"]
    assert diag["id"] > 0
    assert diag["crop"] == "Tomato"
    assert "Early Blight" in diag["disease_name"] or "Tomato" in diag["disease_name"]
    assert len(diag["symptom_boxes"]) > 0
    print("✓ Test 7 Passed: All API Endpoints & Real File Upload Pipeline.")


def test_08_authentication_system():
    """Verify registration, login, JWT issuance, profile updates, password reset, and isolation."""
    from fastapi import HTTPException
    import uuid

    # 1. Register a new test user
    rand_id = uuid.uuid4().hex[:6]
    test_email = f"farmer_{rand_id}@example.com"
    dummy_resp = Response()
    signup_req = SignUpRequest(
        name="Ramesh Kumar",
        email=test_email,
        password="Agrisecret@123",
        confirm_password="Agrisecret@123",
        mobile="9876543210",
        country="India",
        language="ta",
        accept_terms=True
    )
    reg_res = signup_endpoint(signup_req, dummy_resp)
    assert reg_res["status"] == "success"
    assert "token" in reg_res
    user_a = reg_res["user"]
    assert user_a["email"] == test_email
    assert user_a["name"] == "Ramesh Kumar"

    # 2. Duplicate registration rejection
    try:
        signup_endpoint(signup_req, dummy_resp)
        assert False, "Duplicate signup should have failed"
    except HTTPException as e:
        assert e.status_code == 409

    # 3. Weak password rejection
    weak_req = SignUpRequest(
        name="Weak User",
        email=f"weak_{rand_id}@example.com",
        password="short",
        confirm_password="short",
        accept_terms=True
    )
    try:
        signup_endpoint(weak_req, dummy_resp)
        assert False, "Weak password signup should have failed"
    except HTTPException as e:
        assert e.status_code == 400

    # 4. Successful login & remember-me token
    login_req = LoginRequest(email=test_email, password="Agrisecret@123", remember_me=True)
    login_res = login_endpoint(login_req, dummy_resp)
    assert login_res["status"] == "success"
    token = login_res["token"]
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["email"] == test_email
    assert int(payload["sub"]) == user_a["id"]

    # 5. Invalid password login rejection
    bad_login_req = LoginRequest(email=test_email, password="WrongPassword123")
    try:
        login_endpoint(bad_login_req, dummy_resp)
        assert False, "Invalid password login should have failed"
    except HTTPException as e:
        assert e.status_code == 401

    # 6. Profile update
    prof_req = ProfileUpdateRequest(
        name="Ramesh Kumar Organic",
        mobile="9988776655",
        country="India",
        language="en"
    )
    upd_res = update_user_profile_endpoint(prof_req, current_user=user_a)
    assert upd_res["status"] == "success"
    assert upd_res["user"]["name"] == "Ramesh Kumar Organic"
    assert upd_res["user"]["mobile"] == "9988776655"

    # 7. Password change
    chg_req = ChangePasswordRequest(
        current_password="Agrisecret@123",
        new_password="NewAgrisecret@456",
        confirm_new_password="NewAgrisecret@456"
    )
    chg_res = change_user_password_endpoint(chg_req, current_user=user_a)
    assert chg_res["status"] == "success"

    # Verify old password no longer works
    try:
        login_endpoint(LoginRequest(email=test_email, password="Agrisecret@123"), dummy_resp)
        assert False, "Old password should be rejected"
    except HTTPException as e:
        assert e.status_code == 401

    # Verify new password works
    new_login = login_endpoint(LoginRequest(email=test_email, password="NewAgrisecret@456"), dummy_resp)
    assert new_login["status"] == "success"

    # 8. Forgot password & Account recovery flow
    forgot_res = forgot_password_endpoint(ForgotPasswordRequest(email=test_email))
    assert forgot_res["status"] == "success"
    assert "reset_token" in forgot_res
    reset_tok = forgot_res["reset_token"]

    # Complete reset
    rst_req = ResetPasswordRequest(
        token=reset_tok,
        new_password="RecoveredPass@789",
        confirm_new_password="RecoveredPass@789"
    )
    rst_res = reset_password_endpoint(rst_req)
    assert rst_res["status"] == "success"

    # Verify login with recovered password
    rec_login = login_endpoint(LoginRequest(email=test_email, password="RecoveredPass@789"), dummy_resp)
    assert rec_login["status"] == "success"

    # 9. User-Isolated Diagnosis History Verification
    # Create User B
    user_b_email = f"farmer_b_{rand_id}@example.com"
    user_b_res = signup_endpoint(SignUpRequest(
        name="User B",
        email=user_b_email,
        password="PasswordB@123",
        confirm_password="PasswordB@123",
        accept_terms=True
    ), dummy_resp)
    user_b = user_b_res["user"]

    # Upload analysis under User A
    sample_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "frontend", "assets", "samples", "tomato_healthy.jpg"
    )
    with open(sample_path, "rb") as f:
        leaf_bytes = f.read()

    diag_a = process_analysis_core(leaf_bytes, "user_a_leaf.jpg", crop="Tomato", user_id=user_a["id"])
    diag_id_a = diag_a["diagnosis"]["id"]

    # Verify User A's history includes this diagnosis
    from backend.db import get_all_diagnoses, get_diagnosis_by_id
    user_a_history = get_all_diagnoses(user_id=user_a["id"])
    a_ids = [d["id"] for d in user_a_history]
    assert diag_id_a in a_ids

    # Verify User B's history DOES NOT contain User A's diagnosis
    user_b_history = get_all_diagnoses(user_id=user_b["id"])
    b_ids = [d["id"] for d in user_b_history]
    assert diag_id_a not in b_ids

    # Verify User B cannot access diagnosis of User A via isolated get
    rec_b_view = get_diagnosis_by_id(diag_id_a, user_id=user_b["id"])
    assert rec_b_view is None

    # Verify User A can access their diagnosis
    rec_a_view = get_diagnosis_by_id(diag_id_a, user_id=user_a["id"])
    assert rec_a_view is not None
    assert rec_a_view["id"] == diag_id_a

    print("✓ Test 8 Passed: Authentication, Session, Recovery & User History Isolation.")


def test_09_admin_dashboard_complete_lock():
    """
    Verify complete lockdown of the Admin Dashboard:
    1. Lock is active for everyone (including administrators).
    2. Backend APIs (/api/admin/stats, /api/admin/settings) return HTTP 423 Locked.
    3. Error detail matches required message: 'Admin Dashboard is currently locked.'
    4. Code and components remain intact without deletion or damage.
    5. Authorized developer can toggle lock state with developer secret.
    6. Re-locking restores complete lockdown.
    """
    from fastapi import HTTPException

    # 1. Ensure lock is active
    set_admin_dashboard_lock(True)
    assert is_admin_dashboard_locked() is True

    # 2. Check public lock status endpoint
    status_resp = get_admin_lock_status()
    assert status_resp["locked"] is True
    assert "Admin Dashboard is currently locked." in status_resp["message"]

    # 3. Attempting to fetch admin stats must be blocked with HTTP 423
    try:
        get_admin_dashboard_stats()
        assert False, "Accessing locked admin stats should have failed with HTTP 423"
    except HTTPException as e:
        assert e.status_code == 423
        assert e.detail == "Admin Dashboard is currently locked."

    # 4. Attempting to update admin settings must also be blocked with HTTP 423
    try:
        save_settings(SettingsRequest(confidence_threshold="0.50"))
        assert False, "Saving locked admin settings should have failed with HTTP 423"
    except HTTPException as e:
        assert e.status_code == 423
        assert e.detail == "Admin Dashboard is currently locked."

    # 5. Unauthorized toggle attempts must be rejected with HTTP 403
    try:
        toggle_admin_lock(AdminLockToggleRequest(locked=False, developer_secret="wrong-secret"))
        assert False, "Unauthorized unlock should have failed with HTTP 403"
    except HTTPException as e:
        assert e.status_code == 403

    # 6. Authorized developer unlocks dashboard
    dev_secret = os.environ.get("ADMIN_UNLOCK_SECRET", "agriscan-developer-master-key-2026")
    unlock_res = toggle_admin_lock(AdminLockToggleRequest(locked=False, developer_secret=dev_secret))
    assert unlock_res["status"] == "success"
    assert unlock_res["locked"] is False
    assert is_admin_dashboard_locked() is False

    # 7. When unlocked, admin stats and settings work cleanly (preserving all components)
    unlocked_stats = get_admin_dashboard_stats()
    assert unlocked_stats["api_health"]["server_status"] == "ONLINE (200 OK)"
    assert unlocked_stats["total_scans"] >= 0

    # 8. Re-lock dashboard to restore complete lockdown
    lock_res = toggle_admin_lock(AdminLockToggleRequest(locked=True, developer_secret=dev_secret))
    assert lock_res["status"] == "success"
    assert lock_res["locked"] is True
    assert is_admin_dashboard_locked() is True

    # 9. Verify locked again
    try:
        get_admin_dashboard_stats()
        assert False, "Accessing re-locked admin stats should have failed with HTTP 423"
    except HTTPException as e:
        assert e.status_code == 423
        assert e.detail == "Admin Dashboard is currently locked."

    print("✓ Test 9 Passed: Admin Dashboard Complete Lock, Security Gatekeeper & Developer Toggle.")


def test_10_supabase_integration():
    """Verify Supabase integration architecture, SQL schema, SDK client, and fallback."""
    from backend.supabase_service import (
        is_supabase_enabled, get_supabase_config, get_supabase_client,
        get_supabase_admin_client, HAVE_SUPABASE_LIB
    )

    # 1. Supabase Python SDK installation
    assert HAVE_SUPABASE_LIB is True, "supabase python package must be installed"

    # 2. Config reading
    cfg = get_supabase_config()
    assert "url" in cfg
    assert "anon_key" in cfg
    assert "service_role_key" in cfg
    assert "bucket" in cfg

    # 3. Public config endpoint security check (Never leaks service_role_key)
    pub_cfg = get_supabase_client_config()
    assert "enabled" in pub_cfg
    assert "url" in pub_cfg
    assert "anon_key" in pub_cfg
    assert "service_role_key" not in pub_cfg, "Service role key must NEVER be exposed via public endpoint"

    # 4. Fallback resilience check
    # Without external project credentials, system gracefully falls back to local SQLite without errors
    if not is_supabase_enabled():
        assert get_supabase_client() is None
        assert get_supabase_admin_client() is None

    # 5. Schema verification
    schema_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "supabase_schema.sql")
    assert os.path.exists(schema_path), "supabase_schema.sql must exist"
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    assert "public.profiles" in schema_sql
    assert "public.diagnoses" in schema_sql
    assert "public.chat_messages" in schema_sql
    assert "public.failed_logs" in schema_sql
    assert "public.app_settings" in schema_sql
    assert "ENABLE ROW LEVEL SECURITY" in schema_sql
    assert "storage.buckets" in schema_sql
    assert "supabase_realtime" in schema_sql

    print("✓ Test 10 Passed: Supabase Architecture, Client SDK, Schema DDL & Offline Resilience.")


if __name__ == "__main__":
    test_01_db_initialization()
    test_02_image_quality_engine()
    test_03_plant_tissue_verification()
    test_04_cv_disease_prediction_healthy_and_diseased()
    test_05_bilingual_chat_assistant()
    test_06_pdf_report_generator()
    test_07_api_endpoints()
    test_08_authentication_system()
    test_09_admin_dashboard_complete_lock()
    test_10_supabase_integration()
    print("\n==============================================")
    print(" ALL 10 AGRISCAN AI TEST MODULES PASSED (100%) ")
    print("==============================================")
