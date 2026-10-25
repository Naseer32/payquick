/**
 * authService.js
 *
 * Wallet-signature challenge/response authentication.
 *
 * Fix: consumeChallenge previously deleted the row before checking TTL,
 * meaning an expired challenge was silently consumed and could cause
 * confusing errors. Now we check TTL first, then delete atomically in one
 * query so there is no window for a second concurrent consume to succeed.
 */

import crypto from "node:crypto";
import { query } from "../db/database.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function createChallenge(walletAddress) {
  if (!walletAddress) {
    throw new Error("Wallet address is required");
  }

  const key = walletAddress.toLowerCase();
  const nonce = crypto.randomBytes(24).toString("hex");

  await query(
    `
      INSERT INTO auth_challenges (wallet_address, nonce, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (wallet_address)
      DO UPDATE SET
        nonce = EXCLUDED.nonce,
        created_at = NOW()
    `,
    [key, nonce]
  );

  return nonce;
}

export async function consumeChallenge(walletAddress) {
  const key = walletAddress?.toLowerCase();

  if (!key) {
    throw new Error("Wallet address is required");
  }

  // Delete and return in one atomic query.
  // We check that the challenge is not older than CHALLENGE_TTL_MS directly
  // in the WHERE clause so there is no TOCTOU window.
  const result = await query(
    `
      DELETE FROM auth_challenges
      WHERE wallet_address = $1
        AND created_at >= NOW() - ($2 || ' milliseconds')::INTERVAL
      RETURNING nonce, created_at
    `,
    [key, String(CHALLENGE_TTL_MS)]
  );

  if (result.rows.length === 0) {
    // Either never existed, already consumed, or expired.
    // Clean up any stale row just in case.
    await query(
      `DELETE FROM auth_challenges WHERE wallet_address = $1`,
      [key]
    );
    throw new Error("Authentication challenge expired or not found");
  }

  const challenge = result.rows[0];

  return {
    nonce: challenge.nonce,
    createdAt: new Date(challenge.created_at).getTime()
  };
}
