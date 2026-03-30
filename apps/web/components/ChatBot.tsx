"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { usePathname } from "next/navigation";

// Local dev: hits chatbot directly on 8001
// Production: goes through API gateway which proxies to chatbot
// In production: same URL as the AI backend (chatbot merged into it)
// In dev: hits chatbot on 8001 directly OR AI on 8000 if merged locally
const CHATBOT_URL =
  process.env.NEXT_PUBLIC_CHATBOT_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:8000";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_CHIPS = [
  "How do I use this app?",
  "What is a phishing scam?",
  "Check this SMS for fraud",
  "How to report fraud?",
];

// ── SVG Icons (inline, no extra dep) ──────────────────────────────
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const IconClose = ({ size = 16 }: { size?: number } = {}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconBot = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M12 11V7" />
    <circle cx="12" cy="5" r="2" />
    <line x1="8" y1="15" x2="8" y2="15" strokeWidth="3" />
    <line x1="12" y1="15" x2="12" y2="15" strokeWidth="3" />
    <line x1="16" y1="15" x2="16" y2="15" strokeWidth="3" />
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.8s linear infinite" }}>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// ── Render markdown-like bold (** **) with newlines ───────────────
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} style={{ fontWeight: 700 }}>
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authHeader, setAuthHeader] = useState<string>("");
  const [showChips, setShowChips] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 🔄 Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 🔐 Supabase token
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (token) setAuthHeader(`Bearer ${token}`);
      });
  }, []);

  // 🆕 Start fresh chat session
  const startChat = useCallback(() => {
    fetch(`${CHATBOT_URL}/chat/new`, {
      method: "POST",
      headers: authHeader ? { Authorization: authHeader } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        setChatId(d.chat_id);
        setMessages([
          {
            role: "assistant",
            content:
              "Hi! I'm FraudShield AI 🛡️\n\nI can help you detect scams, analyze suspicious messages (SMS, email, URLs), and guide you through the platform.\n\nHow can I assist you today?",
          },
        ]);
        setShowChips(true);
      })
      .catch(() =>
        setError("Cannot connect to the chatbot server. Is FastAPI running?")
      );
  }, [authHeader]);

  useEffect(() => {
    if (open && !chatId) startChat();
  }, [open, chatId, startChat]);

  // ⬇️ Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 💬 Send a message
  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || !chatId || loading) return;

    setInput("");
    setError("");
    setShowChips(false);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    inputRef.current?.focus();

    try {
      const res = await fetch(`${CHATBOT_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
        chat_id: chatId,
        message: msg,
        history: messages.slice(-10),   // send recent history so backend has context
}),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setError("Failed to get a response. Please check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function resetChat() {
    setChatId(null);
    setMessages([]);
    setError("");
    setShowChips(true);
  }

  // ── Render ───────────────────────────────────────────────────────
  if (!authHeader) return null;

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        className={`chatbot-fab ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close Chat" : "Open FraudShield AI Chat"}
      >
        {open ? <IconClose size={24} /> : <IconBot size={24} />}
        {!open && <span className="chatbot-dot" />}
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div className="chatbot-window" role="dialog" aria-label="FraudShield AI Chat">

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar">
                <IconShield />
              </div>
              <div>
                <div className="chatbot-header-name">FraudShield AI</div>
                <div className="chatbot-header-status">
                  <span className="chatbot-status-dot" />
                  Online · Powered by Gemini
                </div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-icon-btn"
                onClick={resetChat}
                title="New Conversation"
                aria-label="Reset chat"
              >
                <IconRefresh />
              </button>
              <button
                className="chatbot-icon-btn"
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close chat"
              >
                <IconClose />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chatbot-msg-row${m.role === "user" ? " user" : ""}`}
              >
                {/* Bot avatar on left */}
                {m.role === "assistant" && (
                  <div className="chatbot-msg-avatar" aria-hidden="true">
                    <IconBot size={13} />
                  </div>
                )}

                <div className={`chatbot-bubble ${m.role}`}>
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <FormattedMessage text={m.content} />
                  )}
                </div>

                {/* User avatar on right */}
                {m.role === "user" && (
                  <div
                    className="chatbot-msg-avatar"
                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                    aria-hidden="true"
                  >
                    <IconUser />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="chatbot-msg-row">
                <div className="chatbot-msg-avatar" aria-hidden="true">
                  <IconBot size={13} />
                </div>
                <div className="chatbot-bubble assistant chatbot-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="chatbot-error" role="alert">
                ⚠️ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick suggestion chips */}
          {showChips && messages.length <= 1 && !loading && (
            <div className="chatbot-chips" role="group" aria-label="Quick suggestions">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  className="chatbot-chip"
                  onClick={() => sendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chatbot-input-area">
            <textarea
              ref={inputRef}
              rows={1}
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder="Ask a question or paste a suspicious message…"
              aria-label="Chat input"
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              {loading ? <IconLoader /> : <IconSend />}
            </button>
          </div>

          {/* Footer note */}
          <div className="chatbot-footer-note">
            FraudShield AI may make mistakes. Always verify critical information.
          </div>
        </div>
      )}
    </>
  );
}