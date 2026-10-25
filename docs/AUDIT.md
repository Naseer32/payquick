# PayQuick V2 — Security, Reliability & Production-Readiness Audit

**Date:** October 2026  
**Scope:** Full codebase — API, database, authentication, blockchain integration, frontend, deployment config  
**Status:** All critical and high-severity issues fixed. Medium issues fixed. Remaining items are deployment/operational tasks.

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 5     | 5     | 0         |
| High     | 5     | 5     | 0         |
| Medium   | 6     | 6     | 0         |
| Low/Info | 4     | 2     | 2 (operational) |

**Tests:** 20/20 pass (`node --test src/test/**/*.test.js`)

---

## Critical Issues (Fixed)

### C1 — In-memory session store lost on restart
**File:** `apps/api/src/services/sessionService.js`  
**Risk:** Every API restart logs out all users. On serverless (Render, Vercel, Railway) this happens on every cold start, making the app unusable. No cross-instance sharing.  
**Fix:** Sessions now stored in the PostgreSQL `sessions` table (which already existed in the schema). TTL extended to 24 hours. `purgeExpiredSessions()` called on startup.

### C2 — No on-chain verification of payment amount, recipient, or token
**File:** `apps/api/src/routes/checkout.js` (POST `/:token/verify`)  
**Risk:** Anyone who submits any transaction hash to `POST /checkout/:token/pay` followed by `POST /checkout/:token/verify` could forge a payment confirmation. The old code fetched a receipt and checked only `receipt.status === "0x1"` — it never verified the recipient matched the merchant, the amount matched the invoice, or the contract was the PaymentTracker.  
**Fix:** `verifyOnChain()` now enforces: (1) receipt exists and status is `0x1`, (2) chain ID matches Arc Testnet, (3) if PaymentTracker is configured, the `receipt.to` must be the contract and the `PaymentSent` log must be present with the correct recipient encoded in `topics[1]`, (4) if no contract (direct transfer fallback), `tx.to` must match the merchant address and the value must match the invoice amount within 1 unit.

### C3 — Decimal mismatch: 10^12 payment amount error
**File:** `apps/web/src/pages/Checkout.jsx`, `apps/web/src/services/blockchain.js`  
**Risk:** Arc Testnet native currency (USDC) has **6 decimals**. Both `Checkout.jsx` and `blockchain.js` used `ethers.parseUnits(amount, 18)` / a hardcoded `decimals = 18`. For a 25 USDC invoice this would attempt to send `25,000,000,000,000,000,000` base units — 10^12 times the correct amount. Any real-money transaction with this bug would drain a wallet instantly.  
**Fix:** Both files now use `ARC_NATIVE_DECIMALS = 6` explicitly. A test confirms the 10^12 magnitude difference.

### C4 — Wrong Arc Testnet RPC URL
**File:** `apps/api/src/routes/checkout.js` (old), `apps/web/src/services/blockchain.js`  
**Risk:** The old code used `https://rpc.testnet.arc.network`. The correct canonical endpoint is `https://rpc.arc.testnet`. Mismatched RPC means transaction receipts are fetched from the wrong node, and `eth_chainId` may return a different value — undermining the chain-ID verification in C2.  
**Fix:** Correct URL used as default, overridable via `ARC_TESTNET_RPC_URL` environment variable.

### C5 — Race condition: no DB transaction in verify endpoint
**File:** `apps/api/src/routes/checkout.js` (POST `/:token/verify`)  
**Risk:** Two simultaneous verify calls for the same invoice could both pass the status check (`status = 'pending'`) and both mark the invoice `paid`, creating duplicate payment confirmations and duplicate notifications.  
**Fix:** The verify handler now opens a PostgreSQL transaction with `FOR UPDATE` on the invoice row. Concurrent calls serialize correctly.

---

## High Severity Issues (Fixed)

### H1 — No rate limiting on authentication endpoints
**File:** `apps/api/src/server.js`, `apps/api/src/middleware/rateLimiter.js` (new)  
**Risk:** The challenge/verify flow had no rate limit, enabling brute-force nonce enumeration and DoS against the database.  
**Fix:** `express-rate-limit` added. Auth routes: 20 req/IP/15 min. Checkout routes: 60 req/IP/5 min. Other API routes: 200 req/IP/min.

