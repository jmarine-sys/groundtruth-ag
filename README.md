# GroundTruth

**The satellite sees the square. We see the field.**

GroundTruth is a field panel that audits satellite-based crop insurance. Local agronomists report what they see in their lots, each report is registered on Solana, informants are paid for honest reporting, and the result shows insurers where a satellite index misses a drought (basis risk).

> **Prototype on Solana devnet.** All transactions use test funds with no real value. In production, informants and farmers would be paid in USDC.

Built for the Colosseum Crypto World's Fair (Solana track and Superteam Argentina track).

---

## The problem

Index-based crop insurance pays from satellite data averaged over grid cells of roughly 20 × 20 km. Droughts are patchy: when a farm dries out but the cell average looks fine, the policy pays nothing. This gap is called **basis risk**. Since July 2026, Argentine regulation (Res. SSN 315/2026) requires insurers to disclose it to farmers, but there is no practical way to measure it today.

## How it works

1. **Report.** An agronomist with a registered lot answers two questions: is the crop below normal or normal, and how many of 10 peers in the zone will say "below normal". They add a short field note.
2. **Register on Solana.** The browser signs a Memo transaction from the agronomist's own wallet containing the SHA-256 hash of the report. The content stays private; anyone holding the report can prove it was not changed after signing.
3. **Close the round.** The server checks every report, reads real weather for the zone (Open-Meteo: 30-day rainfall vs the 5-year average for the same window, plus soil moisture), and runs an AI review (Claude) that flags suspicious reports, such as a note copied from another informant.
4. **Score and pay.** Each informant is scored with Robust Bayesian Truth Serum (peer prediction): rewards depend on consistency with the panel, not on whether there was a drought, so exaggerating does not pay. Flagged reports get nothing. The index hash and every reward are sent in a single Solana transaction.
5. **Basis-risk cover.** When the weather index says normal but at least 3 valid reports confirm drought, a demo cover pays the insured farmer automatically.

The stress index is a fixed, auditable formula: `0.5 × weather stress + 0.5 × share of valid reports saying "below"`. The AI never sets the number; it only flags reports and writes the explanation.

## What is real and what is simulated

| Part | Status |
|---|---|
| Report hash registered on Solana devnet from the user's wallet | Real |
| Index publication and payouts (SOL transfers + memo) on devnet | Real |
| Basis-risk cover payout on devnet | Real transaction, demo policy |
| Weather data (Open-Meteo, no API key) | Real |
| Peer-prediction scoring (RBTS) | Real calculation |
| AI review of the panel (Claude Haiku 4.5) | Real when a key is configured; otherwise a fixed rule flags copied and contrarian reports and the UI says so |
| Four pre-loaded informants | Simulated, labelled "pre-loaded" |
| Insured farmer, sponsor pool and policy terms | Simulated |
| Lot location and grid cell | Fixed demo data (Pergamino, Buenos Aires) |
| Satellite index | Stand-in: weather data. In production the panel audits the insurer's own satellite index for the same cell |

## Solana integration

- **Report registration:** Memo program instruction signed and paid by the agronomist's wallet (Phantom, Wallet Standard). Browser transactions use version 0.
- **Payouts:** one version-1 transaction from the server wallet with a memo (`groundtruth:index:<zone>:<index>:<hash>`) and a System Program transfer per informant. Transfers below 0.001 SOL are skipped (rent minimum for new accounts).
- **Cover:** a SOL transfer to the insured farmer with a memo recording the index, valid reports and flags.
- **Resilience:** requests rate-limited by the public RPC (HTTP 429) are retried, and before resending the server checks whether the failed transaction actually landed, to avoid double payments.

Stack: `@solana/kit` 8 plugin clients, `@solana/kit-plugin-wallet` + `@solana/react` in the browser, `@solana-program/memo` and `@solana-program/system`.

## Architecture

```
Browser (Next.js, React)
  ├─ Agronomist tab: Leaflet map, report form, Phantom signs a Memo tx ──► Solana devnet
  └─ Insurer tab: round panel, results, settlement
        │
        ▼
Next.js route handlers (server)
  ├─ POST /api/round/close   validate → Open-Meteo → AI review → index + RBTS rewards
  ├─ POST /api/payout        index memo + all rewards in one tx ─────────────► Solana devnet
  └─ POST /api/basis-cover   pays the insured farmer when the cover triggers ─► Solana devnet
```

