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

# If model says FRAUD but fraud_probability is below this, allow override
OVERRIDE_THRESHOLD = 0.60

DEFINITE_LEGIT_PATTERNS = [
    # Debit/credit card transaction notifications
    "debit card ending", "credit card ending", "card ending",
    "has been used for", "used for rs", "used for \u20b9",
    "has been debited", "has been credited",
    # Generic debit/credit patterns
    "debited rs", "credited rs",
    "is debited rs", "is credited rs",          # KVB / BOB format
    "debited inr", "credited inr",
    "dr. rs", "dr rs", "cr. rs", "cr rs",
    "a/c is debited", "a/c is credited",        # KVB exact format
    "your a/c", "your account is debited",
    "your account is credited",
    # UPI/NEFT/IMPS reference patterns — always legit
    "upi ref", "upi:", "upi ref no",
    "neft transfer", "imps transfer",
    "avlbal inr", "avl bal inr",               # balance notification
    "avlbal rs", "avl bal rs",
    # Generic bank notification closers
    "not you? call", "if not you call",
    "thank you for banking",
    # BOB specific
    "- bob", "-bob", "- kvb", "-kvb",
    "- sbi", "-sbi",
]
# Patterns that strongly indicate a legitimate bank notification
LEGITIMATE_PATTERNS = [
    "debited rs", "credited rs", "account balance", "a/c balance",
    "your balance", "transaction of rs", "upi ref", "upi:","atm withdrawal",
    "neft transfer", "imps transfer", "available balance", "mini statement",
    "thank you for banking", "your account ending", "a/c *", "acct *",
    # Debit/credit card transaction notifications
    "debit card ending", "credit card ending", "card ending",
    "has been used for", "used for rs", "used for \u20b9",
    "has been debited", "has been credited",
]

# Keyword signal detection — supplements the model
SIGNAL_PATTERNS = {
    "urgency_pressure": [
        "blocked", "suspended", "immediately", "urgent", "freeze",
        "within 24", "final", "warning", "expire",
        "band ho", "turant", "abhi", "temporarily limited",
        "limited", "restore access", "account will be"
    ],
    "credential_harvest": [
        "verify", "update kyc", "kyc", "confirm", "login",
        "enter", "submit", "click here", "validate", "re-verify",
        "verify your details", "details to restore"
    ],
    "threat_language": [
        "permanently closed", "legal action", "police", "arrest",
        "penalty", "fine", "blocked permanently", "account will be",
        "will be permanently closed", "permanently closed within"
    ],
    "fake_domain_hint": [
        "-kyc", "-secure", "-verify", "-block", "-alert",
        ".net", ".co", ".xyz", ".info", "kyc.net", "secure.co",
        "sbi-verify", "sbi-kyc", "bank-verify", "account-verify"
    ],
}

# Signals that are strong indicators of fraud (2+ = escalate)
STRONG_FRAUD_SIGNALS = {"urgency_pressure", "credential_harvest", "threat_language", "fake_domain_hint"}


def _detect_signals(text: str) -> List[str]:
    """Keyword-based signal detection to supplement model verdict."""
    text_lower = text.lower()
    found      = []
    for signal, keywords in SIGNAL_PATTERNS.items():
        if any(kw in text_lower for kw in keywords):
            found.append(signal)
    return found


def _looks_legitimate(text: str) -> bool:
    """Return True if the message matches common legitimate bank notification patterns."""
    text_lower = text.lower()
    return any(pat in text_lower for pat in LEGITIMATE_PATTERNS)


def _is_definitely_legitimate(text: str) -> bool:
    """Return True if message matches patterns that are NEVER fraud (transaction notifications)."""
    text_lower = text.lower()
    return any(pat in text_lower for pat in DEFINITE_LEGIT_PATTERNS)


