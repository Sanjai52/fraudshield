"""
url_pipeline.py
----------------
URL analysis pipeline.
Accepts a raw URL string, runs all evidence checks,
returns structured verdict.

FastAPI /analyse/url calls run() directly.
"""

from evidence.url_checks import check_url, extract_urls


def run(url: str) -> dict:
    """
    Run the full URL analysis pipeline.

    Args:
        url: suspicious URL to analyse

    Returns:
        Full structured URL analysis result
    """
    if not url or not url.strip():
        return {
            "verdict":         "ERROR",
            "display_verdict": "ERROR",
            "explanation":     "No URL provided.",
            "action":          "Please provide a URL to analyse.",
        }

    result = check_url(url.strip())

    # Build explanation
    # check on whois library
    # Build explanation
    parts = []

    # Heuristic flags — always present, most reliable
    for flag in result.get("heuristic_flags", []):
        parts.append(flag + ".")

    if result["domain_age_days"] is not None and result["domain_age_days"] < 30:
        parts.append(
            f"Domain '{result['domain']}' was registered only "
            f"{result['domain_age_days']} days ago."
        )
    if result["safebrowsing_hit"]:
        parts.append("Flagged by Google Safe Browsing as a phishing or malware site.")
    if result["virustotal_malicious"] > 0:
        parts.append(
            f"Flagged as malicious by {result['virustotal_malicious']} "
            f"security engines on VirusTotal ({result['virustotal_score']})."
        )
    if result["phishtank_hit"]:
        parts.append("Confirmed phishing site in the PhishTank database.")

    if not parts:
        explanation = "No suspicious patterns detected. URL appears clean based on available checks."
    else:
        explanation = " ".join(parts)
