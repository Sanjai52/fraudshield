"""
url_pipeline.py
----------------
URL analysis pipeline.
Accepts a raw URL string, runs all evidence checks,
returns a rich structured verdict with full narrative explanation.

FastAPI /analyse/url calls run() directly.
"""

from __future__ import annotations
from evidence.url_checks import check_url


# Map raw verdict to display strings and UI config
_VERDICT_MAP = {
    "MALICIOUS": {
        "display_verdict": "HIGH_FRAUD",
        "confidence_floor": 0.75,
        "action": (
            "Do NOT visit this link or enter any personal information. "
            "If you received this link via SMS or WhatsApp, treat the entire message as a scam. "
            "Report it at cybercrime.gov.in or call 1930."
        ),
    },
    "SUSPICIOUS": {
        "display_verdict": "SUSPICIOUS",
        "confidence_floor": 0.45,
        "action": (
            "Do not click this link without verifying it first. "
            "Call your bank's official number (on the back of your card or their official website) "
            "to confirm whether this URL is genuine. Never enter OTP or passwords from a link in a message."
        ),
    },
    "CLEAN": {
        "display_verdict": "LEGITIMATE",
        "confidence_floor": 0.10,
        "action": (
            "This URL appears safe based on our checks. "
            "Always verify you are on the correct official website before entering credentials. "
            "Check the address bar carefully."
        ),
    },
    "UNKNOWN": {
        "display_verdict": "SUSPICIOUS",
        "confidence_floor": 0.30,
        "action": (
            "We could not fully verify this URL. "
            "Treat it with caution — do not enter banking credentials, OTP, or card details."
        ),
    },
}


def run(url: str) -> dict:
    """
    Full URL analysis pipeline.
    Returns a standardised result compatible with the frontend AnalysisResult type.
    """
    if not url or not url.strip():
        return {
            "verdict":           "ERROR",
            "display_verdict":   "ERROR",
            "confidence":        0.0,
            "fraud_probability": 0.0,
            "signals":           [],
            "sender_check":      None,
            "url_checks":        [],
            "explanation":       "No URL provided.",
            "action":            "Please provide a URL to analyse.",
            "model_version":     "url-v2",
            "language":          "en",
        }

    raw = check_url(url.strip())

    v_config       = _VERDICT_MAP.get(raw["verdict"], _VERDICT_MAP["UNKNOWN"])
    display_verdict = v_config["display_verdict"]
    action          = v_config["action"]

    # Confidence = risk_score, floored at the verdict minimum
    confidence = max(raw["risk_score"], v_config["confidence_floor"])
    # For CLEAN, invert so confidence = how sure we are it's safe
    if raw["verdict"] == "CLEAN":
        confidence = max(1.0 - raw["risk_score"], v_config["confidence_floor"])
    confidence = round(min(confidence, 0.99), 4)

    # Build signals list from all flag reasons (concise, for UI chips)
    signals = _build_signals(raw)

    # Narrative is the full explanation — used in the "Why we flagged this" section
    explanation = raw.get("narrative", "Analysis complete.")

    return {
        # Standard fields (matches AnalysisResult type)
        "verdict":           "FRAUD" if raw["verdict"] in ("MALICIOUS", "SUSPICIOUS") else "LEGITIMATE",
        "display_verdict":   display_verdict,
        "confidence":        confidence,
        "fraud_probability": raw["risk_score"],
        "signals":           signals,
        "sender_check":      None,
        "url_checks":        [raw],
        "explanation":       explanation,
        "action":            action,
        "model_version":     "url-v2",
        "language":          "en",

        # URL-specific fields (used by the URL evidence breakdown cards in the UI)
        "url":                   raw["url"],
        "domain":                raw["domain"],
        "risk_score":            raw["risk_score"],
        "reasons":               raw.get("reasons", []),
        "domain_age_days":       raw.get("domain_age_days"),
        "registrar":             raw.get("registrar"),
        "domain_country":        raw.get("domain_country"),
        "safebrowsing_hit":      raw.get("safebrowsing_hit", False),
        "safebrowsing_type":     raw.get("safebrowsing_type"),
        "virustotal_score":      raw.get("virustotal_score", "—"),
        "virustotal_malicious":  raw.get("virustotal_malicious", 0),
        "heuristic_flags":       raw.get("heuristic_flags", []),
        "urlscan_malicious":     raw.get("urlscan_malicious", False),
        "urlscan_tags":          raw.get("urlscan_tags", []),
        "urlscan_country":       raw.get("urlscan_country"),
        "urlscan_report_url":    raw.get("urlscan_report_url"),
        "urlscan_screenshot_url": raw.get("urlscan_screenshot_url"),
        "firecrawl_scraped": raw.get("firecrawl_scraped"),
        "firecrawl_fraud_signals": raw.get("firecrawl_fraud_signals", []),
        "firecrawl_has_cred_form": raw.get("firecrawl_has_cred_form"),
        "firecrawl_page_title": raw.get("firecrawl_page_title"),
        "phishtank_hit":         False,
        "evidence_count":        raw.get("evidence_count", 0),
    }


def _build_signals(raw: dict) -> list:
    """
    Convert raw check results into concise signal strings for the UI chips.
    These appear as the 'Red flags' list on the result card.
    """
    signals = []

    # Heuristic flags → human labels
    flag_labels = {
        "suspicious_tld":       "Suspicious domain extension",
        "fake_pattern":         "Fake bank pattern in domain",
        "bank_impersonation":   "Impersonates a bank name",
        "multiple_hyphens":     "Multiple hyphens (obfuscation)",
        "ip_address_domain":    "Uses raw IP address",
        "long_domain":          "Unusually long domain",
        "credential_path":      "Page targets login/OTP harvesting",
        "excessive_subdomains": "Excessive subdomain structure",
    }
    for flag in raw.get("heuristic_flags", []):
        key = flag.split(":")[0]
        label = flag_labels.get(key, flag.replace("_", " ").title())
        if label not in signals:
            signals.append(label)

    # External API hits
    if raw.get("safebrowsing_hit"):
        tt = raw.get("safebrowsing_type") or "phishing"
        signals.append(f"Flagged by Google Safe Browsing ({tt.lower()})")

    vt_m = raw.get("virustotal_malicious", 0) or 0
    if vt_m > 0:
        signals.append(f"Flagged by {vt_m} VirusTotal engines")
    #Firecrawl infra signal
    if not raw.get("firecrawl_scraped"):
        signals.append("Domain not reachable (possible phishing infrastructure)")
    if raw.get("urlscan_malicious"):
        signals.append("Flagged by URLScan.io as malicious")

    tags = raw.get("urlscan_tags", [])
    if tags:
        signals.append(f"URLScan tags: {', '.join(tags[:3])}")

    # Domain age
    age = raw.get("domain_age_days")
    if age is not None:
        if age < 7:
            signals.append(f"Domain is only {age} day(s) old — very new")
        elif age < 30:
            signals.append(f"Domain is only {age} days old — recently created")
        elif age < 90:
            signals.append(f"Domain is {age} days old — relatively new")
    #If no signals → add positive reassurance
    if not signals:
        if raw.get("verdict") == "CLEAN":
            signals.append("Verified safe domain")
            signals.append("No suspicious patterns detected")
    return signals[:8]   # cap at 8 for UI cleanliness
