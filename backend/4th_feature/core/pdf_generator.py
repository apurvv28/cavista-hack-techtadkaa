import os
import json
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

CORE_DIR = os.path.dirname(__file__)

FONT_CONFIGS = {
    "mr": {"reg": "NotoSansDevanagari-Regular.ttf", "bold": "NotoSansDevanagari-Bold.ttf", "name": "Devanagari"},
    "hi": {"reg": "NotoSansDevanagari-Regular.ttf", "bold": "NotoSansDevanagari-Bold.ttf", "name": "Devanagari"},
    "ta": {"reg": "NotoSansTamil-Regular.ttf", "bold": "NotoSansTamil-Bold.ttf", "name": "Tamil"},
    "en": {"reg": "NotoSans-Regular.ttf", "bold": "NotoSans-Bold.ttf", "name": "NotoSans"},
    "default": {"reg": "NotoSans-Regular.ttf", "bold": "NotoSans-Bold.ttf", "name": "NotoSans"}
}

REPORT_TRANSLATIONS = {
    "mr": {"summary": "आरोग्य सारांश", "soap": "वैद्यकीय तपशील", "diagnoses": "निदान", "meds": "औषधे", "risk": "धोका पातळी", "follow": "पुढील भेट"},
    "hi": {"summary": "स्वास्थ्य सारांश", "soap": "चिकित्सा विवरण", "diagnoses": "निदान", "meds": "दवाएं", "risk": "जोखिम की स्थिति", "follow": "अगली मुलाकात"},
    "ta": {"summary": "சுகாதார சுருக்கம்", "soap": "மருத்துவ விவரங்கள்", "diagnoses": "நோயறிதல்", "meds": "மருந்துகள்", "risk": "ஆபத்து நிலை", "follow": "அடுத்த சந்திப்பு"},
    "en": {"summary": "YOUR HEALTH SUMMARY", "soap": "CLINICAL DETAILS", "diagnoses": "DIAGNOSES", "meds": "MEDICATIONS", "risk": "ALERT STATUS", "follow": "FOLLOW-UP"}
}

def register_fonts(lang_code):
    """Registers Unicode fonts with ReportLab to avoid encoding issues."""
    en_reg = os.path.join(CORE_DIR, "NotoSans-Regular.ttf")
    en_bold = os.path.join(CORE_DIR, "NotoSans-Bold.ttf")
    
    # 1. Base NotoSans
    try:
        pdfmetrics.registerFont(TTFont('NotoSans', en_reg))
        pdfmetrics.registerFont(TTFont('NotoSans-Bold', en_bold))
        pdfmetrics.registerFontFamily('NotoSans', normal='NotoSans', bold='NotoSans-Bold')
    except Exception as e:
        print(f"Warning: Base font load error {e}")
        
    # 2. Multilingual Font
    config = FONT_CONFIGS.get(lang_code, FONT_CONFIGS["default"])
    multi_font = config["name"]
    
    if multi_font != 'NotoSans':
        reg_path = os.path.join(CORE_DIR, config["reg"])
        bold_path = os.path.join(CORE_DIR, config.get("bold", config["reg"]))
        try:
            if os.path.exists(reg_path):
                pdfmetrics.registerFont(TTFont(multi_font, reg_path))
                if os.path.exists(bold_path):
                    pdfmetrics.registerFont(TTFont(f"{multi_font}-Bold", bold_path))
                else:
                    pdfmetrics.registerFont(TTFont(f"{multi_font}-Bold", reg_path))
                pdfmetrics.registerFontFamily(multi_font, normal=multi_font, bold=f"{multi_font}-Bold")
        except Exception as e:
            print(f"Warning: Multilingual font load error {e}. Falling back to default.")
            multi_font = 'NotoSans'
            
    return multi_font