### H2 — Wildcard CORS
**File:** `apps/api/src/server.js`  
**Risk:** `cors()` with no options allows any origin to call the API with credentials. An attacker can make cross-origin requests from any website on behalf of a logged-in merchant.  
**Fix:** CORS restricted to origins listed in `CORS_ORIGINS` environment variable (comma-separated). Falls back to permissive in local dev when env var is absent. **Action required:** set `CORS_ORIGINS` in production.

### H3 — Challenge TOCTOU: deleted before TTL checked
**File:** `apps/api/src/services/authService.js`  
**Risk:** `consumeChallenge()` deleted the nonce row, then checked TTL. If the TTL check threw after deletion, the challenge was silently consumed with no error returned to the client. Also, two concurrent verify requests could both "consume" the same challenge.  
**Fix:** Single atomic `DELETE … WHERE created_at >= NOW() - interval RETURNING` query. One query both deletes and checks expiry atomically. No TOCTOU window.

### H4 — tx_hash duplicate payment not prevented at DB level
**File:** `apps/api/src/routes/checkout.js` (POST `/:token/pay`)  
**Risk:** The `payments` table has `tx_hash TEXT NOT NULL UNIQUE` but the INSERT had no conflict handling. A duplicate submission would crash with a `23505` constraint error returned raw to the client. More seriously, an attacker could submit the same tx_hash against multiple invoices and trigger a race where one payment record survives.  
**Fix:** INSERT now uses `ON CONFLICT (tx_hash) DO NOTHING RETURNING id`. If no row is returned, the existing payment is looked up and returned to the client with `duplicate: true`.

### H5 — Notification dedup used body-text matching
**File:** `apps/api/src/routes/checkout.js` (POST `/:token/verify`)  
**Risk:** The notification dedup guard used `AND n.body = $2` which could match notifications from different payments with identical amounts. A merchant receiving two payments of the same amount would only get one notification.  
**Fix:** Dedup now checks by `payment_id` via a join on `payment_events`.

---

## Medium Severity Issues (Fixed)

### M1 — Input validation: wallet address not validated on challenge
**File:** `apps/api/src/routes/auth.js`  
**Fix:** `walletAddress` validated against `/^0x[0-9a-fA-F]{40}$/` before creating a challenge. Same pattern applied to signature verify. txHash and payerAddress validated with regex in `POST /checkout/:token/pay`.

### M2 — GET /auth/status always returned `{ authenticated: false }`
**File:** `apps/api/src/routes/auth.js`  
**Risk:** The status endpoint was hardcoded to return unauthenticated. The frontend called `POST /auth/merchant` for session restore instead, which was a semantic misuse.  
**Fix:** Status endpoint now reads the Bearer token and returns the real session state.

### M3 — Internal errors leaked in responses
**File:** Multiple route files  
**Risk:** Error objects including DB error codes, stack traces (`error?.code`, `String(error)`) were sent in 500 responses. This leaks schema information.  
**Fix:** All 500 handlers now return a generic message. Internal detail is only logged server-side.

### M4 — console.log leaking API URLs and wallet data
**File:** `apps/web/src/services/api.js`, `apps/web/src/services/auth.js`  
**Risk:** Every API request logged the full URL and wallet address to the browser console, exposing them in any screen-share or developer-tools capture.  
**Fix:** Request/response `console.log` removed from `api.js`. Auth flow debug logs removed from `auth.js`. Only `console.error` remains for unexpected failures.

### M5 — Database pool had no error handler
**File:** `apps/api/src/db/database.js`, `apps/api/src/server.js`  
**Risk:** An unhandled `error` event on an idle pg client crashes the Node process.  
**Fix:** `pool.on("error", ...)` registered in `server.js` on startup. Pool now has `connectionTimeoutMillis` and `idleTimeoutMillis` to prevent hung connections.

### M6 — blockchain.js getNativeBalance used 18 decimals
**File:** `apps/web/src/services/blockchain.js`  
**Risk:** Balance display was 10^12 times too small.  
**Fix:** `ARC_NATIVE_DECIMALS = 6` constant used throughout. `sendNativeTransfer` also corrected.

---

## Low Severity / Informational

### L1 — `auth_challenges` table missing from original schema.sql
**Status: Fixed.** The `authService.js` depended on an `auth_challenges` table that was never in `schema.sql`. A fresh database deployment would fail with a relation-not-found error on the first `/auth/challenge` request.  
**Fix:** Table added to `schema.sql` and `database/migrations/001_add_missing_schema.sql`.

