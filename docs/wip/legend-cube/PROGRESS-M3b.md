# Legend Cube — M3b Progress Log

> **What this file is:** the "where are we" ledger for M3b, canvas and layout (PLAN §11.6). It is kept apart from
> [PROGRESS.md](PROGRESS.md) and the other milestones' logs, so the lines of work merge cleanly. [PLAN.md](PLAN.md)
> §11.6 holds what M3b settled; [QUESTIONS.md](QUESTIONS.md) the user's answers it builds on; [ISSUES.md](ISSUES.md) the
> known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------- |
| Branch | `cube-canvas`, from finos master `d847e6721` (M4 merged as #5649); worktree `legend-studio-cube-canvas` |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`; the Query dev server for this branch runs on :9003   |
| Step   | M3b.2 done (one finish path; outside actions apply first)                                               |
| Tests  | 2486 core, 1199 builder (core group), 245 Query, 415 builder engine-roundtrip                           |

## Steps

See PLAN §11.6 for each step's deliverable and when it is done.

- [x] **M3b.1** The settled decisions (PLAN §11.6) and this file
- [x] **M3b.2** One finish path; Ctrl+click, F9, Ctrl+Z and outside actions apply first
- [ ] **M3b.3** The floating host, behind a constant
- [ ] **M3b.4** The click-away and Escape
- [ ] **M3b.5** Switch over from the side panel
- [ ] **M3b.6** The editor's frame
- [ ] **M3b.7** Each editor's sizing and edges
- [ ] **M3b.8** One placement rule for the palette, drops and context menus
- [ ] **M3b.9** 'Add Items ▾'
- [ ] **M3b.10** The source dialog's no-tab state and the empty-canvas wording
- [ ] **M3b.11** The node tooltip
- [ ] **M3b.12** Entry links for data product access points (can be cut)
- [ ] **M3b.13** Docs, guides and changeset
- [ ] **M3b.14** PR description; marked ready for review
- [ ] **M3b.15** Verification
- [ ] **M3b.16** Browser rehearsal
- [ ] **M3b.17** A demo video of M3b's features (PLAN §11.3)
- [ ] **M3b.18** Rebase on the latest master; fold PLAN §11.6's supersessions in

## Commits

Filled in as steps land.

| Step    | Commit      | Subject                                                       |
| ------- | ----------- | ------------------------------------------------------------- |
| Answers | `220f02218` | docs: record answers to Legend Cube's UI questions            |
| M3b.1   | `5be141305` | docs: settle Legend Cube M3b (canvas and layout)              |
| M3b.2   | (this one)  | feat: apply Legend Cube's node editor before any other action |

## Step notes

**M3b.1 (2026-10-09).** Requirements came from `m3b-requirements` (workflow run `wf_b6df1aad-dfc`, 5 agents: four
readers and a synthesizer that checked their claims):

- **Readers:** the answers and spec §17; the canvas and palette code; the editor shell and every editor; how to build a
  floating host, covering Data Cube's windows, MUI Popper and xyflow.
- **Output:** 69 checklist items, a 19-step build order, a per-editor fit table and 3 questions.
- **Where it is:** the full result is `m3b-requirements-result.json` in the local evidence folder, with the reports
  under `m3b-requirements/`.

The user answered four questions on 2026-10-09:

- **Editor host:** the floating editor (recommended).
- **Finishing an edit:** keep Apply and Cancel.
- **Palette:** keep the click, and add 'Add Items ▾' (recommended).
- **Entry links:** data product access points only (recommended).

What it established:

- **Width.** Legend's root font size is 62.5%, and Tailwind converts only its theme values, so `w-[27rem]` would render
  270px. The editor is 432px, written in px.
- **Every editor already fits that width**, since all were built for the 400px panel. Height is the cost: Group is
  about 650px tall against a body of about 297px.
- **The Popper and the alternatives.** A MUI Popper portalled to the body floats over the grid. xyflow's `NodeToolbar`
  would be clipped by the canvas's `overflow: hidden`, and Data Cube's windows (react-rnd) have no click-away.
- **What today's code does instead:**
  - Ctrl+click only selects, leaving an open editor with its edits.
  - F9 runs the committed query.
  - Node drags, handle connects and context-menu actions drop the open editor's edits with a notice.
  - A transform dropped on the pane, or added from its menu, lands unconnected.
- **A reversal the advisor caught.** The synthesizer had read U4(a)'s account of the original as an order to make the
  palette drag-only. U4's Plan effect says Cube's click is fine, so the click stays, and so does the Relational item's
  last-tab fallback. The rule: check each answer's Plan effect before changing Cube.

**M3b.2 (2026-10-09).** One finish path for the node editor, still in the side panel:

- **`nodeEditor.finish()`** commits the editor's pending input, then applies and closes. The panel registers a flusher
  that blurs a focused field inside it, so a filter value still being typed is kept. Edits the query can't take close
  the editor with a notice. While `holdOpen()` is held (a dropdown, picker or dialog opened from the editor), nothing
  finishes it and the shortcuts wait.
- **Apply first:** Execute and F9 run the edited query (F9 runs even while only the edits make the query valid), Undo
  and Ctrl+Z apply then undo, so they drop the edits. Ctrl/Cmd+click and Ctrl/Cmd+Enter on a node apply, select and
  open nothing. A node drag, a connection (dragged or clicked) and every context-menu item apply first; Swap Inputs on
  the edited node itself is its editor's own, which stays open. The × finishes too.
- **Execute and Undo after dropped edits** stop there (`finishApplied()`): the run wouldn't be what the user edited.

Tests: workflow `wf_bae62bfd-8c7` (two writers, a reviewer with mutation testing in the isolated copy under the
evidence folder's `m3b-verify/`): 20 of 23 mutants killed (one unreachable in jsdom, one equivalent). Its findings were
fixed and each fix's test kills its mutant (`m3b-verify/m3b2-fix*-mutants.json`). Two guards for a held editor (node
drag, connection) were dropped: a held editor has a backdrop open, so neither can start. Browser check on :9003:
`m3b-verify/browser/check-m3b2.mjs`, 8/8 (on macOS, Ctrl-click is a right-click: the check uses Cmd-click).