def create_snapshot_box(title, content_html, font_name, styles, is_multilingual=False):
    """Creates a professional styled box mimicking the 'snapshot/card' UI."""
    # Use native font family for title if localized
    box_title_style = ParagraphStyle(
        'BoxTitle', 
        parent=styles['Heading2'], 
        fontName=f"{font_name}-Bold" if is_multilingual else "NotoSans-Bold", 
        fontSize=12, 
        textColor=colors.whitesmoke, 
        spaceAfter=5
    )
    
    box_content_style = ParagraphStyle(
        'BoxContent', 
        parent=styles['Normal'], 
        fontName=font_name, 
        fontSize=11, 
        leading=16, 
        textColor=colors.HexColor('#2c3e50')
    )
    
    # Row 1: Colored Title Header
    title_p = Paragraph(title, box_title_style)
    # Row 2: Content text
    content_p = Paragraph(content_html, box_content_style)
    
    # Build a single-column table with 2 rows
    data = [[title_p], [content_p]]
    
    table = Table(data, colWidths=[470])
    table.setStyle(TableStyle([
        # Title Header Styling
        ('BACKGROUND', (0,0), (0,0), colors.HexColor('#3498db')),
        ('TOPPADDING', (0,0), (0,0), 8),
        ('BOTTOMPADDING', (0,0), (0,0), 8),
        
        # Content Box Styling
        ('BACKGROUND', (0,1), (0,1), colors.HexColor('#f8f9fa')),
        ('TOPPADDING', (0,1), (0,1), 12),
        ('BOTTOMPADDING', (0,1), (0,1), 12),
        
        # Shared Border
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#bdc3c7')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bdc3c7')),
        
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
    ]))
    
    # KeepTogether ensures the box doesn't break split awkwardly across two pages
    return KeepTogether(table)

