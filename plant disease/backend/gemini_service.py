"""
AgriScan AI - Unified AI Intelligence Service
Integrates NVIDIA NIM AI (nemotron-3.5-super-vl-120b-a12b) and Google Gemini Vision
with an intelligent, context-aware local agronomic fallback supporting English and Tamil.
"""

import os
import json
import base64
from typing import Dict, Any, List, Optional
from backend.db import get_setting
from backend.nvidia_service import (
    explain_diagnosis_with_nvidia, chat_with_nvidia, get_nvidia_api_key
)

# Optional Gemini SDK
try:
    from google import genai
    from google.genai import types
    HAVE_GEMINI_SDK = True
except ImportError:
    HAVE_GEMINI_SDK = False


def get_gemini_api_key() -> str:
    env_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if env_key:
        return env_key
    return get_setting("gemini_api_key", "")


def generate_vision_explanation(
    image_bytes: bytes,
    mime_type: str,
    cv_result: Dict[str, Any]
) -> Optional[str]:
    """
    Multimodal AI second-opinion and symptom explanation.
    Uses NVIDIA NIM Vision (nvidia/nemotron-3.5-super-vl-120b-a12b) as primary,
    falling back to Gemini Vision if configured.
    """
    # 1. Primary: NVIDIA NIM Vision
    nvidia_key = get_nvidia_api_key()
    if nvidia_key:
        nvidia_exp = explain_diagnosis_with_nvidia(image_bytes, mime_type, cv_result)
        if nvidia_exp:
            return f"🌿 **Multimodal Vision Diagnostic Evaluation:**\n\n{nvidia_exp}"

    # 2. Secondary: Google Gemini Vision
    gemini_key = get_gemini_api_key()
    if gemini_key and HAVE_GEMINI_SDK:
        try:
            client = genai.Client(api_key=gemini_key)
            prompt = f"""
You are an expert plant pathologist and agronomist reviewing an automated computer vision scan.
Here are the CV model findings:
- Crop: {cv_result.get('crop')}
- Detected Disease: {cv_result.get('disease_name')}
- Pathogen: {cv_result.get('pathogen_name')} ({cv_result.get('pathogen_type')})
- Calculated Severity: {cv_result.get('severity_pct')}% ({cv_result.get('severity_label')})
- Confidence Score: {int(cv_result.get('confidence', 0)*100)}%
- Number of Visible Symptom Clusters: {len(cv_result.get('symptom_boxes', []))}

Please provide a concise 3-paragraph diagnostic summary:
1. Visual Symptom Verification: Confirm whether the visible leaf/fruit symptoms match the CV diagnosis.
2. Physiological Impact: Briefly explain how this pathogen disrupts plant photosynthesis or vascular flow.
3. Urgent Actionable Guidance: Highlight the single most critical intervention the farmer must take within 48 hours.
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ]
            )
            return f"🌿 **Gemini Vision Diagnostic Evaluation:**\n\n{response.text}"
        except Exception as e:
            print(f"[Gemini Service] Vision API error: {e}")

    return None


def chat_with_assistant(
    message: str,
    diagnosis_context: Optional[Dict[str, Any]],
    chat_history: List[Dict[str, Any]],
    language: str = "en"
) -> Dict[str, Any]:
    """
    Conversational agricultural extension assistant.
    Primary: NVIDIA NIM AI (nemotron-3.5-super-vl-120b-a12b).
    Secondary: Gemini 2.5 Flash.
    Tertiary: Local agronomic knowledge engine fallback.
    """
    is_tamil = (language.lower() == "ta" or any('\u0b80' <= c <= '\u0bff' for c in message))

    # 1. Primary: NVIDIA NIM AI
    nvidia_key = get_nvidia_api_key()
    if nvidia_key:
        reply = chat_with_nvidia(message, diagnosis_context, chat_history, language=language)
        if reply:
            return {
                "reply": reply,
                "engine": "Agricultural AI Assistant",
                "language": "ta" if is_tamil else "en"
            }

    # 2. Secondary: Gemini Live API
    gemini_key = get_gemini_api_key()
    if gemini_key and HAVE_GEMINI_SDK:
        try:
            client = genai.Client(api_key=gemini_key)
            system_instruction = f"""
