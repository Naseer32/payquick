/**
 * sessionService.js
 *
 * Sessions are stored in the database so they survive API restarts and scale
 * across multiple instances. The schema already has a `sessions` table with
 * token, wallet_address, created_at, and expires_at columns.
 */

import crypto from "node:crypto";
import { query } from "../db/database.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createSession(walletAddress) {
  if (!walletAddress) {
    throw new Error("Wallet address is required");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await query(
    `
      INSERT INTO sessions (token, wallet_address, created_at, expires_at)
      VALUES ($1, $2, NOW(), $3)
    `,
    [token, walletAddress.toLowerCase(), expiresAt]
  );

  return token;
}

export async function getSession(token) {
  if (!token) {
    return null;
  }

  const result = await query(
    `
      SELECT wallet_address, expires_at
      FROM sessions
      WHERE token = $1
        AND expires_at > NOW()
      LIMIT 1
    `,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    walletAddress: result.rows[0].wallet_address
  };
}

export async function destroySession(token) {
  if (!token) return;

  await query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

/**
 * Housekeeping: remove expired sessions. Call periodically (e.g. on startup
 * or via a scheduled job). Safe to call at any time.
 */
export async function purgeExpiredSessions() {
  await query(`DELETE FROM sessions WHERE expires_at <= NOW()`);
}
