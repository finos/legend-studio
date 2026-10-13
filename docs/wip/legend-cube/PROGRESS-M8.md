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
| Step   | M8.1–M8.2 done                                                                                                            |
| Tests  | Engine module 147 (20 new), checkstyle clean                                                                              |

## Steps

See PLAN §11.13 for each step's deliverable and when it is done.

- [x] **M8.1** The settled decisions (PLAN §11.13) and this file
- [x] **M8.2** The engine store, its tests, a draft PR into finos/legend-engine (#5355)
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

| Step | Commit                                     | Subject                                                           |
| ---- | ------------------------------------------ | ----------------------------------------------------------------- |
| M8.1 | `a039d1b01`                                | docs: settle Legend Cube M8 (persistence)                         |
| M8.2 | `487875402ed` (legend-engine `cube-store`) | Add a Cube store to the application query module, for Legend Cube |
| M8.2 | (this one)                                 | docs: record Legend Cube M8.2 (the engine store)                  |

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
- **M8.2** (2026-10-13). The engine store, on `cube-store` from finos master `6283262a105`, as a draft,
  finos/legend-engine#5355. `CubeStoreManager` (built inside `ApplicationQuery`, beside the Data Cube store), the
  model (`StoredCube`, its audit and deletion, `CubeSourceRef`, `CubeSearchSpecification`), seven endpoints under
  `pure/v1/query/cube` and a `@PATCH` annotation (JAX-RS 2.0.1 has none). Ids are UUIDs the store makes; a change is
  one `findOneAndUpdate` filtered on the id, the version read, not deleted and the caller among the owners, and when
  it matches nothing a read says 404, 403 or 409; every version goes to `cubeVersion`, unique on `{id, version}`. A
  soft delete marks the cube and doesn't change its version; a permanent one, allowed on a soft-deleted cube too,
  removes its versions. `ApplicationQueryException` writes escaped JSON now. `TestCubeStoreManager`, 20 tests on
  `mongo-java-server`: validation messages, `lastOpenAt` set alone, versions kept, a 409 on an older or newer version,
  8 writers racing on version 1 (one wins, 7 get a 409, two versions recorded), owners given away, soft then permanent
  delete, the search's term (id exact, name and owners in any case, the term quoted), owner, creator, tags, a source
  matched on one element, the sorts and the 100 cap, the indexes, an unconfigured store, the escaped JSON. The module's
  147 tests and checkstyle (0 violations) pass. Built with IntelliJ's Maven, offline, `-Drevision=4.151.1-SNAPSHOT`
  so the module resolves against the snapshots in `~/.m2`. On Windows, the repo's `check:copyright` splits its LF
  template on `os.EOL` (`\r\n`) and flags every file; it is run with `os.EOL` forced to `\n`
  (`cube-evidence/tools/eol-lf.mjs`). The fork has no `cube-dev`, so a local `origin/cube-dev` points at finos
  `cube-dev` for `check:changeset`.
