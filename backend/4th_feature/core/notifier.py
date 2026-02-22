import os
import time
from twilio.rest import Client
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Twilio Config
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_FROM_NUMBER")

# Email Config
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
EMAIL_FROM = os.getenv("EMAIL_FROM")

def send_sms(to_number: str, first_name: str, clinic_name: str, risk_status: str, summary_text: str, link: str, clinic_phone: str) -> str:
    """
    Sends clinical summary via Twilio with specific handling for trial account limits.
    """
    if not all([TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM]):
        return "invalid_config"

    client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
    status_icon = "🟢" if risk_status == "GREEN" else "🔴"
    
    # Allow for full rich summary in SMS (Up to Twilio's concatenation limit roughly)
    sms_summary = (summary_text[:1000] + '...') if len(summary_text) > 1000 else summary_text
    
    body = f"Hello {first_name}, {clinic_name} has sent your health summary:\n\n{sms_summary}\n\nStatus: {status_icon} {risk_status}\nReport: {link}"
    
    for attempt in range(2):
        try:
            # Twilio requires E.164 format. Ensure '+' prefix.
            clean_number = to_number.strip()
            if not clean_number.startswith('+'):
                clean_number = f"+{clean_number}"
                
            message = client.messages.create(
                body=body,
                from_=TWILIO_FROM,
                to=clean_number
            )
            print(f"Twilio SMS Sent SID: {message.sid}")
            return "sent"
        except Exception as e:
            error_msg = str(e).lower()
            print(f"TWILIO ERROR [Attempt {attempt+1}]: {error_msg}")
            if "unverified" in error_msg:
                return "twilio_unverified_number"
            if attempt == 0:
                time.sleep(3)
    
    return f"failed: {error_msg}"

def send_email(to_email: str, patient_name: str, clinic_name: str, risk_status: str, summary_text: str, link: str, doctor_name: str, clinic_phone: str, clinic_address: str, pdf_path: str, qr_path: str) -> str:
    """
    Sends HTML email with PDF attached and QR code embedded via CID.
    """
    if not all([SMTP_USER, SMTP_PASS, EMAIL_FROM]):
        return "invalid_config"

    msg = MIMEMultipart('related')
    msg['Subject'] = f"Health Report: {patient_name} - {clinic_name}"
    msg['From'] = EMAIL_FROM
    msg['To'] = to_email

    status_icon = "🟢" if risk_status == "GREEN" else "🔴"

    html = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">{clinic_name}</h2>
        <p>Dear <strong>{patient_name}</strong>,</p>
        <p>Your visit summary is ready. Here is a brief overview:</p>
        
        <div style="background: #fdfdfd; padding: 15px; border-left: 5px solid #3498db; margin: 20px 0;">
            <p style="white-space: pre-wrap;">{summary_text}</p>
            <p><strong>Status:</strong> {status_icon} {risk_status}</p>
        </div>

        <div style="text-align: center; margin: 30px 0; padding: 20px; border: 1px dashed #ccc;">
            <p><strong>SCAN OR CLICK TO VIEW FULL REPORT</strong></p>
            <div style="margin: 20px 0;">
                <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px; display: inline-block;" />
            </div>
            <a href="{link}" style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Download Full Report (PDF)</a>
            <p style="font-size: 11px; margin-top: 10px; color: #888;">{link}</p>
        </div>

        <p style="font-size: 0.9em; color: #666;">If you have any questions, please contact the clinic at {clinic_phone}.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #999; text-align: center;">
            {doctor_name} | {clinic_address}<br>
            Sent via Secure Health Platform
        </p>
    </div>
</body>
</html>
"""
    msg_html = MIMEText(html, 'html')
    msg.attach(msg_html)

    # Embed QR Code via CID
    if qr_path and os.path.exists(qr_path):
        try:
            with open(qr_path, 'rb') as f:
                img = MIMEImage(f.read())
                img.add_header('Content-ID', '<qrcode>')
                img.add_header('Content-Disposition', 'inline', filename="qrcode.png")
                msg.attach(img)
        except Exception as e:
            print(f"Failed to embed QR: {e}")

    # Attach PDF
    if pdf_path and os.path.exists(pdf_path):
        try:
            with open(pdf_path, "rb") as f:
                attach = MIMEApplication(f.read(), _subtype="pdf")
                attach.add_header('Content-Disposition', 'attachment', filename=os.path.basename(pdf_path))
                msg.attach(attach)
        except Exception as e:
            print(f"Failed to attach PDF: {e}")

    for attempt in range(2):
        try:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            return "sent"
        except Exception as e:
            print(f"Email attempt {attempt+1} failed: {e}")
            if attempt == 0:
                time.sleep(3)
                
    return "failed"
