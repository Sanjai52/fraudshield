"""
text_pipeline.py
-----------------
Full text analysis pipeline.
Accepts a raw message string, runs the fraud classifier,
maps the result to a structured response with signals and explanation.

FastAPI routes call run() — nothing else.
"""

from models.fraud_classifier import predict


# Confidence thresholds
THRESHOLD_HIGH     = 0.80
THRESHOLD_MODERATE = 0.50

# Simple keyword signal detection
# These supplement the model — they are not the primary classification
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


def _detect_signals(text: str) -> list[str]:
    """Keyword-based signal detection to supplement model verdict."""
    text_lower = text.lower()
    found = []
    for signal, keywords in SIGNAL_PATTERNS.items():
        if any(kw in text_lower for kw in keywords):
            found.append(signal)
    return found


def _build_explanation(verdict: str, confidence: float, signals: list[str]) -> str:
    """Construct a plain-language explanation from verdict + signals."""
    if verdict == "FRAUD":
        parts = ["This message shows patterns consistent with banking fraud."]
        if "urgency_pressure" in signals:
            parts.append("It uses urgency or threat language to pressure you into acting fast.")
        if "credential_harvest" in signals:
            parts.append("It is attempting to collect your credentials or personal information.")
        if "threat_language" in signals:
            parts.append("It contains threatening language designed to cause panic.")
        if "fake_domain_hint" in signals:
            parts.append("It contains a suspicious link or domain that does not match official bank URLs.")
        parts.append(f"Model confidence: {round(confidence * 100)}%.")
        return " ".join(parts)
    else:
        return (
            f"This message does not show strong fraud patterns. "
            f"Model confidence: {round(confidence * 100)}%. "
            "If you are still unsure, contact your bank directly using the number on their official website."
        )


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
        Full structured analysis result
    """
    if not text or not text.strip():
        return {
            "verdict":        "ERROR",
            "display_verdict": "ERROR",
            "confidence":     0.0,
            "signals":        [],
            "explanation":    "Empty message received.",
            "action":         "Please provide a message to analyse.",
            "model_version":  "v1",
        }

    result   = predict(text.strip())
    signals  = _detect_signals(text)
    display  = _verdict_label(result["verdict"], result["fraud_probability"])
    explanation = _build_explanation(result["verdict"], result["confidence"], signals)

    action = (
        "Do NOT click any links or share any information. "
        "Call your bank directly using the number on their official website or the back of your card."
        if result["verdict"] == "FRAUD"
        else "No immediate action required. When in doubt, always call your bank directly."
    )

    return {
        "verdict":           result["verdict"],
        "display_verdict":   display,
        "confidence":        result["confidence"],
        "fraud_probability": result["fraud_probability"],
        "signals":           signals,
        "explanation":       explanation,
        "action":            action,
        "model_version":     result["model_version"],
        "language":          lang,
    }