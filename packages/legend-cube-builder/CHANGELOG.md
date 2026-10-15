# @finos/legend-cube-builder

## 0.0.5

### Patch Changes

- [#5689](https://github.com/finos/legend-studio/pull/5689) [`1cc6925`](https://github.com/finos/legend-studio/commit/1cc69259abbb451b983ac5749df6c3df708943c9) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: each run in the Runs panel keeps the lambda it sent, with its Pure and JSON, failed runs are recorded too, and Dev Settings, from a menu at the top left, change the engine URL and request compression of Cube's engine clients.

- [#5685](https://github.com/finos/legend-studio/pull/5685) [`3a26c9d`](https://github.com/finos/legend-studio/commit/3a26c9d7b8d72820cb347e25db59ffb42e3fbf2e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Move Legend Cube's demo walkthrough, fast notes and specs into the builder's docs (`docs/demo`), out of the repo's
  docs.

- [#5685](https://github.com/finos/legend-studio/pull/5685) [`3a26c9d`](https://github.com/finos/legend-studio/commit/3a26c9d7b8d72820cb347e25db59ffb42e3fbf2e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube, from demo feedback: the source dialog opened from Examples links back to them with "← Back to Examples" under its title, in place of a footer button.

- [#5681](https://github.com/finos/legend-studio/pull/5681) [`56717ae`](https://github.com/finos/legend-studio/commit/56717aeec71833675140d822879829625a102f1e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube, from demo feedback:

  - **Pick several sources at once.** The tables of Sample Data, Project Database and Direct Connection, and the access points of a data product, each have a checkbox (or Cmd/Ctrl-click a row). Add says how many it adds and adds them all in one undo step, the first one picked running; a table the engine can't type stays picked with its error while the others are added. A plain click still picks one row, a double-click adds it alone, and the access point preview shows the one picked last.
  - **Show SQL opens a dialog** with the run's SQL formatted, as Legend Query shows its executed SQL, with Copy SQL. The Runs panel formats its SQL too.
  - **The exported spec shows in a JSON code editor**, so each object and list folds.
  - **New** in the header replaces the cube with a new, empty one (one undo step), e.g. to leave an example.
  - **Back to the examples:** the source dialog opened from a dataset in Examples has a ← Examples button.

- [#5669](https://github.com/finos/legend-studio/pull/5669) [`4a0bfe3`](https://github.com/finos/legend-studio/commit/4a0bfe3e00cc835b1723834c106668a0d02baf81) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube can filter rows by a Pure condition (Filter by Expression), checked by the engine, which now checks Extend's columns and filter conditions through one path. On DuckDB, both filters refuse `%` and `_` in a starts-with, ends-with or contains pattern, which the engine's SQL would match as wildcards.

- [#5678](https://github.com/finos/legend-studio/pull/5678) [`ef8cdef`](https://github.com/finos/legend-studio/commit/ef8cdef1d4712f0808da6e100e6faa59483795d3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube can read a function of a model or a released project that returns a relation, with a value for each of its parameters, on its own runtime when its body names one, and joined with the model's tables.

- [#5694](https://github.com/finos/legend-studio/pull/5694) [`dd0b62a`](https://github.com/finos/legend-studio/commit/dd0b62af9bf179f2c20e55462ed0c3c4e6e0e8a3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube reads a lambda back into steps (Import Pure): the engine's or Cube's JSON of a lambda to Cube's IR, a run's own parts taken off, lambdas compared as the same Pure, and the relation read into steps, each checked by writing it again. `CubeEditor` opens on a host's lambda (`initialLambda`); Studio's Create MatView with Cube button is now Create MatView, and it lists the definition's materialized views to edit: Cube opens on the view, read back, and Save MatView replaces it in place, first asking again for its data's classification when it has none and for its primary key when a key column is gone. The Cube menu's Import Pure reads a pasted Pure query, or its JSON, into steps in place of the cube.

- [#5695](https://github.com/finos/legend-studio/pull/5695) [`3e5ec86`](https://github.com/finos/legend-studio/commit/3e5ec8622b5af70381a906ede4684c1906ddce22) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: a batch-milestoned ingest data set lists the columns its write mode adds in the order the engine returns them, `LAKE_DIGEST`, `LAKE_IN_ID`, `LAKE_OUT_ID` (then `LAKE_FROM`, `LAKE_THRU` for a business-temporal one), so its runs no longer fail with "The engine returned the column "LAKE_DIGEST" at position …, but the query has "LAKE_IN_ID" there". A saved cube's data sets take the new order when it is opened or refreshed, with a warning that their columns were reordered.

- [#5695](https://github.com/finos/legend-studio/pull/5695) [`3e5ec86`](https://github.com/finos/legend-studio/commit/3e5ec8622b5af70381a906ede4684c1906ddce22) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: the Ingest tab picks several data sets of a definition at once, with their checkboxes or a Cmd or Ctrl click, as the other tabs pick tables and access points, and adds them all in one step; the data set picked last is previewed. This includes the screen a host reading one project's ingest definitions shows, as Studio's Create MatView with Cube.

- [#5669](https://github.com/finos/legend-studio/pull/5669) [`1018fe9`](https://github.com/finos/legend-studio/commit/1018fe93c7d475b344643ab07b5b84ac3f262f8c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's results grid works server-side by default, with drill-down levels, CSV and Excel export, a curated menu, run stats and column formats; decimal literals are sent as text, so they keep every digit.

- [#5685](https://github.com/finos/legend-studio/pull/5685) [`3a26c9d`](https://github.com/finos/legend-studio/commit/3a26c9d7b8d72820cb347e25db59ffb42e3fbf2e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube cleans up its operations: Min and Max on strings and Booleans, Distinct Count and Distinct Value on enumerations, a Join's shared columns compared in any case, no backtick in the names it gives columns, a `startsWith`, `endsWith` or `contains` given a pattern that isn't a literal refused unless the cube runs on Snowflake, the grid's Filter by on a 32-bit float finding its rows, and the row limit read as a whole number.

- [#5678](https://github.com/finos/legend-studio/pull/5678) [`aca74f3`](https://github.com/finos/legend-studio/commit/aca74f399951a1afc66ec6eeebc586f96c483863) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube can pivot a column's values into columns through the engine's `pivot()`, refused, and greyed in the palette, on the databases that can't run it; data product and ingest cubes now know they run on Snowflake.

- [#5678](https://github.com/finos/legend-studio/pull/5678) [`54ba40f`](https://github.com/finos/legend-studio/commit/54ba40fc93e31fc3ef4621f22478aa565fd31e73) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: pick a deployed service as a source, from the engine's service registry (in progress: Cube can't read services yet).

- [#5690](https://github.com/finos/legend-studio/pull/5690) [`b33fba5`](https://github.com/finos/legend-studio/commit/b33fba599d8bb530d1587ff7c564e3f8dfa81afe) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube in Studio: an ingest definition's editor offers Create MatView with Cube (behind `NonProductionFeatureFlag`). Cube opens full screen over Studio and reads only the project's own ingest definitions and data products, as the workspace holds them: the source dialog lists them by name, each path muted beside it, with no class, deployment or search to pick, and runs use the workspace and the project's lakehouse runtime, as Studio's own queries do. Add as MatView adds the step that runs to the definition as a materialized view (a `FunctionSource` data set). Cube's host can now name the one project its sources come from (`CubeHost.project`), turn off its sample data and examples, give the engine its own ingest definitions and data product model, and add buttons to the header; the floating step editor stays above a dialog that hosts the page; the Ingest tab picks the only producer deployment and starts on the environment's warehouse; a dialog's primary button is an accent button in every theme; and the canvas keeps its controls' colours where React Flow 11's stylesheet is loaded too.

- [#5685](https://github.com/finos/legend-studio/pull/5685) [`3a26c9d`](https://github.com/finos/legend-studio/commit/3a26c9d7b8d72820cb347e25db59ffb42e3fbf2e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube, a UX pass from the demo review:

  - **Plain row-step names:** "Drop first rows", "Take first rows" and "Take a range of rows", in place of the `<x>` placeholders.
  - **Steps not set yet** show their type's name with a muted "Not set" ("Join Another Input", not "Join additional input"; not "Apply 0 Window Functions"), and their tooltip shows only what is missing. The core's nodes say whether they are set (`isUnset`).
  - **Group rows' numbers** read as quantities: their thousands grouped, an integer's too, and a fraction rounded to the column's scale, or 2 places, so an Average doesn't show every digit. A group's key is never touched, and hover and copy keep the exact value.
  - **Types by the kind of value:** the editors' column lists say "Text", "Whole number", "Date"… and "can be empty", in place of `Varchar(20)?`; the exact type is on hover, and messages that compare types (Join, Concat, a table that changed) keep it.
  - **Run this step:** a step's menu and its editor say "Run this step" in place of "Select", and the step that runs carries a "▶ Runs" badge on the canvas and in its editor.
  - **Redo** (Ctrl/Cmd+Shift+Z, or Ctrl+Y) brings back what Undo took, until a new change; a source re-checked meanwhile stays checked. **New, Import and Export** are under one "Cube ▾" menu, so the header keeps the actions used while building.
  - **A DuckDB sample, Sales**, in Examples, with two Pivot examples: the H2 samples can't run the engine's `pivot()`, so Pivot now works on a sample out of the box.
  - **A column preview for tables** in Sample Data, Project Database and Direct Connection: the table picked last shows its columns under the list once the clicks pause, as an access point does; Add takes the columns read, asking the engine only for the others.
  - **Steps by keyboard and menu:** Delete or Backspace removes the focused step; Ctrl/Cmd+C copies it and Ctrl/Cmd+V pastes the copy after the focused step; Ctrl/Cmd+D duplicates it; the node menu has Copy, Paste and Duplicate. Each is one undo step, and the keys act only on a step, never while typing. A copied source pastes only into a cube of its model, or an empty one, which takes it. The core gains `copyQueryNode`.

- [#5669](https://github.com/finos/legend-studio/pull/5669) [`b464900`](https://github.com/finos/legend-studio/commit/b464900a2bd9e800b116aa80ab169e90c90575a4) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube UX polish, from an audit of the demo:

  - **Picking a source in the source dialog.** The picked row shows an accent bar, a check and a stronger background, which hovering no longer hides. Lists sit on the input background, so hovering a row shows. Add looks disabled until something is picked, and says why. Double-clicking a table, data set or access point adds it, as does Enter on a picked one.
  - **The Join describes itself:** `Left Outer join on "DESK_ID" = "ID"` once it has key pairs, in place of "Join additional input".
  - **Node tooltips** no longer end with the node's internal id.
  - **Apply closes the node editor**, as the other ways out but Cancel do.
  - **Shorter node labels:** a source shows its name, with its schema, data product or ingest definition below; the full description stays in the tooltip. Steps sit closer together, so a long flow keeps its text larger.
  - **An added transform opens its editor**, unless it has nothing to set (Distinct).

## 0.0.4

### Patch Changes

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`1f0ad99`](https://github.com/finos/legend-studio/commit/1f0ad99fa4b8729efd9ada084d70942a42a1cf44) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's node editor floats below its node in place of the side panel. Closing it any way but Cancel applies its edits, and so does Execute, Undo, a node drag, a connection or a context-menu action. Steps from the palette, the context menu and the new Add Items menu go after the selected node. The empty canvas opens the source dialog with no tab chosen. A node's messages show in a tooltip. A link to `/query/cube?sourceType=dataProductAccessPoint&sourceId=…` opens a new cube on that access point (M3b).

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`4860e48`](https://github.com/finos/legend-studio/commit/4860e48e17654fad0ce4a421dec4fef05d099c58) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's Concat editor says when ticking Convert types would let it rename or drop columns to make the inputs
  match.

- [#5656](https://github.com/finos/legend-studio/pull/5656) [`5e42427`](https://github.com/finos/legend-studio/commit/5e424277b3b950ea418cf1ee496f5e50d77b9f72) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Load a CSV, pasted or from a file, into a Legend Cube DuckDB connection as a table: the database connection tab writes it into the setup SQL, guessing each column's type.

- [#5652](https://github.com/finos/legend-studio/pull/5652) [`4f5aab1`](https://github.com/finos/legend-studio/commit/4f5aab13d3d5745ed056c332c609dfdae7216e92) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's data product tab pages the lakehouse's list of data products itself, stopping on a page that isn't one, a missing, unreadable or repeated cursor, or past a page cap, drops a listed product it can't read rather than failing the whole list, and stops a listing once the dialog closes or the mode changes. A failed listing shows in the tab with its own Retry. When Legend Query's config names a marketplace server (`marketplace.serverUrl`, unset by default), the tab instead searches the marketplace as the viewer types, keeping only the latest search's answer and the product picked, says when a search's matches may be cut short, and reopens a data product cube on its own product without searching. A data product cube's Source panel shows its deployment class and edits its warehouse, as one undo step that is remembered for the viewer's next cubes; a warehouse change clears the run's error and marks its rows stale, a read-only cube allows no change, and a SNAPSHOT project is labelled as one that may change. An import and Refresh re-check a data product cube's access points against the deployed artifact, as tables are re-checked, Refresh reading it again, with warnings that name the access point. A run on a data product cube refused for its warehouse says so in the run's error and beside the warehouse, and one refused for access to the data links to each access point group's page in the marketplace, which Legend Query builds from its marketplace URLs by the deployment's class. The data product tab previews a picked access point from its deployed artifact, with its description, typed columns and up to five sample rows, and both the tab and the Source panel open the product's page in the marketplace. Each access point group shows the viewer's access, from their contracts, with a link to request it in the marketplace; Legend Query marks the groups open to everyone from `options.dataProductConfig.publicStereotype`, as Studio and Marketplace do. On a cube whose data products come from one project, Search all shows the class's other products too, greyed, saying which project or version they belong to.

- [#5641](https://github.com/finos/legend-studio/pull/5641) [`e015523`](https://github.com/finos/legend-studio/commit/e01552380b877e9de4251a7a46ebfefde718aaf1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: add the access points of deployed data products as a source, in beta (production and production-parallel deployments).

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`4747154`](https://github.com/finos/legend-studio/commit/474715476c1c6d3aeb626cdb50aa7675c7c8991d) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's cleanups for a demo:

  - **Numbers.** The results grid shows Decimal and Number values with their thousands grouped, every digit kept, and Float values rounded to 2 places and grouped. Integer values stay plain, so ids and years get no commas. Copying a cell copies its exact value, which also shows on hover.
  - **Export and Import** lose their "(dev)" label.
  - **A desk league table example** over the Trades sample: trades joined to their desks, each desk's dollar notional added up, then ranked within its region with a window function.
  - **Show Pure** leaves out the row limit Execute adds to see if there are more rows, as Legend Query's own Show Pure does; a Take or Drop the user added still shows. `QueryEmitter.emitExecutionLambda`'s `rowLimit` is now optional.
  - **Behind the non-production flag.** Legend Query mounts the Cube page at `/query/cube` only when `extensions.core.NonProductionFeatureFlag` is set, since Cube is still a proof of concept. To see it locally, add the flag to the deployment's `dev/config.json`.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`13747cf`](https://github.com/finos/legend-studio/commit/13747cf069ac8fe2b5063993dedfdcd3fbe70034) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube reads tables of the Databases in published Depot projects: a Project tab in the source dialog lists the depot's projects, their released versions (newest first) and a version's own Databases with their runtimes; the cube saves the engine's pointer to the project at that version, and the Source panel shows the project and version. Legend Query builds the project catalog from its `depot.url`.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`dd159b9`](https://github.com/finos/legend-studio/commit/dd159b93d7d6fb336991f0835dfab5deade50635) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add Compare Column Values (Difference) and Extend Columns to Legend Cube. Difference joins two inputs on key columns, keeping every row of both, and for each numeric difference column `x` gives `x_1`, `x_2` and `x_valueDifference`, an empty value counting as 0. Extend adds columns computed by Pure expressions, written inline, which the engine checks, types against the cube's model and plans for its database; a column can use the ones before it, and the builder types an Extend again in the background when its input changes.

- [#5641](https://github.com/finos/legend-studio/pull/5641) [`e015523`](https://github.com/finos/legend-studio/commit/e01552380b877e9de4251a7a46ebfefde718aaf1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: add tables from a direct database connection (H2 and DuckDB) through a tabbed "Add a source" dialog.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`d68ccb8`](https://github.com/finos/legend-studio/commit/d68ccb80f24b93dec798c13d82c1f5d381a15296) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's examples move from a tab of the source dialog to their own dialog, opened by an Examples button beside Add table: a grid with a card per sample dataset (which starts a new cube on it) and its example cubes (which open in place of the cube and run), with icons. Legend Art adds `TrophyIcon`.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`09fdab7`](https://github.com/finos/legend-studio/commit/09fdab7a257784406af7650c5f95bba8ca98dbe1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube ships sample data and example cubes: Sports and Trades sample models beside Northwind in the Model tab (made-up, seeded rows in an in-memory H2 database), and an Examples tab in the source dialog that opens one of six example cubes over them in place of the cube, as one undo step, and runs it. The empty canvas offers "open an example".

- [#5649](https://github.com/finos/legend-studio/pull/5649) [`d847e67`](https://github.com/finos/legend-studio/commit/d847e6721c83fe0d82b437e12a7c87e257ef83ee) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube gains Group ("Group by Column") and Concat ("Concatenate Another Input").

  Group gives one row per value of its group columns, or one row for all the rows with none, each with its
  aggregations: Count, Distinct Count, Distinct Value, Sum, Average, Min, Max and Count Rows, which counts every row.
  Each is offered on the column types the spec lists, typed and made nullable as the engine types it, and named after
  its column until renamed. The grid's quick actions gain `Group by "X"`.

  Concat gives the rows of its two inputs, which must have the same columns, matched by position. Its editor shows both
  inputs' columns side by side, marking each difference, and offers a Rename or a Restrict before an input when one
  makes them match. Its Convert types setting converts types that differ within numbers, strings or dates to the type
  they share; the Join and Filter editors warn that a date converted with timestamps matches them only at midnight.

  Engine tests hold the schema Cube infers to the engine's for every node type.

- [#5654](https://github.com/finos/legend-studio/pull/5654) [`59bbf5d`](https://github.com/finos/legend-studio/commit/59bbf5d54238b5049d7cb7a298aa0f0d04f9cf94) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube reads the data sets of deployed ingest definitions (beta), as Data Cube's producer source picks them: an Ingest tab and an "Ingest Dataset" palette item (Mode, the viewer's environment, a producer deployment, one of its definitions, a data set), typed from what the definition declares, and run through the `#I` accessor on a lakehouse runtime with the cube's warehouse, which the data set's panel edits. A cube reads one kind of source: tables, data products or ingest data sets. Legend Query offers it when its optional `lakehouse.platformUrl` is set.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`4860e48`](https://github.com/finos/legend-studio/commit/4860e48e17654fad0ce4a421dec4fef05d099c58) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's adding-an-operation guides, testing notes and READMEs cover Group and Concat: two-input nodes with their
  own port labels, settings that change a node's types, autofixes offered only when they make a node valid, warnings
  shown in an editor, and the conformance and database tests a new node type needs.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`dd159b9`](https://github.com/finos/legend-studio/commit/dd159b93d7d6fb336991f0835dfab5deade50635) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add Lag, Lead, NTile, Percent Rank, Cumulative Distribution, First and Last to Legend Cube's Apply Window Functions. Lag and Lead read a column from the row so many rows before or after, by the window's sort; First and Last read the partition's first and last rows; NTile splits each partition into buckets; Percent Rank and Cumulative Distribution place each row in its partition. Each needs a sort column.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`99a95ab`](https://github.com/finos/legend-studio/commit/99a95abc7be7eada933788fe67bf440a4da6f195) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube's source dialog tabs are renamed Sample Data, Project Database, Direct Connection, Data Product and Ingest. Sample Data lists the three bundled datasets (Northwind, Sports, Trades) and no longer offers pasting a Pure model; its Northwind leaves out Cube's test tables, and a cube saved with the earlier Northwind still shows as Northwind.

- [#5659](https://github.com/finos/legend-studio/pull/5659) [`4860e48`](https://github.com/finos/legend-studio/commit/4860e48e17654fad0ce4a421dec4fef05d099c58) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add window functions to Legend Cube: Apply Window Functions (Partition), with partition columns, sort columns, and Count, Distinct Count, Distinct Value, Sum, Average, Min, Max, Count Rows, Rank, Dense Rank and Row Number. Every window that isn't the node being run is bound with a `let`, so a later filter can't run before it.

## 0.0.3

### Patch Changes

- [#5634](https://github.com/finos/legend-studio/pull/5634) [`3260216`](https://github.com/finos/legend-studio/commit/3260216a6c3468ff506065b929b7c5093ea81e69) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: the canvas fits the query again when only its height changes, e.g. when the splitter above the results grid moves. Both packages document how to host the page, how to test it, and how to add an operation.

- [#5644](https://github.com/finos/legend-studio/pull/5644) [`0335b3f`](https://github.com/finos/legend-studio/commit/0335b3f5fa7604f3c58a22485effb7a6b395860d) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube gains its simple operations:

  - Sort ("Sort by Column") orders rows by one or more columns, each ascending or descending. The order is written where
    it is used: before a Limit, Drop or Slice, and before the rows shown. A Sort whose order a later node loses, such as
    a Join, shows a warning.
  - Restrict ("Restrict Columns") keeps some columns of its input, in the input's order.
  - Rename ("Rename Columns") gives columns new names, refusing a name another column keeps. A Join whose inputs share
    columns it isn't joined on offers to rename them before each input.
  - Limit ("Take first <x> rows") keeps the first rows of its input, Drop ("Drop first <x> rows") removes them, and Slice
    ("Take rows <x> to <y>") keeps the rows from a start up to, but not including, a stop, counting from 0. Their sizes
    and bounds are whole-number fields that report a cleared or invalid value instead of falling back to the default.
  - Distinct ("Distinct Values") keeps one row of each set of identical rows.
  - Read from the runtime's connections, the databases whose engine SQL is rejected or takes the wrong rows get another
    form: Drop and Slice go through row numbers on SQL Server, Sybase and Sybase IQ, and Drop also on DB2, MemSQL and
    ClickHouse; on Sybase IQ, so does every Limit; and a Distinct is padded on SQL Server and Sybase IQ.
  - A right-click on a cell of the results offers Sort by and Filter by its column, which add a Sort, or a Filter on the
    cell's value, after the node that ran.

## 0.0.2

### Patch Changes

- [#5591](https://github.com/finos/legend-studio/pull/5591) [`fbde437`](https://github.com/finos/legend-studio/commit/fbde4379fcaa2693f4661c0974ded1379a841ed1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add the packages of Legend Cube, a visual query builder: `@finos/legend-cube` (the host-free domain model) and `@finos/legend-cube-builder` (the UI and the Legend engine adapter). Legend Query hosts the Legend Cube page at `/query/cube`, loaded on first visit. The page draws the query as a canvas: tables come from a bundled or pasted Pure model, Join and Filter steps are added from a palette, by drag and drop or from a context menu, and edited in a side panel. It runs the query on the engine and shows its rows, with undo, keyboard shortcuts (F9, Ctrl/Cmd+Z), Show Pure, and export and import of the cube's spec.
