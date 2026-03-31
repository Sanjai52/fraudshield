"""
url_pipeline.py
----------------
URL analysis pipeline.
Accepts a raw URL string, runs all evidence checks,
returns structured verdict.

FastAPI /analyse/url calls run() directly.
"""

from evidence.url_checks import check_url


def run(url: str) -> dict:
    if not url or not url.strip():
        return {
            "verdict": "ERROR",
            "display_verdict": "ERROR",
            "explanation": "No URL provided.",
            "action": "Please provide a URL to analyse.",
        }

    result = check_url(url.strip())

    parts = []

    # Heuristic flags
    for flag in result.get("heuristic_flags", []):
        parts.append(flag + ".")

    # Domain age
    if result["domain_age_days"] is not None and result["domain_age_days"] < 30:
        parts.append(
            f"Domain '{result['domain']}' was registered only "
            f"{result['domain_age_days']} days ago."
        )

    # External checks
    if result["safebrowsing_hit"]:
        parts.append("Flagged by Google Safe Browsing as a phishing or malware site.")

    if result["virustotal_malicious"] > 0:
        parts.append(
            f"Flagged as malicious by {result['virustotal_malicious']} "
            f"security engines on VirusTotal ({result['virustotal_score']})."
        )

    if result["phishtank_hit"]:
        parts.append("Confirmed phishing site in phishing database.")

    # Explanation
    explanation = (
        "No suspicious patterns detected. URL appears clean."
        if not parts else " ".join(parts)
    )

    # 🔥 VERDICT LOGIC (THIS WAS MISSING)
    score = 0

    if result["safebrowsing_hit"]:
        score += 0.6
    if result["virustotal_malicious"] > 0:
        score += 0.5
    if result["phishtank_hit"]:
        score += 0.6
    if result["domain_age_days"] is not None and result["domain_age_days"] < 30:
        score += 0.3
    if result.get("heuristic_flags"):
        score += 0.2

    score = min(score, 1.0)

    # Final verdict
    if score > 0.7:
        verdict = "FRAUD"
        display = "MALICIOUS"
        action = "Do not open this link."
    elif score > 0.4:
        verdict = "FRAUD"
        display = "SUSPICIOUS"
        action = "Proceed with caution."
    else:
        verdict = "LEGITIMATE"
        display = "CLEAN"
        action = "This URL appears safe."

    # 🔥 FINAL RETURN (CRITICAL)
    return {
        "verdict": verdict,
        "display_verdict": display,
        "confidence": score,
        "fraud_probability": score,
        "signals": parts,
        "flags": parts,
        "url_checks": [result],
        "explanation": explanation,
        "action": action,
        "model_version": "url-pipeline-v1",
        "language": "en",
    }