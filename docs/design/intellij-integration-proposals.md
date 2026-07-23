# Proposal: Local Legend Development in IntelliJ

**Status:** Draft for leadership review
**Date:** 2026-07-23
**Author:** Legend Studio team

---

## Executive Summary

Legend Studio today is a browser application that edits models through the Legend SDLC
server, which in turn manages GitLab repositories. A growing set of users — particularly
engineers who live in IntelliJ — want to open a Legend project **as local `.pure` files on
disk**, edit them with normal IDE workflows (git, refactoring, search, code review), and
still have access to Legend's rich visual editors (query builder, diagram editor, element
forms).

This document presents two options for delivering that experience:

| | **Option A — Native IntelliJ Plugin** | **Option B — Embedded Studio ("Studio-in-a-box")** |
|---|---|---|
| Approach | LSP-based language plugin + Studio's React editors embedded per-element via JCEF | Run the full, unmodified Studio web app inside IntelliJ, backed by a local filesystem SDLC facade |
| Source of truth | Local `.pure` files | Local files, mediated through an SDLC API emulation layer |
| Reuses | `legend-engine-ide-lsp` (proven in VS Code), `legend-vscode-extension-dependencies` | `legend-application-studio` as-is |
| Time to first usable release | ~2 months (text editing + diagnostics) | ~3–4 months (all-or-nothing) |
| Time to full experience | ~6–9 months | ~4–5 months |
| Long-term fit | IDE-native, incremental, aligned with the VS Code extension | Browser app in a box; SDLC emulation is a permanent maintenance liability |

**Recommendation: Option A.** It reuses the architecture already proven by the FINOS
Legend VS Code extension, delivers value incrementally (the language layer alone is
useful after ~2 months), and produces an IDE-native experience. Option B reaches a
"full Studio" screen faster but at the cost of emulating a large server API locally and
delivering a weaker user experience that does not integrate with IntelliJ's editor, VCS,
or undo model.

---

## Background: Current Architecture and Prior Art

### How Studio works today

```
Browser (legend-application-studio)
        │  entities (JSON), workspaces, reviews
        ▼
Legend SDLC Server ──────► GitLab (projects, branches, MRs)
        │
        ▼
Legend Engine Server (parse / compile / execute)
```

- Studio edits **entities** (JSON protocol objects), not files. The SDLC server maps
  entities to files in GitLab (`entities/**.json` in classic projects).
- All language intelligence (parsing, compilation, execution) is delegated to the
  Legend Engine server over HTTP.
- The SDLC coupling is isolated in `@finos/legend-server-sdlc`
  (`packages/legend-server-sdlc/src/SDLCServerClient.ts`); the graph manager
  (`@finos/legend-graph`) is agnostic about where entities come from and already
  supports grammar ↔ protocol conversion.

### Prior art: the VS Code extension (the key enabler)

The FINOS **Legend VS Code extension** already delivers local-file Legend development:

1. **`legend-engine-ide-lsp`** (FINOS, Java) — a Language Server Protocol server that
   wraps Legend Engine. It treats a **folder of `.pure` files as the project**: parsing,
   compile diagnostics, completion, go-to-definition, test execution — all against local
   files. No SDLC server. Git is just git.
2. **`@finos/legend-vscode-extension-dependencies`** (in this repo,
   `packages/legend-vscode-extension-dependencies/`) — a bundle that re-exports Studio's
   actual React components (query builder, diagram renderer, data cube, graph manager)
   so an IDE host can mount them in webviews outside the browser Studio shell.

Both proposals below are strategies for bringing this to IntelliJ. Option A ports the
*host* (the thin IDE integration layer). Option B bypasses the LSP model and ports the
*whole browser application*.

### A shared prerequisite: file format

Classic SDLC projects store entities as **JSON** files in GitLab; local IDE workflows
assume **`.pure` grammar text**. Both options need a stance:

- **Convert at the boundary** — entity JSON → `.pure` on checkout, reverse on push
  (Engine provides lossless grammar transformation both ways). Works, but produces
  noisy diffs and two representations of the truth.
- **Migrate projects to pure-text storage** — browser Studio and the IDE then literally
  share the same files. This is the durable answer and should be scoped as a parallel
  SDLC workstream regardless of which option is chosen.

---

## Option A — Native IntelliJ Plugin (LSP + Embedded Studio Editors)

### Concept

Build an IntelliJ plugin the same way the VS Code extension was built:

