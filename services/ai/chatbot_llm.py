import os
import httpx
from dotenv import load_dotenv
from typing import Optional
import google.generativeai as genai

load_dotenv()

_GEMINI_KEY  = os.getenv("GEMINI_API_KEY", "")
_ANALYSE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
_MODEL       = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

if not _GEMINI_KEY:
    print("WARNING: GEMINI_API_KEY not set — chatbot will not work")
else:
    genai.configure(api_key=_GEMINI_KEY)

SYSTEM_PROMPT = """You are FraudShield AI — an expert fraud detection assistant for Indian banking customers.
Always respond directly and precisely to what the user asked.
Be concise. Keep replies under 150 words unless the user asks for detail.
Always recommend calling 1930 (India cyber fraud helpline) for confirmed scams.
"""

def chat_with_gemini(history: list, system: str = SYSTEM_PROMPT) -> str:
    if not _GEMINI_KEY:
        return "Chatbot is not configured (missing GEMINI_API_KEY)."
    try:
        full_prompt = system + "\n\n" + "\n".join(history) + "\nAssistant:"
        model       = genai.GenerativeModel(_MODEL)
        response    = model.generate_content(full_prompt)
        text        = response.text.strip()
        return text if text else "I could not generate a response."
    except Exception as e:
        err = str(e)
        return f"Model error: {err[:80]}"

async def analyse_message_for_chat(message: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{_ANALYSE_URL}/analyse/text",
                json={"message": message, "lang": "en"},
            )
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass
    return None

def format_analysis_for_chat(result: dict) -> str:
    verdict  = result.get("display_verdict", result.get("verdict", "UNKNOWN"))
    conf     = round(result.get("confidence", 0) * 100)
    explain  = result.get("explanation", "")
    action   = result.get("action", "")
    signals  = result.get("signals", [])
    icon     = "🚨" if "FRAUD" in verdict else "✅" if "LEGIT" in verdict else "⚠️"
    lines    = [f"{icon} **{verdict}** — {conf}% confidence"]
    if signals:
        lines.append(f"Signals: {', '.join(signals)}")
    if explain:
        lines.append(explain)
    if action:
        lines.append(f"What to do: {action}")
    return "\n".join(lines)
