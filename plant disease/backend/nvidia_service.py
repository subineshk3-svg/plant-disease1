"""
AgriScan AI - NVIDIA NIM AI Service
Powers multimodal disease diagnosis explanation, vision verification,
and bilingual (English/Tamil) agricultural treatment assistant using
NVIDIA's flagship 'nvidia/nemotron-3.5-super-vl-120b-a12b' model.
"""

import os
import json
import base64
import urllib.request
from typing import Dict, Any, List, Optional
from backend.db import get_setting, update_setting

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b"
HARDCODED_NVIDIA_KEY = "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"


def get_nvidia_api_key() -> str:
    """Retrieves NVIDIA API key from environment, database, or default configured key."""
    env_key = os.environ.get("NVIDIA_API_KEY")
    if env_key:
        return env_key.strip()
    db_key = get_setting("nvidia_api_key", "")
    if db_key:
        return db_key.strip()
    return HARDCODED_NVIDIA_KEY


def explain_diagnosis_with_nvidia(
    image_bytes: bytes,
    mime_type: str,
    cv_result: Dict[str, Any]
) -> Optional[str]:
    """
    Sends the plant image and CV findings to NVIDIA's Vision Language Model
    to generate an agronomic second opinion, symptom verification, and treatment overview.
    """
    api_key = get_nvidia_api_key()
    if not api_key:
        return None

    try:
        b64_img = base64.b64encode(image_bytes).decode("utf-8")
        prompt = f"""
You are an expert plant pathologist and agronomist reviewing an automated computer vision scan.
Here are the findings from the computer vision model:
- Crop: {cv_result.get('crop')}
- Detected Disease: {cv_result.get('disease_name')} ({cv_result.get('scientific_name')})
- Pathogen: {cv_result.get('pathogen_name')} ({cv_result.get('pathogen_type')})
- Severity: {cv_result.get('severity_pct')}% ({cv_result.get('severity_label')})
- AI Confidence: {int(cv_result.get('confidence', 0)*100)}%
- Detected Symptom Clusters: {len(cv_result.get('symptom_boxes', []))}

Please provide a concise, structured 3-paragraph diagnostic summary:
1. Visual Symptom Verification: Confirm whether the visible foliar/fruit lesions in the image match the diagnosis.
2. Physiological Impact: Explain how this pathogen affects the plant's vascular flow, photosynthesis, or yield.
3. Urgent Treatment Strategy: Recommend the most crucial organic or chemical intervention the farmer must take within 48 hours.
"""
        payload = {
            "model": DEFAULT_NVIDIA_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_img}"}}
                    ]
                }
            ],
            "max_tokens": 700,
            "temperature": 0.2
        }

        req = urllib.request.Request(
            NVIDIA_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )

        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
            msg = data["choices"][0]["message"]
            content = msg.get("content")
            if not content and msg.get("reasoning_content"):
                content = msg.get("reasoning_content")
            return content
    except Exception as e:
        print(f"[NVIDIA Service] Vision explanation error: {e}")
        return None


def chat_with_nvidia(
    message: str,
    diagnosis_context: Optional[Dict[str, Any]],
    chat_history: List[Dict[str, Any]],
    language: str = "en"
) -> Optional[str]:
    """
    Conversational agricultural extension assistant powered by NVIDIA NIM.
    Supports English and Tamil.
    """
    api_key = get_nvidia_api_key()
    if not api_key:
        return None

    is_tamil = (language.lower() == "ta" or any('\u0b80' <= c <= '\u0bff' for c in message))

    system_prompt = f"""
You are AgriScan AI's Chief Agricultural Extension Officer, an advanced AI diagnostic and agronomic assistant.
You provide precise, practical, and compassionate agronomic advice to farmers, agronomists, and students.
Active Diagnosis Context:
{json.dumps(diagnosis_context, indent=2) if diagnosis_context else "No active diagnosis uploaded."}

Language requirement:
Respond in {'Tamil (தமிழ்)' if is_tamil else 'English'}.
Structure your advice clearly with practical bullet points.
Cover organic biocontrol remedies, registered chemical fungicide/bactericide dosages, spread prevention, and recovery scouting.
Always note that model predictions are advisory.
"""

    messages = [{"role": "system", "content": system_prompt}]
    for m in chat_history[-6:]:
        messages.append({
            "role": m.get("role", "user"),
            "content": m.get("content", "")
        })
    messages.append({"role": "user", "content": message})

    payload = {
        "model": DEFAULT_NVIDIA_MODEL,
        "messages": messages,
        "max_tokens": 800,
        "temperature": 0.2
    }

    req = urllib.request.Request(
        NVIDIA_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode())
            msg = data["choices"][0]["message"]
            content = msg.get("content")
            if not content and msg.get("reasoning_content"):
                content = msg.get("reasoning_content")
            return content
    except Exception as e:
        print(f"[NVIDIA Service] Chat completion error: {e}")
        return None
