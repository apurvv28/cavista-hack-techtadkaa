import uuid
import hmac
import hashlib
import time
import os
from typing import Optional

# Secret key for HMAC (should be in .env)
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_medical_key")

def generate_secure_token(patient_id: str) -> str:
    """
    Generates a unique, HMAC-signed token for a patient report.
    """
    timestamp = str(int(time.time()))
    base = f"{patient_id}_{timestamp}_{uuid.uuid4()}"
    signature = hmac.new(
        SECRET_KEY.encode(),
        base.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return f"{base}_{signature}"

def validate_token(token: str) -> bool:
    """
    Validates the token signature. 
    In a real app, you'd also check against a DB/Cache for expiry and single-use.
    """
    try:
        parts = token.split("_")
        if len(parts) != 4:
            return False
            
        base = "_".join(parts[:3])
        signature = parts[3]
        
        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            base.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False
