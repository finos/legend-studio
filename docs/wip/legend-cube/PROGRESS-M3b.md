# Legend Cube — M3b Progress Log

> **What this file is:** the "where are we" ledger for M3b, canvas and layout (PLAN §11.6). It is kept apart from
> [PROGRESS.md](PROGRESS.md) and the other milestones' logs, so the lines of work merge cleanly. [PLAN.md](PLAN.md)
> §11.6 holds what M3b settled; [QUESTIONS.md](QUESTIONS.md) the user's answers it builds on; [ISSUES.md](ISSUES.md) the
> known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Branch | `cube-canvas`, on finos master `5e424277b` (first from `d847e6721`, after M4 merged as #5649); worktree `legend-studio-cube-canvas` |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`; the Query dev server for this branch runs on :9003                               |
| Step   | M3b.8 done (one placement rule)                                                                                                     |
| Tests  | 2486 core, 1298 builder (core group), 245 Query, 416 builder engine-roundtrip (after M3b.6)                                         |

## Steps

See PLAN §11.6 for each step's deliverable and when it is done.

- [x] **M3b.1** The settled decisions (PLAN §11.6) and this file
- [x] **M3b.2** One finish path; Ctrl+click, F9, Ctrl+Z and outside actions apply first
- [x] **M3b.3** The floating host, behind a prop
- [x] **M3b.4** The click-away and Escape
- [x] **M3b.5** Switch over from the side panel
- [x] **M3b.6** The editor's frame
- [x] **M3b.7** Each editor's sizing and edges
- [x] **M3b.8** One placement rule for the palette, drops and context menus
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

Filled in as steps land. Rebased on finos master `5e424277b` (#5656, CSV into DuckDB) after M3b.5: the hashes are the
rebased ones.

| Step    | Commit      | Subject                                                            |
| ------- | ----------- | ------------------------------------------------------------------ |
| Answers | `12c8782f1` | docs: record answers to Legend Cube's UI questions                 |
| M3b.1   | `455e3376e` | docs: settle Legend Cube M3b (canvas and layout)                   |
| M3b.2   | `1b7277d0a` | feat: apply Legend Cube's node editor before any other action      |
| M3b.3   | `3c70a267f` | feat: add Legend Cube's floating node editor, not yet in use       |
| M3b.4   | `172d8cbcc` | feat: close Legend Cube's floating node editor, applying its edits |
| M3b.5   | `d2f39ed89` | feat: float Legend Cube's node editor in place of its side panel   |
| M3b.6   | `1e76a681a` | feat: frame Legend Cube's floating node editor as a dialog         |
| M3b.7   | `81a29d1dd` | feat: fit each Legend Cube editor to the floating node editor      |
| M3b.8   | (this one)  | feat: add Legend Cube's steps after the selected node              |

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

**M3b.3 (2026-10-09).** The floating editor, built but not yet in use: `CubeEditor`'s `floatingEditor` prop (and
`CubeCanvas`') stays off until M3b.5 removes the side panel.

- **Anchor.** `CubeNodeEditorAnchor.ts` computes the node's screen rectangle from the dagre layout and React Flow's
  viewport, so nothing is measured.
- **Popper.** `CubeNodeEditorPopper.tsx` is a legend-art `BasePopper` rendered inside `<ReactFlow>` and portalled to
  the body: 432px wide, at z-index 1250, 8px below its node. It flips above when it fits there and shifts to stay in
  the window. It is hidden while its node is out of the canvas, and stays open with its edits.
- **Panel.** `CubeNodeEditorPanel` gains a `float` variant, with a body of 80px to 33vh that scrolls.
- **Repositioning.** MUI's Popper repositions on every render, and the popper re-renders on every pan or zoom, so it
  needs no update effect of its own.

Tests: workflow `wf_c6464b46-ce1` (one writer, a reviewer with mutation testing):

- **Mutants:** 20 of 26 killed. The reviewer showed jsdom can test placement once the canvas rectangle and the
  window's size are stubbed. Those tests now kill the four placement survivors (`m3b-verify/m3b3-fix-mutants.json`).
  The update effect was an equivalent mutant and is gone. The side panel's default layout stays unpinned until M3b.5
  removes it.
- **Browser** (`m3b-verify/browser/check-m3b3.mjs`, with the floating editor on in a local build), 30/30 at 900px and at
  560px:
  - 432px wide, 8px below and centred, shifted at the right edge, inside the window;
  - the body scrolls between 80px and 33vh;
  - it follows a pan;
  - above a node at the canvas's bottom when there is no room below.
- **The reviewer's extra checks** (`m3b-verify/m3b3/`):
  - every M2 and M4 node type, data product access points, and H2 and DuckDB tables;
  - zoom, fitView and a splitter drag;
  - hidden while out of view;
  - over the grid after Execute.

**M3b.4 (2026-10-09).** Closing the floating editor (`useCubeNodeEditorDismiss.ts`). The editor closes and applies its
edits on:

- a press of the main button outside it, as the button goes down, so Execute, Undo and the grid act on the applied
  edits;
- a click on the canvas's background;
- Escape;
- hiding the graph.

These don't close it:

- a press on a node, whose click applies the edits and opens that node or selects it;
- a press on the background, controls or minimap, so a pan or zoom keeps it open;
- a press in MUI's layers;
- a right-click, including Ctrl with the main button (a right-click on macOS);
- an Escape a field or the grid's menu already used;
- anything while a Cube dialog is open or the editor is held.

Show Pure, Export, Add table and a palette click apply the editor first by keyboard too. The grid's quick actions are
disabled while the editor holds edits.

Tests: workflow `wf_e63c407e-215`:

- **Mutants:** 20 of 25 killed, four of the five survivors equivalent. Every review fix has a test that kills its
  mutant (`m3b-verify/m3b4-fix-mutants.json`, 8/8).
- **jsdom has no PointerEvent.** The tests dispatch a MouseEvent of type `pointerdown`, which carries the button.
- **Browser** (`m3b-verify/browser/check-m3b4.mjs`), 18/18.
- **The reviewer's probe** (`probe-m3b4-review.mjs`), done before the fixes:

  - a press on a disabled Execute applies the edits, then the click runs them;
  - Show Pure pressed with the mouse shows the edited query (by keyboard it now does too);
  - the grid's column header and a palette drag apply the edits.

  Native select popups don't show in a headless browser: a headed manual check stays for the rehearsal (M3b.16).

**M3b.5 (2026-10-09).** The floating editor replaces the side panel: the page is the palette, the graph header, then
the graph above the results, and opening an editor no longer changes the page's layout or refits the canvas. The
editor's tests render the canvas alone, which floats the editor; the side panel's own tests are gone.

Tests: workflow `wf_f7acd161-e57` (page tests: the layout is unchanged when the editor opens, the editor is on the
body, one editor follows the node clicked, Remove of the edited node applies first). The reviewer found that a press
on the graph/results splitter closed the editor, against C-07: the splitter is now left alone (its test kills its
mutant). Browser, with the floating editor the default: `check-m3b2` 8/8, `check-m3b3` 39/39 at 900px and 768px,
`check-m3b4` 18/18; the reviewer's probes confirm the canvas no longer refits when the editor opens or closes.

**M3b.6 (2026-10-09).** The editor's frame, in one floating layout:

- **Dialog.** It is a non-modal dialog named by its title, each word of the label capitalised (`toEditorTitle`, display
  only).
- **Layout.** The body (80px to 33vh) scrolls. The problems strip (three lines, then it scrolls) and Apply and Cancel
  stay under it.
- **Focus.** Enter on a node moves the focus into its editor. Escape, Cancel and the × give it back to the node when it
  was in the editor; an Escape or a press elsewhere leaves it where the user put it.
- **Popper role.** MUI's Popper no longer wraps the dialog in a tooltip role.

Tests: workflow `wf_d240978c-273`. 20 of 23 mutants killed, two of the survivors equivalent and the third (the strip's
cap) now pinned by a class check; every review fix's test kills its mutant (`m3b-verify/m3b6-fix-mutants.json`, 5/5).
Browser: `check-m3b6.mjs` 7/7 at 768px, and the reviewer's `m3b6/review-m3b6.mjs` 28/28 (a tall Join with seven
incompatible pairs: the strip sits between the body and the footer, inside the window).

Gates: green but for one engine test, `CubeDirectConnection`'s 'setup SQL' case, which timed out at 30s twice. The
same test with another H2 database name passes in 56ms in the isolated copy, so the shared engine holds a stuck
connection to `CUBE_DIRECT_BAD` (an engine restart clears it); M3b.6 doesn't touch the engine path.

**M3b.7 (2026-10-09).** Each editor in the floating editor:

- **One scroller.** The body is the only scroller: the Sort, Rename, Restrict and Group lists lose their own caps.
- **Join.** Its autofix list wraps a long name instead of widening the editor.
- **Data product warehouse.** Text typed but not applied is applied when the editor closes. Its editor has no footer, so
  there is no Cancel.
- **Flusher order.** The editor's blur runs before other flushers (`addFlusher(..., { first: true })`), as PLAN orders
  them.

Tests: workflow `wf_4d45cc70-ce3`. 13 of 18 mutants killed. Four survivors were caps written another way, now caught by
a regex over the list's classes; one is equivalent (`setWarehouse` refuses blank text itself). The fix mutants are 4/4
(`m3b-verify/m3b7-fix-mutants.json`). Browser (`check-m3b7.mjs`), at 900px and 768px:

- every node type of the all-types spec, a data product access point, and H2 and DuckDB tables: 432px, nothing wider
  than the editor;
- no element in the body with a cap or a scroller (since the review, even one that doesn't overflow).

**M3b.8 (2026-10-09).** One placement rule (`stores/CubeAddPlacement.ts`) for the palette (click and drop), drops
on the canvas and both context menus (U3, U4):

- **Transforms.** A transform goes after the node it targets, or else after the selected node, and stands alone only in
  an empty query.
- **Sources.** A source ignores any node and opens its dialog tab: dropped on a node, which doesn't light up, or picked
  from a node's menu, where it is now enabled.
- **Empty query.** It has no context menu.
- **Applying first.** Adds apply the node editor first and add nothing when its edits had to be dropped
  (`finishApplied`), as Execute and Undo do. Select, Remove and Swap Inputs keep `finish()`.

Tests: workflow `wf_597e1ab9-673`:

- **Mutants:** 16 of 20 killed, two equivalent. The other two, the drops' own apply, were a backstop the browser covers
  with the drag's press; they are now pinned by a drop test with the editor open (`m3b-verify/m3b8-fix-mutants.json`,
  2/2).
- **Browser** (`check-m3b8.mjs`, real drags), 28/28:
  - a palette click and a drop on the pane go after the selected node;
  - a drop on a node splices after it and lights it;
  - a table dropped on a node opens the Model tab, unlit;
  - the menus place nodes as decided;
  - an empty cube has no menu.
- **Probe** (`probe-m3b8-editor-drop.mjs`, 7/7): a drop with the editor holding edits applies them first.
