/**
 * auth.js
 * -------
 * Supabase JWT verification middleware.
 * Attaches req.user if a valid token is present.
 * Does NOT block requests without a token — guests are allowed.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;    // guest request — allowed
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      req.user = null;
    } else {
      req.user = data.user;
    }
  } catch {
    req.user = null;
  }

  next();
}

module.exports = { authMiddleware, supabase };