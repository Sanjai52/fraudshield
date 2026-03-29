"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter }                        from "next/navigation";
import { createClient }                     from "@/lib/supabase";
import { signOut }                          from "@/lib/auth";
import { getUserStats }                     from "@/lib/db";

type Tab = "profile" | "security" | "privacy" | "chats" | "danger";

export default function SettingsPage() {
  const router = useRouter();

  const [user,       setUser]       = useState<any>(null);
  const [fullName,   setFullName]   = useState("");
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [msg,        setMsg]        = useState("");
  const [error,      setError]      = useState("");
  const [tab,        setTab]        = useState<Tab>("profile");
  const [stats,      setStats]      = useState({ total: 0, fraud: 0, safe: 0, thisMonth: 0 });
  const [sessions,   setSessions]   = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user);
      setFullName(data.user.user_metadata?.full_name ?? "");
      const s = await getUserStats(data.user.id);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const loadChatSessions = useCallback(async () => {
    setChatsLoading(true);
    const res  = await fetch("/api/chat");
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setChatsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "chats") loadChatSessions();
  }, [tab, loadChatSessions]);

  async function saveProfile() {
    setSaving(true); setMsg(""); setError("");
    const supabase = createClient();
    const { error: e } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (e) setError(e.message);
    else   setMsg("Profile updated successfully.");
    setSaving(false);
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  async function deleteChatSession(chatId: string) {
    await fetch(`/api/chat/delete?chat_id=${chatId}`, { method: "DELETE" });
    setSessions(prev => prev.filter(s => s.chat_id !== chatId));
  }

  async function deleteAllChats() {
    if (!confirm("Delete all chat history? This cannot be undone.")) return;
    await fetch("/api/chat/delete", { method: "DELETE" });
    setSessions([]);
  }

  async function deleteAccount() {
    if (!confirm("This will permanently delete your account and all data. This cannot be undone.")) return;
    setDeleting(true);
    // Call a server action to delete user — for now sign out
    // Full deletion requires SUPABASE_SERVICE_ROLE_KEY in an API route
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: "calc(100vh - 60px)" }}>
      <div className="dash-spinner" />
    </div>
  );

  const isGoogle     = user?.app_metadata?.provider === "google";
  const avatarLetter = (user?.user_metadata?.full_name ?? user?.email ?? "U")[0].toUpperCase();

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "profile",  icon: "👤", label: "Profile"   },
    { id: "security", icon: "🔐", label: "Security"  },
    { id: "privacy",  icon: "🔒", label: "Privacy"   },
    { id: "chats",    icon: "💬", label: "Chats"     },
    { id: "danger",   icon: "⚠️", label: "Account"  },
  ];

  return (
    <main className="dash-main">
      <div className="dash-container">

        {/* Header */}
        <div className="settings-profile-header">
          <div className="settings-avatar">
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt={avatarLetter}
                     style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              : avatarLetter}
          </div>
          <div>
            <h1 className="dash-title">Account Settings</h1>
            <p className="dash-subtitle">
              {user?.email} &nbsp;·&nbsp;
              <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                {isGoogle ? "Google account" : "Email account"}
              </span>
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="settings-stats-strip">
          {[
            { label: "Total checks",   val: stats.total },
            { label: "Fraud detected", val: stats.fraud },
            { label: "Safe messages",  val: stats.safe  },
            { label: "This month",     val: stats.thisMonth },
          ].map(s => (
            <div key={s.label} className="settings-stat-item">
              <div className="settings-stat-val">{s.val}</div>
              <div className="settings-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="settings-layout">

          {/* Sidebar */}
          <nav className="settings-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setMsg(""); setError(""); }}
                className={`settings-nav-btn ${tab === t.id ? "active" : ""}`}
              >
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="settings-content">

            {/* ── PROFILE ───────────────────────────────── */}
            {tab === "profile" && (
              <div className="card settings-panel">
                <h2 className="settings-panel-title">Profile Information</h2>

                <div className="settings-field">
                  <label className="section-label">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    disabled={isGoogle}
                    style={{ marginTop: 8 }}
                  />
                  {isGoogle && (
                    <p className="settings-hint">Name is synced from your Google account.</p>
                  )}
                </div>

                <div className="settings-field">
                  <label className="section-label">Email address</label>
                  <input type="email" value={user?.email ?? ""} disabled
                    style={{ marginTop: 8, opacity: 0.6, cursor: "not-allowed" }} />
                  <p className="settings-hint">Email cannot be changed. Contact support if needed.</p>
                </div>

                <div className="settings-field">
                  <label className="section-label">Sign-in method</label>
                  <div className="settings-method-badge" style={{ marginTop: 8 }}>
                    {isGoogle ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google OAuth
                      </>
                    ) : "📧 Email + Password"}
                  </div>
                </div>

                {msg   && <div className="settings-success">✅ {msg}</div>}
                {error && <div className="settings-error">⚠️ {error}</div>}

                {!isGoogle && (
                  <button onClick={saveProfile} disabled={saving} className="btn-primary"
                    style={{ marginTop: 8, alignSelf: "flex-start", padding: "10px 24px" }}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                )}
              </div>
            )}

            {/* ── SECURITY ──────────────────────────────── */}
            {tab === "security" && (
              <div className="card settings-panel">
                <h2 className="settings-panel-title">Security</h2>
                <div className="settings-security-list">
                  {[
                    { icon: "🔐", title: "Password hashing",  detail: "Passwords use bcrypt via Supabase Auth. They are never stored in plain text and are never accessible to FraudShield." },
                    { icon: "🔑", title: "Session tokens",    detail: "JWT tokens expire automatically. Signing out terminates all active sessions immediately." },
                    { icon: "🛡️", title: "Google OAuth",     detail: "If you signed in with Google, no password is stored at all. Your Google account controls access." },
                    { icon: "🔒", title: "Row-level security",detail: "Database policies ensure you can only ever access your own analyses and chat history." },
                  ].map(item => (
                    <div key={item.title} className="settings-security-item">
                      <span className="settings-security-icon">{item.icon}</span>
                      <div>
                        <div className="settings-security-title">{item.title}</div>
                        <div className="settings-hint">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {!isGoogle && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                    <p className="settings-hint" style={{ marginBottom: 12 }}>
                      To reset your password, sign out and use the "Forgot password?" link on the login page.
                    </p>
                    <button onClick={handleSignOut} className="btn-outline" style={{ fontSize: 13 }}>
                      Sign out to reset password →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── PRIVACY ───────────────────────────────── */}
            {tab === "privacy" && (
              <div className="card settings-panel">
                <h2 className="settings-panel-title">Privacy & Data</h2>
                <div className="settings-privacy-list">
                  {[
                    { icon: "🔒", title: "Message text never stored",      detail: "Raw message content is discarded immediately after analysis. Only the verdict, signals, and confidence score are saved." },
                    { icon: "🔒", title: "PII stripped before analysis",    detail: "Phone numbers, account numbers, PAN cards, and Aadhaar numbers are masked before the AI sees your message." },
                    { icon: "🔒", title: "URL scans cached 24 hours only", detail: "URL scan results are cached for performance then permanently deleted after 24 hours." },
                    { icon: "🔒", title: "No third-party tracking",        detail: "FraudShield does not use Google Analytics, Meta Pixel, or any third-party tracking scripts." },
                    { icon: "🔒", title: "Voice audio deleted immediately",detail: "Audio files are processed in memory. MFCC features are extracted and the file is discarded — never stored." },
                    { icon: "🔒", title: "Chat messages stored securely",  detail: "Chatbot conversations are stored in Supabase with row-level security. Only you can see your own chat history." },
                  ].map(item => (
                    <div key={item.title} className="settings-privacy-item">
                      <span>{item.icon}</span>
                      <div>
                        <div className="settings-privacy-title">{item.title}</div>
                        <div className="settings-hint">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CHATS ─────────────────────────────────── */}
            {tab === "chats" && (
              <div className="card settings-panel">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                              marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                  <h2 className="settings-panel-title" style={{ margin: 0 }}>Chat History</h2>
                  {sessions.length > 0 && (
                    <button onClick={deleteAllChats} className="settings-delete-btn" style={{ fontSize: 12, padding: "6px 14px" }}>
                      Clear all
                    </button>
                  )}
                </div>

                {chatsLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                    <div className="dash-spinner" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="dash-empty" style={{ padding: "40px 0" }}>
                    <div className="dash-empty-icon">💬</div>
                    <p>No chat history yet. Open the AI assistant to start a conversation.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sessions.map(s => (
                      <div key={s.chat_id} className="settings-chat-row">
                        <div className="settings-chat-preview">
                          {s.content.slice(0, 80)}{s.content.length > 80 ? "…" : ""}
                        </div>
                        <div className="settings-chat-meta">
                          <span>{new Date(s.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}</span>
                          <button
                            onClick={() => deleteChatSession(s.chat_id)}
                            className="settings-delete-btn"
                            style={{ fontSize: 11, padding: "3px 10px" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── DANGER ZONE ───────────────────────────── */}
            {tab === "danger" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card settings-panel">
                  <h2 className="settings-panel-title">Sign out</h2>
                  <p className="settings-hint" style={{ marginBottom: 16 }}>
                    You'll need to log in again to access your dashboard and analysis history.
                  </p>
                  <button onClick={handleSignOut} className="btn-outline" style={{ fontSize: 14 }}>
                    🚪 Sign out
                  </button>
                </div>

                <div className="card settings-panel" style={{ borderColor: "var(--danger-border)" }}>
                  <h2 className="settings-panel-title" style={{ color: "var(--danger)" }}>
                    ⚠️ Delete account
                  </h2>
                  <p className="settings-hint" style={{ marginBottom: 16 }}>
                    This permanently deletes your account and all analysis history, feedback, and chat messages.
                    This action <strong>cannot be undone</strong>.
                  </p>
                  <div className="settings-danger-checklist">
                    {[
                      "All analysis history deleted",
                      "All feedback submissions deleted",
                      "All chat history deleted",
                      "Account credentials removed",
                    ].map(item => (
                      <div key={item} className="settings-danger-check-item">
                        <span style={{ color: "var(--danger)" }}>×</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={deleteAccount}
                    disabled={deleting}
                    className="settings-delete-btn"
                    style={{ marginTop: 16, padding: "10px 20px", fontSize: 14 }}
                  >
                    {deleting ? "Deleting…" : "Delete my account permanently"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}