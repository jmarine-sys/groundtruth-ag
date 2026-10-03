@AGENTS.md

## Authority order

If two sources contradict each other, **the lower number wins.**

| # | Layer | Where it lives |
|---|---|---|
| 1 | **Why** | `docs/ADRs.md` and `docs/ODs.md` — **they outrank everything, no exceptions** |
| 3 | **Shape** | `proyecto/contratos.md` — the JSON contracts between Dev A and Dev B |
| 4 | **What to build** | `proyecto/03-mvp.md` and `proyecto/04-plan.md` |

<!-- Layers 2 and 5 are deliberately absent, not forgotten: this repo has no per-piece specs and no
     evidence folder yet, so there is nothing to point those rows at. Add a row the day the artifact
     exists — never before. -->

**Read `docs/ODs.md` before deciding anything this project has not decided.** An item marked
`NEEDS-INPUT` is blocked on something this team cannot produce: **do not resolve it by inventing the
missing fact.**

**What you discover while working goes back into those records, in the same change.**