```
┌──────────────────────── IntelliJ ────────────────────────┐
│  .pure editor (native)          Tool windows / tabs      │
│  ├─ highlighting (TextMate)     ├─ Query Builder (JCEF)  │
│  ├─ diagnostics                 ├─ Diagram Editor (JCEF) │
│  ├─ completion / navigation     └─ Element forms (JCEF)  │
│  └─ run/test gutter markers            ▲                 │
│           │ LSP (stdio)                │ JS bridge       │
│           ▼                            │                 │
│  legend-engine-ide-lsp (bundled JVM process)             │
│           │ engine protocol                              │
│           ▼                                              │
│  Legend Engine (remote server, or local engine runtime)  │
└──────────────────────────────────────────────────────────┘
                Local .pure files = source of truth
                Git = IntelliJ's native VCS support
```

### Implementation detail

**Layer 1 — Language plugin (LSP client)**

- Register the `.pure` file type; reuse the existing TextMate grammar for syntax
  highlighting (same asset the VS Code extension uses).
- Launch `legend-engine-ide-lsp` as a managed child process (bundled jar; the plugin
  manages JVM discovery, server lifecycle, restarts, and log surfacing).
- Wire it as an LSP client. Two client frameworks exist:
  - **LSP4IJ** (Red Hat, open source) — works on **IntelliJ Community and Ultimate**.
    Recommended baseline so the plugin is not restricted to paid IDEs.
  - IntelliJ's native LSP API (`com.intellij.platform.lsp`) — cleaner integration but
    **paid IDEs only**. Can be added later behind a capability check.
- Out of the box from the existing LSP server: compile diagnostics as you type,
  completion, hover docs, go-to-definition, find-references, document symbols.
- Plugin settings: engine server URL, JVM options, project-level config
  (mirroring the VS Code extension's settings surface).

**Layer 2 — Executable workflows**

- The LSP server already exposes runnable items (functions, services, tests) as code
  lenses. Map these to IntelliJ **line markers and run configurations**, so users get
  the familiar green "run" gutter icons and a results panel for Legend test suites.
- Compile-project action, execution result rendering (tabular results panel).

**Layer 3 — Embedded visual editors (the Studio experience)**

- IntelliJ ships **JCEF** (embedded Chromium, `JBCefBrowser`). Build a web bundle from
  `@finos/legend-vscode-extension-dependencies` — or a sibling package
  `@finos/legend-intellij-extension-dependencies` in this repo — containing the query
  builder, diagram editor, data cube, and element editors.
- Replace the VS Code `postMessage` bridge with **`JBCefJSQuery`** (JCEF's JS↔JVM
  message channel). The message contract (element path, project entities, engine
  callbacks, save requests) is already defined by the VS Code extension and can be
  ported nearly verbatim — this is the main net-new engineering in Option A.
- **Opening an element's editor:** caret on an element in a `.pure` file → intention
  action / gutter icon ("Open in Query Builder", "View Diagram") → editor tab hosting
  the JCEF view for that element. Element location comes from the LSP server's source
  information (file + line per element).
- **Write-back (local file modification):** the webview edits the element model,
  serializes it back to Pure grammar text (Engine `jsonToGrammar`), and the plugin
  applies it as a normal IntelliJ document edit to the `.pure` file. Consequences:
  - IntelliJ **undo/redo** works across visual edits.
  - Changes show in IntelliJ's **local history and git diff** immediately.
  - The LSP server re-parses on change, so text view and visual view never diverge.

**Layer 4 — Project lifecycle and SDLC bridging**

- "Open Legend project locally": clone the project's GitLab repo (converting entity
  JSON → `.pure` if the project is in classic format).
- Branch naming conventions matching SDLC workspaces, so a local branch can round-trip
  with a browser-Studio workspace; review creation via SDLC REST or IntelliJ's native
  GitLab merge-request tooling.
- Deep links from browser Studio: "Open in IntelliJ" using the JetBrains protocol
  (`jetbrains://idea/navigate/reference?...`) targeting the element's file + line.

### What it means for the user

- **IntelliJ is a first-class Legend editor.** `.pure` files open natively with
  highlighting, error squiggles, completion, navigation — alongside the user's Java/
  Python/SQL code in the same window, same git checkout, same PR flow.
- **Familiar IDE idioms:** run/test gutter icons, run configurations, project-wide
  search and replace across models and application code together, IntelliJ refactoring
  and VCS tooling.
- **Studio's visual editors on demand**, per element, inside the IDE — not a separate
  app. Visual edits and text edits are the same file, so mixed teams (modelers +
  engineers) work in one medium.
- **Offline-tolerant:** files are local; only compile/execute needs an engine.
- **Incremental adoption:** users get real value from Layer 1 alone (a competent
  `.pure` editor) months before the visual layer ships.

### Resources and timeline