You are AgriScan AI's Agricultural Extension Specialist.
You provide empathetic, scientifically accurate, and practical advice to farmers, agronomists, and students.
Current diagnostic context:
{json.dumps(diagnosis_context, indent=2) if diagnosis_context else "No active diagnosis uploaded."}

Language requirement:
Respond in {'Tamil (தமிழ்)' if is_tamil else 'English'}.
Keep your advice clear, step-by-step, actionable, and safe.
Always clearly state that model predictions are advisory and not certified laboratory diagnoses.
"""
            contents = []
            for m in chat_history[-6:]:
                role = "model" if m.get("role") == "assistant" else "user"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m.get("content", ""))]))
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.3
                )
            )
            return {
                "reply": response.text,
                "engine": "Gemini 2.5 Flash",
                "language": "ta" if is_tamil else "en"
            }
        except Exception as e:
            print(f"[Gemini Chat] API call failed: {e}")

    # 3. Tertiary: Local Agronomic Rule Engine Fallback (Supports Tamil and English)
    local_reply = generate_local_agronomic_reply(message, diagnosis_context, is_tamil)
    return {
        "reply": local_reply,
        "engine": "AgriScan Intelligent Knowledge Engine",
        "language": "ta" if is_tamil else "en"
    }


def generate_local_agronomic_reply(
    message: str,
    ctx: Optional[Dict[str, Any]],
    is_tamil: bool
) -> str:
    """
    Local knowledge base generator for the 6 core agricultural questions:
    1. How can I treat this disease?
    2. Why did this disease occur?
    3. Can it spread to other plants?
    4. How can I prevent it?
    5. Is there an organic treatment option?
    6. How should I monitor recovery?
    """
    msg = message.lower()

    if not ctx or ctx.get("is_uncertain"):
        if is_tamil:
            return (
                "தற்போது எந்த ஒரு குறிப்பிட்ட நோயறிதல் முடிவும் தேர்ந்தெடுக்கப்படவில்லை அல்லது படம் தெளிவாக இல்லை. "
                "தயவுசெய்து உங்கள் பயிரின் பாதிக்கப்பட்ட இலை அல்லது பழத்தை தெளிவாக புகைப்படம் எடுத்து பதிவேற்றவும். "
                "அதன் பிறகு நோய்க்கான சிகிச்சை, தடுப்பு முறைகள் மற்றும் பரவுதல் குறித்த கேள்விகளுக்கு என்னால் விரிவான வழிகாட்டலை வழங்க முடியும்."
            )
        return (
            "No confirmed diagnostic report is currently active, or the uploaded image was inconclusive. "
            "Please upload a clear photograph of the affected plant foliage, stems, or fruits. "
            "Once scanned, I will provide tailored treatment schedules, organic options, and spread prevention advice."
        )

    crop = ctx.get("crop", "Plant")
    disease = ctx.get("disease_name", "Disease")
    tamil_name = ctx.get("tamil_name", disease)
    severity = ctx.get("severity_label", "Unknown")
    confidence = int(ctx.get("confidence", 0) * 100)
    organic_treat = ctx.get("organic_treatment", "")
    tamil_organic = ctx.get("tamil_organic_treatment", organic_treat)
    chem_treat = ctx.get("chemical_treatment", "")
    tamil_chem = ctx.get("tamil_chemical_treatment", chem_treat)
    causes = ctx.get("causes", "")
    prevention = ctx.get("prevention_methods", "")
    tamil_prev = ctx.get("tamil_prevention", prevention)
    monitoring = ctx.get("monitoring_recommendations", "")

    # 1. Treatment questions (General or Chemical)
    if any(k in msg for k in ["treat", "cure", "medicine", "spray", "chemical", "மருந்து", "சிகிச்சை", "குணப்படுத்த"]):
        if any(k in msg for k in ["organic", "natural", "bio", "இயற்கை", "ஆர்கானிக்"]):
            if is_tamil:
                return (
                    f"🌿 **{crop} - {tamil_name}க்கான இயற்கை சிகிச்சை முறைகள்:**\n\n"
                    f"{tamil_organic}\n\n"
                    f"💡 **பயன்பாட்டு குறிப்பு:** இயற்கை தெளிப்பான்களை காலை 6-8 மணி அல்லது மாலை 4-6 மணிக்குள் இலைகளின் அடிப்புறமும் படும்படி தெளிக்க வேண்டும். மழை பெய்வதற்கு முன் தெளிக்க வேண்டாம்."
                )
            return (
                f"🌿 **Organic Management for {crop} ({disease}):**\n\n"
                f"{organic_treat}\n\n"
                f"💡 **Application Tip:** Apply bio-fungicides and botanical extracts in early morning (6-8 AM) or late afternoon (4-6 PM) ensuring thorough coverage of the lower leaf surfaces."
            )
        else:
            if is_tamil:
                return (
                    f"💊 **{crop} - {tamil_name}க்கான ஒருங்கிணைந்த சிகிச்சை திட்டம்:**\n\n"
                    f"1. **இயற்கை முறை:** {tamil_organic}\n\n"
                    f"2. **இரசாயன முறை (அங்கீகரிக்கப்பட்ட மருந்துகள்):**\n{tamil_chem}\n\n"
                    f"⚠️ **எச்சரிக்கை:** பாதுகாப்பு கையுறைகள் மற்றும் முகக்கவசம் அணிந்து மருந்துகளை பரிந்துரைக்கப்பட்ட அளவில் மட்டுமே பயன்படுத்தவும்."
                )
            return (
                f"💊 **Integrated Treatment Plan for {crop} ({disease}):**\n\n"
                f"1. **Organic / Biological Options:**\n{organic_treat}\n\n"
                f"2. **Chemical Management (Locally Approved Formulations):**\n{chem_treat}\n\n"
                f"⚠️ **Safety Advisory:** Always adhere to label withholding periods before harvest, and wear protective equipment during pesticide application."
            )

    # 2. Why did it occur? / Causes
    elif any(k in msg for k in ["why", "cause", "reason", "occur", "source", "ஏன்", "காரணம்"]):
        if is_tamil:
            return (
                f"🔬 **{crop} பயிரில் {tamil_name} ஏற்படுவதற்கான முக்கிய காரணங்கள்:**\n\n"
                f"{causes}\n\n"
                f"📊 தற்போதைய பாதிப்பு அளவு: **{severity}** (AI உறுதித்தன்மை: {confidence}%)."
            )
        return (
            f"🔬 **Etiology & Causes of {disease} on {crop}:**\n\n"
            f"{causes}\n\n"
            f"📊 Current diagnosed severity is **{severity}** with **{confidence}%** AI model confidence."
        )

    # 3. Can it spread? / Contagion
    elif any(k in msg for k in ["spread", "infect", "neighbor", "contagious", "transmit", "பரவுமா", "தொற்று"]):
        pathogen_type = ctx.get("pathogen_type", "")
        if is_tamil:
            return (
                f"⚠️ **நோய் பரவும் அபாயம் ({crop} - {tamil_name}):**\n\n"
                f"ஆம், இந்த நோய் ({pathogen_type}) காற்றின் மூலமாகவும், மழைநீர் தெறிப்பதன் மூலமாகவும் மற்றும் பூச்சிகள் வழியாகவும் அருகில் உள்ள ஆரோக்கியமான தாவரங்களுக்கு வேகமாக பரவக்கூடியது.\n\n"
                f"🛡️ **பரவுவதை தடுக்கும் உடனடி நடவடிக்கைகள்:**\n"
                f"1. பாதிக்கப்பட்ட இலைகளை வெட்டி ஒரு பையில் அடைத்து தோட்டத்திலிருந்து வெளியேற்றி எரிக்கவும்.\n"
                f"2. செடிகள் ஈரமாக இருக்கும்போது வயலில் வேலை செய்வதை தவிர்க்கவும் (இது பூஞ்சாண வித்துக்களை பரப்பும்).\n"
                f"3. கவாத்து செய்யும் கத்தரிக்கோலை 70% ஆல்கஹால் கொண்டு கிருமி நீக்கம் செய்யவும்."
            )
        return (
            f"⚠️ **Transmission & Spread Risk for {crop} ({disease}):**\n\n"
            f"Yes, this pathogen ({pathogen_type}) has a high potential to spread to neighboring susceptible plants via wind-borne spores, splashing water droplets, or insect vectors.\n\n"
            f"🛡️ **Immediate Containment Measures:**\n"
            f"1. Surgically prune and bag severely diseased foliage; never throw infected debris into regular compost.\n"
            f"2. Avoid handling or working among wet plants to prevent mechanical spore transfer.\n"
            f"3. Disinfect pruning shears between plants using 70% isopropyl alcohol or bleach solution."
        )

    # 4. Prevention methods
    elif any(k in msg for k in ["prevent", "avoid", "protect", "stop", "தடுக்க", "முன்னெச்சரிக்கை"]):
        if is_tamil:
            return (
                f"🛡️ **{crop} - {tamil_name} வராமல் தடுப்பதற்கான முன்னெச்சரிக்கை வழிகள்:**\n\n"
                f"{tamil_prev}\n\n"
                f"🌱 நோய் எதிர்ப்பு திறன் கொண்ட ரகங்களை பயிரிடுவதும், சொட்டுநீர் பாசனம் அமைப்பதும் மிகச் சிறந்த நீண்ட கால தீர்வாகும்."
            )
        return (
            f"🛡️ **Preventative Protocols for {crop} ({disease}):**\n\n"
            f"{prevention}\n\n"
            f"🌱 Implementing drip fertigation, balanced potassium nutrition, and planting certified disease-resistant hybrids are the most effective long-term strategies."
        )

    # 5. Monitoring recovery
    elif any(k in msg for k in ["monitor", "recover", "healing", "check", "follow", "கண்காணிக்க", "குணம்"]):
        if is_tamil:
            return (
                f"📈 **செடி குணமடைவதை கண்காணிக்கும் வழிகாட்டுதல் ({crop}):**\n\n"
                f"{monitoring}\n\n"
                f"📌 **முக்கிய குறிப்பு:** பழைய இலைகளில் ஏற்பட்ட பழுப்பு கருகல் புள்ளிகள் மீண்டும் பச்சையாக மாறாது. புதிய தளிர்கள் ஆரோக்கியமாகவும், புள்ளிகள் இல்லாமலும் வளர்கிறதா என்பதை வைத்தே செடி குணமடைவதை உறுதி செய்ய வேண்டும்!"
            )
        return (
            f"📈 **Recovery Monitoring Protocol for {crop} ({disease}):**\n\n"
            f"{monitoring}\n\n"
            f"📌 **Important Agronomic Rule:** Already necrotic tissue cannot regain green pigmentation. True physiological recovery is evaluated by whether newly emerging shoots and leaves are clean, vibrant, and free from lesions!"
        )

    # General / Default response
    else:
        if is_tamil:
            return (
                f"வணக்கம்! உங்கள் **{crop}** பயிரில் கண்டறியப்பட்ட **{tamil_name}** ({severity}) தொடர்பான எந்த ஒரு கேள்விக்கும் நான் உதவ தயாராக உள்ளேன்.\n\n"
                f"நீங்கள் கீழ்கண்ட கேள்விகளை கேட்கலாம்:\n"
                f"• இந்த நோயை எவ்வாறு குணப்படுத்துவது?\n"
                f"• இதற்கு இயற்கை வழி தீர்வு உள்ளதா?\n"
                f"• இந்த நோய் மற்ற செடிகளுக்கு பரவுமா?\n"
                f"• இதை எவ்வாறு மீண்டும் வராமல் தடுப்பது?\n"
                f"• செடி குணமடைவதை எவ்வாறு கண்காணிப்பது?"
            )
        return (
            f"Hello! I am monitoring your diagnostic report for **{crop}** with diagnosed **{disease}** ({severity}, {confidence}% confidence).\n\n"
            f"You can ask me specific questions such as:\n"
            f"• *How can I treat this disease?*\n"
            f"• *Is there an organic treatment option?*\n"
            f"• *Can it spread to other plants?*\n"
            f"• *Why did this disease occur?*\n"
            f"• *How should I monitor recovery?*"
        )
