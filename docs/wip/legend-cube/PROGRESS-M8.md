# Legend Cube — M8 Progress Log

> **What this file is:** the "where are we" ledger for M8, persistence (PLAN §11.3 and §11.13). It is kept apart from
> [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly. [PLAN.md](PLAN.md)
> §11.13 holds what M8 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Branch | `cube-m8`, from `cube-dev` (`4a0bfe3e0`); a draft PR into `cube-dev`. Engine: `cube-store` of the fork, from finos master |
| Engine | Local legend-engine on `localhost:6300` (IntelliJ, no Mongo); the development store on `:6301` from M8.3                  |
| Step   | M8.1 done                                                                                                                 |
| Tests  | Not run yet (docs only)                                                                                                   |

## Steps

See PLAN §11.13 for each step's deliverable and when it is done.

- [x] **M8.1** The settled decisions (PLAN §11.13) and this file
- [ ] **M8.2** The engine store, its tests, a draft PR into finos/legend-engine
- [ ] **M8.3** A development store, every endpoint probed live
- [ ] **M8.4** The builder's port and adapter
- [ ] **M8.5** The page's state
- [ ] **M8.6** The UI
- [ ] **M8.7** Legend Query: the host's store, the address, `blockNavigation`
- [ ] **M8.8** Guides, READMEs, testing.md, hosting.md and the changesets
- [ ] **M8.9** Verification and the browser rehearsal
- [ ] **M8.10** A demo video (PLAN §11.3)
- [ ] **M8.11** Fold PLAN §11.13's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step | Commit     | Subject                                   |
| ---- | ---------- | ----------------------------------------- |
| M8.1 | (this one) | docs: settle Legend Cube M8 (persistence) |

## Notes

- **M8.1** (2026-10-13). Started on a new computer, from a hand-over prompt. finos `cube-dev` had been reset to master
  (`4a0bfe3e0`) once #5669 merged; the prompt's `c1b40a480` is the same tree, and #5674–#5677 are still on it. The
  evidence folder is new: `C:\Users\lmaur\Documents\GS\cube-evidence` (`m8-requirements/p0-setup.md`). What this
  computer has: IntelliJ's Maven and a Corretto 11 JDK, with which the engine module's Data Cube store tests run
  (31 tests, ~15 s, on `mongo-java-server`); Docker Desktop installed but not running; the IntelliJ engine on `:6300`
  (master `e60ab67`, anonymous auth, no Mongo: the stores fail with "not configured"). The repo corrects the prompt
  in one place: U9 keeps `?queryId=` in the address (QUESTIONS.md), so the address follows the open cube rather than
  dropping the parameter; a path, `/cube/:cubeId`, does both. The user's answers, all on the recommendation: the
  engine PR from a fork branch, opened as a draft by Claude, without waiting for it; `/cube/:cubeId` with `?queryId=`
  read and replaced; an in-memory store for unit tests and an engine store on `:6301` for development; Save, Save as,
  Load and Delete, owners shown, not edited.
