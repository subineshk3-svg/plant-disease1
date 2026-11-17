"""
AgriScan AI - Enterprise PDF Diagnostic Report Generator
Produces publication-quality agricultural diagnostic reports in English and Tamil.
Includes original and annotated images, 16 diagnostic fields, severity meters, and disclaimers.
"""

import os
from datetime import datetime
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Nirmala font for full Indic / Tamil and Unicode support
FONT_NAME = "Helvetica"
FONT_NAME_BOLD = "Helvetica-Bold"

nirmala_path = r"C:\Windows\Fonts\Nirmala.ttc"
if os.path.exists(nirmala_path):
    try:
        pdfmetrics.registerFont(TTFont("Nirmala", nirmala_path, subfontIndex=0))
        FONT_NAME = "Nirmala"
        FONT_NAME_BOLD = "Nirmala"
    except Exception as e:
        print(f"[PDF Generator] Font register warning: {e}")


def generate_diagnostic_pdf(
    diagnosis: Dict[str, Any],
    output_path: str,
    language: str = "en"
) -> str:
    """
    Generates a comprehensive PDF diagnostic report.
    Language: 'en' for English, 'ta' for Tamil.
    """
    is_ta = (language.lower() == "ta")
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "ReportTitle",
        fontName=FONT_NAME_BOLD,
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1b4332"),
        alignment=0
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        fontName=FONT_NAME,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4a5568")
    )

    h2_style = ParagraphStyle(
        "Heading2",
        fontName=FONT_NAME_BOLD,
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2d3748"),
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        "BodyDark",
        fontName=FONT_NAME,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#2d3748")
    )

    meta_label = ParagraphStyle(
        "MetaLabel",
        fontName=FONT_NAME_BOLD,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1b4332")
    )

    meta_val = ParagraphStyle(
        "MetaVal",
        fontName=FONT_NAME,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1a202c")
    )

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        fontName=FONT_NAME,
        fontSize=7.5,
        leading=11,
        textColor=colors.HexColor("#718096")
    )

    # 1. Header Banner
    header_title = "AgriScan AI — வேளாண்மை தாவர நோய் கண்டறிதல் அறிக்கை" if is_ta else "AgriScan AI — Comprehensive Plant Diagnostic Report"
    header_sub = (
        f"அறிக்கை எண்: #AGRI-{diagnosis.get('id', 0):05d} | பகுப்பாய்வு தேதி: {diagnosis.get('created_at', str(datetime.now())[:19])}"
        if is_ta else
        f"Report ID: #AGRI-{diagnosis.get('id', 0):05d} | Generated: {diagnosis.get('created_at', str(datetime.now())[:19])}"
    )

    story.append(Paragraph(header_title, title_style))
    story.append(Paragraph(header_sub, subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2d6a4f"), spaceBefore=2, spaceAfter=10))

    # 2. Image Section (Original & Annotated with Bounding Boxes)
    orig_path = diagnosis.get("original_image_path", "")
    anno_path = diagnosis.get("annotated_image_path", "")

    img_elements = []
    # Original
    if orig_path and os.path.exists(orig_path):
        try:
            im1 = RLImage(orig_path, width=240, height=160)
            lbl1 = "அசல் படம் (Original Scan)" if is_ta else "Original Field Photograph"
            img_elements.append([im1, Paragraph(f"<para align='center'><b>{lbl1}</b></para>", body_style)])
        except Exception:
            pass

    # Annotated
    if anno_path and os.path.exists(anno_path):
        try:
            im2 = RLImage(anno_path, width=240, height=160)
            lbl2 = "அடையாளம் காணப்பட்ட அறிகுறிகள் (AI Lesions)" if is_ta else "AI Symptom Localization (YOLO Lesions)"
            if img_elements:
                img_elements[0].extend([im2, Paragraph(f"<para align='center'><b>{lbl2}</b></para>", body_style)])
            else:
                img_elements.append([im2, Paragraph(f"<para align='center'><b>{lbl2}</b></para>", body_style)])
        except Exception:
            pass

    if img_elements:
        img_table = Table(
            [[img_elements[0][0], img_elements[0][2]] if len(img_elements[0]) >= 4 else [img_elements[0][0]],
             [img_elements[0][1], img_elements[0][3]] if len(img_elements[0]) >= 4 else [img_elements[0][1]]],
            colWidths=[270, 270] if len(img_elements[0]) >= 4 else [540]
        )
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(img_table)
        story.append(Spacer(1, 10))

    # 3. Primary Classification Summary Table
    crop_name = diagnosis.get("crop", "Unknown")
    disease_name = diagnosis.get("tamil_name" if is_ta else "disease_name") or diagnosis.get("disease_name", "")
    sci_name = diagnosis.get("scientific_name", "N/A")
    pathogen = f"{diagnosis.get('pathogen_name', '')} ({diagnosis.get('pathogen_type', '')})"
    sev_pct = diagnosis.get("severity_pct", 0.0)
    sev_lbl = diagnosis.get("severity_label", "Unknown")
    conf = int(diagnosis.get("confidence", 0) * 100)

    summary_data = [
        [
            Paragraph("பயிர் (Crop):" if is_ta else "Identified Crop:", meta_label),
            Paragraph(f"<b>{crop_name}</b>", meta_val),
            Paragraph("நோயின் பெயர் (Disease):" if is_ta else "Predicted Disease:", meta_label),
            Paragraph(f"<b>{disease_name}</b>", meta_val),
        ],
        [
            Paragraph("அறிவியல் பெயர் (Scientific):" if is_ta else "Scientific Name:", meta_label),
            Paragraph(f"<i>{sci_name}</i>", meta_val),
            Paragraph("நோய்க்காரணி (Pathogen):" if is_ta else "Possible Pathogen:", meta_label),
            Paragraph(pathogen, meta_val),
        ],
        [
            Paragraph("தீவிரம் (Severity):" if is_ta else "Disease Severity:", meta_label),
            Paragraph(f"<b>{sev_pct}% ({sev_lbl})</b>", meta_val),
            Paragraph("நம்பிக்கை (Confidence):" if is_ta else "AI Model Confidence:", meta_label),
            Paragraph(f"<b>{conf}%</b>", meta_val),
        ]
    ]

    summary_table = Table(summary_data, colWidths=[120, 150, 130, 140])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bbf7d0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # 4. Detailed 16-Field Content Cards
    sections = [
        ("கண்டறியப்பட்ட அறிகுறிகள் (Visible Symptoms)" if is_ta else "Visible Symptoms",
         diagnosis.get("tamil_symptoms" if is_ta else "symptoms") or diagnosis.get("symptoms", "N/A")),

        ("தோன்றியதற்கான காரணங்கள் (Possible Causes & Etiology)" if is_ta else "Possible Causes & Etiology",
         diagnosis.get("causes", "N/A")),

        ("இயற்கை வழி சிகிச்சை முறைகள் (Organic Management Options)" if is_ta else "Organic Management Options",
         diagnosis.get("tamil_organic_treatment" if is_ta else "organic_treatment") or diagnosis.get("organic_treatment", "N/A")),

        ("இரசாயன சிகிச்சை (Chemical Management - Approved Formulations)" if is_ta else "Chemical Management Options (Locally Approved Formulations)",
         diagnosis.get("tamil_chemical_treatment" if is_ta else "chemical_treatment") or diagnosis.get("chemical_treatment", "N/A")),

        ("முன்னெச்சரிக்கை தடுப்பு முறைகள் (Prevention Methods)" if is_ta else "Prevention & Orchard Sanitation",
         diagnosis.get("tamil_prevention" if is_ta else "prevention_methods") or diagnosis.get("prevention_methods", "N/A")),

        ("கண்காணிப்பு வழிகாட்டுதல் (Monitoring Recommendations)" if is_ta else "Monitoring Recommendations",
         diagnosis.get("monitoring_recommendations", "N/A")),

        ("வேளாண் நிபுணரை எப்போது அணுக வேண்டும்? (When to Consult an Expert)" if is_ta else "When to Consult an Agricultural Expert",
         diagnosis.get("when_to_consult_expert", "N/A")),
    ]

    for title, content in sections:
        card_data = [
            [Paragraph(title, h2_style)],
            [Paragraph(content, body_style)]
        ]
        card_table = Table(card_data, colWidths=[540])
        card_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(card_table)
        story.append(Spacer(1, 6))

    # 5. Alternative Diagnoses
    alts = diagnosis.get("alternative_diagnoses", [])
    if alts:
        alt_title = "மாற்று சாத்தியமான நோயறிதல்கள் (Alternative Possible Diagnoses)" if is_ta else "Alternative Possible Diagnoses (Differential Analysis)"
        alt_rows = [[
            Paragraph(f"<b>{alt_title}</b>", h2_style),
            Paragraph("", body_style)
        ]]
        for a in alts[:3]:
            a_name = a.get("disease_name", "")
            a_conf = int(a.get("confidence", 0) * 100)
            alt_rows.append([
                Paragraph(f"• {a_name}", body_style),
                Paragraph(f"<b>{a_conf}% confidence</b>", body_style)
            ])
        alt_table = Table(alt_rows, colWidths=[400, 140])
        alt_table.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#fde68a")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(alt_table)
        story.append(Spacer(1, 8))

    # 6. Important Disclaimer / Limitations
    disclaimer_text = (
        "<b>முக்கிய வரம்புகள் & எச்சரிக்கை:</b> இந்த நோயறிதல் அறிக்கை கணினி பார்வை செயற்கை நுண்ணறிவு (AI) மாதிரி மூலம் வழிகாட்டல் மற்றும் ஆரம்ப நிலை பரிசோதனைக்காக மட்டுமே உருவாக்கப்பட்டுள்ளது. இது ஆய்வக சோதனைக்கு அல்லது வேளாண்மை விஞ்ஞானியின் நேரடி ஆய்வுக்கு மாற்றாகாது. எந்த ஒரு ரசாயன மருந்தை தெளிக்கும் முன்பும் உள்ளூர் வேளாண் அதிகாரியின் ஆலோசனையை பெறவும்."
        if is_ta else
        "<b>IMPORTANT LIMITATIONS & DISCLAIMER:</b> This diagnostic report is generated by an automated artificial intelligence computer vision system (PlantVillage model) for agricultural advisory and triage guidance only. Model predictions are probabilistic and do not constitute a certified laboratory confirmation. Always observe label instructions, pre-harvest intervals (PHI), and consult your local agricultural extension service (KVK) before applying agrochemicals."
    )
    story.append(Spacer(1, 4))
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    # Build document
    doc.build(story)
    return output_path
