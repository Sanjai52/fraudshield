import Link from "next/link";

export default function SignupPage() {
  return (
    <main style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "var(--subtle)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 36 }}>🛡️</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 12, marginBottom: 6 }}>Create your account</h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>Free forever · No credit card required</p>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Full name</div>
              <input type="text" placeholder="Sanjay Kumar" />
            </div>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Email address</div>
              <input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Mobile number</div>
              <input type="tel" placeholder="+91 9876543210" />
            </div>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Password</div>
              <input type="password" placeholder="Min. 8 characters" />
            </div>
            <button className="btn-primary" style={{ padding: "13px 0", fontSize: 15, marginTop: 4 }}>
              Create account →
            </button>
            <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
              By signing up you agree to our <a href="#" style={{ color: "var(--primary)" }}>Terms</a> and <a href="#" style={{ color: "var(--primary)" }}>Privacy Policy</a>.
            </p>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 20 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}