| Phase | Scope | Duration | Staffing |
|---|---|---|---|
| 0 — Spike | LSP4IJ wiring + one JCEF webview rendering the diagram editor | 2 weeks | 1 eng |
| 1 — Language plugin | File type, highlighting, LSP lifecycle, diagnostics/completion/nav, settings | 6–8 weeks | 1 Java/IntelliJ-platform eng |
| 2 — Executable workflows | Run configs, gutter markers, test results, execution panel | 4–6 weeks | same eng |
| 3 — Visual editors | Web bundle, JCEF bridge, element actions, grammar write-back | 10–14 weeks | + 1 frontend eng (legend-studio) |
| 4 — Lifecycle & SDLC bridge | Local checkout/convert, workspace-branch mapping, deep links | 6–8 weeks | both, part-time |
| 5 — Hardening & release | Marketplace publishing, Community/Ultimate matrix, versioning vs engine releases | 4 weeks | both |

- **Team:** 1 Java engineer with (or willing to learn) IntelliJ Platform SDK experience;
  1 frontend engineer familiar with legend-studio internals; part-time consultation from
  a `legend-engine-ide-lsp` maintainer (any server gaps found benefit VS Code too).
- **Total:** roughly **6–9 months to full experience**, with a **usable text-editing
  release at ~2 months**.
- **Infrastructure:** JetBrains Marketplace account; CI for plugin builds (Gradle
  IntelliJ plugin); no new server infrastructure — reuses existing engine deployments.

### Risks

| Risk | Mitigation |
|---|---|
| LSP feature gaps vs. browser Studio (e.g., niche DSL editors) | Ship editors incrementally; text mode is always a complete fallback for any element |
| JCEF quirks (rendering, focus, IME) across OSes | Spike early (Phase 0); the pattern is widely used by other JetBrains-ecosystem plugins |
| LSP4IJ dependency (third-party plugin) | Actively maintained by Red Hat; native LSP API is a fallback for Ultimate users |
| Entity-JSON projects need conversion | Boundary conversion at checkout/push in Phase 4; push for pure-text project storage in parallel |

---

## Option B — Embedded Studio Backed by a Local Filesystem SDLC

### Concept

Run the existing, unmodified `legend-application-studio` SPA inside an IntelliJ JCEF
window (or standalone local server + browser), and make it believe it is talking to a
normal SDLC server — but implement that SDLC API against the **local filesystem**.

```
┌──────────────────── IntelliJ ────────────────────┐
│   JCEF window: full Legend Studio SPA            │
│        │ SDLC REST API (unchanged Studio code)   │
│        ▼                                         │
│   Local SDLC Facade (bundled service)            │
│   ├─ entities API  ◄──► .pure/.json files on disk│
│   ├─ workspaces    ◄──► git branches (local)     │
│   ├─ revisions     ◄──► git commits              │
│   └─ reviews       ◄──► GitLab MRs (optional)    │
│        │                                         │
│        ▼                                         │
│   Legend Engine Server (remote or local)         │
└──────────────────────────────────────────────────┘
```

### Implementation detail

**Component 1 — Local SDLC facade (the bulk of the work)**

A small service (Java, bundled with the plugin, or a Node sidecar) implementing the
subset of the SDLC REST API that Studio actually calls:

- **Entities:** on read, parse local `.pure` files via Engine (`grammarToJson`) and
  serve entity JSON; on write, receive entity changes from Studio, serialize back to
  grammar (`jsonToGrammar`), and write files. Requires careful mapping of elements →
  file layout (one element per file vs. grouped files) and preservation of formatting.
- **Workspaces / revisions:** map onto local git branches and commits (JGit). Studio's
  update/sync/conflict-resolution flows must be reimplemented or stubbed coherently —
  Studio expects server-computed diffs, revision ranges, and conflict payloads.
- **Reviews, project config, dependencies:** either stub (degrade features) or proxy to
  the real SDLC/Depot servers when online.
- The SDLC API surface consumed by Studio is large; even a "minimal" facade must cover
  entity CRUD, workspace lifecycle, revisions, project configuration, and dependency
  resolution before Studio will function at all — this is **all-or-nothing**: Studio
  does not render a project until the whole entity/workspace path works.

**Component 2 — IntelliJ host plugin (thin)**

- JCEF window hosting the SPA; lifecycle management for the facade process; an action
  to "Open folder as Legend project."
- Optional file watcher: when the user edits a `.pure` file in the IntelliJ text editor,
  invalidate/refresh Studio's loaded entities (Studio was not designed for external
  concurrent modification of its backing store — this reconciliation is a known
  hard spot and a likely source of edge-case bugs).

