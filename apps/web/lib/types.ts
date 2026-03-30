// Verdict shown in UI
export type DisplayVerdict = "HIGH_FRAUD" | "SUSPICIOUS" | "LEGITIMATE";

// Raw model verdict (strict typing)
export type RawVerdict = "FRAUD" | "LEGITIMATE";

// Sender validation
export interface SenderCheck {
  sender:           string;
  status:           "verified" | "known_fake" | "unknown";
  claimed_bank?:    string;
  real_sender_ids?: string[];
  helpline?:        string;
}

// URL analysis
export interface UrlCheck {
  url:                   string;
  domain:                string;
  verdict:               "MALICIOUS" | "SUSPICIOUS" | "CLEAN";
  domain_age_days?:      number;
  safebrowsing_hit?:     boolean;
  virustotal_malicious?: number;
  phishtank_hit?:        boolean;
  virustotal_score?:     string;
}

// Main result type
export interface AnalysisResult {
  // Core AI output
  verdict:           RawVerdict;
  display_verdict:   DisplayVerdict;
  confidence:        number; // 0–1
  fraud_probability: number; // 0–1

  // 🧠 AI signals (machine-readable)
  signals: string[];

  // 👀 UI-friendly explanations
  flags?: string[];

  // Checks
  sender_check: SenderCheck | null;
  url_checks:   UrlCheck[];

  // Explanation & action
  explanation: string;
  action:      string;

  // Metadata
  model_version: string;
  language:      string;

  // Frontend-only fields
  _input?: string;
  _tab?:   "text" | "url" | "screenshot" | "voice";
}

// Requests
export interface AnalyseTextRequest {
  message: string;
}

export interface AnalyseUrlRequest {
  url: string;
}