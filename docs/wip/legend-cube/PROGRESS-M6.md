# Legend Cube — M6 Progress Log

> **What this file is:** the "where are we" ledger for M6, Difference and Extend (PLAN §11.3 and §11.7). It is kept
> apart from [PROGRESS.md](PROGRESS.md), which covers M1, and the M2, M4 and M5 logs, so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.7 holds what M6 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                 |
| ------ | ------------------------------------------------------------------------------------- |
| Branch | `cube-m6`, from `cube-dev` `1f8f8cf0b`; a draft PR into `cube-dev` (user, 2026-10-10) |
| Engine | Local legend-engine on `localhost:6300`                                               |
| Step   | M6.1: the settled decisions (PLAN §11.7) and this file                                |
| Tests  | Unchanged from `cube-dev`                                                             |

## Steps

See PLAN §11.7 for each step's deliverable and when it is done.

- [x] **M6.1** The settled decisions (PLAN §11.7) and this file
- [ ] **M6.2** Difference in the core
- [ ] **M6.3** Difference in the builder, and registered
- [ ] **M6.4** Difference on the engine, around the databases and in the browser
- [ ] **M6.5** Extend in the core
- [ ] **M6.6** The engine adapter: parse, render, type and plan expressions
- [ ] **M6.7** Retyping in the builder
- [ ] **M6.8** The Extend editor, and registered
- [ ] **M6.9** Extend on the engine, in the conformance suite and around the databases
- [ ] **M6.10** Guides, READMEs and the changeset
- [ ] **M6.11** Verification and the browser rehearsal
- [ ] **M6.12** A demo video of M6's features (PLAN §11.3)
- [ ] **M6.13** Fold PLAN §11.7's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step | Commit     | Subject                                          |
| ---- | ---------- | ------------------------------------------------ |
| M6.1 | (this one) | docs: settle Legend Cube M6 (Difference, Extend) |

## Notes

- **M6.1** (2026-10-10). The user's answers, all on the recommendation: Extend's expressions edited inline in the
  panel, as full lambdas (`x | …`), a column able to use the ones above it, and automatic retyping; Difference with
  native types, after the probes showed `toFloat()` refused when planning on 7 of 20 database types. The probes
  (`m6-requirements/` in the evidence folder) also found that Extend must be typed over the cube's model, since an
  empty model can't type the model's enums or functions.