**Component 3 — Packaging**

- Bundle the Studio SPA build + facade jar with the plugin, or distribute as a
  standalone "Legend Local" desktop service that IntelliJ (or any browser) points at.

### What it means for the user

- **The full Studio UX, pixel-identical to the browser** — every editor, wizard, and
  panel works on day one of release, because it *is* Studio.
- But it is **Studio in a box, not an IDE experience**:
  - The `.pure` text files and the Studio window are two loosely-coupled views;
    editing files directly in IntelliJ while Studio is open risks conflicts and
    requires refresh/reload cycles.
  - No IntelliJ-native diagnostics, completion, navigation, or refactoring on `.pure`
    files (unless Option A's language layer is *also* built).
  - IntelliJ undo, local history, and search do not see edits made inside the Studio
    window until they hit disk; git operations from Studio's UI and from IntelliJ can
    race.
- Workspaces/reviews behave differently offline than users expect from browser Studio,
  since the semantics are emulated.

### Resources and timeline

| Phase | Scope | Duration | Staffing |
|---|---|---|---|
| 0 — Spike | Studio SPA in JCEF against a hand-stubbed entities endpoint | 2–3 weeks | 1 eng |
| 1 — Facade core | Entities CRUD over grammar conversion, project config, minimal workspace | 8–10 weeks | 1 backend eng + 1 eng familiar with Studio's SDLC call patterns |
| 2 — Git semantics | Branches/commits as workspaces/revisions, update/conflict flows | 6–8 weeks | backend eng |
| 3 — Host & sync | IntelliJ plugin shell, file watching, external-edit reconciliation | 4–6 weeks | 1 eng |
| 4 — Hardening | Edge cases in conflict/sync, packaging, release | 4–6 weeks | both |

- **Team:** 1 backend (Java) engineer, 1 engineer with deep knowledge of Studio's SDLC
  client behavior; total **~4–5 months** — but no intermediate usable milestone: the
  facade must be substantially complete before anything works.
- **Permanent cost:** the facade re-implements a moving API. Every Studio release that
  touches SDLC interactions must be re-validated against the emulation; this is a
  **standing maintenance tax** with no upstream (FINOS) precedent to share it with.

### Risks

| Risk | Mitigation / reality |
|---|---|
| SDLC API surface larger than estimated; all-or-nothing delivery slips | Little mitigation available — Studio requires the full entity/workspace path to boot |
| External file edits vs. Studio's in-memory state (two writers, one store) | Lockout mode ("don't touch files while Studio is open") — undermines the original goal of local file editing |
| Divergence between emulated and real SDLC semantics confuses users | Documentation; feature flags to hide unsupported flows |
| Ongoing maintenance of the facade against Studio releases | Budget permanent part-time ownership |
| Does not deliver IDE-native language features at all | Would still need Option A's Layer 1 eventually — duplicated investment |

---

## Comparison

| Dimension | Option A — Native plugin | Option B — Embedded Studio |
|---|---|---|
| First usable release | ~2 months (text editing + diagnostics) | ~4 months (all-or-nothing) |
| Full experience | 6–9 months | 4–5 months |
| `.pure` editing in IntelliJ's editor | Native, first-class | Plain text only; no language support |
| Visual editors | Studio's real components, per element, in IDE tabs | Full Studio, in one window |
| Local files as source of truth | Yes — directly | Indirect, via facade; concurrent-edit hazards |
| IDE integration (undo, VCS, search, run configs) | Full | None (browser app in a box) |
| Reuses FINOS-proven components | Yes (`legend-engine-ide-lsp`, VS Code extension patterns) | Partially (Studio SPA), but the facade is novel and unshared |
| Ongoing maintenance | Shared with VS Code ecosystem; bridge layer is thin | Standing SDLC-emulation tax owned solely by us |
| Alignment with VS Code extension strategy | Same architecture, second IDE host | Divergent |

---

## Recommendation

**Pursue Option A**, with the pure-text project storage decision scoped in parallel.

- It delivers a usable IntelliJ experience for engineers in ~2 months and compounds
  from there, rather than gating everything on a large emulation layer.
- It aligns IntelliJ and VS Code on one architecture (`legend-engine-ide-lsp` + shared
  Studio component bundles), so future editor features are built once and hosted twice.
- Option B's only real advantage — full Studio parity on day one — comes bundled with
  its central weakness: it does not actually integrate Legend into the IDE, which was
  the point of the initiative.

If leadership wants a near-term demonstrator while Option A is in flight, Option B's
Phase 0 spike (Studio in JCEF against a stub) can serve as a demo without committing to
the facade build-out.
