# PayQuick

A USDC stablecoin payment platform built on Arc. Merchants create invoices, customers pay with their wallet, and PayQuick verifies the payment on-chain and updates the invoice instantly.

## Structure

- `apps/web` — React + Vite merchant dashboard and public checkout page
- `apps/api` — Node.js + Express payment API and on-chain verification service
- `packages/shared` — shared status constants and network definitions
- `contracts` — PaymentTracker contract ABI and deployment notes
- `database` — PostgreSQL schema and migrations
- `docs` — architecture docs and the mainnet migration guide

## Development

### Prerequisites

- Node.js 20+
- Bun (package manager)
- PostgreSQL database (Supabase, Neon, Render Postgres, or local)

### Install

```bash
bun install
```

### Environment variables

Copy `.env.example` to `.env` in the repo root and fill in the values. Key variables:

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | Vercel | URL of the deployed API |
| `VITE_ARC_NETWORK` | Vercel | `testnet` or `mainnet` |
| `ARC_NETWORK` | Render | `testnet` or `mainnet` — must match frontend |
| `DATABASE_URL` | Render | PostgreSQL connection string |
| `CORS_ORIGINS` | Render | Comma-separated allowed origins |
| `SESSION_SECRET` | Render | 32-byte hex secret for session tokens |
| `ARC_MAINNET_RPC_URL` | Render | Required when `ARC_NETWORK=mainnet` |
| `PAYMENT_TRACKER_ADDRESS_MAINNET` | Render | Required for contract-mode verification on mainnet |

See `.env.example` for the full list including optional overrides.

### Run locally

```bash
# API (runs on port 3000 by default)
bun run --cwd apps/api dev

# Frontend (runs on port 5173)
bun run --cwd apps/web dev
```

### Test

```bash
bun run --cwd apps/api test
```

### Build

```bash
bun run --cwd apps/web build
```

## Deployment

- **Frontend:** Vercel — connected to this repository, auto-deploys on push to `main`
- **API:** Render — connected to this repository, auto-deploys on push to `main`
- **Database:** Supabase PostgreSQL — RLS enabled on all tables

After deploying a new migration, run the SQL in `database/migrations/` against your live database using the Supabase SQL Editor.

## Mainnet migration

See `docs/MAINNET_MIGRATION.md` for the full checklist and step-by-step instructions.

## Network configuration

PayQuick is network-agnostic. Set `VITE_ARC_NETWORK=mainnet` (Vercel) and `ARC_NETWORK=mainnet` (Render) to switch from Arc Testnet to Arc Mainnet. Both variables must match.

Do not commit private keys, production credentials, or mainnet contract addresses to this repository.
