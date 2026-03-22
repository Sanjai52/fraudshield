"""
url_checks.py
--------------
URL evidence engine.
Runs a suspicious URL through 4 external checks and returns
combined factual evidence.

Checks:
    1. WHOIS        — domain age + registrant country
    2. Google Safe Browsing — known phishing database (free 10k/day)
    3. VirusTotal   — 70+ engine scan (free 4 req/min)
    4. PhishTank    — crowd-verified phishing database (free)

Week 3: all 4 checks active.
Week 5: cache results in Supabase url_checks table (24hr TTL).

Usage:
    from evidence.url_checks import check_url, extract_urls
"""

from __future__ import annotations
import os
import re
import base64
import requests
from datetime import datetime, timezone
from typing import List
from dotenv import load_dotenv

load_dotenv()

SAFEBROWSING_KEY = os.getenv("GOOGLE_SAFEBROWSING_KEY", "")
VIRUSTOTAL_KEY   = os.getenv("VIRUSTOTAL_KEY", "")

TIMEOUT = 8  # seconds per external API call


# ── URL extraction ────────────────────────────────────────────

def extract_urls(text: str) -> List[str]:
    """
    Extract all URLs from a message text.
    Handles http://, https://, and bare domains like sbi-kyc.net
    """
    # Full URLs
    urls = re.findall(
        r'https?://[^\s<>"\']+|www\.[^\s<>"\']+',
        text, re.IGNORECASE
    )

    # Bare suspicious domains (common in SMS fraud)
    bare = re.findall(
        r'\b([a-z0-9\-]+\.(net|co|xyz|info|org|in|online|site|click|link))'
        r'(?:/[^\s]*)?',
        text, re.IGNORECASE
    )
    for match in bare:
        domain = match[0]
        if domain not in urls:
            urls.append(domain)

    return list(set(urls))


def _clean_url(url: str) -> str:
    """Ensure URL has a scheme for API calls."""
    if not url.startswith(("http://", "https://")):
        return "https://" + url
    return url


def _extract_domain(url: str) -> str:
    """Extract bare domain from URL."""
    url   = _clean_url(url)
    match = re.search(r'https?://([^/\?#]+)', url)
    return match.group(1).lower() if match else url.lower()


# ── Check 1: WHOIS ────────────────────────────────────────────

def _check_whois(domain: str) -> dict:
    """
    Check domain registration age using RDAP (no API key needed).
    Falls back to python-whois if RDAP fails.
    A domain registered days ago claiming to be a major bank is fraud evidence.
    """
    # Try RDAP first — free, no key, fast
    try:
        r = requests.get(
            f"https://rdap.org/domain/{domain}",
            timeout=TIMEOUT,
            headers={"Accept": "application/json"}
        )
        if r.status_code == 200:
            data     = r.json()
            events   = data.get("events", [])
            created  = None
            for event in events:
                if event.get("eventAction") == "registration":
                    created = event.get("eventDate")
                    break

            if created:
                # Parse ISO date
                from datetime import datetime, timezone
                created_dt = datetime.fromisoformat(
                    created.replace("Z", "+00:00")
                )
                age_days = (datetime.now(timezone.utc) - created_dt).days
                return {
                    "success":    True,
                    "domain":     domain,
                    "age_days":   age_days,
                    "registrar":  data.get("handle"),
                    "country":    None,
                    "suspicious": age_days < 30,
                    "source":     "rdap",
                }
    except Exception:
        pass  # fall through to python-whois

    # Fallback — python-whois
    try:
        import whois
        w        = whois.whois(domain)
        creation = w.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation:
            from datetime import datetime, timezone
            if creation.tzinfo is None:
                creation = creation.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - creation).days
            return {
                "success":    True,
                "domain":     domain,
                "age_days":   age_days,
                "registrar":  str(w.registrar) if w.registrar else None,
                "country":    str(w.country)   if w.country   else None,
                "suspicious": age_days < 30,
                "source":     "whois",
            }
    except Exception as e:
        pass

    # Both failed — domain likely doesn't exist or blocks lookups
    return {
        "success":    False,
        "domain":     domain,
        "age_days":   None,
        "error":      "WHOIS and RDAP both failed — domain may not exist or blocks lookups",
        "suspicious": False,
    }


# ── Check 2: Google Safe Browsing ─────────────────────────────

