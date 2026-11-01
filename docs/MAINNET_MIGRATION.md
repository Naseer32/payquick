# PayQuick — Mainnet Migration Guide

## Deployed Mainnet Contracts

| Contract | Address | Chain |
|---|---|---|
| PaymentTracker | `0xe9917809eEaDc1Cc7426bD8F0f4b7a68004C3fC5` | Arc Mainnet (5042) |

Deployer: `0xd1332CD4492a90C102420fFBABC533998aa2a0Fb`
Deploy tx: `0xe5f44c82987cd99d32cb5a80a0e5031a503337055fb0fa3cf745f99191fc0ae3`
Deployed: 2026-11-01

---

This document covers everything required to move PayQuick from Arc Testnet to
Arc Mainnet. Work through each section in order. Do not skip the pre-flight
checklist — real funds are at stake once mainnet is live.

---

## Pre-flight checklist

Complete every item before changing any environment variable to `mainnet`.

### Security and code

- [ ] All audit findings from `docs/AUDIT.md` are resolved and deployed
- [ ] Authentication, session persistence, and rate limiting are live and verified
- [ ] On-chain payment verification (recipient, amount, chain ID) is live
- [ ] RLS is enabled on all Supabase tables
- [ ] `CORS_ORIGINS` is set to the exact production frontend URL (no wildcards)
- [ ] `SESSION_SECRET` is a cryptographically random 32-byte hex value
- [ ] No secrets, private keys, or contract addresses are committed to the repo
- [ ] `.env` and `.env.*` are in `.gitignore`

### Testing

- [ ] 57/57 unit and auth tests pass (`bun run --cwd apps/api test`)
- [ ] End-to-end payment flow tested on Arc Testnet with a real wallet
- [ ] Invoice creation, checkout, on-chain payment, and confirmation all work
- [ ] Logout, session expiry, and re-login all work correctly
- [ ] Withdrawal flow (Settings page) tested with a real testnet transfer
- [ ] Wallet balance displays the correct amount after the decimal fix

### Independent review

- [ ] A security professional has reviewed the payment verification logic in
      `apps/api/src/routes/checkout.js` — specifically that recipient, amount,
      chain ID, and tx receipt are all verified server-side against the invoice
- [ ] The PaymentTracker contract (if used) has been independently audited
- [ ] All wallet addresses, contract addresses, and chain IDs have been
      double-checked by a second person

### Infrastructure

- [ ] Production database backups are configured and tested
- [ ] Render service is on a paid plan (free instances sleep and may drop
      payment verification webhooks)
- [ ] Vercel deployment is on a plan that supports your expected traffic
- [ ] Database connection pooling is configured for expected concurrent load
- [ ] Error alerting (e.g. Sentry, Render alerts) is set up

---

## Environment variables to change

Set these in the **Render** dashboard for the API service:

| Variable | Testnet value | Mainnet value |
|---|---|---|
| `ARC_NETWORK` | `testnet` | `mainnet` |
| `ARC_MAINNET_RPC_URL` | (not needed) | `https://rpc.mainnet.arc.io` |
| `PAYMENT_TRACKER_ADDRESS_MAINNET` | (not needed) | Your mainnet contract address |
| `CORS_ORIGINS` | `https://payquick-v2.vercel.app` | Your production Vercel URL |

Set these in the **Vercel** dashboard for the frontend:

| Variable | Testnet value | Mainnet value |
|---|---|---|
| `VITE_ARC_NETWORK` | `testnet` | `mainnet` |
| `VITE_API_URL` | `https://payquick-v2.onrender.com` | Your new Render service URL |

Both `ARC_NETWORK` and `VITE_ARC_NETWORK` must match. A mismatch causes the
frontend to prompt for the wrong chain and the API to reject valid transactions.

---

## Chain facts (for reference)

