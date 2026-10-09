# Legend Cube — UI questions for the original app

> **What this file is:** questions about the original app's user interface (described by
> [WIP-CUBE-SPEC.md](../../design/WIP-CUBE-SPEC.md)) that the spec leaves open: what users see and do. Cube copies
> the original's experience, not its internals: how it stores, builds or sends things is designed afresh on the
> open-source engine (user, 2026-10-08), so this file asks only about the UI. Each question says what the spec says
> now and which Cube work needs the answer. [PLAN.md](PLAN.md) holds the plan and the user's decisions.
>
> **Upkeep:** add a question when UI work hits something the spec leaves open. When one is answered, write the answer
> under it with the date, update PLAN where it changes the plan, and keep the entry.

## Needed for the operations and sources now being built

### U1. Where the node editor opens

When you click a node, where does its editor appear?

- **(a)** Below the node or beside it? How wide is it, and does the width change with the node type?
- **(b)** What happens near the right or bottom edge of the canvas, or when the editor is taller than the space left?
  Does it flip above the node, move inward, cover the results grid, or scroll inside itself?
- **(c)** Where do validation messages show: beside the wrong field or row, in a list, or only on the canvas node? Is
  there a separate details area anywhere on the screen, or is this small editor the only place a node's settings and
  errors appear?

**What the spec says:** §17.5 (spec line 1942-1943) says only that the editor is 'anchored to' the node (original: a
popover). It gives no position, size, edge behaviour or scrolling. The canvas is capped at 60% of the viewport (§17.3,
spec line 1812), so a popover near the bottom runs into the grid. A 'details panel' appears in the §2.1 diagram (spec
line 91), in describe() (spec line 454) and in §7.10/§7.11 (spec line 763, 817), but the §17.1 layout (spec line
1757-1772) has no such region. Messages are defined per row (e.g. Rename, spec line 712-719), but not where they show.

**Needed for:** The M3 decision on where the node editor opens (PLAN §12.2 item 1), and the messages in the M2 row
editors (Sort, Rename, Slice).

**Answer** (2026-10-09):

- **(a)** Below the node, centred under it. Every node type's editor has the **same fixed width, 27rem** (minimum and
  maximum are equal and no node type overrides it). It has a title bar (the node's label in large text with each word capitalised,
  a help icon, and the Select link at the right) over a body.
- **(b)** The editor floats over whatever is beneath it, **including the results grid**; the 60% cap applies to the
  canvas, not to the editor. It is meant to stay inside the window, but whether it flips above the node near the
  bottom edge could not be determined. A tall
  editor **scrolls inside itself**: the body is at least 5rem and at most **33% of the viewport height**, with a
  vertical scroll bar, and the title bar stays put. Dialogs opened from inside it (the expression editor, the
  value-list dialog, a checkbox dropdown) sit **above** it with their own backdrop; the editor stays underneath.
- **(c)** **Messages are not shown in the editor at all.** An invalid field is only marked red, with no text. The
  message text appears in one place: the hover tooltip of the node on the canvas (after a 500 ms delay, above the
  node, deduplicated and joined with newlines), together with the node's border colour (red = invalid, amber =
  incomplete). The one exception: when an _upstream_ node is broken, the editor body is replaced by a warning that
  shows the upstream message. There is **no separate details area**: the screen is header, palette, canvas, grid, and
  this editor is the only place a node's settings appear. (The spec's "details panel" wording means this editor.)

**Plan effect:** PLAN §12.2 item 1. A floating host that matches the original needs: placed below the node, 27rem
wide, body scrolling at 33vh, and dialogs opened from it stacked above it. Cube's side panel listing the node's
problems is already better than the original here.

### U2. Finishing or abandoning an edit

How does a user finish with a node's editor?

- **(a)** Is there an OK/Apply, Cancel or close (x) button? Can Cancel or Escape throw away the edits made since the
  editor opened?
- **(b)** If the user clicks another node while the editor has changes, are the changes kept, and does the other node's
  editor open?
- **(c)** While the editor has changes, what do F9/Execute, Ctrl+Z/Undo and Ctrl+click on another node do: save the
  edits first, drop them, or do nothing? If Execute runs, does it use the edited version?

**What the spec says:** §17.5 (spec line 1951-1958): edits commit when the editor closes, and clicking outside does not
close it while a nested editor is open. That implies clicking outside otherwise closes and commits. The spec says
nothing about buttons, Cancel or Escape, or how the §17.12 shortcuts (spec line 2096-2107) behave while the editor is
open. Cube's side panel has Apply and Cancel, and closing it or clicking another node applies the edits.

**Needed for:** The editor shell every M2 editor uses, and the M3 floating-editor decision (PLAN §12.2 item 1).

**Answer** (2026-10-09):

- **(a)** **There is no OK/Apply, Cancel or close button.** The editor has only its title bar and body. It closes when
  the user clicks anywhere outside it, or presses Escape (expected from standard pop-up behaviour; not
  confirmed). **Closing always applies the edits.** There is no way to discard: Escape applies too, and
  the only way back is Undo afterwards. It counts edits, not net change: if the user edits and then puts the value back
  by hand, one undo step is still added. If nothing was touched, nothing is applied and no undo step is added.