def _check_safebrowsing(url: str) -> dict:
    """
    Check URL against Google's phishing + malware database.
    Free — 10,000 requests/day.
    """
    if not SAFEBROWSING_KEY:
        return {"success": False, "hit": False, "error": "No API key configured"}

    endpoint = (
        f"https://safebrowsing.googleapis.com/v4/threatMatches:find"
        f"?key={SAFEBROWSING_KEY}"
    )
    payload = {
        "client":     {"clientId": "fraudshield", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes":      ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            "platformTypes":    ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries":    [{"url": _clean_url(url)}],
        },
    }
    try:
        r = requests.post(endpoint, json=payload, timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            hit  = bool(data.get("matches"))
            return {
                "success":     True,
                "hit":         hit,
                "threat_type": data["matches"][0]["threatType"] if hit else None,
            }
        return {"success": False, "hit": False, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"success": False, "hit": False, "error": str(e)}


# ── Check 3: VirusTotal ───────────────────────────────────────

def _check_virustotal(url: str) -> dict:
    """
    Scan URL across 70+ security engines via VirusTotal.
    Free — 4 requests/minute.
    Submits URL if not yet scanned, waits briefly, then fetches result.
    """
    if not VIRUSTOTAL_KEY:
        return {
            "success": False,
            "malicious": 0,
            "total": 0,
            "error": "No API key configured — add VIRUSTOTAL_KEY to .env"
        }

    import time
    headers = {"x-apikey": VIRUSTOTAL_KEY}
    url_id  = base64.urlsafe_b64encode(
        _clean_url(url).encode()
    ).decode().strip("=")

    def _fetch(uid: str) -> dict:
        try:
            r = requests.get(
                f"https://www.virustotal.com/api/v3/urls/{uid}",
                headers=headers,
                timeout=TIMEOUT
            )
            if r.status_code == 200:
                stats     = r.json()["data"]["attributes"]["last_analysis_stats"]
                malicious = stats.get("malicious", 0)
                total     = sum(stats.values())
                return {
                    "success":    True,
                    "malicious":  malicious,
                    "total":      total,
                    "score":      f"{malicious}/{total}",
                    "suspicious": malicious > 3,
                }
            return None
        except Exception:
            return None

    # Step 1 — try to fetch existing result
    result = _fetch(url_id)
    if result:
        return result

    # Step 2 — not in VT yet, submit for scanning
    try:
        requests.post(
            "https://www.virustotal.com/api/v3/urls",
            headers=headers,
            data={"url": _clean_url(url)},
            timeout=TIMEOUT
        )
        # Wait for scan to complete
        time.sleep(15)
        # Fetch result after scan
        result = _fetch(url_id)
        if result:
            return result
    except Exception as e:
        return {
            "success":    False,
            "malicious":  0,
            "total":      0,
            "error":      str(e),
        }

    return {
        "success":    True,
        "malicious":  0,
        "total":      0,
        "score":      "scan_pending",
        "suspicious": False,
        "note":       "URL submitted for scanning — check again in 60 seconds",
    }



# ── Check 4: PhishTank ────────────────────────────────────────

def _check_phishtank(url: str) -> dict:
    """
    Check URL against PhishTank crowd-verified phishing database.
    Free API key required — register at phishtank.org
    """
    pt_key = os.getenv("PHISHTANK_KEY", "")

    try:
        data = {
            "url":    _clean_url(url),
            "format": "json",
        }
        if pt_key:
            data["app_key"] = pt_key

        r = requests.post(
            "https://checkurl.phishtank.com/checkurl/",
            data=data,
            headers={"User-Agent": "fraudshield-checker/1.0"},
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            results = r.json().get("results", {})
            in_db   = results.get("in_database", False)
            valid   = results.get("valid", False)
            return {
                "success":     True,
                "in_database": in_db,
                "verified":    valid,
                "hit":         in_db and valid,
            }
        return {
            "success": False,
            "hit":     False,
            "error":   f"HTTP {r.status_code}",
        }
    except Exception as e:
        return {"success": False, "hit": False, "error": str(e)}


# ── Main check_url function ───────────────────────────────────

def check_url(url: str) -> dict:
    """
    Run all 4 checks on a URL and return combined evidence.

    Args:
        url: suspicious URL from message

    Returns:
        {
            "url":                  str,
            "domain":               str,
            "domain_age_days":      int | None,
            "registrar":            str | None,
            "safebrowsing_hit":     bool,
            "virustotal_score":     str,
            "virustotal_malicious": int,
            "phishtank_hit":        bool,
            "verdict":              "MALICIOUS"|"SUSPICIOUS"|"CLEAN"|"UNKNOWN",
            "evidence_count":       int,
            "checks":               dict,
        }
    """
    domain = _extract_domain(url)
    whois  = _check_whois(domain)
    sb     = _check_safebrowsing(url)
    vt     = _check_virustotal(url)
    pt     = _check_phishtank(url)

    # Count how many checks flagged it
    flags = sum([
        whois.get("suspicious", False),
        sb.get("hit", False),
        vt.get("suspicious", False),
        pt.get("hit", False),
    ])

    # Overall verdict
    if flags >= 3:
        verdict = "MALICIOUS"
    elif flags >= 1:
        verdict = "SUSPICIOUS"
    elif all([whois["success"], sb["success"]]):
        verdict = "CLEAN"
    else:
        verdict = "UNKNOWN"

    return {
        "url":                   url,
        "domain":                domain,
        "domain_age_days":       whois.get("age_days"),
        "registrar":             whois.get("registrar"),
        "domain_suspicious":     whois.get("suspicious", False),
        "safebrowsing_hit":      sb.get("hit", False),
        "virustotal_score":      vt.get("score", "unknown"),
        "virustotal_malicious":  vt.get("malicious", 0),
        "phishtank_hit":         pt.get("hit", False),
        "verdict":               verdict,
        "evidence_count":        flags,
        "checks": {
            "whois":        whois,
            "safebrowsing": sb,
            "virustotal":   vt,
            "phishtank":    pt,
        },
    }
