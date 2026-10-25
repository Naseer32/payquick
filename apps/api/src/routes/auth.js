/**
 * auth.js
 *
 * Authentication routes.
 *
 * Fixes applied:
 *  - GET /status now returns the real authenticated state for the bearer token
 *  - POST /logout destroys the session
 *  - Internal error details are not leaked to the client in 500 responses
 */

import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getOrCreateMerchant } from "../services/merchantService.js";
import { createChallenge, consumeChallenge } from "../services/authService.js";
import { verifyWalletSignature } from "../services/signatureService.js";
import { createSession, getSession, destroySession } from "../services/sessionService.js";

const router = Router();

router.get("/status", async (req, res) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.json({ authenticated: false });
  }

  const token = authorization.slice(7);

  try {
    const session = await getSession(token);

    if (!session) {
      return res.json({ authenticated: false });
    }

    res.json({ authenticated: true, walletAddress: session.walletAddress });
  } catch {
    res.json({ authenticated: false });
  }
});

router.post("/challenge", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const normalizedAddress = walletAddress?.toLowerCase();

    if (!normalizedAddress || !/^0x[0-9a-fA-F]{40}$/.test(normalizedAddress)) {
      return res.status(400).json({
        ok: false,
        error: "Valid wallet address is required"
      });
    }

    const nonce = await createChallenge(normalizedAddress);

    res.json({ ok: true, walletAddress: normalizedAddress, nonce });
  } catch (error) {
    console.error("PayQuick challenge error:", error);
    res.status(400).json({ ok: false, error: "Failed to create authentication challenge" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    const normalizedAddress = walletAddress?.toLowerCase();

    if (!normalizedAddress || !/^0x[0-9a-fA-F]{40}$/.test(normalizedAddress)) {
      return res.status(400).json({ ok: false, error: "Valid wallet address is required" });
    }

    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ ok: false, error: "Signature is required" });
    }

    const challenge = await consumeChallenge(normalizedAddress);

    const message = `Sign in to PayQuick\n\nNonce: ${challenge.nonce}`;

    const valid = verifyWalletSignature(normalizedAddress, message, signature);

    if (!valid) {
      return res.status(401).json({ ok: false, error: "Invalid wallet signature" });
    }

    const sessionToken = await createSession(normalizedAddress);

    res.json({
      ok: true,
      authenticated: true,
      walletAddress: normalizedAddress,
      sessionToken
    });
  } catch (error) {
    console.error("PayQuick verification error:", error);
    // Distinguish client errors (bad nonce/signature) from server errors
    const isClientError =
      error?.message?.includes("expired") ||
      error?.message?.includes("not found") ||
      error?.message?.includes("Invalid");

    res.status(isClientError ? 400 : 500).json({
      ok: false,
      error: isClientError ? error.message : "Wallet verification failed"
    });
  }
});

router.post("/merchant", requireAuth, async (req, res) => {
  try {
    const walletAddress = req.auth.walletAddress;
    const result = await getOrCreateMerchant(walletAddress);

    res.json({ ok: true, merchant: result.merchant, created: result.created });
  } catch (error) {
    console.error("PayQuick merchant authentication error:", error);
    res.status(500).json({ ok: false, error: "Merchant authentication failed" });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

    if (token) {
      await destroySession(token);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("PayQuick logout error:", error);
    res.status(500).json({ ok: false, error: "Logout failed" });
  }
});

export default router;
