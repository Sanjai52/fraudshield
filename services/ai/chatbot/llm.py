"""
services/ai/chatbot/llm.py
---------------------------
Gemini LLM integration for the FraudShield chatbot.
Merged into services/ai so everything runs on a single port.
"""

import os
import httpx
from typing import Optional
from google import genai
from dotenv import load_dotenv
load_dotenv()


_ANALYSE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
_MODEL       = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ── System prompt — context-aware, user-focused ───────────────────
# Rules:
# 1. Answer EXACTLY what the user asked — no generic replies
# 2. If user pastes a suspicious message — analyse it directly
# 3. If user asks about a specific bank/scam type — answer that specifically
# 4. Never give a one-size-fits-all response
# 5. Tone: calm, clear, direct — like a knowledgeable friend, not a chatbot

SYSTEM_PROMPT = """You are FraudShield AI — a fraud detection expert specifically for Indian banking customers.

## Your core behaviour
- Read every user message carefully. Respond ONLY to what they actually asked.
- If someone pastes a message asking "is this a scam?" — analyse THAT specific message.
- If someone asks about a specific bank (SBI, HDFC, etc.) — answer about THAT bank.
- If someone describes what happened to them — respond to THEIR situation specifically.
- Never give generic advice when the user gave you specific details to work with.

## What you know
- All major Indian bank sender IDs (SBIBNK, HDFCBK, ICICIB, AXISBK, etc.)
- Common fraud patterns: KYC scams, OTP harvesting, fake refunds, lottery fraud, job scams
- UPI fraud mechanics — how money is stolen, how to recover it
- RBI guidelines and official helplines
- Cybercrime reporting: cybercrime.gov.in, helpline 1930

## How to respond
- If user pastes a suspicious SMS or message → analyse it: check sender, urgency language, links
- If user asks "what is [scam type]?" → explain that specific scam with Indian examples
- If user says "I got scammed" → immediate steps: call 1930, freeze account, report online
- If user asks "is [sender ID] real?" → check against known bank IDs and say clearly yes/no
- If user asks how FraudShield works → explain the feature they asked about specifically

## Constraints
- Keep responses under 200 words unless user asks for detail
- Use bullet points only when listing steps or multiple items
- Always end with the relevant helpline if the situation is serious
- Never make up bank details or sender IDs you are not sure about
- If you cannot determine something definitively, say so clearly

## Emergency
If someone says they lost money or are being threatened: immediately tell them to call 1930 and freeze their bank account — BEFORE any other advice.
"""

def chat_with_gemini(history: list, user_message: str, system: str = SYSTEM_PROMPT) -> str:
    if not os.getenv("GEMINI_API_KEY"):
        return "Chatbot is not configured. Please set GEMINI_API_KEY."

    try:
        prompt_parts = [system, ""]

        for turn in history[:-1]:
            role = "User" if turn["role"] == "user" else "Assistant"
            prompt_parts.append(f"{role}: {turn['content']}")

        prompt_parts.append(f"User: {user_message}")
        prompt_parts.append("Assistant:")

        full_prompt = "\n".join(prompt_parts)

        response = client.models.generate_content(
            model=_MODEL,
            contents=full_prompt
        )

        text = response.text.strip() if response.text else None
        return text or "I could not generate a response. Please try again."

    except Exception as e:
        err = str(e)
        if "404" in err:
            return f"Model '{_MODEL}' not available."
        if "quota" in err.lower() or "429" in err:
            return "Rate limit reached. Please try again."
        return f"Error reaching AI service. ({err[:60]})"


async def analyse_message_for_chat(message: str) -> Optional[dict]:
    """
    Calls /analyse/text on itself (same service, loopback) when
    user pastes a suspicious SMS into the chat.
    """
    try:
        # Self-call: chatbot calls the fraud analysis endpoint on the same app
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
    """
    Formats a fraud analysis result into a readable chatbot reply.
    Shows the actual evidence — not just a verdict label.
    """
    verdict  = result.get("display_verdict", result.get("verdict", "UNKNOWN"))
    conf     = round(result.get("confidence", 0) * 100)
    explain  = result.get("explanation", "")
    action   = result.get("action", "")
    signals  = result.get("signals", [])
    sender   = result.get("sender_check")

    icon = "🚨" if "FRAUD" in verdict else "✅" if "LEGIT" in verdict else "⚠️"

    signal_labels = {
        "urgency_pressure":   "Uses urgency/threat language",
        "credential_harvest": "Asks for OTP or personal details",
        "threat_language":    "Contains threatening language",
        "fake_domain_hint":   "Contains a suspicious link",
        "fake_sender_id":     "Sender ID is not genuine",
        "malicious_url":      "Contains a malicious URL",
    }

    lines = [f"{icon} **{verdict}** — {conf}% confidence", ""]

    # Sender verification — strongest evidence
    if sender:
        if sender.get("status") == "known_fake":
            lines.append(f"❌ Sender **{sender['sender']}** is NOT a registered ID for {sender.get('claimed_bank', 'this bank')}.")
            if sender.get("real_sender_ids"):
                lines.append(f"   Real IDs: {', '.join(sender['real_sender_ids'][:3])}")
        elif sender.get("status") == "verified":
            lines.append(f"✅ Sender **{sender['sender']}** is verified for {sender.get('claimed_bank', 'this bank')}.")
        elif sender.get("status") == "unknown":
            lines.append(f"⚠️ Sender **{sender['sender']}** could not be verified.")

    # Signals
    if signals:
        lines.append("")
        lines.append("**Why flagged:**")
        for s in signals[:3]:
            lines.append(f"• {signal_labels.get(s, s.replace('_', ' '))}")

    # Explanation
    if explain:
        lines.append("")
        lines.append(explain)

    # Action
    if action:
        lines.append("")
        lines.append(f"**What to do:** {action}")

    return "\n".join(lines)