def generate_patient_pdf(data: dict, translated_data: dict, output_path: str, qr_code_path: str = None, lang_code: str = "en"):
    """
    Generates the patient report using ReportLab Platypus.
    Solves horizontal overflow naturally through Flowables and prevents encoding crashes.
    """
    multi_font = register_fonts(lang_code)
    trans = REPORT_TRANSLATIONS.get(lang_code, REPORT_TRANSLATIONS["en"])
    
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    styles = getSampleStyleSheet()
    
    # Common Styles
    title_style = ParagraphStyle('Title', fontName='NotoSans-Bold', fontSize=18, textColor=colors.HexColor('#2c3e50'), spaceAfter=2)
    subtitle_style = ParagraphStyle('SubTitle', fontName='NotoSans', fontSize=10, textColor=colors.HexColor('#7f8c8d'), spaceAfter=15)
    
    # ---------------- 1. HEADER & PATIENT INFO ----------------
    story.append(Paragraph(data.get('clinic_name', 'Medical Summary'), title_style))
    story.append(Paragraph("Official Clinical Report", subtitle_style))
    
    # Horizontal Line
    story.append(Table([['']], colWidths=[470], style=[('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#bdc3c7')), ('BOTTOMPADDING', (0,0), (-1,-1), 5)]))
    story.append(Spacer(1, 15))
    
    # Patient Info Grid
    info_style_label = ParagraphStyle('IL', fontName='NotoSans-Bold', fontSize=11, textColor=colors.HexColor('#2c3e50'))
    info_style_value = ParagraphStyle('IV', fontName='NotoSans', fontSize=11, textColor=colors.HexColor('#2c3e50'))
    
    info_data = [
        [Paragraph("Patient Name:", info_style_label), Paragraph(data.get('patient_name', 'N/A'), info_style_value)],
        [Paragraph("Patient ID:", info_style_label), Paragraph(data.get('patient_id', 'N/A'), info_style_value)],
        [Paragraph("Visit Date:", info_style_label), Paragraph(data.get('visit_date', 'N/A'), info_style_value)],
        [Paragraph("Doctor:", info_style_label), Paragraph(data.get('doctor_name', 'N/A'), info_style_value)]
    ]
    
    t_info = Table(info_data, colWidths=[120, 350], hAlign='LEFT')
    t_info.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOTTOMPADDING', (0,0), (-1,-1), 6)]))
    story.append(t_info)
    story.append(Spacer(1, 25))

    # ---------------- 2. PAGE 1: AGENTIC SUMMARY ----------------
    summary_text = (translated_data.get('summary') or 'Summary not generated.').strip()
    
    # Strict JSON formatting removal for summary
    if summary_text.startswith('{'):
        try:
            parsed_summary = json.loads(summary_text)
            if isinstance(parsed_summary, dict):
                lines = []
                for k, v in parsed_summary.items():
                    clean_k = str(k).strip(' "\'{}:')
                    lines.append(f"<b>{clean_k}</b><br/>{str(v)}<br/>")
                summary_text = "".join(lines)
        except:
             summary_text = summary_text.replace("{", "").replace("}", "").replace('"', "")
    else:
        # Convert plain newlines to HTML-style Breaks for ReportLab Paragraphs
        summary_text = summary_text.replace('\n', '<br/>')

    story.append(create_snapshot_box(
        title=f"{trans['summary']} -> HEALTH SUMMARY", 
        content_html=summary_text, 
        font_name=multi_font, 
        styles=styles, 
        is_multilingual=True
    ))
    story.append(Spacer(1, 15))
    
    # Risk
    risk = data.get('risk_status', 'GREEN')
    risk_color = '#27ae60' if risk == 'GREEN' else '#c0392b'
    story.append(Paragraph(f"<b>{trans['risk']}:</b> <font color='{risk_color}'>{risk}</font>", ParagraphStyle('Risk', fontName=multi_font, fontSize=12)))
    
    # QR Code at the bottom of Page 1
    if qr_code_path and os.path.exists(qr_code_path):
        story.append(Spacer(1, 30))
        story.append(Paragraph("<b>YOUR DIGITAL REPORT</b>", ParagraphStyle('QC', fontName='NotoSans-Bold', alignment=1, fontSize=11)))
        story.append(Spacer(1, 5))
        story.append(Image(qr_code_path, width=120, height=120))
        story.append(Spacer(1, 2))
        story.append(Paragraph("Scan to verify clinical findings", ParagraphStyle('QCI', fontName='NotoSans', alignment=1, fontSize=9, textColor=colors.HexColor('#7f8c8d'))))

    # ---------------- 3. PAGE 2: CLINICAL DETAILS ----------------
    story.append(PageBreak())
    
    clinical = data.get('clinical_findings', {})
    
    # Format SOAP
    soap_lines = []
    if clinical.get('chief_complaint'):
        soap_lines.append(f"<b>COMPLAINT:</b><br/>{clinical['chief_complaint']}")
    if clinical.get('vitals'):
        v_str = ", ".join([f"{k.replace('_', ' ').title()}: {v}" for k, v in clinical['vitals'].items() if v])
        if v_str: soap_lines.append(f"<b>VITALS:</b><br/>{v_str}")
    if clinical.get('objective_findings'):
        soap_lines.append(f"<b>OBJECTIVE:</b><br/>{clinical['objective_findings']}")
    if clinical.get('plan'):
        soap_lines.append(f"<b>PLAN:</b><br/>{clinical['plan']}")
        
    soap_html = "<br/><br/>".join(soap_lines)
    if soap_html:
        story.append(create_snapshot_box("CLINICAL NOTES", soap_html, "NotoSans", styles))
        story.append(Spacer(1, 15))
        
    # Diagnoses
    diag_lines = []
    for mapping in data.get('medical_knowledge', []):
        d = mapping.get('disease_details', {})
        if d:
            line = f"• <font color='#c0392b'><b>{d.get('disease_name')}</b></font> (ICD-10: {d.get('icd_code')})"
            if d.get('what_is_wrong'):
                line += f"<br/>&nbsp;&nbsp;&nbsp;&nbsp;<i>Detail: {d['what_is_wrong']}</i>"
            diag_lines.append(line)
            
    if diag_lines:
        story.append(create_snapshot_box("DIAGNOSES & CODES", "<br/><br/>".join(diag_lines), "NotoSans", styles))
        story.append(Spacer(1, 15))

    # Medications
    med_lines = []
    for mapping in data.get('medical_knowledge', []):
        d = mapping.get('disease_details', {})
        for m in d.get('medications', []):
            med_lines.append(f"• <b>{m}</b> <font color='#7f8c8d' size='10'>(for {d.get('disease_name')})</font>")
            
    if med_lines:
        story.append(create_snapshot_box("MEDICATIONS", "<br/>".join(med_lines), "NotoSans", styles))
        story.append(Spacer(1, 20))
        
    # Follow Up
    story.append(Paragraph(f"<b>FOLLOW UP:</b> {data.get('follow_up_date', 'As needed')}", ParagraphStyle('F', fontName='NotoSans-Bold', fontSize=12)))

    doc.build(story)
    return output_path
