"""
voice_pipeline.py
------------------
Voice deepfake detection pipeline.
Accepts an audio file (MP3, WAV, OGG, M4A — common WhatsApp formats),
extracts MFCC features via librosa,
runs a binary classifier: Human vs Synthetic (AI-generated).

Note: The classifier is heuristic-based in Week 7.
A proper trained classifier requires labelled deepfake audio data
which will be collected in Phase 2 (WhatsApp bot reports).

FastAPI /analyse/voice calls run() directly.
"""

from __future__ import annotations
import io
import numpy as np
from typing import Optional


def _extract_features(audio_bytes: bytes, filename: str = "") -> dict:
    """
    Extract MFCC and spectral features from audio bytes.

    Returns feature dict or error.
    """
    try:
        import librosa
        import soundfile as sf

        # Load audio — librosa handles MP3, WAV, OGG
        audio_io = io.BytesIO(audio_bytes)

        try:
            # Try soundfile first (faster, handles WAV/OGG)
            y, sr = sf.read(audio_io)
            if len(y.shape) > 1:
                y = y.mean(axis=1)  # stereo to mono
            y = y.astype(np.float32)
        except Exception:
            # Fall back to librosa (handles MP3)
            audio_io.seek(0)
            y, sr = librosa.load(audio_io, sr=22050, mono=True)

        # Duration check
        duration = len(y) / sr
        if duration < 0.5:
            return {"success": False, "error": "Audio too short (< 0.5 seconds)"}
        if duration > 300:
            return {"success": False, "error": "Audio too long (> 5 minutes)"}

        # ── Feature extraction ────────────────────────────────
        # MFCCs — primary deepfake indicator
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        mfcc_mean = mfccs.mean(axis=1)
        mfcc_std  = mfccs.std(axis=1)
        mfcc_delta = librosa.feature.delta(mfccs).mean(axis=1)

        # Spectral features
        spectral_centroid  = librosa.feature.spectral_centroid(y=y, sr=sr).mean()
        spectral_rolloff   = librosa.feature.spectral_rolloff(y=y, sr=sr).mean()
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr).mean()
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y).mean()

        # Chroma features
        chroma = librosa.feature.chroma_stft(y=y, sr=sr).mean(axis=1)

        # RMS energy
        rms = librosa.feature.rms(y=y).mean()

        return {
            "success":            True,
            "duration_seconds":   round(duration, 2),
            "sample_rate":        sr,
            "mfcc_mean":          mfcc_mean.tolist(),
            "mfcc_std":           mfcc_std.tolist(),
            "mfcc_delta":         mfcc_delta.tolist(),
            "spectral_centroid":  float(spectral_centroid),
            "spectral_rolloff":   float(spectral_rolloff),
            "spectral_bandwidth": float(spectral_bandwidth),
            "zero_crossing_rate": float(zero_crossing_rate),
            "chroma":             chroma.tolist(),
            "rms_energy":         float(rms),
        }

    except ImportError:
        return {"success": False, "error": "librosa not installed. Run: pip install librosa soundfile"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _classify_deepfake(features: dict) -> dict:
    """
    Heuristic deepfake classifier.

    AI-generated voice (TTS/deepfake) characteristics:
    - Very uniform MFCC variance (natural voice varies more)
    - High spectral centroid (synthesized voice sounds "tinny")
    - Low zero crossing rate variance
    - Unnaturally consistent energy (RMS)
    - Unnaturally smooth chroma

    This is a rule-based classifier. Replace with a trained model
    once labelled deepfake audio data is collected via Phase 2 bot reports.
    """
    flags = []
    suspicion_score = 0

    mfcc_std_values = features["mfcc_std"]
    mfcc_mean_vals  = features["mfcc_mean"]

    # Check 1 — MFCC std variance (too uniform = synthetic)
    avg_mfcc_std = np.mean(np.abs(mfcc_std_values))
    if avg_mfcc_std < 8.0:
        flags.append("Unusually uniform MFCC variance — consistent with synthetic voice")
        suspicion_score += 3

    # Check 2 — spectral centroid (too high = tinny/synthetic)
    sc = features["spectral_centroid"]
    if sc > 4500:
        flags.append(f"High spectral centroid ({sc:.0f} Hz) — synthesized voice often sounds 'tinny'")
        suspicion_score += 2

    # Check 3 — zero crossing rate (too low/uniform = synthetic)
    zcr = features["zero_crossing_rate"]
    if zcr < 0.02:
        flags.append("Low zero crossing rate — consistent with synthetic audio")
        suspicion_score += 2

    # Check 4 — RMS energy too consistent (natural voice has dynamic variation)
    rms = features["rms_energy"]
    if rms < 0.01:
        flags.append("Very low RMS energy — may be compressed or artificially generated")
        suspicion_score += 1

    # Check 5 — MFCC delta (natural speech has higher deltas due to transitions)
    avg_delta = np.mean(np.abs(features["mfcc_delta"]))
    if avg_delta < 1.5:
        flags.append("Low MFCC delta — unnatural speech transitions consistent with TTS")
        suspicion_score += 2

    # Verdict
    if suspicion_score >= 6:
        verdict     = "SYNTHETIC"
        confidence  = min(0.95, 0.5 + suspicion_score * 0.05)
        label       = "AI-GENERATED VOICE"
        explanation = (
            "This audio shows characteristics consistent with AI-generated or deepfake voice. "
            + " ".join(flags)
        )
    elif suspicion_score >= 3:
        verdict     = "SUSPICIOUS"
        confidence  = 0.5 + suspicion_score * 0.03
        label       = "SUSPICIOUS AUDIO"
        explanation = (
            "Some characteristics suggest this may not be a natural human voice. "
            + " ".join(flags)
        )
    else:
        verdict     = "HUMAN"
        confidence  = max(0.6, 0.9 - suspicion_score * 0.05)
        label       = "LIKELY HUMAN VOICE"
        explanation = "Audio characteristics are consistent with a natural human voice recording."

    return {
        "verdict":          verdict,
        "display_verdict":  label,
        "confidence":       round(confidence, 4),
        "suspicion_score":  suspicion_score,
        "flags":            flags,
        "explanation":      explanation,
        "duration_seconds": features["duration_seconds"],
    }


def run(audio_bytes: bytes, filename: str = "") -> dict:
    """
    Full voice analysis pipeline.

    1. Extract MFCC + spectral features
    2. Run deepfake classifier
    3. Return structured verdict

    Args:
        audio_bytes: raw audio file bytes
        filename:    original filename

    Returns:
        Structured voice analysis result
    """
    if not audio_bytes:
        return {
            "verdict":         "ERROR",
            "display_verdict": "ERROR",
            "explanation":     "No audio file provided.",
            "action":          "Please upload a voice note to analyse.",
        }

    # Step 1 — Extract features
    features = _extract_features(audio_bytes, filename)

    if not features["success"]:
        return {
            "verdict":         "ERROR",
            "display_verdict": "ERROR",
            "explanation":     f"Could not process audio: {features['error']}",
            "action":          "Please upload a clear audio file (WAV, MP3, OGG, M4A).",
        }

    # Step 2 — Classify
    result = _classify_deepfake(features)

    action = (
        "Do NOT trust this voice call. Hang up and call your bank directly "
        "using the number on the back of your card or their official website."
        if result["verdict"] in ("SYNTHETIC", "SUSPICIOUS")
        else "Audio appears to be a natural human voice. "
             "Still verify the caller's identity by calling back on the official number."
    )

    return {
        "verdict":          result["verdict"],
        "display_verdict":  result["display_verdict"],
        "confidence":       result["confidence"],
        "suspicion_score":  result["suspicion_score"],
        "synthetic_flags":  result["flags"],
        "explanation":      result["explanation"],
        "action":           action,
        "duration_seconds": result["duration_seconds"],
        "model_version":    "v1-heuristic",
        "input_type":       "voice",
    }