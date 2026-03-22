"""
text_pipeline.py
-----------------
Full text analysis pipeline.
Accepts a raw message string, runs the fraud classifier,
checks sender ID, extracts and checks any URLs,
maps the result to a structured response with signals and explanation.

FastAPI routes call run() — nothing else.

Week 2: model verdict + keyword signals
Week 3: + sender ID verification + URL extraction
"""

from __future__ import annotations
from typing import Optional, List
from models.fraud_classifier import predict
from evidence.sender_ids import check_sender_from_text
from evidence.url_checks import extract_urls, check_url

# Confidence thresholds
THRESHOLD_HIGH     = 0.80
THRESHOLD_MODERATE = 0.50

# Keyword signal detection — supplements the model
SIGNAL_PATTERNS = {
    "urgency_pressure": [
        "blocked", "suspended", "immediately", "urgent", "freeze",
        "within 24", "today", "now", "final", "warning", "expire",
        "band ho", "turant", "abhi"
    ],
    "credential_harvest": [
        "verify", "update kyc", "kyc", "confirm", "login",
        "enter", "submit", "click here", "validate", "re-verify"
    ],
    "threat_language": [
        "permanently closed", "legal action", "police", "arrest",
        "penalty", "fine", "blocked permanently", "account will be"
    ],
    "fake_domain_hint": [
        "-kyc", "-secure", "-verify", "-block", "-alert",
        ".net", ".co", ".xyz", ".info", "kyc.net", "secure.co"
    ],
}


def _detect_signals(text: str) -> List[str]:
    """Keyword-based signal detection to supplement model verdict."""
    text_lower = text.lower()
    found      = []
    for signal, keywords in SIGNAL_PATTERNS.items():
        if any(kw in text_lower for kw in keywords):
            found.append(signal)
    return found


def _build_explanation(
    verdict: str,
    confidence: float,
    signals: List[str],
    sender_check: Optional[dict],
    url_checks: List[dict],
) -> str:
    """Construct a plain-language explanation from all evidence."""
    parts = []

    # Sender evidence — strongest proof
    if sender_check:
        if sender_check["status"] == "known_fake":
            parts.append(
                f"Sender '{sender_check['sender']}' is NOT registered to "
                f"{sender_check['claimed_bank']}. "
                f"Real sender IDs are: {', '.join(sender_check['real_sender_ids'][:3])}."
            )
        elif sender_check["status"] == "unknown":
            parts.append(
                f"Sender '{sender_check['sender']}' could not be verified "
                f"against any known bank's official sender list."
            )
        elif sender_check["status"] == "verified":
            parts.append(
                f"Sender '{sender_check['sender']}' is verified for "
                f"{sender_check['claimed_bank']}."
            )

    # URL evidence
    for uc in url_checks:
        if uc["verdict"] in ("MALICIOUS", "SUSPICIOUS"):
            age = uc.get("domain_age_days")
            if age is not None and age < 30:
                parts.append(
                    f"Link '{uc['domain']}' was registered {age} days ago — "
                    f"not a legitimate bank domain."
                )
            if uc.get("safebrowsing_hit"):
                parts.append(f"'{uc['domain']}' is flagged by Google Safe Browsing.")
            if uc.get("virustotal_malicious", 0) > 0:
                parts.append(
                    f"'{uc['domain']}' flagged by {uc['virustotal_malicious']} "
                    f"security engines on VirusTotal."
                )

    # Model evidence
    if verdict == "FRAUD":
        parts.append(
            f"Message content matches fraud patterns. "
            f"Model confidence: {round(confidence * 100)}%."
        )
        if "urgency_pressure" in signals:
            parts.append("Uses urgency or threat language to pressure you into acting fast.")
        if "credential_harvest" in signals:
            parts.append("Attempts to collect your credentials or personal information.")
    else:
        if not parts:
            parts.append(
                f"This message does not show strong fraud patterns. "
                f"Model confidence: {round(confidence * 100)}%."
            )

    return " ".join(parts) if parts else "Analysis complete."


def _verdict_label(verdict: str, fraud_probability: float) -> str:
    """Map model output to display verdict."""
    if verdict == "FRAUD":
        if fraud_probability >= THRESHOLD_HIGH:
            return "HIGH_FRAUD"
        return "SUSPICIOUS"
    return "LEGITIMATE"


def run(text: str, lang: str = "en") -> dict:
    """
    Run the full text analysis pipeline.

    Args:
        text: PII-stripped message text
        lang: language code (en / hi / ta / te)

    Returns:
        Full structured analysis result including
        model verdict, sender check, and URL checks.
    """
    if not text or not text.strip():
        return {
            "verdict":           "ERROR",
            "display_verdict":   "ERROR",
            "confidence":        0.0,
            "fraud_probability": 0.0,
            "signals":           [],
            "sender_check":      None,
            "url_checks":        [],
            "explanation":       "Empty message received.",
            "action":            "Please provide a message to analyse.",
            "model_version":     "v1",
            "language":          lang,
        }

    text = text.strip()

    # ── 1. Model inference ────────────────────────────────────
    result = predict(text)

    # ── 2. Keyword signals ────────────────────────────────────
    signals = _detect_signals(text)

    # ── 3. Sender ID check ────────────────────────────────────
    sender_check = check_sender_from_text(text)
    if sender_check and sender_check["status"] == "known_fake":
        if "fake_sender_id" not in signals:
            signals.append("fake_sender_id")

    # ── 4. URL checks ─────────────────────────────────────────
    urls       = extract_urls(text)
    url_checks = [check_url(u) for u in urls[:2]]  # max 2 URLs per message
    if any(uc["verdict"] in ("MALICIOUS", "SUSPICIOUS") for uc in url_checks):
        if "malicious_url" not in signals:
            signals.append("malicious_url")

    # ── 5. Display verdict ────────────────────────────────────
    display = _verdict_label(result["verdict"], result["fraud_probability"])

    # Upgrade to HIGH_FRAUD if sender is a known fake even if model is moderate
    if (display == "SUSPICIOUS" and sender_check and
            sender_check["status"] == "known_fake"):
        display = "HIGH_FRAUD"

    # ── 6. Explanation ────────────────────────────────────────
    explanation = _build_explanation(
        result["verdict"],
        result["confidence"],
        signals,
        sender_check,
        url_checks,
    )

    # ── 7. Action step ────────────────────────────────────────
    helpline = (
        sender_check["helpline"]
        if sender_check and sender_check.get("helpline")
        else "1930"
    )
    if result["verdict"] == "FRAUD":
        action = (
            f"Do NOT click any links or share any information. "
            f"Call your bank's fraud helpline: {helpline}."
        )
    else:
        action = (
            "No immediate action required. "
            "When in doubt, call your bank directly."
        )

    return {
        "verdict":           result["verdict"],
        "display_verdict":   display,
        "confidence":        result["confidence"],
        "fraud_probability": result["fraud_probability"],
        "signals":           signals,
        "sender_check":      sender_check,
        "url_checks":        url_checks,
        "explanation":       explanation,
        "action":            action,
        "model_version":     result["model_version"],
        "language":          lang,
    }
