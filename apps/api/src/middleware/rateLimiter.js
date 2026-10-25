/**
 * rateLimiter.js
 *
 * Rate limiters for sensitive endpoints.
 *
 * Uses express-rate-limit (in-memory store). For multi-instance deployments
 * replace the default store with a Redis-backed store such as rate-limit-redis.
 */

import rateLimit from "express-rate-limit";

/**
 * Auth endpoints: stricter limit to slow brute-force and DoS against the
 * challenge/verify flow. 20 requests per IP per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many authentication attempts. Try again later." },
  skipSuccessfulRequests: false
});

/**
 * Checkout pay/verify: allows more requests (customers polling verify).
 * 60 requests per IP per 5 minutes.
 */
export const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many checkout requests. Try again later." }
});

/**
 * General API limiter: applies to all other authenticated routes.
 * 200 requests per IP per minute.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests. Try again later." }
});
