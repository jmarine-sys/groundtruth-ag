# Open — what is not decided yet

This is **the project's edge of knowledge**: everything undecided, at risk, or owed, in one place.

It exists for a concrete reason: **without it an agent invents an answer where there is none, and
invents it with complete confidence.** So does a new person.

It is the counterpart of [ADRs.md](ADRs.md): there is **what was decided and why**, here
**what is missing**. Together they are the state of the project.

---

## The rules of this register

1. **The register does not duplicate the analysis: it links to where it lives.** If a *why* starts
   being explained here, it is drifting. Cut it and leave a link.
2. **Four states**, and the third is what makes the rest credible.

   | State | What it means |
   |---|---|
   | `OPEN` | undecided |
   | `LEANING` | there is a recommendation, missing a signature |
   | `NEEDS-INPUT` | **blocked on something we cannot produce ourselves** |
   | `DECIDED` | resolved, with its ref — and with its reservation written down if one remains |

   `NEEDS-INPUT` separates *"we did not decide"* from *"we CANNOT decide"*. Without it, an item that
   depends on another team looks like laziness, **and the agent invents the missing fact.**
3. **Three types:** `decision` · `risk` · `debt`.
4. **No urgency labels.** Priority comes out of the *Blocks* column and **recalculates itself** when
   something resolves. A `P0` set by hand in March still says P0 in September.
5. **If the item does not fit on one line, it is two items.**
6. **An open item that is already resolved but still marked open is worse than an open one:** it
   teaches the reader to distrust the whole register. That includes the count in the header.

---

## The register

| # | Item | Type | State | Note — and what exactly is missing | Blocks |
|---|---|---|---|---|---|
| OD-01 | Onchain approach for the hackathon demo | `decision` | DECIDED | Memo program for report/index hashes + transfers of a devnet test token; no custom program today ([03-mvp.md](../proyecto/03-mvp.md)). Reservation: rules are not enforced onchain until the Anchor program exists | T1.2, T2.2 |
| OD-02 | Custom Anchor program (commit-reveal, payouts, policy trigger) | `decision` | OPEN | Deferred by OD-01; design sketch exists in session notes, not in the repo | composability claim in the pitch |
| OD-03 | Who sets the index number | `decision` | DECIDED | Fixed formula `0.5 × climate stress + 0.5 × panel consensus`; AI only flags reports and explains ([lib/index.ts](../lib/index.ts), [lib/ai.ts](../lib/ai.ts)). Why: Res. SSN 315/2026 requires an independent actuary to validate the index | — |
| OD-04 | Index weights (0.5/0.5) and dry threshold (`DRY_RATIO = 0.6`) | `debt` | OPEN | Chosen by hand, not calibrated against any historical series | an insurer conversation |
| OD-05 | What the fake report in the demo looks like | `decision` | DECIDED | A copied note (collusion), because real weather in Pergamino on 2026-10-03 was normal: 48.5 mm in 30 days vs 34.7 mm 5-year mean (POST /api/round/close, open-meteo) — a "normal" dissenter would not look suspicious ([lib/fixtures.ts](../lib/fixtures.ts)) | T3.2 |
| OD-06 | Claude model and effort in `lib/ai.ts` | `decision` | NEEDS-INPUT | Leaning `claude-opus-5-5` at effort `low`; never called — no `ANTHROPIC_API_KEY` yet. Falls back to `rule-based` without it | T2.1 |
| OD-07 | Server-side refusal fallback for Claude | `debt` | OPEN | Not enabled; a refusal currently drops to the rule-based review | — |
| OD-08 | Wallet onboarding for non-crypto informants | `decision` | DECIDED | Phantom on devnet for today; email login deferred ([04-plan.md](../proyecto/04-plan.md)) | real informant tests |
| OD-09 | Will insurers or cooperatives pay for a base-risk audit | `risk` | NEEDS-INPUT | Zero conversations so far; T2.4 asks it | pitch business slide |
| OD-10 | Fewer than 3 real informants per zone | `risk` | OPEN | RBTS degrades below n=3; demo panel is synthetic and declared as such | T2.4, traction claim |
| OD-11 | Informant payouts not classified as gambling in Argentina | `risk` | NEEDS-INPUT | Informants never stake money (Ley 538 CABA definition); needs a lawyer's opinion, not verified | any launch beyond devnet |
| OD-12 | Pitch video length (2 or 3 min) and English-only rule | `decision` | NEEDS-INPUT | Marked "to confirm" in [contexto-hackathon.md](contexto-hackathon.md); must be read in official rules | T3.2, T3.3 |
| OD-13 | GitHub remote | `decision` | DECIDED | Public repo `git@github.com:jmarine-sys/groundtruth-ag.git`; branches `main`, `dev-a`, `dev-b` | — |
| OD-14 | Transaction version for the browser wallet | `decision` | DECIDED | Browser client sends v0 (memo fits in 1232 bytes; no dependency on wallet v1 support); server sends v1 ([app/providers.tsx](../app/providers.tsx), [lib/solana-server.ts](../lib/solana-server.ts)) | — |
| OD-15 | `/api/payout` and `/api/policy` trust the RoundResult sent by the browser | `debt` | OPEN | Capped by the round pool, devnet test token only; moves onchain with OD-02 | any launch beyond devnet |
| OD-16 | Devnet SOL for the server wallet | `risk` | DECIDED | Public faucet rejected the airdrop; funded by a manual transfer from the team wallet on 2026-10-03 (~1 SOL on `Cv9Nos5wnwc2N4LmoZBMMbcvi2tFLUZqGtuC9gBBdwSm`, 100,000 GTT minted). Reservation: top up again if many demo runs drain it | — |
| OD-17 | What stands in for the satellite index in the demo | `decision` | DECIDED | Open-Meteo rainfall and soil moisture (weather models), labelled "Weather index" in the UI; in production the panel audits the insurer's own satellite index for the same grid cell. MODIS NDVI rejected for today: weeks of lag | — |
| OD-18 | Report location and grid cell | `risk` | OPEN | Lot and cell are fixed demo data in [lib/zones.ts](../lib/zones.ts), shown on a map as "registered at account creation" ([components/LotMap.tsx](../components/LotMap.tsx)); reports carry no location. Needs geolocation + ~20 km cell + contract change with Dev B; GPS spoofing unaddressed | multi-zone, comparing each report with its cell |
| OD-19 | Who closes a round and when | `decision` | DECIDED | Rounds close on a fixed deadline (Monday 12:00 ART), not at an informant's or operator's choice; the demo closes manually and says so in the UI. Permissionless close after the deadline arrives with OD-02 | — |

---

## The state of the project, read off the register

19 items: 10 decided, 0 leaning, 4 blocked on input this team does not produce yet (API key, insurer
answer, legal opinion, official rules), 5 open. The four `NEEDS-INPUT` items do not unblock
by coding longer — they unblock by asking someone.

---

## How it is maintained — the propagation duty

> **Downward:** if a document contradicts [ADRs.md](ADRs.md) or this register, **the
> register wins.**
>
> **Upward:** if you discover something the register does not have, **the finding goes back into the
> register in the same change. Not later.**

If the second half is not honoured, the register's authority is paper.

**And it is not a phase at the end: it is a condition of done.** A phase gets skipped under delivery
pressure, which is exactly the problem this register exists to solve.
