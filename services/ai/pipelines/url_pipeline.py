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
    parts = []
    if result["domain_age_days"] is not None and result["domain_age_days"] < 30:
        parts.append(
            f"Domain '{result['domain']}' was registered only "
            f"{result['domain_age_days']} days ago."
        )
    #check on the google official db for the url
    if result["safebrowsing_hit"]:
        parts.append("Flagged by Google Safe Browsing as a phishing or malware site.")
    if result["virustotal_malicious"] > 0:
        parts.append(
            f"Flagged as malicious by {result['virustotal_malicious']} "
            f"security engines on VirusTotal ({result['virustotal_score']})."
        )
    #check for the flagged sites
    if result["phishtank_hit"]:
        parts.append("Confirmed phishing site in the PhishTank database.")

    if not parts:
        explanation = "No major threats detected for this URL."
    else:
        explanation = " ".join(parts)

    action = (
        "Do NOT visit this link. Do not enter any personal or banking information."
        if result["verdict"] in ("MALICIOUS", "SUSPICIOUS")
        else "This URL appears clean, but always verify by going directly to your bank's official website."
    )

    display_map = {
        "MALICIOUS": "HIGH_RISK_URL",
        "SUSPICIOUS": "SUSPICIOUS_URL",
        "CLEAN":      "URL_LOOKS_SAFE",
        "UNKNOWN":    "URL_UNVERIFIED",
    }

    return {
        "url":                  result["url"],
        "domain":               result["domain"],
        "verdict":              result["verdict"],
        "display_verdict":      display_map.get(result["verdict"], "UNKNOWN"),
        "domain_age_days":      result["domain_age_days"],
        "safebrowsing_hit":     result["safebrowsing_hit"],
        "virustotal_score":     result["virustotal_score"],
        "virustotal_malicious": result["virustotal_malicious"],
        "phishtank_hit":        result["phishtank_hit"],
        "evidence_count":       result["evidence_count"],
        "explanation":          explanation,
        "action":               action,
    }