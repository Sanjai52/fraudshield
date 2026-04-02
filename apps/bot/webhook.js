require("dotenv").config();
const express   = require("express");
const fetch     = require("node-fetch");
const FormData  = require("form-data");
const twilio    = require("twilio");
const { formatVerdict, formatImageVerdict, isUrlOnly, welcomeMessage } = require("./formatter");

const app         = express();
const PORT        = process.env.PORT ?? 3002;
const RAILWAY_URL = process.env.RAILWAY_URL;
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const BOT_NUMBER  = process.env.TWILIO_WHATSAPP_NUMBER;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ── Per-user session (in-memory, resets on restart) ───────────
const sessions = new Map();

// ── Send WhatsApp reply ───────────────────────────────────────
async function reply(to, body) {
  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  await client.messages.create({ from: BOT_NUMBER, to, body });
}

// ── Call Railway AI engine — JSON payload ─────────────────────
async function callRailway(path, payload) {
  const res = await fetch(`${RAILWAY_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Railway responded ${res.status}`);
  return res.json();
}

// ── Download image from Twilio media URL ──────────────────────
// Twilio requires Basic Auth (SID:TOKEN) to download media
async function downloadTwilioMedia(mediaUrl) {
  const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Media download failed: ${res.status}`);
  const buffer      = await res.buffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return { buffer, contentType };
}

// ── Send image to Railway /analyse/image ──────────────────────
async function analyseImage(mediaUrl) {
  const { buffer, contentType } = await downloadTwilioMedia(mediaUrl);

  // Derive a sensible filename from content type
  const ext      = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
  const filename = `whatsapp_screenshot.${ext}`;

  const form = new FormData();
  form.append("file", buffer, { filename, contentType });

  const res = await fetch(`${RAILWAY_URL}/analyse/image`, {
    method:  "POST",
    body:    form,
    headers: form.getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Image analysis failed: ${res.status}`);
  }
  return res.json();
}

// ── Main webhook ──────────────────────────────────────────────
app.post("/whatsapp/webhook", async (req, res) => {
  res.sendStatus(200);   // always acknowledge Twilio immediately

  const from     = req.body.From;
  const body     = (req.body.Body ?? "").trim();
  const numMedia = parseInt(req.body.NumMedia ?? "0", 10);

  if (!from) return;

  // First contact → send welcome
  if (!sessions.has(from)) {
    sessions.set(from, { count: 0 });
    await reply(from, welcomeMessage());
    return;
  }

  const session = sessions.get(from);

  // Daily rate limit
  if (session.count >= 10) {
    await reply(from,
      "⚠️ Daily limit of 10 checks reached.\n\nVisit fraudshield.vercel.app for unlimited checks."
    );
    return;
  }

  session.count++;

  try {

    // ── CASE 1: Image sent ──────────────────────────────────
    if (numMedia > 0) {
      const mediaUrl         = req.body.MediaUrl0;
      const mediaContentType = req.body.MediaContentType0 ?? "";

      // Only handle images — ignore audio/video/documents for now
      if (!mediaContentType.startsWith("image/")) {
        await reply(from,
          "📎 I can only analyse *image screenshots* right now.\n\n" +
          "For voice scams, please transcribe the message and paste it as text."
        );
        return;
      }

      // Let user know we're processing (images take a few seconds for OCR)
      await reply(from, "🔍 Scanning your screenshot...");

      const result = await analyseImage(mediaUrl);
      await reply(from, formatImageVerdict(result));
      return;
    }

    // ── CASE 2: URL only ────────────────────────────────────
    if (isUrlOnly(body)) {
      const result = await callRailway("/analyse/url", { url: body });
      await reply(from, formatVerdict(result));
      return;
    }

    // ── CASE 3: Text message ────────────────────────────────
    if (!body) {
      await reply(from,
        "📝 Please send:\n• A suspicious SMS or message\n• A suspicious link\n• A screenshot of a suspicious message"
      );
      return;
    }

    const result = await callRailway("/analyse/text", { message: body, lang: "en" });
    await reply(from, formatVerdict(result));

  } catch (err) {
    console.error("[bot error]", err.message);
    await reply(from, "❌ Analysis failed. Please try again in a moment.\n\n🚨 If urgent: call *1930*");
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "fraudshield-bot" }));

app.listen(PORT, () => {
  console.log(`\n🛡️  FraudShield WhatsApp Bot`);
  console.log(`   Port     : ${PORT}`);
  console.log(`   Railway  : ${RAILWAY_URL}`);
  console.log(`   Number   : ${BOT_NUMBER}\n`);
});