| | Arc Testnet | Arc Mainnet |
|---|---|---|
| Chain ID | 5042002 (`0x4cef52`) | 5042 (`0x13b2`) |
| RPC | `https://rpc.testnet.arc.io` | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.testnet.arc.io` | `https://explorer.arc.io` |
| USDC contract | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |
| USDC decimals (ERC-20) | 6 | 6 |
| Native wei decimals (eth_getBalance) | 18 | 18 |
| CCTP domain | 26 | 26 |

---

## Database migration

No schema changes are required to move from testnet to mainnet. The database
stores invoice amounts as `NUMERIC(30, 6)` and records the chain ID in
`payment_events.payload` — both are network-agnostic.

Before going live on mainnet:

1. Take a full database backup
2. Verify all existing testnet data is clearly marked as testnet in your records
3. Consider running a separate production database instance to keep testnet and
   mainnet data separate — this prevents accidental cross-contamination and
   simplifies compliance

---

## Deployment steps

Follow this order exactly. Do not update the frontend before the API is live.

### Step 1 — Deploy the PaymentTracker contract on Arc Mainnet (if using contract mode)

If you are using the PaymentTracker contract for enhanced payment verification:

1. Review the contract source in `contracts/` with a qualified auditor
2. Deploy to Arc Mainnet using your own wallet and deployment tooling
3. Note the deployed contract address and the `PaymentSent` event topic hash
4. Do not proceed to Step 2 until the contract is deployed and verified

### Step 2 — Update Render (API)

1. Go to your Render service dashboard
2. Under **Environment**, add or update:
   - `ARC_NETWORK=mainnet`
   - `ARC_MAINNET_RPC_URL=https://rpc.mainnet.arc.io`
   - `PAYMENT_TRACKER_ADDRESS_MAINNET=<your contract address>` (if using)
   - `PAYMENT_SENT_TOPIC=<event topic>` (if using)
   - `CORS_ORIGINS=<your production Vercel URL>`
3. Trigger a manual deploy
4. Verify the health endpoint: `GET /api/health` should return `"network": "Arc Mainnet"`
5. Verify `/api/auth/challenge` still works (sends a 200 with a nonce)

### Step 3 — Update Vercel (frontend)

Only proceed after Step 2 is confirmed working.

1. Go to your Vercel project settings → **Environment Variables**
2. Update:
   - `VITE_ARC_NETWORK=mainnet`
   - `VITE_API_URL=<your Render service URL>`
3. Trigger a redeploy (Vercel requires a new deployment to pick up env var changes)
4. Open the live URL in a browser and confirm:
   - The wallet connect prompt asks for Arc (chain ID 5042), not Arc Testnet
   - A real wallet with Arc Mainnet USDC can connect and see its balance
   - Invoice creation works end-to-end

### Step 4 — Smoke test with a real payment

1. Create a test invoice for a small amount (e.g. 0.01 USDC)
2. Pay it from a real Arc Mainnet wallet
3. Confirm the invoice status changes to "paid" in the dashboard
4. Check the payment record shows the correct amount, tx hash, and payer address
5. Verify the on-chain tx on `https://explorer.arc.io`

### Step 5 — Monitor

For the first 48 hours after mainnet launch:

- Watch Render logs for any verification errors or 500 responses
- Watch the database for any payments stuck in `pending` state
- Confirm the Supabase dashboard shows no unexpected direct table access
- Keep testnet credentials available so you can roll back quickly if needed

---

## Rollback

To roll back to testnet at any time:

1. Render: set `ARC_NETWORK=testnet` and redeploy
2. Vercel: set `VITE_ARC_NETWORK=testnet` and redeploy
3. Both revert instantly — no database changes needed

---

## What this migration does NOT cover

- Migrating existing testnet payment records to mainnet (testnet USDC has no
  real-world value; mainnet is a clean start)
- KYC/AML compliance requirements for your jurisdiction
- Tax reporting for USDC payments received
- PCI-DSS or SOC 2 compliance
- Insurance or liability for lost or misdirected funds

These are your responsibility as the operator of a payment platform handling
real funds. Consult a legal and compliance professional before going live.
