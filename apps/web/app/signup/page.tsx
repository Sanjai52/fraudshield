"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [gLoading,  setGLoading]  = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  function validatePassword(p: string) {
    if (p.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(p)) return "Include at least one uppercase letter.";
    if (!/[0-9]/.test(p)) return "Include at least one number.";
    return null;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!fullName.trim())  { setError("Please enter your full name."); return; }
    if (!email.trim())     { setError("Please enter your email address."); return; }

    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const { data, error } = await signUpWithEmail(email, password, fullName);
      if (error) {
        setError(
          error.message.includes("already registered")
            ? "This email is already registered. Try logging in instead."
            : error.message
        );
      } else if (data.user && !data.session) {
        // Email confirmation required
        setSuccess("Account created! Check your email to confirm your account, then log in.");
      } else {
        setSuccess("Account created and logged in! Redirecting...");
        setTimeout(() => router.push("/"), 1200);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError(""); setGLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) setError(error.message);
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGLoading(false);
    }
  }

  const pwStrength = password.length === 0 ? null
    : password.length < 8 ? "weak"
    : !/[A-Z]/.test(password) || !/[0-9]/.test(password) ? "medium"
    : "strong";

  const strengthColor = pwStrength === "strong" ? "var(--success)"
    : pwStrength === "medium" ? "var(--warning)"
    : "var(--danger)";

  return (
    <main style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      background: "var(--bg)",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            Free forever · No credit card required
          </p>
        </div>

        <div className="card" style={{ padding: 32, boxShadow: "var(--shadow-md)" }}>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignup}
            disabled={gLoading || loading}
            style={{
              width:          "100%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            12,
              padding:        "12px 20px",
              background: "var(--bg-card)",
color: "var(--foreground)",
              border:         "1.5px solid var(--border)",
              borderRadius:   "var(--radius-sm)",
              fontSize:       15,
              fontWeight:     600,
              cursor:         gLoading ? "not-allowed" : "pointer",
              boxShadow:      "var(--shadow)",
              transition:     "box-shadow 0.15s, border-color 0.15s",
              opacity:        gLoading ? 0.7 : 1,
              marginBottom:   20,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#4285f4")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            {gLoading ? (
              <span>Redirecting to Google...</span>
            ) : (
              <>
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
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>or sign up with email</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Full name</div>
              <input
                type="text"
                placeholder="Sanjay Kumar"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>

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
              <div className="section-label" style={{ marginBottom: 8 }}>Password</div>
              <input
                type="password"
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              {/* Strength indicator */}
              {pwStrength && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      background: strengthColor,
                      width: pwStrength === "strong" ? "100%" : pwStrength === "medium" ? "60%" : "25%",
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: strengthColor, fontWeight: 600, textTransform: "capitalize" }}>
                    {pwStrength}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Confirm password</div>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                style={{
                  borderColor: confirm && confirm !== password ? "var(--danger)" : undefined,
                }}
              />
              {confirm && confirm !== password && (
                <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>
                  Passwords do not match
                </div>
              )}
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
                lineHeight:   1.6,
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
              {loading ? "Creating account..." : "Create account →"}
            </button>

            <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
              By signing up you agree to our{" "}
              <Link href="/terms" style={{ color: "var(--primary)" }}>Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" style={{ color: "var(--primary)" }}>Privacy Policy</Link>.
            </p>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 20 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}