def _should_override_to_legitimate(
    fraud_probability: float,
    signals: List[str],
    sender_check: Optional[dict],
    url_checks: List[dict],
    text: str,
) -> bool:
    """
    Override a weak FRAUD verdict to LEGITIMATE when:
      - fraud_probability is below OVERRIDE_THRESHOLD (not a strong signal)
      - no fraud keyword signals detected
      - no malicious/suspicious URLs
      - sender is verified OR message matches known legitimate patterns
    """
    if fraud_probability >= OVERRIDE_THRESHOLD:
        return False
    if fraud_probability < THRESHOLD_MODERATE:
        return False

    has_fraud_signals = len(signals) > 0
    has_bad_urls      = any(uc["verdict"] in ("MALICIOUS", "SUSPICIOUS") for uc in url_checks)
    sender_verified   = sender_check and sender_check.get("status") == "verified"
    looks_legit       = _looks_legitimate(text)

    if has_fraud_signals or has_bad_urls:
        return False

    return sender_verified or looks_legit


def _signal_based_verdict(
    signals: List[str],
    fraud_probability: float,
    current_display: str,
    model_unavailable: bool = False,
) -> Optional[str]:
    """
    If the model is weak/unavailable but keyword signals are strong, escalate verdict.
    When model is unavailable, signals are the ONLY source of truth — lower the bar.
    """
    signal_set  = set(signals)
    strong_hits = len(signal_set & STRONG_FRAUD_SIGNALS)

    # 3+ strong signals → HIGH_FRAUD regardless of model
    if strong_hits >= 3:
        return "HIGH_FRAUD"

    # 2+ strong signals → SUSPICIOUS minimum, HIGH_FRAUD if model also agrees
    if strong_hits >= 2:
        if current_display == "LEGITIMATE":
            return "SUSPICIOUS"
        if current_display == "SUSPICIOUS" and fraud_probability >= 0.70:
            return "HIGH_FRAUD"

    # When model is unavailable — trust signals fully, no fp threshold needed
    if model_unavailable:
        if strong_hits >= 2:
            return "HIGH_FRAUD"
        if strong_hits >= 1:
            return "SUSPICIOUS"
        # Even 1 weak signal is suspicious without model
        if len(signal_set) >= 2:
            return "SUSPICIOUS"
        return None

    # Normal path — 1 strong signal + moderate model confidence → SUSPICIOUS
    if strong_hits >= 1 and fraud_probability >= 0.35 and current_display == "LEGITIMATE":
        return "SUSPICIOUS"

    return None


