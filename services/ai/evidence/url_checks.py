"""
url_checks.py
--------------
URL evidence engine for FraudShield.

Checks (in order of speed):
  1. Domain Heuristics      — instant, no API, pattern matching
  2. WHOIS / RDAP           — domain age, registrar, country
  3. Google Safe Browsing   — phishing/malware DB (free, 10k/day)
  4. VirusTotal             — 70+ engine scan (free, 4 req/min)
  5. URLScan.io (Firecrawl) — live page screenshot + content scan (free)
  6. PhishTank              — STUBBED (service down, re-enable later)

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
URLSCAN_KEY      = os.getenv("URLSCAN_KEY", "")   # free at urlscan.io
FIRECRAWL_KEY = os.getenv("FIRECRAWL_API_KEY", "")
TIMEOUT = 8   # seconds — per external API call
print("FIRECRAWL:", FIRECRAWL_KEY)

# ── URL helpers ───────────────────────────────────────────────

def extract_urls(text: str) -> List[str]:
    """
    Extract all URLs from a message text.
    Handles http://, https://, www., and bare suspicious domains.
    """
    urls: List[str] = re.findall(
        r'https?://[^\s<>"\']+|www\.[^\s<>"\']+',
        text, re.IGNORECASE
    )
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
    if not url.startswith(("http://", "https://")):
        return "https://" + url
    return url


def _extract_domain(url: str) -> str:
    url   = _clean_url(url)
    match = re.search(r'https?://([^/\?#]+)', url)
    return match.group(1).lower() if match else url.lower()


# ── Check 1: Domain Heuristics ────────────────────────────────

OFFICIAL_BANK_DOMAINS = {
    "sbi.co.in", "onlinesbi.sbi", "sbionline.com",
    "hdfcbank.com", "netbanking.hdfcbank.com",
    "icicibank.com", "infinity.icicibank.com",
    "axisbank.com", "netbanking.axisbank.com",
    "kotak.com", "netbanking.kotak.com",
    "pnbindia.in", "netpnb.com",
    "bankofbaroda.in", "bobibanking.com",
    "canarabank.com",
    "unionbankofindia.co.in", "unionbankonline.co.in",
    "paytmbank.com", "bank.paytm.com",
    "rbi.org.in", "npci.org.in", "upi.org.in", "bhimupi.org.in",
    "incometax.gov.in", "uidai.gov.in", "india.gov.in",
    "google.com", "gmail.com", "youtube.com",
    "amazon.in", "flipkart.com", "phonepe.com",
}

SUSPICIOUS_TLDS = {
    ".xyz", ".top", ".click", ".link", ".online",
    ".site", ".info", ".biz", ".tk", ".ml", ".ga",
    ".cf", ".gq", ".pw", ".cc", ".ws", ".icu",
}

FAKE_BANK_PATTERNS = [
    "kyc", "update", "verify", "secure", "alert",
    "block", "suspend", "unlock", "reactivate",
    "reward", "cashback", "offer", "win", "prize",
    "netbank", "ibanking", "mbanking", "e-banking",
    "sbi-", "hdfc-", "icici-", "axis-", "paytm-",
    "-sbi", "-hdfc", "-icici", "-axis",
    "sbikyc", "hdfckyc", "icicikyc",
    "rbi-", "-rbi", "income-tax", "incometax-",
]

BANK_KEYWORDS = [
    "sbi", "hdfc", "icici", "axis", "kotak", "pnb", "bob",
    "canara", "union", "paytm", "rbi", "npci", "upi", "bhim",
    "incometax", "aadhaar", "uidai",
]

CREDENTIAL_PATH_KEYWORDS = [
    "login", "signin", "sign-in", "verify", "kyc",
    "password", "otp", "credential", "account", "secure",
    "update", "confirm", "validate", "authorize",
]


def _check_domain_heuristics(url: str, domain: str) -> dict:
    """
    Instant pattern-based analysis. Works without any API key.
    Returns rich flags with human-readable explanations.
    """
    flags: List[str] = []
    reasons: List[str] = []
    domain_lower = domain.lower()
    url_lower    = url.lower()
    clean_domain = domain_lower.removeprefix("www.")

    # Official domain check — always trusted
    if clean_domain in OFFICIAL_BANK_DOMAINS:
        return {
            "success":     True,
            "suspicious":  False,
            "flags":       [],
            "reasons":     [],
            "is_official": True,
            "risk_level":  "none",
            "explanation": f"'{domain}' is a verified official domain used by a legitimate institution.",
        }

    # Suspicious TLD
    for tld in SUSPICIOUS_TLDS:
        if domain_lower.endswith(tld):
            flags.append(f"suspicious_tld:{tld}")
            reasons.append(
                f"The domain uses '{tld}' — this extension is rarely used by real banks or "
                f"government websites and is commonly associated with fraud domains."
            )
            break

    # Fake bank pattern
    matched_pattern = None
    for pattern in FAKE_BANK_PATTERNS:
        if pattern in domain_lower:
            matched_pattern = pattern
            flags.append(f"fake_pattern:{pattern}")
            reasons.append(
                f"The domain contains the word '{pattern}', which fraudsters commonly include "
                f"to make fake websites look like official banking portals."
            )
            break

    # Bank name impersonation
    for bank in BANK_KEYWORDS:
        if bank in domain_lower and clean_domain not in OFFICIAL_BANK_DOMAINS:
            flags.append(f"bank_impersonation:{bank.upper()}")
            reasons.append(
                f"The domain uses the name '{bank.upper()}' but is NOT the official website. "
                f"Scammers often register similar-looking domains to impersonate real banks."
            )
            break

    # Multiple hyphens (obfuscation trick)
    hyphen_count = domain_lower.count("-")
    if hyphen_count >= 2:
        flags.append("multiple_hyphens")
        reasons.append(
            f"The domain contains {hyphen_count} hyphens (e.g. sbi-secure-kyc-update.in). "
            f"Legitimate bank domains almost never have more than one hyphen."
        )

    # IP address used as domain
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain_lower):
        flags.append("ip_address_domain")
        reasons.append(
            "This URL uses a raw IP address instead of a domain name. "
            "No legitimate bank or financial service links directly to an IP address."
        )

    # Unusually long domain
    if len(clean_domain) > 40:
        flags.append("long_domain")
        reasons.append(
            f"The domain is unusually long ({len(clean_domain)} characters). "
            f"Fraudsters create long, complicated domains to bury suspicious keywords."
        )

    # Suspicious path keywords
    path = url_lower.split(domain_lower)[-1] if domain_lower in url_lower else ""
    for kw in CREDENTIAL_PATH_KEYWORDS:
        if kw in path:
            flags.append(f"credential_path:{kw}")
            reasons.append(
                f"The URL path contains '{kw}', suggesting this page may be designed "
                f"to harvest your login credentials, OTP, or personal information."
            )
            break

    # Subdomain abuse (too many subdomains)
    parts = clean_domain.split(".")
    if len(parts) > 4:
        flags.append("excessive_subdomains")
        reasons.append(
            "The URL has an unusually deep subdomain structure — a common technique "
            "to make a fake domain look more official."
        )

    risk_level = "none"
    if len(flags) >= 3:
        risk_level = "high"
    elif len(flags) >= 1:
        risk_level = "medium"

    return {
        "success":     True,
        "suspicious":  len(flags) > 0,
        "flags":       flags,
        "reasons":     reasons,
        "is_official": False,
        "risk_level":  risk_level,
        "explanation": " ".join(reasons) if reasons else "No suspicious patterns found in the domain.",
    }


# ── Check 2: WHOIS / RDAP ─────────────────────────────────────

def _check_whois(domain: str) -> dict:
    domain = domain.replace("www.", "")   # 🔥 FIX

    try:
        r = requests.get(
            f"https://rdap.org/domain/{domain}",
            timeout=TIMEOUT,
            headers={"Accept": "application/json"},
        )

        if r.status_code == 200:
            data = r.json()

            created = None
            for ev in data.get("events", []):
                if ev.get("eventAction") == "registration":
                    created = ev.get("eventDate")
                    break

            if created:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                age_days = (datetime.now(timezone.utc) - dt).days

                return {
                    "success": True,
                    "domain": domain,
                    "age_days": age_days,
                    "registrar": data.get("handle"),
                    "country": None,
                    "suspicious": age_days < 90,
                    "source": "rdap",
                }

    except Exception:
        pass

    return {
        "success": False,
        "domain": domain,
        "age_days": None,
        "suspicious": False,
        "error": "WHOIS lookup failed",
    }


def _whois_explanation(whois_result: dict) -> str:
    """Convert WHOIS result into a human-readable sentence."""
    if not whois_result.get("success"):
        return ""
    age = whois_result.get("age_days")
    if age is None:
        return ""
    registrar = whois_result.get("registrar") or "an unknown registrar"
    domain    = whois_result.get("domain", "")
    if age < 7:
        return (
            f"'{domain}' was registered only {age} day(s) ago through {registrar}. "
            f"This is a very strong fraud indicator — phishing domains are created just hours before attacks."
        )
    if age < 30:
        return (
            f"'{domain}' was registered {age} days ago. "
            f"Legitimate bank websites are years old — newly registered domains are a major red flag."
        )
    if age < 90:
        return (
            f"'{domain}' is only {age} days old (registered through {registrar}). "
            f"Most trusted financial websites have been active for years, not months."
        )
    years = age // 365
    return (
        f"'{domain}' has been registered for {years} year(s) through {registrar}. "
        f"This is consistent with a legitimate long-standing domain."
    )


# ── Check 3: Google Safe Browsing ─────────────────────────────

def _check_safebrowsing(url: str) -> dict:
    """
    Google Safe Browsing API — largest phishing/malware database.
    Free — 10,000 requests/day.
    """
    if not SAFEBROWSING_KEY:
        return {"success": False, "hit": False, "threat_type": None,
                "error": "GOOGLE_SAFEBROWSING_KEY not set"}

    endpoint = (
        f"https://safebrowsing.googleapis.com/v4/threatMatches:find"
        f"?key={SAFEBROWSING_KEY}"
    )
    payload = {
        "client": {"clientId": "fraudshield", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes":      ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes":    ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries":    [{"url": _clean_url(url)}],
        },
    }
    try:
        r = requests.post(endpoint, json=payload, timeout=TIMEOUT)
        if r.status_code == 200:
            data        = r.json()
            hit         = bool(data.get("matches"))
            threat_type = data["matches"][0]["threatType"] if hit else None
            return {
                "success":     True,
                "hit":         hit,
                "threat_type": threat_type,
            }
        return {"success": False, "hit": False, "threat_type": None,
                "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"success": False, "hit": False, "threat_type": None, "error": str(e)}


def _safebrowsing_explanation(sb: dict) -> str:
    if not sb.get("success") or not sb.get("hit"):
        return ""
    tt = sb.get("threat_type") or "phishing/malware"
    label_map = {
        "MALWARE":                   "malware distribution",
        "SOCIAL_ENGINEERING":        "phishing / social engineering",
        "UNWANTED_SOFTWARE":         "unwanted software installation",
        "POTENTIALLY_HARMFUL_APPLICATION": "potentially harmful app",
    }
    label = label_map.get(tt, tt.lower())
    return (
        f"Google Safe Browsing has flagged this URL for {label}. "
        f"Google's database covers billions of URLs and is updated every 30 minutes — "
        f"a hit here means this link has been confirmed dangerous."
    )


# ── Check 4: VirusTotal ───────────────────────────────────────

def _check_virustotal(url: str) -> dict:
    """
    VirusTotal — 70+ antivirus/security engines in one API call.
    Free tier: 4 requests/minute. Does NOT sleep on new URLs.
    """
    if not VIRUSTOTAL_KEY:
        return {"success": False, "malicious": 0, "total": 0,
                "error": "VIRUSTOTAL_KEY not set"}

    headers = {"x-apikey": VIRUSTOTAL_KEY}
    url_id  = base64.urlsafe_b64encode(_clean_url(url).encode()).decode().strip("=")

    # Try fetching existing report first
    try:
        r = requests.get(
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers=headers, timeout=TIMEOUT,
        )
        if r.status_code == 200:
            stats     = r.json()["data"]["attributes"]["last_analysis_stats"]
            malicious = stats.get("malicious", 0)
            suspicious_vt = stats.get("suspicious", 0)
            total     = sum(stats.values())
            return {
                "success":      True,
                "malicious":    malicious,
                "suspicious":   suspicious_vt,
                "total":        total,
                "score":        f"{malicious}/{total}",
                "suspicious_flag": (malicious + suspicious_vt) > 2,
                "source":       "cached",
            }
    except Exception:
        pass

    # Submit for scanning — return pending immediately (no sleep)
    try:
        requests.post(
            "https://www.virustotal.com/api/v3/urls",
            headers=headers,
            data={"url": _clean_url(url)},
            timeout=TIMEOUT,
        )
    except Exception:
        pass

    return {
        "success":       True,
        "malicious":     0,
        "suspicious":    0,
        "total":         0,
        "score":         "scan_pending",
        "suspicious_flag": False,
        "source":        "submitted",
        "note":          "URL submitted to VirusTotal for scanning",
    }


def _virustotal_explanation(vt: dict) -> str:
    if not vt.get("success"):
        return ""
    malicious  = vt.get("malicious", 0)
    suspicious = vt.get("suspicious", 0)
    total      = vt.get("total", 0)
    score      = vt.get("score", "")

    if score == "scan_pending":
        return "This URL was submitted to VirusTotal for scanning across 70+ security engines."

    if malicious == 0 and suspicious == 0:
        if total > 0:
            return (
                f"VirusTotal scanned this URL across {total} security engines and found no threats. "
                f"However, new phishing sites are often not yet detected by security vendors."
            )

    flagging_engines = malicious + suspicious
    severity = "multiple" if flagging_engines >= 5 else "several" if flagging_engines >= 3 else "some"
    return (
        f"VirusTotal flagged this URL as malicious by {malicious} engines "
        f"and suspicious by {suspicious} additional engines out of {total} total ({score}). "
        f"When {severity} independent security vendors flag the same URL, "
        f"it is very likely a phishing or malware site."
    )

# ── Check 5: Firecrawl — live page content scraping ──────────



# Fraud-indicating keywords found in scraped page content
_PAGE_FRAUD_KEYWORDS = [
    "enter your otp", "enter otp", "verify otp",
    "enter your atm pin", "enter your pin",
    "enter your aadhaar", "enter aadhaar number",
    "enter your account number", "enter account number",
    "enter your card number", "enter card details",
    "verify your kyc", "complete your kyc", "kyc update",
    "enter your password", "confirm your password",
    "login to continue", "sign in to continue",
    "your account has been suspended", "your account is blocked",
    "update your details immediately", "verify immediately",
    "click here to claim", "claim your prize",
    "you have won", "congratulations you won",
    "enter cvv", "enter expiry",
    "bank account details", "enter ifsc",
    "upi pin", "enter upi pin",
]

# Legitimate page patterns — reduce false positives
_PAGE_LEGIT_MARKERS = [
    "copyright", "privacy policy", "terms of service",
    "contact us", "about us", "registered under",
    "rbi registered", "sebi registered",
    "grievance officer", "nodal officer",
]


def _check_firecrawl(url: str) -> dict:
    """
    Firecrawl — scrapes the actual page content of the URL.
    Extracts visible text, title, links, and forms.
    Then runs fraud keyword analysis on the scraped content.

    Why this matters: A URL can pass all domain checks but still
    be a fraud page. Firecrawl lets us read what is ACTUALLY on the
    page — OTP forms, fake bank login screens, prize claim pages.

    Free tier: 500 credits/month at firecrawl.dev
    Get key: firecrawl.dev → Sign up → API Keys
    """
    if not FIRECRAWL_KEY:
        return {
            "success": False,
            "scraped": False,
            "error":   "FIRECRAWL_API_KEY not set — add it to Railway variables",
            "content_fraud_signals": [],
            "content_legit_markers": [],
            "has_credential_form":   False,
            "page_title":            None,
        }

    try:
        from firecrawl import FirecrawlApp # type: ignore
        fc  = FirecrawlApp(api_key=FIRECRAWL_KEY)
        clean = _clean_url(url)

        # Scrape the page — extract markdown text + metadata
        result = fc.scrape_url(
            clean,
            params={
                "formats":      ["markdown", "links"],
                "onlyMainContent": True,
                "timeout":      15000,   # 15 seconds
            },
        )

        if not result or not result.get("markdown"):
            return {
                "success": True,
                "scraped": False,
                "error":   "Page returned no content (may be behind login or JS-only)",
                "content_fraud_signals": [],
                "content_legit_markers": [],
                "has_credential_form":   False,
                "page_title":            result.get("metadata", {}).get("title") if result else None,
            }

        content_lower  = result["markdown"].lower()
        page_title     = result.get("metadata", {}).get("title", "")
        links          = result.get("links", [])

        # Check for fraud keywords in page content
        fraud_signals = [
            kw for kw in _PAGE_FRAUD_KEYWORDS
            if kw in content_lower
        ]

        # Check for legit markers
        legit_markers = [
            kw for kw in _PAGE_LEGIT_MARKERS
            if kw in content_lower
        ]

        # Detect credential-harvesting forms
        # Look for input field indicators in markdown
        form_indicators = [
            "[ ]", "[  ]",        # empty form fields in markdown
            "password", "pin",
            "otp", "cvv",
            "account number", "card number",
        ]
        has_credential_form = sum(1 for fi in form_indicators if fi in content_lower) >= 2

        # Count external links to suspicious domains
        suspicious_link_count = sum(
            1 for link in (links or [])
            if any(tld in str(link).lower() for tld in [".xyz", ".top", ".tk", ".ml", ".pw"])
        )

        return {
            "success":               True,
            "scraped":               True,
            "page_title":            page_title,
            "content_length":        len(result["markdown"]),
            "content_fraud_signals": fraud_signals[:6],      # top 6
            "content_legit_markers": legit_markers[:4],
            "has_credential_form":   has_credential_form,
            "suspicious_links":      suspicious_link_count,
            "fraud_signal_count":    len(fraud_signals),
            "legit_marker_count":    len(legit_markers),
            "source":                "firecrawl",
        }

    except ImportError:
        return {
            "success": False,
            "scraped": False,
            "error":   "firecrawl-py not installed — run: pip install firecrawl-py",
            "content_fraud_signals": [],
            "content_legit_markers": [],
            "has_credential_form":   False,
            "page_title":            None,
        }
    except Exception as e:
        err = str(e)
        # Rate limit or blocked — not a failure of the URL itself
        if "429" in err or "rate" in err.lower():
            return {
                "success": False,
                "scraped": False,
                "error":   "Firecrawl rate limit reached",
                "content_fraud_signals": [],
                "content_legit_markers": [],
                "has_credential_form":   False,
                "page_title":            None,
            }
        return {
            "success": False,
            "scraped": False,
            "error":   f"Firecrawl error: {err[:120]}",
            "content_fraud_signals": [],
            "content_legit_markers": [],
            "has_credential_form":   False,
            "page_title":            None,
        }


def _firecrawl_explanation(fc: dict) -> str:
    #If DNS Could not resolve it
    if not fc.get("scraped"):
        err = (fc.get("error") or "").lower()

        if "dns" in err:
            return (
                "The website could not be reached (DNS resolution failed). "
                "Fraudulent domains are often taken offline quickly to avoid detection."
            )

        if "timeout" in err:
            return "The website could not be loaded in time. This may indicate a slow or unstable server."
    
    """Human-readable explanation of Firecrawl findings."""
    if not fc.get("success") or not fc.get("scraped"):
        return ""

    parts = []
    title = fc.get("page_title", "")
    if title:
        parts.append(f"Page title: \"{title}\".")

    fraud_signals = fc.get("content_fraud_signals", [])
    if fraud_signals:
        sample = fraud_signals[:3]
        signals_str = ", ".join(f'"{s}"' for s in sample)

        parts.append(
        f"The page content contains {len(fraud_signals)} fraud indicator(s) — "
        f"including: {signals_str}. "
        f"These are phrases typically found on fake bank login pages and phishing sites."
        )

    if fc.get("has_credential_form"):
        parts.append(
            "The page appears to contain a form asking for sensitive credentials "
            "(OTP, PIN, password, card number). "
            "Legitimate banks never ask you to enter this information via a link in an SMS."
        )

    legit = fc.get("content_legit_markers", [])
    if legit and not fraud_signals:
        parts.append(
            f"The page contains standard legitimate markers ({', '.join(legit[:3])}), "
            f"suggesting it may be a genuine website."
        )

    if fc.get("suspicious_links", 0) > 0:
        parts.append(
            f"The page contains {fc['suspicious_links']} link(s) pointing to suspicious domains."
        )

    return " ".join(parts)
# ── Check 5: URLScan.io ───────────────────────────────────────

def _check_urlscan(url: str) -> dict:
    """
    URLScan.io — searches existing scans + submits new scan if needed.
    Works even without API key (limited free submission).
    """
    clean = _clean_url(url)
    domain = _extract_domain(url)

    # ── Step 1: Search existing scans ─────────────────────────
    try:
        search_res = requests.get(
            f"https://urlscan.io/api/v1/search/?q=domain:{domain}&size=1",
            timeout=TIMEOUT,
            headers={"User-Agent": "fraudshield/1.0"},
        )

        if search_res.status_code == 200:
            data = search_res.json()
            results = data.get("results", [])

            if results:
                latest = results[0]
                page = latest.get("page", {})
                task = latest.get("task", {})
                verdicts = latest.get("verdicts", {})

                overall = verdicts.get("overall", {})

                return {
                    "success": True,
                    "found": True,
                    "malicious": overall.get("malicious", False),
                    "score": overall.get("score", 0),
                    "tags": overall.get("tags", []),
                    "country": page.get("country"),
                    "server": page.get("server"),
                    "ip": page.get("ip"),
                    "screenshot_url": f"https://urlscan.io/screenshots/{latest.get('_id', '')}.png",
                    "report_url": f"https://urlscan.io/result/{latest.get('_id', '')}/",
                    "scan_date": task.get("time"),
                    "source": "urlscan_search",
                }

    except Exception:
        pass  # fail silently → move to submission

    # ── Step 2: Submit for fresh scan (API key OR free tier) ──
    try:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "fraudshield/1.0",
        }

        # Add API key if available (better rate limits)
        if URLSCAN_KEY:
            headers["API-Key"] = URLSCAN_KEY

        sub = requests.post(
            "https://urlscan.io/api/v1/scan/",
            headers=headers,
            json={"url": clean, "visibility": "public"},
            timeout=TIMEOUT,
        )

        if sub.status_code in (200, 201):
            result = sub.json()

            return {
                "success": True,
                "found": False,
                "submitted": True,
                "scan_pending": True,
                "report_url": result.get("api", ""),
                "screenshot_url": result.get("screenshot", ""),
                "source": "urlscan_submitted",
                "note": "URL submitted for live scan — results available in ~20–60 seconds",
            }

        # Handle rate limit gracefully
        if sub.status_code == 429:
            return {
                "success": False,
                "found": False,
                "error": "URLScan rate limit reached",
            }

    except Exception as e:
        return {
            "success": False,
            "found": False,
            "error": f"URLScan error: {str(e)[:100]}",
        }

    # ── Final fallback ────────────────────────────────────────
    return {
        "success": False,
        "found": False,
        "error": "URLScan unavailable or no data",
    }


def _urlscan_explanation(us: dict) -> str:
    if not us.get("success") or not us.get("found"):
        if us.get("submitted"):
            return "This URL was submitted to URLScan.io for live analysis and page screenshot capture."
        return ""

    parts = []
    if us.get("malicious"):
        parts.append("URLScan.io's automated analysis flagged this page as malicious.")

    tags = us.get("tags", [])
    if tags:
        tag_str = ", ".join(tags[:4])
        parts.append(f"Security tags from URLScan: {tag_str}.")

    country = us.get("country")
    server  = us.get("server")
    ip      = us.get("ip")
    if country:
        parts.append(f"The server hosting this URL is located in {country}.")
    if server:
        parts.append(f"Server software: {server}.")

    report = us.get("report_url")
    if report and parts:
        parts.append(f"Full scan report: {report}")

    return " ".join(parts)


# ── Check 6: PhishTank — STUBBED ──────────────────────────────

def _check_phishtank(url: str) -> dict:
    """
    PhishTank API is currently unavailable due to service errors.
    Returning a neutral stub so the pipeline is not blocked.
    Re-enable when PhishTank restores service at phishtank.org.
    """
    return {
        "success":     False,
        "hit":         False,
        "in_database": False,
        "verified":    False,
        "error":       "PhishTank service temporarily unavailable",
    }


# ── Evidence Narrative Builder ────────────────────────────────

def _build_narrative(
    domain: str,
    heuristics: dict,
    whois_res: dict,
    sb: dict,
    vt: dict,
    urlscan: dict,
    verdict: str,
    fc: dict = None, # type: ignore
) -> str:
    """
    Build a full human-readable explanation of why this URL is safe/dangerous.
    This is what gets shown to users — clear, jargon-free, actionable.
    """
    sentences: List[str] = []

    # 1. Official domain — short reassurance
    if heuristics.get("is_official"):
        return (
            f"'{domain}' is a verified official domain. "
            f"This URL belongs to a known, legitimate institution. "
            f"No suspicious patterns, blacklists, or threat indicators were found."
        )

    # 2. Open with the overall verdict
    if verdict == "MALICIOUS":
        sentences.append(
            f"This URL has been identified as highly dangerous and should NOT be visited."
        )
    elif verdict == "SUSPICIOUS":
        sentences.append(
            f"This URL shows multiple warning signs that are commonly associated with phishing or fraud."
        )
    elif verdict == "CLEAN":
        sentences.append(
            f"No major threats were detected for this URL based on our available checks."
        )
    else:
        sentences.append(
            f"We could not fully verify this URL — treat it with caution."
        )

    # 3. Domain heuristics — most explainable layer
    for reason in heuristics.get("reasons", [])[:3]:
        sentences.append(reason)

    # 4. WHOIS age
    whois_exp = _whois_explanation(whois_res)
    if whois_exp:
        sentences.append(whois_exp)

    # 5. Safe Browsing
    sb_exp = _safebrowsing_explanation(sb)
    if sb_exp:
        sentences.append(sb_exp)

    # 6. VirusTotal
    vt_exp = _virustotal_explanation(vt)
    if vt_exp:
        sentences.append(vt_exp)

    # 7a. URLScan
    us_exp = _urlscan_explanation(urlscan)
    if us_exp:
        sentences.append(us_exp)
    
    # 7b. Firecrawl — page content (most credible layer)
    if fc:
        fc_exp = _firecrawl_explanation(fc)
        if fc_exp:
            sentences.append(fc_exp)

    # 8. Closing advice
    if verdict == "MALICIOUS":
        sentences.append(
            "Do NOT enter any personal information, banking credentials, OTP, or card details on this page. "
            "If you have already done so, contact your bank immediately and call the National Cyber Crime helpline: 1930."
        )
    elif verdict == "SUSPICIOUS":
        sentences.append(
            "Before clicking this link, verify the source independently by calling your bank's official number. "
            "Never enter OTP, passwords, or card details on a site you reached through an SMS or WhatsApp link."
        )
    elif verdict == "CLEAN":
        sentences.append(
            "Always verify that a website's address exactly matches your bank's official domain before entering credentials."
        )

    return " ".join(sentences)


# ── Risk score calculator ─────────────────────────────────────

def _calculate_risk_score(heuristics: dict, whois_res: dict, sb: dict, vt: dict, urlscan: dict, fc: dict = None) -> float: # type: ignore
    """
    Weighted risk score 0.0–1.0.
    External API hits weighted higher than heuristics.
    """
    score = 0.0

    # Hard hits — external databases (highest weight)
    if sb.get("hit"):
        score += 0.55   # Google confirmed threat
    if (vt.get("malicious", 0) or 0) >= 5:
        score += 0.50   # Many engines flagged
    elif (vt.get("malicious", 0) or 0) >= 2:
        score += 0.30
    elif (vt.get("suspicious", 0) or 0) >= 3:
        score += 0.20
    if urlscan.get("malicious"):
        score += 0.40

    # Domain age (strong indicator)
    age = whois_res.get("age_days")
    if age is not None:
        if age < 7:
            score += 0.45
        elif age < 30:
            score += 0.35
        elif age < 90:
            score += 0.20

    # Heuristics — each flag adds weight
    num_flags = len(heuristics.get("flags", []))
    if num_flags >= 3:
        score += 0.65
    elif num_flags >= 2:
        score += 0.45
    elif num_flags == 1:
        score += 0.25
    for flag in heuristics.get("flags", []):
        if "credential_path" in flag:
            score += 0.30
        if "bank_impersonation" in flag:
            score += 0.30
    # Firecrawl content analysis (highest credibility — based on actual page content)
    if fc and fc.get("scraped"):
        fraud_count = fc.get("fraud_signal_count", 0)
        legit_count = fc.get("legit_marker_count", 0)
        if fc.get("has_credential_form"):
            score += 0.50   # credential form = very strong fraud signal
        elif fraud_count >= 4:
            score += 0.40
        elif fraud_count >= 2:
            score += 0.25
        elif fraud_count >= 1:
            score += 0.10
        # Legit markers reduce score slightly
        if legit_count >= 3 and fraud_count == 0:
            score = max(0.0, score - 0.15)
        #Firecrawl failure as infra signal
        
        if fc and not fc.get("scraped"):
            err = (fc.get("error") or "").lower()

            if "dns" in err or "resolve" in err:
                score += 0.30   # strong fraud infra signal
    return round(min(score, 1.0), 4)


# ── Main entry point ──────────────────────────────────────────

def check_url(url: str) -> dict:
    """
    Main URL analysis pipeline.
    Runs all checks and returns structured result.
    """

    # ── Step 0: Clean + extract ─────────────────────────────
    clean = _clean_url(url)
    domain = _extract_domain(clean)

    # ── Step 1: Run all checks ─────────────────────────────
    heuristics = _check_domain_heuristics(clean, domain)
    whois_res  = _check_whois(domain)
    sb         = _check_safebrowsing(clean)
    vt         = _check_virustotal(clean)
    urlscan    = _check_urlscan(clean)
    fc         = _check_firecrawl(clean)

    # ── Step 2: Build reasons (explanations) ────────────────
    reasons = []

    # Heuristics
    reasons.extend(heuristics.get("reasons", []))

    # WHOIS
    whois_exp = _whois_explanation(whois_res)
    if whois_exp:
        reasons.append(whois_exp)

    # Safe Browsing
    sb_exp = _safebrowsing_explanation(sb)
    if sb_exp:
        reasons.append(sb_exp)

    # VirusTotal
    vt_exp = _virustotal_explanation(vt)
    if vt_exp:
        reasons.append(vt_exp)

    # Firecrawl
    fc_exp = _firecrawl_explanation(fc)
    if fc_exp:
        reasons.append(fc_exp)

    # URLScan
    us_exp = _urlscan_explanation(urlscan)
    if us_exp:
        reasons.append(us_exp)

    # ── Step 3: Risk scoring (YOUR LOGIC PRESERVED) ─────────
    risk_score = 0.0

    # Heuristics
    if heuristics.get("flags"):
        risk_score += 0.4

    # WHOIS
    age = whois_res.get("age_days")
    if age is not None and age < 90:
        risk_score += 0.3

    # Safe Browsing
    if sb.get("hit"):
        risk_score += 0.9

    # VirusTotal
    if vt.get("malicious", 0) > 0:
        risk_score += 0.6

    # Firecrawl
    if fc.get("has_credential_form"):
        risk_score += 0.7
    elif fc.get("content_fraud_signals"):
        risk_score += 0.5

    # Infra signal (your earlier logic)
    if fc and not fc.get("scraped"):
        err = (fc.get("error") or "").lower()
        if "dns" in err or "resolve" in err:
            risk_score += 0.3

    # URLScan
    if urlscan.get("malicious"):
        risk_score += 0.6

    # Clamp
    risk_score = min(risk_score, 1.0)

    # ── Step 4: Verdict ─────────────────────────────────────
    if risk_score >= 0.75:
        verdict = "MALICIOUS"
    elif risk_score >= 0.4:
        verdict = "SUSPICIOUS"
    else:
        verdict = "CLEAN"

    # ── Step 5: Evidence count (FIX) ────────────────────────
    evidence_count = len(reasons)

    # ── Step 6: Narrative ───────────────────────────────────
    narrative = _build_narrative(
        domain,
        heuristics,
        whois_res,
        sb,
        vt,
        urlscan,
        verdict,
        fc,
    )

    # ── Step 7: FINAL RETURN (FULLY FIXED) ──────────────────
    return {
        "url": clean,
        "domain": domain,

        # Core
        "risk_score": risk_score,
        "verdict": verdict,
        "reasons": reasons,
        "narrative": narrative,

        # Heuristics
        "heuristic_flags": heuristics.get("flags", []),

        # WHOIS (FIXED)
        "domain_age_days": whois_res.get("age_days"),
        "registrar": whois_res.get("registrar"),
        "domain_country": whois_res.get("country"),

        # Safe Browsing
        "safebrowsing_hit": sb.get("hit", False),
        "safebrowsing_type": sb.get("threat_type"),

        # VirusTotal
        "virustotal_score": vt.get("score", "unknown"),
        "virustotal_malicious": vt.get("malicious", 0),

        # URLScan
        "urlscan_malicious": urlscan.get("malicious", False),
        "urlscan_tags": urlscan.get("tags", []),
        "urlscan_country": urlscan.get("country"),
        "urlscan_report_url": urlscan.get("report_url"),
        "urlscan_screenshot_url": urlscan.get("screenshot_url"),

        # 🔥 Firecrawl (CRITICAL FIX)
        "firecrawl_scraped": fc.get("scraped"),
        "firecrawl_fraud_signals": fc.get("content_fraud_signals", []),
        "firecrawl_has_cred_form": fc.get("has_credential_form"),
        "firecrawl_page_title": fc.get("page_title"),

        # Meta
        "evidence_count": evidence_count,
    }