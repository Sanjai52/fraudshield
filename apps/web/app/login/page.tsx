"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password. Please try again."
            : error.message
        );
      } else {
        setSuccess("Logged in successfully! Redirecting...");
        setTimeout(() => router.push("/"), 1000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(""); setGLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) setError(error.message);
      // On success — Google redirects the page, no further action needed
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      background: "var(--bg)",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            Log in to save your analysis history
          </p>
        </div>

        <div className="card" style={{ padding: 32, boxShadow: "var(--shadow-md)" }}>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={gLoading || loading}
            style={{
              width:         "100%",
              display:       "flex",
              alignItems:    "center",
              justifyContent: "center",
              gap:           12,
              padding:       "12px 20px",
             background: "var(--bg-card)",
              color: "var(--foreground)",
              border:        "1.5px solid var(--border)",
              borderRadius:  "var(--radius-sm)",
              fontSize:      15,
              fontWeight:    600,
              cursor:        gLoading ? "not-allowed" : "pointer",
             
              boxShadow:     "var(--shadow)",
              transition:    "box-shadow 0.15s, border-color 0.15s",
              opacity:       gLoading ? 0.7 : 1,
              marginBottom:  20,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#4285f4")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            {gLoading ? (
              <span>Redirecting to Google...</span>
            ) : (
              <>
                {/* Google G icon */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Email address</div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div className="section-label">Password</div>
                <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding:      "10px 14px",
                background:   "var(--danger-bg)",
                border:       "1px solid var(--danger-border)",
                borderRadius: "var(--radius-sm)",
                fontSize:     13,
                color:        "var(--danger)",
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{
                padding:      "10px 14px",
                background:   "var(--success-bg)",
                border:       "1px solid var(--success-border)",
                borderRadius: "var(--radius-sm)",
                fontSize:     13,
                color:        "var(--success)",
              }}>
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || gLoading}
              style={{ padding: "13px 0", fontSize: 15, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Signing in..." : "Log in →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 20 }}>
          Don't have an account?{" "}
          <Link href="/signup" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}