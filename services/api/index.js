/**
 * index.js
 * --------
 * FraudShield — Node.js + Express.js API Gateway
 *
 * Sits between Next.js frontend and Python FastAPI backend.
 * Handles: PII stripping, rate limiting, auth, Supabase persistence.
 *
 * Run:
 *   cd fraudshield/services/api
 *   npm install
 *   node index.js   (or: npm run dev)
 */

const express    = require("express");
const cors       = require("cors");
const fetch      = require("node-fetch");
require("dotenv").config();

const { piiStripMiddleware }    = require("./middleware/piiStrip");
const { guestLimiter, authLimiter } = require("./middleware/rateLimit");
const { authMiddleware }        = require("./middleware/auth");
const analyseRoutes             = require("./routes/analyse");
const statsRoutes               = require("./routes/stats");
const feedbackRoutes            = require("./routes/feedback");

const app  = express();
const PORT = process.env.PORT ?? 3001;
const AI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";
const CHATBOT_URL = process.env.CHATBOT_URL ?? "http://localhost:8001";

// ── Global middleware ─────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    process.env.FRONTEND_URL ?? "https://your-app.vercel.app",
  ],
  credentials: true,
}));

app.use(express.json({ limit: "2mb" }));
app.use(authMiddleware);         // attach req.user if token present
app.use(piiStripMiddleware);     // strip PII from all request bodies

// ── Rate limiting ─────────────────────────────────────────────
app.use("/analyse", guestLimiter);
app.use("/analyse", authLimiter);

// ── Routes ────────────────────────────────────────────────────
app.use("/analyse",  analyseRoutes);
app.use("/stats",    statsRoutes);
app.use("/feedback", feedbackRoutes);

// ── Proxy remaining AI endpoints ──────────────────────────────
// sender-ids, health — proxy directly, no auth/rate-limit needed
app.get("/sender-ids/:bank", async (req, res) => {
  try {
    const r = await fetch(`${AI_URL}/sender-ids/${req.params.bank}`);
    const d = await r.json();
    return res.json(d);
  } catch (err) {
    return res.status(502).json({ error: "AI service unavailable" });
  }
});

app.get("/health", async (req, res) => {
  try {
    const r = await fetch(`${AI_URL}/health`);
    const d = await r.json();
    return res.json({ ...d, gateway: "ok", port: PORT });
  } catch {
    return res.status(502).json({ gateway: "ok", ai: "unavailable", port: PORT });
  }
});

// ── Chatbot proxy → port 8001 ────────────────────────────────
// Frontend calls /chat/* through this gateway in production.
// In dev, ChatBot.tsx can call 8001 directly (NEXT_PUBLIC_CHATBOT_URL).


app.all("/chat/new", async (req, res) => {
  try {
    const r = await fetch(`${CHATBOT_URL}/chat/new`, {
      method:  "POST",
      headers: buildChatHeaders(req),
    });
    return res.status(r.status).json(await r.json());
  } catch { return res.status(502).json({ error: "Chatbot unavailable" }); }
});

app.get("/chats", async (req, res) => {
  try {
    const r = await fetch(`${CHATBOT_URL}/chats`, { headers: buildChatHeaders(req) });
    return res.status(r.status).json(await r.json());
  } catch { return res.status(502).json({ error: "Chatbot unavailable" }); }
});

app.get("/chat/:id", async (req, res) => {
  try {
    const r = await fetch(`${CHATBOT_URL}/chat/${req.params.id}`, { headers: buildChatHeaders(req) });
    return res.status(r.status).json(await r.json());
  } catch { return res.status(502).json({ error: "Chatbot unavailable" }); }
});

app.delete("/chat/:id", async (req, res) => {
  try {
    const r = await fetch(`${CHATBOT_URL}/chat/${req.params.id}`, {
      method: "DELETE", headers: buildChatHeaders(req),
    });
    return res.status(r.status).json(await r.json());
  } catch { return res.status(502).json({ error: "Chatbot unavailable" }); }
});

app.delete("/chats", async (req, res) => {
  try {
    const r = await fetch(`${CHATBOT_URL}/chats`, {
      method: "DELETE", headers: buildChatHeaders(req),
    });
    return res.status(r.status).json(await r.json());
  } catch { return res.status(502).json({ error: "Chatbot unavailable" }); }
});

app.post("/chat", async (req, res) => {
  try {
    const r = await fetch(`${CHATBOT_URL}/chat`, {
      method:  "POST",
      headers: { ...buildChatHeaders(req), "Content-Type": "application/json" },
      body:    JSON.stringify(req.body),
    });
    return res.status(r.status).json(await r.json());
  } catch { return res.status(502).json({ error: "Chatbot unavailable" }); }
});

function buildChatHeaders(req) {
  const h = {};
  if (req.headers.authorization) h["Authorization"] = req.headers.authorization;
  return h;
}
// ── End chatbot proxy ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ service: "FraudShield API Gateway", version: "1.0.0", status: "ok" });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛡️  FraudShield API Gateway`);
  console.log(`   Running on  http://localhost:${PORT}`);
  console.log(`   FastAPI at  ${AI_URL}`);
  console.log(`   Env         ${process.env.NODE_ENV ?? "development"}\n`);
});
