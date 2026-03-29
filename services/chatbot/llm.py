import os
import httpx
from dotenv import load_dotenv
from typing import Optional

import google.generativeai as genai

load_dotenv()

_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
_ANALYSE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")

if not _GEMINI_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in .env")

# ✅ Correct SDK usage
genai.configure(api_key=_GEMINI_KEY)

_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

SYSTEM_PROMPT = """You are FraudShield AI — an expert fraud detection assistant for Indian banking customers.
Your most important rule is: ALWAYS respond to the user's question directly with precise context.
Be concise. Do not use generic or overly broad explanations. Tailor your response exactly to what the user explicitly asked.
"""


def chat_with_gemini(history: list[str], system: str = SYSTEM_PROMPT) -> str:
    try:
        full_prompt = system + "\n\n" + "\n".join(history) + "\nAssistant:"

        model = genai.GenerativeModel(_MODEL)
        response = model.generate_content(full_prompt)

        text = response.text.strip()
        return text if text else "I couldn't generate a response."

    except Exception as e:
        err = str(e)
        if "404" in err:
            return f"Model '{_MODEL}' not found."
        return f"Error: {err[:80]}"


# ✅ FIXED typing (Python 3.9 compatible)
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
    verdict = result.get("display_verdict", result.get("verdict", "UNKNOWN"))
    conf = round(result.get("confidence", 0) * 100)
    explain = result.get("explanation", "")
    action = result.get("action", "")
    signals = result.get("signals", [])

    icon = "🚨" if "FRAUD" in verdict else "✅" if "LEGIT" in verdict else "⚠️"

    lines = [f"{icon} **{verdict}** — {conf}% confidence"]

    if signals:
        lines.append(f"Signals: {', '.join(signals)}")

    if explain:
        lines.append(explain)

    if action:
        lines.append(f"What to do: {action}")

    return "\n".join(lines)