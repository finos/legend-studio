# @finos/legend-cube-builder

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