| Path | What it does |
|---|---|
| `components/Demo.tsx` | Both role views and the whole demo flow |
| `components/LotMap.tsx` | Map of the registered lot, grid cell and weather point |
| `lib/scoring.ts` | RBTS peer-prediction scores, rewards, copied-note detection |
| `lib/ai.ts` | Claude review with structured output; rule-based review when no key is set |
| `lib/weather.ts` | Open-Meteo rainfall vs 5-year baseline |
| `lib/index.ts` | Fixed index formula |
| `lib/validation.ts` | Report validation (one report per wallet per round, valid addresses, ranges) |
| `lib/solana-server.ts` | Server wallet client, batched payouts, safe retries |
| `lib/hash.ts` | Canonical report hash and memo formats |
| `scripts/setup-devnet.mts` | Creates the server wallet and demo addresses |

## Run it locally

Requirements: Node.js 20+ and the Phantom browser extension set to **Devnet** with some devnet SOL ([faucet.solana.com](https://faucet.solana.com)).

```bash
git clone https://github.com/jmarine-sys/groundtruth-ag.git
cd groundtruth-ag
npm install
cp .env.example .env.local
npm run setup:devnet   # creates a server wallet in .env.local (devnet only)
npm run dev            # landing at http://localhost:3000, demo at /demo
npm test
```

After `setup:devnet`, send about 0.5 devnet SOL to the printed server wallet address so it can pay rewards. Each full demo run uses about 0.15 SOL (0.1 SOL reward pool + 0.05 SOL cover).

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SERVER_WALLET`, `NEXT_PUBLIC_SEED_WALLETS`, `NEXT_PUBLIC_INSURED_WALLET` | `.env` (committed) | Public demo addresses |
| `SOLANA_RPC_URL`, `NEXT_PUBLIC_SOLANA_RPC_URL` | `.env` | Devnet RPC for server and browser. A dedicated RPC is recommended; the public one is rate-limited |
| `ROUND_POOL_SOL`, `COVER_PAYOUT_SOL` | `.env` | Reward pool per round and cover payout |
| `SERVER_SECRET_KEY` | `.env.local` only | Private key of the paying wallet. Never commit it |
| `ANTHROPIC_API_KEY` | `.env.local` only | Optional. Enables the Claude review |

## Demo walkthrough

The landing page (`/`) explains the problem; the demo lives at `/demo`.


1. **Agronomist tab:** connect Phantom (Devnet), choose the crop condition, set your guess, write a note and sign. The report hash appears on Solana Explorer.
2. **Insurer tab:** the panel shows the pre-loaded reports plus yours. Click **Close round now (demo)**: weather index vs field panel, the basis-risk alert, flagged reports and rewards.
3. **Publish & pay:** one transaction publishes the index and pays every informant.
4. **Settle cover:** if the weather index says normal and at least 3 valid reports confirm drought, the insured farmer is paid.

## Security notes

- Devnet only. The app never targets mainnet.
- The paying wallet's private key lives only in `.env.local` or the hosting provider's secret store.
- Report notes are data, never instructions: the AI prompt treats them as untrusted input, and the index is computed by a fixed formula.
- `/api/payout` and `/api/basis-cover` trust the round result sent by the browser, capped by the round pool. In production these rules move into a custom Solana program.
- Not audited. Do not use with real funds.

## Roadmap

- Custom Solana program (Anchor) with commit-reveal reports, on-chain scoring commitments and a permissionless cover trigger.
- Lot geolocation at onboarding and multi-zone grid cells matching the insurer's index.
- Email login with embedded wallets for non-crypto agronomists, payouts in USDC.
- Pilots with an insurer or cooperative to measure basis risk on a real portfolio.

## Project records

Decisions and open items are tracked in [`docs/ODs.md`](docs/ODs.md). Planning documents live in [`proyecto/`](proyecto/).
