# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Paying customer:** crop insurers and agricultural cooperatives in Argentina that sell or distribute index-based (parametric) crop insurance and must disclose basis risk to farmers.
- **Informants:** local agronomists who walk lots every week and report crop condition per zone. They are paid per round for honest reporting.
- **Beneficiary:** the insured farmer, who gets paid when the satellite index misses a drought on their lot.
- **Evaluators right now:** Colosseum Crypto World's Fair judges and investors, who must understand the problem in seconds and then open the demo, the video or the repo.

## Product Purpose

GroundTruth measures basis risk: the gap between what a satellite or weather index says about a ~20 km grid cell and what actually happens on each farm. A panel of agronomists reports from the field, each report is signed on Solana, informants are paid for honesty, and the result shows insurers where their index fails. A basis-risk cover pays the insured farmer in the case the index misses (weather index normal, at least 3 valid reports confirming drought). Success for the hackathon: judges grasp "the satellite sees the square, we see the field" and try the working devnet demo.

## Positioning

GroundTruth does not replace the insurer's satellite index; it audits it. Its mechanism is a peer-prediction panel (Robust Bayesian Truth Serum) whose pay does not depend on the outcome, with copied or coordinated reports excluded, and every report committed on Solana before the result is known. Neighbouring products tokenize crops, sell parametric policies or crowdsource data for tokens; none audit an existing index with incentive-compatible field reports.

## Operating Context

- Argentina, Pampas wheat; demo zone Pergamino, Buenos Aires.
- Regulation: Res. SSN 315/2026 (B.O. 23/07/2026) enables parametric insurance and requires disclosing basis risk; an independent actuary validates each index, so the index is a fixed auditable formula and the AI never sets the number.
- Demo flow: agronomist signs a report with Phantom on Solana devnet; insurer closes the round, sees weather index vs field panel, pays agronomists in one transaction and settles the basis-risk cover.

## Capabilities and Constraints

- Working prototype on Solana devnet with test funds; production payouts would be in USDC.
- Weather data from Open-Meteo stands in for the insurer's satellite index in the demo.
- Pre-loaded demo agronomists, insured farmer and policy terms are simulated; lot location is fixed demo data.
- AI review (Claude) flags suspicious reports when a key is configured; otherwise a fixed rule does and the UI says so.
- Not audited; not for real funds.

## Brand Commitments

- Name: GroundTruth. Line: "The satellite sees the square. We see the field."
- Visual identity established by the demo (field green and soil palette, Geist, logo mark of a leaf with a crosshair) is binding for new surfaces.
- Copy for judges and submission material is in English.

## Evidence on Hand

- Working demo (`/demo`) and public repo github.com/jmarine-sys/groundtruth-ag.
- Res. SSN 315/2026 as regulatory context.
- No customers, pilots, testimonials, user counts or market-size figures yet. Do not fabricate any; validation quotes may be added later by the team.

## Product Principles

1. Audit the index, don't replace it: the insurer keeps its trigger; GroundTruth shows where it fails.
2. Pay for honesty, not for outcomes: informant rewards never depend on whether there was a drought.
3. Every claim checkable: reports, index and payouts leave a trace on Solana; the formula is fixed and explainable.
4. Say what is a prototype: devnet, simulated parties and stand-in data are always labelled.
