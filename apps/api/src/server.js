/**
 * server.js
 *
 * Security hardening applied:
 *  - CORS restricted to allowed origins (CORS_ORIGINS env var, comma-separated)
 *  - express.json() limited to 64 KB to prevent JSON body DoS
 *  - Global error handler that never leaks stack traces to clients
 *  - Pool-level error handler so uncaught idle-client errors don't crash Node
 *  - Expired session cleanup on startup
 */

import express from "express";
import cors from "cors";
import pool from "./db/database.js";
import { purgeExpiredSessions } from "./services/sessionService.js";
import { authLimiter, checkoutLimiter, apiLimiter } from "./middleware/rateLimiter.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import invoicesRouter from "./routes/invoices.js";
import checkoutRouter from "./routes/checkout.js";
import customersRouter from "./routes/customers.js";
import paymentsRouter from "./routes/payments.js";
import notificationsRouter from "./routes/notifications.js";
import apiKeysRouter from "./routes/apiKeys.js";

const app = express();

// Trust Render's reverse proxy so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 4000;

// ── CORS ────────────────────────────────────────────────────────────────────
// Default allows the Vercel deployment and localhost dev. Set CORS_ORIGINS in
// production to lock this down to your exact frontend domain(s).
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// When no CORS_ORIGINS env var is set (e.g. in local dev), allow all origins.
// In production you MUST set CORS_ORIGINS.
app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin: (origin, callback) => {
            // Allow server-to-server requests (no origin header)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
          },
          credentials: true
        }
      : undefined // no restriction in dev
  )
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "64kb" }));

// ── Database pool error handler ──────────────────────────────────────────────
// Prevents uncaught errors from idle clients crashing the process.
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/invoices", apiLimiter, invoicesRouter);
app.use("/api/checkout", checkoutLimiter, checkoutRouter);
app.use("/api/customers", apiLimiter, customersRouter);
app.use("/api/payments", apiLimiter, paymentsRouter);
app.use("/api/notifications", apiLimiter, notificationsRouter);
app.use("/api/keys", apiLimiter, apiKeysRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Express 5 passes async route errors here automatically.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled route error:", err);
  res.status(500).json({ ok: false, error: "An unexpected error occurred" });
});

// ── Startup ──────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`PayQuick API running on port ${PORT}`);

  // Clean up any sessions that expired while the server was offline
  try {
    await purgeExpiredSessions();
    console.log("Expired sessions purged");
  } catch (err) {
    console.error("Failed to purge expired sessions on startup:", err.message);
  }
});

export default app;