### L2 — Missing database indexes
**Status: Fixed.** `invoices`, `payments`, `payment_events`, `notifications`, `customers`, and `api_keys` tables lacked indexes on their most-queried foreign keys and filter columns. Every merchant dashboard load was a full table scan.  
**Fix:** 13 indexes added in schema and migration.

### L3 — No `PAYMENT_TRACKER_ADDRESS` or `PAYMENT_SENT_TOPIC` documented
**Status: Operational task.** The PaymentTracker contract at `0xd0c5...` is hardcoded in `Checkout.jsx`. Until `VITE_PAYMENT_TRACKER_ADDRESS` is set, the frontend uses a hardcoded address. The API cannot verify contract-mode payments until `PAYMENT_TRACKER_ADDRESS` and `PAYMENT_SENT_TOPIC` are set.  
**Action required:** Deploy or verify the PaymentTracker contract, compute the `PaymentSent` topic hash, and set both env vars.

### L4 — No `CORS_ORIGINS` set in production
**Status: Operational task.** See H2.  
**Action required:** Set `CORS_ORIGINS=https://payquick-v2.vercel.app` (or your domain) in the API's production environment variables.

---

## Required Environment Variables

### API (`apps/api`)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | API server port (default: 4000) |
| `CORS_ORIGINS` | **Yes in production** | Comma-separated allowed origins |
| `ARC_TESTNET_RPC_URL` | No | Arc Testnet JSON-RPC URL (default: `https://rpc.arc.testnet`) |
| `PAYMENT_TRACKER_ADDRESS` | No* | PaymentTracker contract address; enables contract-mode verification |
| `PAYMENT_SENT_TOPIC` | No* | keccak256 topic of `PaymentSent` event; required with `PAYMENT_TRACKER_ADDRESS` |
| `PG_POOL_MAX` | No | Max DB pool size (default: 10) |

*Required together for contract-mode verification. Without them, fallback to direct-transfer verification is used.

### Frontend (`apps/web`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | API base URL (default: `https://payquick-v2.onrender.com`) |
| `VITE_PAYMENT_TRACKER_ADDRESS` | No | PaymentTracker contract address |
| `VITE_ARC_TESTNET_RPC_URL` | No | Arc Testnet RPC URL for wallet chain config |

---

## Deployment Steps (Apply to existing deployment)

1. **Run migration** against your production database:
   ```sql
   -- Run database/migrations/001_add_missing_schema.sql
   ```

2. **Set environment variables** in your API hosting (Render, Railway, etc.):
   - `CORS_ORIGINS=https://payquick-v2.vercel.app`
   - `ARC_TESTNET_RPC_URL=https://rpc.arc.testnet`
   - `PAYMENT_TRACKER_ADDRESS=<address>` (when contract is deployed)
   - `PAYMENT_SENT_TOPIC=<keccak256 topic>` (when contract is deployed)

3. **Redeploy the API** after setting env vars (required for session persistence and rate limiting to activate).

4. **Redeploy the frontend** after setting `VITE_PAYMENT_TRACKER_ADDRESS` if the contract is now deployed.

---

## Production Readiness Assessment

PayQuick V2 is **not yet ready for mainnet or real funds.** The following remain before a production launch is responsible:

1. **Contract verification:** The PaymentTracker contract at the hardcoded address has not been verified or audited in this engagement. Its ABI and event signature must be confirmed before enabling contract-mode verification.
2. **Rate limiter scaling:** The current `express-rate-limit` store is in-memory. With multiple API instances, replace it with a Redis-backed store (e.g. `rate-limit-redis`).
3. **Session secret rotation strategy:** Sessions use random tokens stored in Postgres. A compromised DB exposes all session tokens. Consider adding a HMAC or rotating token generation for defence-in-depth.
4. **No TLS termination at the API:** Ensure the API is behind a TLS-terminating proxy (Render and Railway do this automatically; confirm it is enforced).
5. **No webhook delivery or retry:** The notifications system stores in-DB but has no outbound webhook. Merchants cannot subscribe to payment events externally.
6. **No idempotency key on invoice creation:** Rapid double-clicks can create duplicate invoices. Add a client-supplied idempotency key unique per merchant.
7. **Mainnet readiness:** The codebase is currently Arc Testnet only by design. A separate mainnet configuration, audited contracts, and security review are required before handling real funds.

For the Arc Testnet use case the system is now architecturally sound and all critical vulnerabilities have been remediated.