def _build_explanation(
    display_verdict: str,
    confidence: float,
    signals: List[str],
    sender_check: Optional[dict],
    url_checks: List[dict],
    overridden: bool,
    fraud_probability: float,
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

    if display_verdict == "HIGH_FRAUD":
        parts.append(
            f"This message exhibits strong characteristics of a phishing or fraud attempt "
            f"(model confidence: {round(fraud_probability * 100)}%)."
        )
        if "urgency_pressure" in signals:
            parts.append("Uses urgency or threat language to pressure you into acting fast.")
        if "credential_harvest" in signals:
            parts.append("Attempts to collect your credentials or personal information.")
        if "threat_language" in signals:
            parts.append("Contains threatening language such as legal action or permanent account closure.")
        if "fake_domain_hint" in signals:
            parts.append("Contains a suspicious domain pattern commonly used in phishing links.")

    elif display_verdict == "SUSPICIOUS":
        suspicious_summary = (
            f"This message shows partial fraud patterns — urgency pressure or requests to verify details "
            f"are common tactics in scam messages (model score: {round(fraud_probability * 100)}%). "
            f"Evidence is not conclusive enough to confirm a scam, but caution is strongly advised."
        )
        parts.insert(0, suspicious_summary)
        if "urgency_pressure" in signals:
            parts.append("Contains urgency language — verify independently before acting.")
        if "credential_harvest" in signals:
            parts.append("Asks you to verify, confirm, or submit information — a common fraud tactic.")
        if "fake_domain_hint" in signals:
            parts.append("Contains a domain pattern that resembles known phishing sites.")

    else:  # LEGITIMATE
        if overridden:
            parts.append(
                "This appears to be a genuine bank transaction notification. "
                "No fraud signals, suspicious senders, or malicious links were detected."
            )
        elif not parts:
            parts.append(
                f"No suspicious patterns detected. "
                f"The message does not match known scam signatures "
                f"(model confidence: {round((1 - fraud_probability) * 100)}% legitimate)."
            )

    return " ".join(parts) if parts else "Analysis complete."


def _verdict_label(verdict: str, fraud_probability: float) -> str:
    """Map model output to display verdict."""
    # Model unavailable — start neutral, let rules decide
    if fraud_probability == 0.0 and verdict == "LEGITIMATE":
        return "LEGITIMATE"
    if verdict == "FRAUD":
        if fraud_probability >= THRESHOLD_HIGH:
            return "HIGH_FRAUD"
        if fraud_probability >= THRESHOLD_MODERATE:
            return "SUSPICIOUS"
        # Weak fraud signal — treat as suspicious not high fraud
        return "SUSPICIOUS"
    return "LEGITIMATE"


def run(text: str, lang: str = "en") -> dict:
    """
    Run the full text analysis pipeline.
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

    # 1. Model inference
  # 1. Model inference
    result = predict(text)

    # If model was unavailable (fallback), start from neutral
    # Rules and signals below will still determine the final verdict
    model_unavailable = result["confidence"] == 0.0 and result["fraud_probability"] == 0.0
    # 2. Keyword signals
    signals = _detect_signals(text)

    # 3. Sender ID check
    sender_check = check_sender_from_text(text)
    if sender_check and sender_check["status"] == "known_fake":
        if "fake_sender_id" not in signals:
            signals.append("fake_sender_id")

    # 4. URL checks
    urls       = extract_urls(text)
    url_checks = [check_url(u) for u in urls[:2]]
    if any(uc["verdict"] in ("MALICIOUS", "SUSPICIOUS") for uc in url_checks):
        if "malicious_url" not in signals:
            signals.append("malicious_url")

    # 5. Display verdict
    display    = _verdict_label(result["verdict"], result["fraud_probability"])
    overridden = False

    has_bad_urls   = any(uc["verdict"] in ("MALICIOUS", "SUSPICIOUS") for uc in url_checks)
    sender_is_fake = sender_check and sender_check.get("status") == "known_fake"

    # Hard override: definite transaction notifications are NEVER fraud
    if (
        display in ("SUSPICIOUS", "HIGH_FRAUD")
        and _is_definitely_legitimate(text)
        and not has_bad_urls
        and not sender_is_fake
    ):
        display    = "LEGITIMATE"
        overridden = True

    # Upgrade to HIGH_FRAUD if sender is known fake
    elif display == "SUSPICIOUS" and sender_is_fake:
        display = "HIGH_FRAUD"

    # 5b. Signal-based escalation — fires when model is weak but signals are strong
    # 5b. Signal-based escalation — fires when model is weak but signals are strong
    elif not overridden:
        escalated = _signal_based_verdict(
            signals, result["fraud_probability"], display, model_unavailable
        )
        if escalated:
            display = escalated

    # Downgrade weak FRAUD to LEGITIMATE if no supporting evidence
    elif display == "SUSPICIOUS" and _should_override_to_legitimate(
        result["fraud_probability"], signals, sender_check, url_checks, text
    ):
        display    = "LEGITIMATE"
        overridden = True

    # 6. Explanation
    explanation = _build_explanation(
        display,
        result["confidence"],
        signals,
        sender_check,
        url_checks,
        overridden,
        result["fraud_probability"],
    )

    # 7. Action step
    helpline = (
        sender_check["helpline"]
        if sender_check and sender_check.get("helpline")
        else "1930"
    )
    if display == "HIGH_FRAUD":
        action = (
            f"Do NOT click any links or share any information. "
            f"Report this to cybercrime.gov.in or call the National Cyber Crime helpline: {helpline}."
        )
    elif display == "SUSPICIOUS":
        action = (
            f"Proceed with caution. Verify the sender through official channels before responding. "
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
