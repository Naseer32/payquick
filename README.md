# PayQuick

**USDC payment platform for merchants on Arc Mainnet.**

Merchants connect their wallet, create invoices, and share checkout links. Customers pay in native USDC. PayQuick verifies the payment against a deployed smart contract on-chain and marks the invoice as Paid instantly. Both parties get a receipt with the payer address, merchant address, and a link to the transaction on the Arc explorer.

**Live:** https://payquick-v2.vercel.app
**Contract:** [`0xe9917809eEaDc1Cc7426bD8F0f4b7a68004C3fC5`](https://explorer.arc.io/address/0xe9917809eEaDc1Cc7426bD8F0f4b7a68004C3fC5) on Arc Mainnet

---

## Features

- Invoice creation and management
- Shareable checkout links — no account required for customers
- On-chain USDC payment verification via PaymentTracker smart contract
- Real-time receipts showing paid-by address, paid-to address, and transaction hash
- Payment history, customer records, and merchant dashboard
- Full security audit — authentication hardening, session persistence, rate limiting, RLS on all database tables

## Tech stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity, Arc Mainnet (chain ID 5042) |
| Backend API | Node.js, Express, PostgreSQL |
| Frontend | React, Vite, ethers.js |
| Database | Supabase (PostgreSQL, RLS enabled) |
| Hosting | Vercel (frontend), Render (API) |
| Blockchain | Arc Mainnet — native USDC as gas |

## Project structure

```
apps/
  web/        React + Vite merchant dashboard and checkout page
  api/        Node.js + Express API and on-chain verification
packages/
  shared/     Status constants and network definitions
contracts/    PaymentTracker.sol — written, audited, and deployed via Arc Studio
database/     PostgreSQL schema and migrations
docs/         Security audit report and mainnet migration guide
```

## Development

### Prerequisites

- Node.js 20+
- npm (monorepo root) or bun (per-workspace)
- PostgreSQL database (Supabase, Neon, Render Postgres, or local)

### Install

```bash
npm install
```

### Environment variables

Copy `.env.example` and fill in the values:

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | Vercel | URL of the deployed API |
| `VITE_ARC_NETWORK` | Vercel | `testnet` or `mainnet` |
| `ARC_NETWORK` | Render | `testnet` or `mainnet` — must match frontend |
| `DATABASE_URL` | Render | PostgreSQL connection string |
| `CORS_ORIGINS` | Render | Comma-separated allowed frontend origins |
| `SESSION_SECRET` | Render | 32-byte hex secret for session tokens |
| `ARC_MAINNET_RPC_URL` | Render | Arc Mainnet RPC — required when `ARC_NETWORK=mainnet` |
| `PAYMENT_TRACKER_ADDRESS_MAINNET` | Render | Mainnet contract address |
| `PAYMENT_TRACKER_ADDRESS_TESTNET` | Render | Testnet contract address |

See `.env.example` for the full list.

### Run locally

```bash
# API (port 4000)
npm run --workspace=apps/api dev

# Frontend (port 5173)
npm run --workspace=apps/web dev
```

### Test

```bash
npm run --workspace=apps/api test
```

### Build

```bash
npm run --workspace=apps/web build
```

## Deployment

| Service | Platform | Trigger |
|---|---|---|
| Frontend | Vercel | Auto-deploy on push to `main` |
| API | Render | Auto-deploy on push to `main` |
| Database | Supabase | Manual migration via SQL Editor |

After deploying, run any new files from `database/migrations/` in the Supabase SQL Editor.

## Smart contracts

| Contract | Network | Address |
|---|---|---|
| PaymentTracker | Arc Mainnet | [`0xe9917809eEaDc1Cc7426bD8F0f4b7a68004C3fC5`](https://explorer.arc.io/address/0xe9917809eEaDc1Cc7426bD8F0f4b7a68004C3fC5) |
| PaymentTracker | Arc Testnet | [`0xd0c5f3e9570CcA0E9913522905b164304A692166`](https://explorer.testnet.arc.io/address/0xd0c5f3e9570CcA0E9913522905b164304A692166) |

The PaymentTracker contract accepts native USDC payments, forwards the full amount to the merchant wallet, and emits a `PaymentSent` event. The API verifies this event before marking an invoice as Paid. The contract is fully permissionless and immutable — no owner, no admin, no upgradability.

See `docs/AUDIT.md` for the full security review and `docs/MAINNET_MIGRATION.md` for the mainnet setup guide.

## Network configuration

PayQuick is network-agnostic. Set `VITE_ARC_NETWORK=mainnet` on Vercel and `ARC_NETWORK=mainnet` on Render to run on Arc Mainnet. Both must match. The default is `testnet`.

## Security

- All database tables have Row Level Security enabled on Supabase
- Sessions are stored in PostgreSQL and survive API restarts
- Every payment is verified on-chain: recipient address, amount, and invoice number must all match
- Rate limiting on all API routes, strict limits on authentication endpoints
- CORS restricted to the exact frontend origin
- Full audit report: `docs/AUDIT.md`

---

Built with [Arc Studio](https://studio.arc.io) by [Nasiru Uba](https://github.com/Naseer32).
