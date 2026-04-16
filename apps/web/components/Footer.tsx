import Link from "next/link";
const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { label: "Analyse Message", href: "/analyse" },
      { label: "Dashboard",       href: "/dashboard" },
      { label: "Transparency",    href: "/transparency" },
      { label: "WhatsApp Bot",    href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us",    href: "/about" },
      { label: "Contact",     href: "/contact" },
      { label: "How It Works",href: "/transparency" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Use",   href: "#" },
      { label: "Security",       href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">

        {/* Top row */}
        <div className="site-footer__top">

          {/* Brand column */}
          <div className="site-footer__brand">
            <div className="site-footer__logo">
              <span className="site-footer__logo-icon">🛡️</span>
              <span className="site-footer__logo-text">
                Fraud<span className="site-footer__logo-accent">Shield</span>
              </span>
            </div>
            <p className="site-footer__tagline">
              AI-powered fraud detection for Indian banking customers.
              Protecting you before money is lost.
            </p>
            {/* Emergency badge */}
            <div className="site-footer__emergency">
              <span className="site-footer__emergency-dot" />
              <span>Fraud helpline: </span>
              <strong>1930</strong>
              <span> · Available 24/7</span>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(col => (
            <div key={col.title} className="site-footer__col">
              <div className="site-footer__col-title">{col.title}</div>
              <ul className="site-footer__col-links">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="site-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="site-footer__divider" />

        {/* Bottom row */}
        <div className="site-footer__bottom">
          <span>© 2026 FraudShield · SSN Institute of Technology, Chennai</span>
          <div className="site-footer__bottom-badges">
            <span className="site-footer__badge">🔒 No data stored</span>
            <span className="site-footer__badge">🤖 MuRIL v2</span>
            <span className="site-footer__badge">🇮🇳 Made for India</span>
          </div>
        </div>

      </div>
    </footer>
  );
}