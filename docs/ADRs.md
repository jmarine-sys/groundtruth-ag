# Architecture decisions (ADR)

One entry per decision, with **the why and the evidence** — not just the outcome.

**A closed entry is never edited.** If a decision changes, write a new one that replaces it and mark
the old one. **Exception: an entry marked `Open` is a living document until it closes** — load
measurements into it, correct its numbers; it becomes immutable only when it closes.

**Status:** `Open` · `Current` · `Superseded by NNN` · `Closed by NNN` (an `Open` entry another one resolved).

**Format:** Context -> Decision -> Consequences -> Rejected alternatives -> Evidence -> **Verified against what already exists**.

| Field | What it carries |
|---|---|
| **Context** | what pressure existed. **Ideally not a preference but a concrete failure that already happened** |
| **Decision** | what was decided, in the present tense, in one sentence |
| **Consequences** | what is now true, **including the uncomfortable part** |
| **Rejected alternatives** | **mandatory.** It is the field that stops 80% of repeated arguments |
| **Evidence** | where each claim comes from: a `commit`, a `file:line`, the command that shows it |
| **Verified against what already exists** | the command you ran and what it returned, or *"not applicable"* with its reason |

**Write ADRs backwards only**, about what has already been argued twice. A preventive ADR of a
decision nobody made is fiction, and an agent will believe it.

**A change you were asked to finish is not the failure.** If the pressure you observed is the state of
someone's unfinished work -- incomplete, not working, half-edited -- there is no decision to record:
nobody decided that. Describe the problem the change solves, never a verdict on the draft.

| # | Decision | Status |
|---|---|---|

---

<!--
  The form for the first entry, commented out ON PURPOSE. Copy it below this comment when you write
  ADR-001, and write its heading at column 0.

  It stays a comment so that `grep -c '^## ADR-'` returns **zero** on a fresh corpus. This project
  reads its state by counting, and a placeholder that counts as one entry makes an empty record look
  populated. Same failure as a piece labelled "do not use" that keeps getting used: the label is not
  where the reader lands. An HTML comment hides nothing from `grep`, so the heading below is
  written without its `##`: a heading at column 0 inside this comment would count as an entry.

Heading: `## ADR-001 — <the decision, one sentence, present tense>`

**Context.** <What pressure existed. Name the concrete damage: how many different values there were,
how many times it broke, how much time was lost. A context that says "to improve maintainability" is
useless — it can be neither verified nor argued with.>

**Decision.** <One sentence, present tense.>

**Consequences.**
- <What is now true.>
- <**The uncomfortable part.** If nothing is uncomfortable, this probably was not a decision.>

**Rejected alternatives.** <What was discarded and why. This is the field that keeps the argument
from coming back.>

**Evidence.** <Where it came from. A link, never a copy of the analysis.>

**Verified against what already exists.**

```bash
# does the framework, the platform or another service already do this?
<the command you ran>   # -> <what it returned>

<What you conclude from it. If it does not apply, write "not applicable" and why.>
-->
