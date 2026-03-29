"""
ocr_pipeline.py
----------------
Screenshot analysis pipeline.
Accepts an image file (PNG, JPG, JPEG, WEBP),
extracts text via Tesseract OCR,
then runs the full text pipeline on the extracted text.

FastAPI /analyse/image calls run() directly.
"""

from __future__ import annotations
import os
import io
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Set Tesseract path for Windows
TESSERACT_PATH = os.getenv("TESSERACT_PATH", "")
if TESSERACT_PATH:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


def extract_text_from_image(image_bytes: bytes, filename: str = "") -> dict:
    """
    Extract text from an image using Tesseract OCR.

    Args:
        image_bytes: raw image file bytes
        filename:    original filename (for format detection)

    Returns:
        { "success": bool, "text": str, "confidence": float, "error": str }
    """
    try:
        from PIL import Image
        import pytesseract

        # Load image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if needed (handles PNG with alpha)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        # OCR config — optimised for SMS/WhatsApp screenshots
        # PSM 6 = assume uniform block of text
        # OEM 3 = default LSTM engine
        config = "--psm 6 --oem 3 -l eng+hin"

        # Get text with confidence data
        data = pytesseract.image_to_data(
            image,
            config=config,
            output_type=pytesseract.Output.DICT
        )

        # Filter out low-confidence words and join
        words = [
            data["text"][i]
            for i in range(len(data["text"]))
            if int(data["conf"][i]) > 30 and data["text"][i].strip()
        ]
        text = " ".join(words).strip()

        # Average confidence
        confs = [int(c) for c in data["conf"] if int(c) > 0]
        avg_conf = sum(confs) / len(confs) if confs else 0

        if not text:
            return {
                "success": False,
                "text":    "",
                "confidence": 0.0,
                "error":   "No text detected in image. Make sure the screenshot is clear and not blurry.",
            }

        return {
            "success":    True,
            "text":       text,
            "confidence": round(avg_conf / 100, 2),
            "error":      None,
        }

    except ImportError:
        return {
            "success": False,
            "text":    "",
            "confidence": 0.0,
            "error":   "Tesseract OCR not installed. Run: pip install pytesseract Pillow",
        }
    except Exception as e:
        return {
            "success": False,
            "text":    "",
            "confidence": 0.0,
            "error":   str(e),
        }


def run(image_bytes: bytes, filename: str = "") -> dict:
    """
    Full screenshot analysis pipeline.

    1. OCR extracts text from screenshot
    2. Text pipeline runs full fraud analysis
    3. Result includes OCR metadata

    Args:
        image_bytes: raw image bytes
        filename:    original filename

    Returns:
        Full analysis result with ocr_text and ocr_confidence added
    """
    # Step 1 — OCR
    ocr = extract_text_from_image(image_bytes, filename)

    if not ocr["success"]:
        return {
            "verdict":         "ERROR",
            "display_verdict": "ERROR",
            "confidence":      0.0,
            "fraud_probability": 0.0,
            "signals":         [],
            "sender_check":    None,
            "url_checks":      [],
            "explanation":     f"Could not extract text from image: {ocr['error']}",
            "action":          "Please upload a clearer screenshot.",
            "model_version":   "v1",
            "language":        "en",
            "ocr_text":        "",
            "ocr_confidence":  0.0,
        }

    # Step 2 — Run text pipeline on extracted text
    from pipelines.text_pipeline import run as text_run
    result = text_run(ocr["text"])

    # Step 3 — Attach OCR metadata
    result["ocr_text"]       = ocr["text"]
    result["ocr_confidence"] = ocr["confidence"]
    result["input_type"]     = "image"

    return result