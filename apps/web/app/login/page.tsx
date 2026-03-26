import Link from "next/link";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "var(--subtle)" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 36 }}>🛡️</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 12, marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>Log in to save your analysis history</p>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Email or phone</div>
              <input type="text" placeholder="you@example.com or 9876543210" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div className="section-label">Password</div>
                <a href="#" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none" }}>Forgot password?</a>
              </div>
              <input type="password" placeholder="••••••••" />
            </div>
            <button className="btn-primary" style={{ padding: "13px 0", fontSize: 15, marginTop: 4 }}>
              Log in →
            </button>
            <div style={{ textAlign: "center", position: "relative" }}>
              <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
              <span style={{ background: "white", padding: "0 12px", fontSize: 13, color: "var(--muted)", position: "relative", zIndex: 1 }}>or</span>
            </div>
            <button className="btn-outline" style={{ padding: "12px 0", fontSize: 14 }}>
              📱 Log in with OTP
            </button>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 20 }}>
          Don't have an account?{" "}
          <Link href="/signup" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>Sign up free</Link>
        </p>
      </div>
    </main>
  );
}