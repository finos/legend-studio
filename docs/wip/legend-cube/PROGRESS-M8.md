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
| Step   | M8.1–M8.5 done                                                                                                            |
| Tests  | Engine module 147; builder core 1764; store contract on :6301                                                             |

## Steps

See PLAN §11.13 for each step's deliverable and when it is done.

- [x] **M8.1** The settled decisions (PLAN §11.13) and this file
- [x] **M8.2** The engine store, its tests, a draft PR into finos/legend-engine (#5355)
- [x] **M8.3** A development store, every endpoint probed live
- [x] **M8.4** The builder's port and adapter
- [x] **M8.5** The page's state
- [ ] **M8.6** The UI
- [ ] **M8.7** Legend Query: the host's store, the address, `blockNavigation`
- [ ] **M8.8** Guides, READMEs, testing.md, hosting.md and the changesets
- [ ] **M8.9** Verification and the browser rehearsal
- [ ] **M8.10** A demo video (PLAN §11.3)
- [ ] **M8.11** Fold PLAN §11.13's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step | Commit                                     | Subject                                                                  |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------ |
| M8.1 | `a039d1b01`                                | docs: settle Legend Cube M8 (persistence)                                |
| M8.2 | `487875402ed` (legend-engine `cube-store`) | Add a Cube store to the application query module, for Legend Cube        |
| M8.2 | `0df8496cc`                                | docs: record Legend Cube M8.2 (the engine store)                         |
| M8.3 | `063030ed940` (legend-engine `cube-store`) | Allow PATCH through the engine's CORS filter, for the Cube store's PATCH |
| M8.3 | `c7512bd8f`                                | docs: record Legend Cube M8.3 (a development store)                      |
| M8.4 | `156e7b82a`                                | feat: add a Cube store port to Legend Cube, over the engine's Cube store |
| M8.5 | `409f93db5`                                | feat: save, load, copy and paste cubes in Legend Cube's page state       |
| M8.5 | (this one)                                 | docs: record Legend Cube M8.4 and M8.5                                   |

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
- **M8.3** (2026-10-13). A development store, outside both repos (`cube-evidence/dev-store/`, with a README): an
  in-memory Mongo (`DevMongo`, `mongo-java-server`'s memory backend) on `:27018`, and an engine on `:6301` run from
  the `4.151.1-SNAPSHOT` jars in `~/.m2` with `cube-store`'s `legend-engine-application-query` classes first, on
  `userTestConfig.json` with the port, the H2 test database moved to 9093 (9092 is the IntelliJ engine's) and a
  property vault naming the `query.mongo.*` keys. It starts in seconds. Reading `Server.java` to run it showed that the
  engine's CORS filter allows no `PATCH`, so a browser's `PATCH` would fail its preflight: `cube-store` now allows it
  (`063030ed940`), and the PR says so. Probes, `m8-requirements/p1-live-store.out`: `GET cube/abc` reaches the Cube
  store (404) while `GET someQuery` still reaches Query's; search, create (owners `["anonymous"]`, the content's `.`,
  `$` and `null` kept), get (`lastOpenAt` moved alone), a save, a 409 on the old version, a version read, a `PATCH`
  refused for `content`, owners given to another user and then a 403, an escaped message for an id with `"` and `\`,
  the preflight, soft then permanent delete, a delete without a version, searches by term and owner. Legend Query's
  `dev/config.json` in the worktree has `engine.queryUrl` on `:6301` and `NonProductionFeatureFlag`.
- **M8.4** (2026-10-13). The port, `graph-manager/CubeStore.ts`: `CubeStore` (create, save over the version read,
  get, search, soft delete), its classes (`SavedCubeSummary`, `SavedCube`, `CubeDraft`, `CubeSourceRef`) and
  `CubeStoreError` with five kinds; `CubeHost.store`, optional. `getCubeSourceRefs` (`graph-manager/CubeSourceRefs.ts`)
  lists a cube's tables (with the Depot project, none for a direct connection), data product access points and ingest
  data sets, each once. The v1 seam: `V1_StoredCube` and its parts as `serializr` classes, and `V1_LegendCubeStore`
  over `V1_EngineServerClient`'s public `get`, `post`, `put` and `delete`, on `${queryBaseUrl ?? baseUrl}`; statuses
  become kinds (409 conflict, 401 and 403 forbidden, 404 with the store's message not found, 404 without it an engine
  with no store, 400 invalid, the rest unavailable, with the engine's message); `buildCubeStore` builds it, so hosts
  name no `V1_*` symbol. The legend-graph client is left alone (D8). The in-memory store (`__test-utils__`) has the
  engine's refusals and messages, `asUser`, `failNext` and `hold`; `runCubeStoreContract` checks both: in the core
  group for the in-memory one, and by hand (`cube-local`, `CubeStore.cube-local-test.ts`) for the engine's on `:6301`,
  6 tests passing (the owners case needs a second user, so it runs on the in-memory store only). 20 new core tests.
  Running the whole package's tests with no group runs the engine-roundtrip suites too, all at once against the local
  engine: several time out in their `beforeAll` (30 s) under that load, as the known setup-SQL ones do; the core group
  is the gate, the engine suites run at the verification step.
- **M8.5** (2026-10-13). `CubePersistenceState` (`editorState.persistence`), with `CubeSaveDialogState` and
  `CubeLoadDialogState`. The saved cube shown is an id and what the page last loaded or saved of each cube (its
  summary and the spec halves); `getCubeSpecHalves` encodes the spec and splits off `meta`. `importDocument` tells it
  another cube replaced the document (remembering which saved cube that one showed), and `undo` back over an import
  tells it to show that cube again, if still known. Save gating names the first step with a problem, as Execute does.
  Save on a saved cube saves at once; on a 409 or 403 the Save dialog opens with the store's message, to save a copy.
  Load reads the spec with the codec, the store's name winning, never runs; from the address a failure is the graph
  area's (`loadError`), else the dialog's. Delete asks, then deletes softly, the content kept unsaved. Copy writes
  the spec; Paste reads `navigator.clipboard`, opening the Import dialog with the text (or empty when the browser
  refuses). The question before losing changes is Cube's own (`confirmation`). Alt+N, Alt+L, Alt+S, Alt+C and Alt+V
  are new `LEGEND_CUBE_COMMAND_KEY`s, run through `runPersistenceAction`, which finishes the node editor first. 16
  state tests. A test's `when` must read an observable before anything else: one that read the store's call list
  first short-circuited and never ran again.
