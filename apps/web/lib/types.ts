export type DisplayVerdict = "HIGH_FRAUD" | "SUSPICIOUS" | "LEGITIMATE";

export interface SenderCheck {
  sender:           string;
  status:           "verified" | "known_fake" | "unknown";
  claimed_bank?:    string;
  real_sender_ids?: string[];
  helpline?:        string;
}

export interface UrlCheck {
  url:                  string;
  domain:               string;
  verdict:              "MALICIOUS" | "SUSPICIOUS" | "CLEAN";
  domain_age_days?:     number;
  safebrowsing_hit?:    boolean;
  virustotal_malicious?: number;
  phishtank_hit?:       boolean;
  virustotal_score?:    string;
}

export interface AnalysisResult {
  verdict:           string;          // raw model output: FRAUD | LEGITIMATE
  display_verdict:   DisplayVerdict;  // mapped UI verdict
  confidence:        number;          // 0–1
  fraud_probability: number;          // 0–1
  signals:           string[];        // e.g. ["urgency_pressure", "credential_harvest"]
  sender_check:      SenderCheck | null;
  url_checks:        UrlCheck[];
  explanation:       string;
  action:            string;
  model_version:     string;
  language:          string;
  // fields added by frontend before storing to localStorage
  _input?:           string;
  _tab?:             "text" | "url" | "screenshot" | "voice";
}

export interface AnalyseTextRequest {
  message: string;
}

export interface AnalyseUrlRequest {
  url: string;
}
