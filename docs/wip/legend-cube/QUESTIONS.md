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

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

### U5. Rows in the searchable source lists

In the tabs that list items to pick (services, Data Browser queries, PURE functions):

- **(a)** What does each row show: a name only, or also an id, owner or description?
- **(b)** Can the user see more about the highlighted item (its parameters, columns or description) before adding it?
- **(c)** Can they move through the list with the arrow keys and add the item with Enter?

**What the spec says:** §6.6 (spec line 566-579): items are {id, name, owner?}, sorted by name and id, filtered by
substring, and capped at 300 with two messages. The first item is reselected when the filter drops the selection. §17.8
(spec line 2030-2031): a tab may add an item on double-click. Nothing on what a row shows, a preview, or the keyboard.

**Needed for:** The M3 pickers for databases from a project catalog and for deployed data products, which reuse this
search-and-pick pattern.

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

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

**Needed for:** The M3 source panel for project-catalog databases, direct connections and data products; the error
states of direct connections; and M8 Load.

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.

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

**Answer:** open.