- **(b)** The edits are kept and the other node's editor opens, in the same click. A **Ctrl+click** on another node
  closes and applies this editor and makes that node the capture node, without opening its editor. The exception:
  while a dropdown, picker or dialog opened from the editor is open, outside clicks are ignored and nothing closes.
- **(c)**
  - **Execute (button or F9):** it runs the **edited** version. Execute deliberately waits a moment so that an
    open editor's pending edits are applied first: F9 acts as a click on the Execute button, that click counts as a
    click outside the editor, so the editor closes and applies first. Two catches: Execute is disabled while the
    _committed_ query is invalid, so a user fixing an invalid node cannot run it from inside that node's editor
    (F9 does nothing; they must close the editor first); and while a nested dialog is open the edits are not applied,
    so Execute would use the committed version.
  - **Ctrl+Z / Undo:** the shortcut is global (it fires wherever the focus is, including while typing in a field, and
    it blocks the browser's own text undo). It undoes the **committed** query; the open editor is not told and keeps its
    pending edits, which are then applied on top of the restored query when it closes. If the undo removed that node,
    applying fails and nothing handles that. Nothing coordinates the two.
  - **Ctrl+click on another node:** as in (b).

**Plan effect:** PLAN §7.4. The original has **neither a Cancel button nor a close button**, and its Escape applies.
Cube's Apply/Cancel is a deliberate departure, and "closing applies" does match the original. Whether to keep Cancel
is a decision, not a parity question.

### U3. Where an added step lands

When the user adds a transform without dragging it, where does it go, and can they fill it in at once?

- **(a)** From the toolbar's 'Add Items' drop-down: after the selected node, or on its own, unconnected?
- **(b)** From the right-click menu: after the node that was right-clicked? On its own when they right-click empty
  canvas?
- **(c)** After any add (including a drag, or the grid's 'Sort by'/'Filter by'), does the new node's editor open by
  itself, or must the user click the node?

**What the spec says:** §17.4 (spec line 1920-1921) says where a dragged item lands. The right-click items (spec
line 1931) and 'Add Items ▾' (spec line 1764) don't. §4.4 add (spec line 291-293) decides which node is selected,
and §12.4 (spec line 1433) puts the grid's actions after the selected node. Nothing says whether the editor opens after
an add.

**Needed for:** M2 (a new Limit, Drop or Slice needs its number right away) and the M3 entry points.

**Answer** (2026-10-09):

- **(a)** After the **selected** node (the capture node), connected: the new node is spliced between the selected node
  and whatever followed it. Only when the query is empty does it appear on its own.
- **(b)** Right-click **on a node**: after **that** node. Right-click on **empty canvas** (when the query is not
  empty): after the **selected** node, exactly like Add Items. When the query is empty there is no right-click menu at
  all. On empty canvas the Select / Remove / Swap Inputs items are shown disabled.
  - **Correction to the spec:** §17.4 says a palette item dropped on empty canvas is added _unconnected_. That is true
    only for **sources**. A **transform** dropped anywhere on the canvas that is not on a node goes after the
    selected node, the same as Add Items. Dropped _onto_ a node, it goes after that node.
- **(c)** **No.** The editor never opens by itself after any add: not from a drag, the menus, or the grid's Sort by /
  Group by / Filter by. The node just appears and the user clicks it. It becomes the capture node only if it was added
  after the selected node. Grid-menu nodes arrive already filled in and valid (Sort by X ascending; Group by X with a
  Count; Filter by X equal to the clicked cell's value). A palette-added Limit/Drop/Slice arrives with 10 (Slice 10 to 20) and is valid at once; Sort, Group, Filter, Restrict, Rename, Join, Extend and Window arrive invalid until
  configured (spec §17.6, "State on creation").

**Plan effect:** PLAN §7.3's row "drag a palette item onto the canvas → add the node, unconnected" repeats the spec's
mistake; for transforms it should read "after the selected node". For M2: since nothing opens the editor, a new Limit,
Drop or Slice works immediately because it starts at 10.

### U4. Opening the source dialog

How does the user reach the source dialog, and what does it show first?

- **(a)** When they click a source item in the left sidebar, or drop one on empty canvas, does the dialog open on that
  source's tab, or does an empty source node appear, to be filled in later?
- **(b)** When they open it from the empty canvas's 'connect to a source' link or from 'Add Items', which tab is open?
  Does it remember the last tab, search text or selection from the previous time?
- **(c)** Does it close after one source is added, or can the user add several (for example two tables) before closing?
  What is the confirm button called?

**What the spec says:** §17.2 (spec line 1788): sidebar entries are drag sources. §17.4 (spec line 1920): a drop on
empty canvas adds that node. §17.8 (spec line 2036-2037): a picked source is resolved before it is added, but §6.1 (spec
line 491) allows an unresolved '(unknown)' source. §17.3 (spec line 1827-1828): the canvas link opens the source picker.
§17.8 (spec line 2023-2034): each tab keeps its state while the dialog is open, confirm is disabled until the selection
is valid, and 'Select source type above' shows before a tab is chosen. Nothing on what is kept between openings, the
button's name, or adding several. Cube opens its picker on click or drop and closes it after each Add.

**Needed for:** The M3 sources modal and its entry points.

**Answer** (2026-10-09):

- **(a)** Clicking a sidebar item **does nothing**: the items are drag-only. Dragging a source onto the canvas (empty
  canvas, or onto a node, which is ignored) **opens the dialog on that source's tab**. No node appears until the user
  confirms; then the dialog closes, a "resolving source" overlay shows, and the resolved node appears
  **unconnected**. The 'Add Items' drop-down and the right-click menu behave the same.
- **(b)** From the empty canvas's "connect to a source" link, the dialog opens with **no tab selected** and the prompt
  "Select source type above". From the drop-down, menus or a drag, it opens on that type's tab. The last tab is **not**
  remembered. Between openings it keeps each tab's _selection_: the relational tab keeps its connection, schema, table
  and loaded schema list; the Services tab keeps nothing useful (it reloads and selects the first row; see spec
  §17.8). The search text is not kept.
- **(c)** It closes after **one** source. To add two tables the user opens it twice. The title is "Select Source", the
  confirm button is **"Select"**, and there are Cancel and a × in the header. Clicking the dark backdrop does not
  close it. In the Services tab, double-click or Enter does the same as Select.

**Plan effect:** none against the plan as written. This is what Cube already does (open on click or drop, close after
each Add), apart from the link opening with no tab.

### U5. Rows in the searchable source lists

In the tab that lists services to pick:

- **(a)** What does each row show: a name only, or also an id, owner or description?
- **(b)** Can the user see more about the highlighted item (its parameters, columns or description) before adding it?
- **(c)** Can they move through the list with the arrow keys and add the item with Enter?

**What the spec says:** §6.6 (spec line 566-579): items are {id, name, owner?}, sorted by name and id, filtered by
substring, and capped at 300 with two messages. The first item is reselected when the filter drops the selection. §17.8
(spec line 2030-2031): a tab may add an item on double-click. Nothing on what a row shows, a preview, or the keyboard.

**Needed for:** The M3 service picker, which reuses this search-and-pick pattern.

**Answer** (2026-10-09):

- **(a)** The Services tab has a filter box above a table with the columns **Name, URL Pattern, Owner(s)** (owners
  comma-joined). The filter hint reads "Enter a service name, pattern, or owner to filter".

  Rows are sorted by name, then id (case-insensitive, numbers in numeric order). The filter is a case-insensitive
  substring match on the name, id and owner(s). Long cells are cut off with an ellipsis. The dialog body is 70% of the
  viewport tall, and the table scrolls inside it.

- **(b)** **No.** There is no detail or preview pane: no parameters, columns or description before adding. Parameters
  appear only in the node's editor afterwards.
- **(c)** **Yes.** ArrowUp/ArrowDown move the highlight (stopping at the ends, scrolling it into view), and Enter adds
  the highlighted item, the same as double-click or the Select button. These keys work even while the cursor is in the
  filter box. The first row is highlighted on open, and again whenever a filter change removes the highlighted row.
  An empty result shows "No matching items found."; more than 300 matches shows "Too many matching items; list
  truncated." (only the first 300 are listed).

**Plan effect:** none. This is the pattern for the M3 service picker.

### U6. Choosing a database connection

In the relational tab, how does the user choose a connection?

- **(a)** Is it a drop-down or a list you can search? How is each connection labelled: name, host, database type, who
  used it? Are connections from saved queries shown apart from those defined in projects, and are duplicates shown once?
- **(b)** Can the user type or paste a connection that isn't listed, or edit one (host, port, database, login method)
  before testing it?
- **(c)** Once the query has a table, can the user still add a table from another connection, or a service? If not, how
  are they told: is it hidden or greyed out in the dialog, is there a message on the node, or does Execute fail with an
  error?

**What the spec says:** §6.2 (spec line 509-521): known connections come from saved queries and from connections defined
in projects. The user picks one, then presses Test Connection. Nothing on how the list looks, how connections are
labelled or de-duplicated, or how one is added. Each relational source holds its own connection (spec line 497), and no
rule across sources is given. In Cube, the first source fixes one model context for the whole cube.

**Needed for:** The M3 picker for direct database connections (PLAN §6.8), and how the M3 pickers show the one-context
rule.

**Answer** (2026-10-09):

- **(a)** A **type-ahead field**, not a drop-down, labelled "Registered Connections" (hint "Select one of previously
  registered connections.", placeholder "Start typing here to search for previously registered connection..."). It is
  disabled while there are none. Each entry is a **one-line summary built from the connection's settings**:
  database type | datasource type | a short summary | authentication type | a short summary, plus "quotes
  identifiers" when set. For example `Snowflake | Snowflake | MYDB @ WH in us-east-1 as ACME | OAuth | with KEY under
SCOPE`. Entries have **no name** and show no "who used it". Connections found in saved queries and connections
  defined in projects are **merged into one list with no separation**. Entries whose summaries are identical appear
  **once**. The list is sorted by summary.
- **(b)** **Yes to both.** Below the type-ahead the dialog has three selectors, _Database Type_, _Datasource Type_ and
  _Authentication Type_, then the fields for those choices (host, port and database name; or account, region,
  warehouse and so on; then the authentication reference fields), then a _Quote Identifiers_ Yes/No. A user can build a
  connection from scratch, or pick one and then edit any field. The Datasource and Authentication selectors lock when
  only one choice exists for the database type, and stay disabled until a database type is chosen. **Test Connection**
  is enabled only once the connection is valid. (The full field list is in spec §6.2.)
- **(c)** **There is no rule at all.** Each relational source keeps its own connection, and nothing stops the user
  adding a table from a different connection, or a service, next to it. Nothing is
  hidden or greyed out, and there is no message on the node. Whether such a query runs is the engine's decision at
  Execute, and a failure shows as a red error banner under the grid toolbar. So the one-context rule has **no
  precedent in the original**; its wording and where to show it need designing in Cube.

**Plan effect:** PLAN §6.8. Cube's single model context is a restriction the original does not have; the picker's
message for it is new design.

### U7. Picking a table after Test Connection

After 'Test Connection' succeeds, how does the user find and pick a table?

- **(a)** Are schemas and tables offered as two drop-downs, a tree, or a list with search? How does the user find one
  table among thousands? Are names shown exactly as the database returns them (case, quotes)?
- **(b)** Can they see a table's columns before adding it?
- **(c)** Are views listed, and are they marked differently from tables? What does the user see for a table with a
  column the app can't handle (for example binary data): is the table hidden, marked, or does adding it fail with an
  error?

**What the spec says:** §6.2 (spec line 516-519) and §17.8 (spec line 2032-2033): pick a connection, press Test
Connection, then pick a schema and a table. Changing the connection resets both. §17.13 gives the progress label
'Loading database schemas' (spec line 2116), and failures show in place with a trace link (spec line 2117-2120). Nothing
on the success screen, previews, views or unusual columns. The spec says only that an unknown type throws (§3.1, spec
line 156) and gives the message 'Required schema of this source could not be resolved.' (spec line 482). Cube hides
views and shows tables with BINARY columns as unavailable.

**Needed for:** The M3 direct-connection picker, and PLAN §12.2 item 4 (views and BINARY tables).

**Answer** (2026-10-09):

- **(a)** Two **type-ahead fields**, "Database Schema" then "Database Table", not a tree (hints: "Start typing here to
  search for database schema by its name..." and "...table..."). Each list is sorted case-insensitively with numbers
  in numeric order. Both are **empty and disabled until Test Connection succeeds**. To find one table among
  thousands the user types to filter. Names are shown **as the engine returns them** (case kept), except that a schema
  name wrapped in double quotes has the quotes removed. One call fetches every schema and its tables (up to 100,000
  tables).
- **(b)** **No.** There is no column preview in the picker. After adding, the table node's own editor still shows only
  schema, table and connection (U8); the columns are only visible indirectly, in the column pickers of later nodes.
- **(c)**
  - **Views:** the picker neither lists them apart nor marks them; the client shows whatever tables the engine returns,
    so whether views appear depends on the engine.
  - **A column the app can't handle:** the picker does not see columns, so it does not hide or mark such a table.
    When the table is added, the schema step fails if any column has a type the app does not know. The user sees a red
    banner "Error resolving source!" with the message `assertion error: "<TYPE>" is neither known enum nor primitive
type`, and **no node is added**. (The engine itself may drop or convert such columns first; that cannot be told
    from the client.)

**Plan effect:** PLAN §12.2 item 4. Cube's "hide views, show BINARY tables as unavailable" is better than the
original's behaviour, so there is nothing to match.

### U8. A table node, and tables that changed

What does a source node show after it is added, and what happens when its table changes?

- **(a)** When the user clicks a table node, which details does its editor show (connection, schema, table, columns and
  their types)? Can the user change the table or the connection there, or must they add a new node?
- **(b)** When Refresh, or opening a saved query, finds that the table's columns have changed, that the database can't
  be reached, or that the user has no access, what does the user see: a message on the node, an error in the graph area,
  or nothing? Can the query still be edited?

**What the spec says:** §17.6 (spec line 1986): a source's editor has read-only coordinates/identity, a parameter form
and a Refresh action. Editing a source re-resolves it (spec line 1988-1989). describe() leaves the connection out (spec
line 503-504). Sources are resolved when a query loads (§6.1, spec line 458-461), and a source whose schema can't be
resolved fails with 'Required schema of this source could not be resolved.' (spec line 482). Changed columns are not
covered. Cube warns about changes and lists the changed columns.

**Needed for:** The M3 source panel for direct connections; the error
states of direct connections; and M8 Load.

**Answer** (2026-10-09):

- **(a)** On the canvas the node shows a table icon and the text `Table "<table>" from schema "<schema>"`. Its editor
  is a **read-only three-line list**: Schema, Table, Connection (the one-line summary from U6, or the word "(invalid)"
  when the connection fails the validity check). It shows **no columns or types**, and it has **no controls**: the
  table or connection cannot be changed there. To point at another table, the user removes the node and adds a new
  one. (The spec's "Refresh action" for sources does not exist; see spec §17.6.)
- **(b)** There is **no change detection**. On opening a saved query the sources are re-resolved, and:
  - **Columns changed:** no message and no list of what changed. The node quietly takes the new columns. A later node
    that used a column that is gone turns **red** with a message such as `Column "X" is not present in the input
schema.` in its tooltip, and the nodes after it turn **amber** ("depends on some invalid inputs"). The query stays
    fully editable; Execute is disabled while it is invalid.
  - **Database unreachable, or no access:** this depends on how the _engine_ answers, which the client cannot show.
    If the whole resolve call fails, the load fails: a red banner "Error loading query!" with the engine's message,
    and the current screen is left as it was. If the engine answers without a schema for that source, the query opens
    and that node is red with "Required schema of this source could not be resolved." (downstream amber, all editable).
  - There is no Refresh button, so recovering means reloading the query.

**Plan effect:** none against the plan; Cube's warning that lists changed columns is an addition the original lacks. For
M8 Load, the original's choice to open a query with broken sources rather than refuse is worth keeping.

### U9. Arriving from another screen

From which other screens can a user open the app with a source or a saved query already chosen? The kind of screen is
enough; no names are needed.

- **(a)** What do they see when they arrive: the source alone on the canvas, its editor open, the source dialog, or
  results already run?
- **(b)** What do they see if the linked query or source doesn't exist or can't be opened?

**What the spec says:** §17.15 (spec line 2128-2132): ?queryId= opens a saved query, and ?sourceType= with ?sourceId=
starts a new query with one resolved source. Both are removed from the URL once read. Nothing on where these links come
from, what the landing screen shows, or errors.

**Needed for:** The M3 entry points (the D7 follow-up, PLAN §12.2 item 1).

**Answer** (2026-10-09):

**Which screens link in:** **this cannot be answered from what the app does or documents.** Nothing in Cube builds or documents inbound
links, and it keeps no list of who uses them. (Cube only links _out_: a source node's editor has a link that opens
that source's own page in a new tab.) The two parameter forms are `?queryId=` and `?sourceType=...&sourceId=...`.
Which neighbouring apps use them has to be asked of the people who own those apps.

- **(a)** With `?queryId=`: the saved query loads behind a full-screen "loading query" overlay, and the canvas fills
  in. Nothing is executed (the grid shows "Build or load valid query in the panel above and then press key F9 or push
  Execute Query button to display query results here.") and no editor is open. With `?sourceType=` and `?sourceId=`:
  **no dialog and no editor**; the source is resolved and appears **alone on the canvas as the capture node**, with the
  grid prompt as above. If both are given, `queryId` wins and the source parameters are ignored.
  - **Correction to the spec:** §17.15 says both parameters are removed from the address bar once read. That is true
    of the **source** parameters only. `queryId` **stays**, and always reflects the saved query that is open: it is set
    on load and save, and cleared by New Query and Paste. So the address bar is a shareable link to the current query.
- **(b)** A query that doesn't exist or can't be opened: a red banner "Error loading query!" with the server's message,
  in the graph area; the canvas stays empty and `queryId` stays in the address bar. A source that doesn't exist: a red
  banner "Error resolving source!" with the engine's message and nothing added, or, if the engine answers with no
  details instead of an error, a red node labelled "(unknown)" (which of the two happens is the engine's choice).
  The source parameters are removed from the address bar either way.

**Plan effect:** PLAN §12.2 item 1 (entry points). The "which screens" part needs input from the team, not the app's specs.

### U10. Sort, Rename and Restrict editors

In the Sort, Rename and Restrict Columns editors:

- **(a)** What does a new node start with: one empty row (Sort, Rename)? All columns ticked, or none (Restrict)? Which
  direction does a new Sort row get, and is direction a drop-down or an Asc/Desc toggle?
- **(b)** How are Sort rows reordered: a drag handle, or up and down arrows? Does Restrict have select-all, clear-all or
  a search box?
- **(c)** In the column drop-downs, can the user type to search? Is each column's type shown? Are columns used in
  another row hidden or greyed out? What does a row show when its column no longer exists because an earlier step
  changed?

**What the spec says:** §17.6 (spec line 1973, 1976-1977): Sort is an ordered list of (column, direction) rows with
add/remove/reorder, Restrict is a multi-select, and Rename is a list of (old, new) rows. §7.1 (spec line 652): the
labels are 'Asc'/'Desc'. §7.4 (spec line 695-697): the output keeps the input's column order. §17.6 (spec line
1991-1992): add-row is disabled once every column is used. §17.5 (spec line 1963-1964): pickers offer only input
columns. Cube shows each column's type. On the cube-ops branch, Sort and Rename start with one blank row and pickers
stay native selects ( there).

**Needed for:** The M2 Sort, Rename and Restrict editors (M2.8, M2.9, M2.11), and the column picker that every later
editor reuses.

**Answer** (2026-10-09):

- **(a)**
  - **Sort:** the node starts with no sorts, but the editor shows **one empty row** (blank column, direction
    Ascending) that is not part of the node until the user touches it.
  - **Rename:** one empty row (old blank, new blank).
  - **Restrict Columns:** one empty row. Nothing is "ticked"; it is a list of rows, not checkboxes. An **Add All**
    button fills the list with every column.
  - **Direction** is a **toggle**, not a drop-down: clicking the word flips Ascending to Descending and back. The
    editor writes the full words; the short "Asc"/"Desc" appear only in the node's description text.
- **(b)** Rows are reordered by **dragging the row itself**; there is no handle and no up/down arrows. It applies to
  Sort and Restrict (and Group, Window and Extend lists); **Rename rows cannot be reordered**. Restrict has **Add** and
  **Add All** but no clear-all and no search box (the user removes rows with the ✕ on each row); each row's column
  field is itself a type-ahead.
- **(c)** The column field shows the column name or "(blank)". Clicking turns it into a **type-ahead** ("Start
  typing...", with a small clear button) over the input schema's columns, sorted by name. **The type is not shown**,
  only the name. Columns already used in another row are **not hidden or greyed**; picking one marks the row **red**
  in Restrict, Group columns and Rename's old-name field (Sort allows the same column twice and does not mark it). A
  row whose column no longer exists (an earlier step changed) keeps showing the old name **in red**, and the node's
  tooltip says, for example, `Sort column "x" is not present in the input schema.`

**Plan effect:** PLAN §11.4 (M2). The original has a type-ahead, not a native select, and no type labels; Cube's
type labels are an improvement.

### U11. Screenshots

Could the team share screenshots, with names and data blurred, of:

- **(a)** the main screen with a small query, and the node editor open on a Sort, a Rename, a Limit and a Join
  (including the Join's duplicate-column fix);
- **(b)** the source dialog on each tab, including the relational tab before and after Test Connection, and the
  right-click menus on a node and on empty canvas;
- **(c)** for later work: the grid's right-click menu, the Format Column dialog, the drill-down control, the execution
  statistics popover, the save and load dialogs, the Expression Editor, and the Group and Window Functions editors?

**What the spec says:** §0.1 (spec line 51) rules out a pixel-for-pixel copy, and §17 (spec line 1749-1753) describes
behaviour, not visuals. The only size it gives is the node box (spec line 1861).

**Needed for:** The M2 editors (including the Join autofix wording), the M3 sources modal, entry points and final look,
the M3 editor-placement decision, and the M4 to M8 screens.

**Answer:** [Not able to answer]

## Needed for later milestones

### U12. Group editor defaults

In the Group editor:

- **(a)** Does a new Group node start with an aggregation row, such as a Count? When a row's column is picked, which
  function is selected by default?
- **(b)** The output name fills itself in (for example 'Notional Sum'). Does it follow later changes to the column or
  the function, and does it stop changing once the user types their own name?
- **(c)** Can the grouping columns be reordered?

**What the spec says:** §17.6 (spec line 1974): grouping columns, plus (column, aggregation, output name) rows, with
aggregations filtered by type and the name 'auto-generated but editable'. §10.3 (spec line 1141-1151) gives the naming
rule. §7.2 (spec line 674) gives only the grid's 'Group by' default (Count). Nothing on the editor's starting state, the
default function, or when the name updates.

**Needed for:** The M4 Group editor.

**Answer** (2026-10-09):

- **(a)** A new Group node starts with no columns and no aggregations in the node, but the editor shows **one empty
  aggregation row** (blank column, blank function). The grouping-columns list may be empty. **No function is chosen by
  default** when a column is picked: the function field stays blank until the user chooses from the list for that
  column's type (Count and the rest; Sum, Average, Min, Max for numbers). The "Count" default exists only for the grid's
  right-click "Group by".
- **(b)** The **output name is not editable and not shown** in the editor, which has only a column field and a function
  field per row. The name is rebuilt from them whenever either changes (`<column> <Function>`, for example
  `notional Sum`). So the case "the user types their own name" **does not exist** in the original. If the user changes
  a row's column and the old function does not apply to the new column's type, the function is cleared.
- **(c)** **Yes.** Grouping columns, and the aggregation rows, are reordered by dragging the row; their order is the
  output column order. A column repeated in the grouping list is marked red.

**Plan effect:** none. If Cube wants custom output names that is an addition; note that Group aggregations read from a
saved query lose a stored name in the original (spec §10.3).

### U13. Window function and expression editors

In the 'Apply Window Functions' editor and the Expression Editor window:

- **(a)** How are the window editor's three parts (partition columns, sort rows, function rows) laid out? Is the column
  field hidden or disabled for Rank and Dense Rank?
- **(b)** In the Expression Editor, can the user click a listed column to insert it? Is there autocomplete, syntax
  colouring, or a list of functions with help? What does the expression help link open?
- **(c)** After Validate succeeds, does the window show the result type? Does Apply return the user to the node's
  editor?

**What the spec says:** §17.6 (spec line 1984): partition columns (may be empty), sort rows and window operations, where
rank operations take no column. §9.1 (spec line 1052-1061): a modal with free text, columns listed as '[columnName]
#Type', and a Validate button (F10) that enables Apply, with errors in a read-only box. §18.3 mentions an 'expression
help clicked' event (spec line 2185). Nothing on the layout, inserting columns, autocomplete, function help or a type
display.

**Needed for:** The M5 window-function editor and the M6 Extend editor.

**Answer** (2026-10-09):

- **(a)** Three sections stacked top to bottom: **"Aggregations"** (rows of column + function) **first**, then
  **"Partition by"** (an optional list of columns), then **"Order by"** (an optional list of column + direction toggle).
  For Rank and Dense Rank the column field is **neither hidden nor disabled**; it is just optional. A row with a blank
  column offers only Rank and Dense Rank in its function field. Picking a real column switches the function field to
  that column type's aggregations. Picking a column on a row that already has Rank clears the function, because Rank
  allows no column.
- **(b)** The Expression Editor is a large dialog (60% of the screen tall) above the node editor, with its own
  backdrop; clicking the backdrop does not close it. The left pane is a scrolling **"Columns"** list showing each
  column as `[name]` in monospace with `#Type` at the right, sorted by name. **Clicking a column does nothing**: it is
  not inserted (the text can be selected and copied by hand). The right side is a large plain monospace text area:
  **no autocomplete, no syntax colouring, no function list**. Under it are a **Validate Expression** button (F10) and a
  read-only error box. Next to the title is a "Help" link that opens the expression documentation page (it appears
  only when that address is configured). Cancel (focused by default) and Apply are at the bottom.
- **(c)** After Validate succeeds **nothing is shown**: no result type and no success message. The error box stays
  empty and **Apply becomes enabled**; editing the text disables it again until the next Validate. Apply closes the
  dialog and writes the expression into the row; the node's editor stays open underneath. For an existing expression
  the dialog first shows a loading state while the engine turns it into text.

**Plan effect:** PLAN M5/M6. The original gives no result-type display and no column insertion; both would be new.

### U14. Grid modes, drill-down, formats and times

In the results grid:

- **(a)** How is the switch between the two grid modes shown and labelled? How does the user set up a drill-down: add,
  reorder and remove levels, pick measures, and turn on 'count every other column' or 'skip the hierarchy columns'?
- **(b)** Which fields does the Format Column dialog have: type, decimal places, currency symbol (typed or picked),
  thousands separator, negatives in red or in brackets? Is there a preview, and how is 'apply to all number columns'
  offered?
- **(c)** Are date-times shown in UTC or in local time, and is the time zone shown, both in the grid and when typing a
  date-time into a filter?

**What the spec says:** §12.1 (spec line 1304-1312): a toggle between server-side and local modes. §12.2 (spec line
1325-1337, 1403-1404): a drill-down has columns, aggregations, fullSchema and excludeKeys, and is entered from the
context menu. §17.11 (spec line 2091-2093) mentions a 'drill-down configuration' control. §13.1 (spec line 1489-1516)
lists the format's fields and 'apply to all'. §17.7 (spec line 2010-2015): date-times use a datetime-local input and are
kept as strings. No controls, dialog or time zone are described.

**Needed for:** The M7 grid (drill-down, formatting), and today's Filter editor for date-times.

**Answer** (2026-10-09):

- **(a)** _Mode:_ a **"Local Mode"** checkbox with a (?) help icon. It is disabled, with the tooltip "Local mode is
  currently disabled because drilldown is configured.", while a drill-down is set. Switching mode clears the results;
  the user must Execute again. _Drill-down:_ a link-style button reading `Drilldown: (none)` or, once set,
  `Drilldown: "region", "bookName"`, with a ✕ at its right that clears it (disabled while none). The button is
  **disabled while Local Mode is on**, and turns red when the drill-down no longer fits the query. Clicking opens a
  popover titled **"Drilldown"** with a **"Columns"** list (the levels; add, drag to reorder, remove), an
  **"Aggregations"** list (the measures: column + function), and two checkboxes: **"Show all columns"** (on by default;
  it counts every other column) and **"Hide key columns"** (off by default; it skips the level columns when doing
  that). The changes apply when the popover closes, and the next Execute uses them. The grid's right-click "Drilldown by
  X" adds X as a new level. If the selected node is invalid the popover shows "Selected graph node is invalid and
  drilldown depends on it. Please correct it first."
- **(b)** The **Format Column** dialog opens only from the grid's right-click menu (enabled for number columns). Title
  `Column Style for Column "<name>"`, changing to `Column Style for Number Columns` when "apply to all" is ticked.
  Fields: **"Format column as"** radio buttons (number / currency / percentage); **"Decimal Places"** drop-down
  ("Select number of decimal places..." then 0 to 5); **"Currency Symbol"** typed free text, shown only for currency
  (placeholder "Enter currency symbol like '$'"; only $, €, £ and ¥ are recognised, any other symbol falls back to a
  plain number); **"If Negative"** checkboxes **Parentheses** and **Red**; **"Thousands Separator"** checkbox "Use 1000
  Separator (,)". **There is no preview.** The footer has a checkbox "Apply to all number columns" on the left, then
  Cancel and Apply; Apply stays disabled until something changed or that box is ticked. (Known original defect: Red
  does not work as labelled; spec §21.)
- **(c)** **Neither.** There is no time-zone handling anywhere in the app. Date and date-time values are shown exactly
  as the engine sent them (as text). In a filter they are typed through the browser's own date or date-time control
  and kept as text, with no conversion and no zone label. The only locale-dependent times are in the execution
  statistics (local time, 24-hour) and the saved-queries "Last Updated" column (the browser's local date, YYYY-MM-DD).

**Plan effect:** PLAN M7. The original has no time-zone rule to copy, so Cube's decision (UTC or local, and showing it)
is new.

### U15. Saving and opening queries

When saving and opening queries:

- **(a)** What does the save dialog ask for: name, owners, tags, description? Is there a 'Save as' and a way to rename,
  and where are owners and tags changed later?
- **(b)** What does the load dialog list (name, owner, last changed), and in what order? Does it show everyone's queries
  or only the user's? Can a query be deleted, or an older version opened, from there?
- **(c)** When a save fails because someone saved a newer version first, or because the user isn't an owner, what does
  the user see? Are they offered a choice: reload, overwrite or save a copy?

**What the spec says:** §14.4 (spec line 1621-1628): Save is disabled while the query is invalid, and the load dialog
searches id, name and owners in the browser. §17.10 (spec line 2080-2087): the toolbar shows the name, or 'Unsaved
Query', with an asterisk, and hovering shows the name, id, version and owners. §14.3 (spec line 1586-1614): owners,
tags, versions, soft delete, and the two failure messages. Nothing on the dialogs or on what the user can do after a
failure.

**Needed for:** M8 save and load, with the version and owner checks (PLAN §10.6).

**Answer** (2026-10-09):

- **(a)** The dialog is titled "Save Cube Query" (originally "Save Alloy Cube Query"). For a query never saved there is
  only a **name box** ("Enter query name here") and a **Save Query** button, disabled while the name is empty. For a
  query that was loaded or saved before there are three radio buttons: **Save** ("Updates query while maintaining query
  identifier and name."), **Save as** ("Creates new query with new identifier and query name.") and **Rename**
  ("Updates query and its name while maintaining its identifier."), defaulting to Save, with the name box active for
  Save as and Rename. A note reads "NOTE: Other people may use saved query without your knowledge." **There are no
  owner, tag or description fields, and nowhere in the UI to change owners or tags later**: the creator becomes the
  only owner on first save (the server supports more, but the UI never sends them). After saving, the query is
  reloaded from the store, so the version number and the address bar update.
- **(b)** The load dialog ("Load Cube Query", large) has a **"Show only my queries"** checkbox (ticked by default,
  remembered on this browser), a filter box ("Enter a query name, ID, or owner to filter queries", focused on open), and
  a table with **Name, Owner, Last Updated** (a date, YYYY-MM-DD) and a delete ✕. Unticked, it lists everyone's queries.
  The list is sorted by name (case-insensitive, numbers in numeric order). The first row is highlighted; click selects,
  double-click or Enter loads, arrows move; an empty result shows "No matching queries found." **Delete:** the ✕
  appears only on queries the user owns, and never on the query that is currently open; it asks "Are you sure that you
  want to permanently delete this query?" (the server keeps the query's history and only removes it from the list, so the wording overstates it). **Older
  versions cannot be listed or opened**; it always loads the latest. The button is "Load Query"; loading over unsaved
  changes asks for confirmation first.
- **(c)** A failed save shows a red banner in the graph area, "Error saving query!", with the server's message, for
  example `Cannot update version 3. Current version is 4.` or `Only current owners can update this query. Current
owners are ...`. **No choice is offered** (no reload, overwrite or save-a-copy). The user's work is untouched, and
  they can choose **Save as** to keep it as a copy. The message also carries plain text lines starting `###` with the
  HTTP status and a trace identifier; there is no clickable link in the banner (see spec §17.13 correction).

**Plan effect:** PLAN §10.6 (M8). The original's flow ends at a message, so the reload/overwrite/copy choice in (c) is
new design; "Save as" already provides the copy path.

---

**Disclaimer:** These answers are based on the app's specs. The app was not run locally, so none of the behaviour
described here has been checked against a running copy.
