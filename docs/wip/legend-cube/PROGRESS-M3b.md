# Legend Cube — M3b Progress Log

> **What this file is:** the "where are we" ledger for M3b, canvas and layout (PLAN §11.8). It is kept apart from
> [PROGRESS.md](PROGRESS.md) and the other milestones' logs, so the lines of work merge cleanly. [PLAN.md](PLAN.md)
> §11.8 holds what M3b settled; [QUESTIONS.md](QUESTIONS.md) the user's answers it builds on; [ISSUES.md](ISSUES.md) the
> known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Branch | `cube-canvas`, on finos master `5e424277b` (first from `d847e6721`, after M4 merged as #5649); worktree `legend-studio-cube-canvas` |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`; the Query dev server for this branch runs on :9003                               |
| Step   | M3b.18 done: every step done; the PR is ready for review                                                                            |
| Tests  | 2486 core, 1347 builder (core group), 245 Query, 416 builder engine-roundtrip (after M3b.15)                                        |

## Steps

See PLAN §11.8 for each step's deliverable and when it is done.

- [x] **M3b.1** The settled decisions (PLAN §11.8) and this file
- [x] **M3b.2** One finish path; Ctrl+click, F9, Ctrl+Z and outside actions apply first
- [x] **M3b.3** The floating host, behind a prop
- [x] **M3b.4** The click-away and Escape
- [x] **M3b.5** Switch over from the side panel
- [x] **M3b.6** The editor's frame
- [x] **M3b.7** Each editor's sizing and edges
- [x] **M3b.8** One placement rule for the palette, drops and context menus
- [x] **M3b.9** 'Add Items ▾'
- [x] **M3b.10** The source dialog's no-tab state and the empty-canvas wording
- [x] **M3b.11** The node tooltip
- [x] **M3b.12** Entry links for data product access points (can be cut)
- [x] **M3b.13** Docs, guides and changeset
- [x] **M3b.14** PR description; marked ready for review
- [x] **M3b.15** Verification
- [x] **M3b.16** Browser rehearsal
- [x] **M3b.17** A demo video of M3b's features (PLAN §11.3)
- [x] **M3b.18** Rebase on the latest master; fold PLAN §11.8's supersessions in

## Commits

Filled in as steps land. Rebased on finos master `5e424277b` (#5656, CSV into DuckDB) after M3b.5: the hashes are the
rebased ones.

| Step    | Commit      | Subject                                                                  |
| ------- | ----------- | ------------------------------------------------------------------------ |
| Answers | `12c8782f1` | docs: record answers to Legend Cube's UI questions                       |
| M3b.1   | `455e3376e` | docs: settle Legend Cube M3b (canvas and layout)                         |
| M3b.2   | `1b7277d0a` | feat: apply Legend Cube's node editor before any other action            |
| M3b.3   | `3c70a267f` | feat: add Legend Cube's floating node editor, not yet in use             |
| M3b.4   | `172d8cbcc` | feat: close Legend Cube's floating node editor, applying its edits       |
| M3b.5   | `d2f39ed89` | feat: float Legend Cube's node editor in place of its side panel         |
| M3b.6   | `1e76a681a` | feat: frame Legend Cube's floating node editor as a dialog               |
| M3b.7   | `81a29d1dd` | feat: fit each Legend Cube editor to the floating node editor            |
| M3b.8   | `9b22589e9` | feat: add Legend Cube's steps after the selected node                    |
| M3b.9   | `1c1bc7469` | feat: add Legend Cube's Add Items menu in place of Add table             |
| M3b.10  | `c20ab24b4` | feat: open Legend Cube's source dialog with no tab from the empty canvas |
| M3b.11  | `5c0521b07` | feat: show Legend Cube's node messages in a tooltip above the node       |
| M3b.12  | `d4e937d1f` | feat: open Legend Cube on a data product access point from a link        |
| M3b.13  | `ced0bf124` | docs: guide Legend Cube's editors in the floating node editor            |
| M3b.15  | `0ea779e8c` | fix: fix Legend Cube M3b's verification findings                         |
| M3b.16+ | `cdfe12d91` | docs: record Legend Cube M3b's rehearsal and demo video                  |
| M3b.18  | (this one)  | docs: fold Legend Cube M3b into the plan's canvas and editor sections    |

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

**M3b.9 (2026-10-09).** 'Add Items ▾' replaces 'Add table' in the graph's header (`components/CubeAddItems.tsx`). It
lists the palette's items: the sources the cube can take, then the transforms, placed by M3b.8's rule. The canvas's
context menu lists the same items from the same function. A disabled source says why: `OTHER_SOURCE_KIND_TITLE`, as in
the palette, or the source dialog's own reason. Tests open the source dialog through Add Items (`TEST__chooseAddItem`).

Tests: workflow `wf_579863ba-371`, 14 of 17 mutants killed:

- **The keyboard trap.** The reviewer found that the first version, built on `ControlledDropdownMenu`, trapped the
  keyboard: no Escape, no item reachable. It is now legend-art's `DropdownMenu` with MUI menu items, as Data Cube's
  title bar: the arrows, Enter and Escape work, and the focus goes back to the button.
- **Tests added:** for that, for disabled reasons and titles, and that 'Add table' is gone. The fix mutants are 4/4
  (`m3b-verify/m3b9-fix-mutants.json`).
- **Browser** (`check-m3b9.mjs`), 27/27:
  - the menu's items;
  - a transform after the selected node;
  - the table item opens the dialog;
  - a typed Limit size is applied first;
  - the menu sits over the floating editor.

**M3b.10 (2026-10-09).** The empty canvas reads "Connect to a source to start a new one." Its link opens the source
dialog with no tab chosen, prompting "Select source type above" (U4(b)); Add stays disabled until a tab is chosen. A cube
with a fixed context, or a host serving one tab, opens on that tab. The picker change is a few small hunks in
`CubeSourcePickerState` (the sources session's file): `isChoosingTab` and `openToChoose()`.

Tests: workflow `wf_d0f07822-b4f`; 21 of 21 mutants killed. The tests that opened the dialog through the old link now
choose the tab they need. Browser (`check-m3b10.mjs`), 29/29. Noted, not changed: legend-art's `ModalFooterButton`
looks the same disabled as enabled (older than this step).

**M3b.11 (2026-10-09).** The node's tooltip is legend-art's (MUI). It opens after 500 ms, above the node, one message a
line (U1(c)), and is non-interactive. It describes the node (`describeChild`) rather than renaming it, and is at most
40rem wide. The same text is on the node's body as `aria-description`, which the tests read instead of the native
title, now gone.

Tests: workflow `wf_cb95f66c-ad5`. 15 of 20 mutants killed. The reviewer found why the 500 ms delay looked pinned and
wasn't: legend-dev-utils retries a failed test twice (`jest.retryTimes(2)`), and MUI remembers an open tooltip for
800 ms across tests, so a retry passed on `enterNextDelay`. The tests now let that lapse after each test. They pin
`disableInteractive` and `describeChild` too (`m3b-verify/m3b11-fix-mutants.json`, 3/3). Browser (`check-m3b11.mjs`):
nothing at 400 ms, the tooltip at 650 ms, above the node, error, then description, then id. Known, low, in ISSUES.md:
the tooltip stays through a node drag or a zoom until the pointer moves.

Lesson for mutation runs: with `jest.retryTimes(2)`, a mutant whose first failing attempt leaves module-wide state
behind can pass on a retry. A surviving mutant is worth a second look for that.

**M3b.12 (2026-10-09).** Entry links for data product access points (U9, Q4):
`?sourceType=dataProductAccessPoint&sourceId=<class>/<data product id>/<deployment id>/<group>/<access point>`.

- **Legend Query** (`LegendQueryCubeEntry.ts`) reads the parameters once with `URLSearchParams` (Legend's own reader
  decodes twice, which breaks an encoded part) and takes them out of the address after the page shows. A `queryId`
  wins and stays.
- **The builder** (`CubeEntrySource.ts`) finds the product through the catalog and adds the access point through the
  data product tab, as a pick would: alone, selected, on the remembered warehouse, with no dialog or editor and
  nothing run. It refuses a cube that isn't new, and opens once.
- **Failures** show "Error resolving source!" with the reason (`CubeEntrySourceBanner`).

Tests: workflow `wf_a4d586cc-6b3`, 20 of 22 mutants killed:

- **The review's fixes.**

  - The page changed the address while rendering, which React warned about. The read is now pure and the strip runs in
    an effect.
  - The double decoding.
  - Wrong messages, and a second open running at the same time: the open now refuses a cube that isn't new, and opens
    once.

  Their tests kill their mutants (`m3b-verify/m3b12-fix-mutants.json`, 2/2).

- **Real-router page tests** check that the address is stripped, and that `queryId` wins.
- **Browser** (`check-m3b12.mjs`), 27/30. The three failures are recorded limits: the strip pushes a history entry, and
  a raw `%2F` (not encoded as the documented format asks) decodes to `/`. Recorded in ISSUES.md: the history entry, a
  malformed `%` stopping Legend Query itself, and a full-text catalog search that could miss an exact id. A real
  access point couldn't be resolved in the browser: the data product servers aren't running.

**M3b.13 (2026-10-09).** Docs for the floating node editor:

- **`adding-an-operation.md`** gives the editor's rules: 432px, the body as the one scroller, closing applies, a field's
  blur and `addFlusher`, and portals hold the editor open.
- **`testing.md`** covers the canvas floating the editor in tests, `pointerdown` as a `MouseEvent`, stubbing placement,
  the tooltip's MUI memory against Jest's retries, and the Add Items helpers.
- **`hosting.md`** gives `initialSource` and the link format.
- **Also:** the README, the last "side panel" docstring, and the changeset's final text.

**M3b.14 (2026-10-10).** #5657's description rewritten for review and marked ready, with Auto-fix on. #5655 closed
without merging, so this PR's first commit carries the answers.

**M3b.15 (2026-10-10).** Verification (`wf_ce506b61-8ab`, four area reviewers and a skeptic per finding, in the
evidence folder's `verify-5657-result.json`) kept 11 findings, all reproduced, all fixed:

- **Floating editor.**
  - It is placed again when its own content grows (a ResizeObserver), so Apply and Cancel stay in the window.
  - F9 and Ctrl+Z from inside it give the focus back to the node.
- **Add Items.** A disabled source can be hovered and reached by the keyboard, so its reason shows. It uses
  `aria-disabled` and `disabledItemsFocusable`, with a not-allowed cursor.
- **Grid quick actions.** They wait while the editor holds uncommitted input (`hasPendingInput`), and treat any stale
  result as stale. Their apply compares the whole document.
- **Data product warehouse.** Text applied when the editor closes isn't remembered for the viewer's next cubes, so
  Undo takes it back entirely.
- **Entry links.**
  - The error keeps the catalog's detail, shown on demand.
  - A link refuses a cube that changed while it was read, and is interrupted (not misreported) when the dialog closed
    or another product was picked meanwhile.
  - The dialog's tab is left clean after a failure.
  - Only the source's parameters leave the address.
  - The public API is documented, and the parser is no longer exported.
- **testing.md** shows how a page test gets the page's state.

Tests: workflow `wf_9b0a6e64-1b1` wrote a test for each fix. Its review found two more problems: a product picked in
the dialog while a link read its own, and the keyboard still skipping a disabled item. Both are fixed. The fix mutants
are 5/5 (`m3b-verify/m3b15-fix-mutants.json`). Browser: the verification's probes pass (`m3b15/`), and every
`check-m3b*.mjs` passes but the three recorded `check-m3b12` limits.

**M3b.16 (2026-10-10).** Browser rehearsal (`m3b-verify/browser/rehearsal-m3b.sh`, against :9003 at `0ea779e8c` with
the libraries rebuilt; results in `rehearsal-m3b/summary.txt`). Every check passes but the three recorded `check-m3b12`
limits (the strip's history entry, Back returning to the link, a raw `%2F` id):

- every `check-m3b*.mjs`, with the editor checks (`check-m3b3`, `-6` and `-7`) at window heights of 900px and 768px;
- the host growth probe at both heights, and the Add Items hover probe.

Not checkable headless: a native `<select>`'s OS popup (Escape, or a click outside, while it is open). It stays a
manual check.

**M3b.17 (2026-10-10).** Demo video (`demo/demo-m3b.mjs`; `demo/out-demo-m3b/legend-cube-m3b-canvas.webm`, with a
screenshot per moment in `frames/`). All 22 of its checks pass. It shows:

1. the empty canvas, and the source dialog with no tab chosen;
2. the floating editor, and Execute applying its edit first;
3. a click on another node applying the open editor and opening that node's in the same click, and Cmd+click selecting
   with no editor;
4. Add Items and a palette drop each adding after the selected node, and a source dropped on a node opening the dialog;
5. the tooltip;
6. an entry link that can't be opened.

Each frame was read against its caption. The recording has no address bar, so the demo shows the address in an overlay
for the entry link, before and after. The video was sent to the user, to attach to #5657.

**M3b.18 (2026-10-10).** finos master is still `5e424277b`, the commit the branch sits on, so no rebase was needed.
PLAN §11.8's supersessions are folded in:

- **§7.1:** the floating editor and 'Add Items ▾'.
- **§7.2:** the tooltip.
- **§7.3:** the gesture table rewritten to the placement rule and to applying first.
- **§7.4:** the host, the frame and the finish path, with the click-away's rules and `holdOpen()`. "Following the
  cube" is narrowed to what the user didn't do from outside the editor. The editor contract gains the 432px,
  one-scroller and `addFlusher` rules.
- **§7.5, §7.8:** "panel" becomes "editor", and `nodeEditor` lists `finish()`, `holdOpen()` and `addFlusher()`.
- **M1.8b's settled answers:** dated notes only, for the palette source item and the side panel's rule.
- **Appendix A:** rows for §17.4, §17.5 and §17.15.

Part B's manual steps 1–3 still named 'Add table', the side panel, and a Join dropped unconnected. Step 3 now says the
Join goes after ORDERS, the selected node, and only CUSTOMERS is connected by hand. A probe checks that step in the
browser (`m3b-verify/browser/probe-partb3.mjs`, 10/10): ORDERS feeds Left, the Join is incomplete and the capture node,
no editor opens, and CUSTOMERS connects to Right.

**Merge of finos master (2026-10-10).** #5654 (ingest data sets, `59bbf5d54`) merged into master and conflicted with
#5657, so master was merged in (Auto-fix asks for a merge, not a rebase):

- **Warehouse control.** Master moved the data product's warehouse control to `CubeWarehouseControl.tsx`, shared with
  ingest data sets. The flusher that applies typed text when the editor closes moved with it, so it covers both.
- **Ingest editor tests.** They drop the side panel they rendered beside the canvas, since the canvas floats the
  editor.
- **Editor title test.** It lists `ingestDataset`.
- **Docs.** PROGRESS.md, the README and hosting.md keep both sides.

Gates: check:ci and lint pass. Tests: 2506 core, 1456 builder, 259 Query. Engine round trips: the ingest round trip
passes; the four tests that send rejected setup SQL (H2 and DuckDB) time out on the stuck local engine; the other 415 of 419 pass.

**Retargeted to `cube-dev` (2026-10-10).** The user moved Legend Cube's PRs to finos `cube-dev`, squash-merged there,
while master has no approvers over the weekend. #5657 now targets `cube-dev`, which was merged in (`ed375e076`: M4's
follow-ups and M5, the examples, Depot databases, the renamed source tabs):

- **Plan.** M5 holds §11.6 on `cube-dev` and M6 (#5662) takes §11.7, so M3b is now **§11.8**, along with every
  reference M3b added. Part B's first step, the milestone table and Appendix A keep both sides.
- **Empty canvas.** "Connect to a source to start a new one, or open an example."
- **One scroller.** M5's Partition editor, the shared column checklist and the Group editor's aggregations drop their
  inner caps. A browser probe at window heights of 900px and 768px (`probe-partition-fit.mjs`) finds the Partition
  editor 432px wide, with its body as its one scroller and Apply in the window.
- **Tests.**
  - `cube-dev`'s Partition and project source editor tests no longer render the side panel.
  - Tests that open the source dialog use its new tab names (Sample Data, Direct Connection).
  - The source picker's tests open it from Add Items, straight on its tab.
  - The editor-title and Add Items lists include Apply Window Functions.

Gates: check:ci and lint pass. Tests: 2772 core, 1555 builder, 259 Query. Engine round trips: 685 of 689 pass; the four
setup-SQL tests still time out on the stuck local engine.
