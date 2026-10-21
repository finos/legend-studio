# Hosting the Cube page

A Legend application hosts the page by giving it a `CubeHost` and contributing its shortcuts. Two applications
host it today:

- **Legend Analytics**, at `/analytics/`, an application of its own: `createLegendAnalyticsCubeHost`
  (`src/stores/`) and the page at its root (`src/components/`) of `@finos/legend-application-analytics`, with its
  bootstrap and deployment (PLAN §11.19). Its host is a `LegendCubeHost` (below).
- **Legend Studio**, from an ingest definition's editor (see [Legend Studio](#legend-studio-create-matview)).

Legend Query hosted the page at `/query/cube` until Legend Analytics took it over (PLAN §11.24).

## The host

```ts
interface CubeHost {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly engine: CubeEngine;
  readonly modelCatalog: LocalModelCatalog;
  readonly connectionExplorer?: CubeConnectionExplorer | undefined;
  readonly dataProductCatalog?: CubeDataProductCatalog | undefined;
  readonly ingestCatalog?: CubeIngestCatalog | undefined;
  readonly projectCatalog?: CubeProjectCatalog | undefined;
  readonly serviceCatalog?: CubeServiceCatalog | undefined;
  readonly store?: CubeStore | undefined;
  /** False to leave out the Sample Data tab and the Examples, as Studio does */
  readonly offersSampleData?: boolean | undefined;
  readonly engineClientSettings?: CubeEngineClientSettings | undefined;
}
```

**A Legend deployment's host:** `new LegendCubeHost(applicationStore, config, parts?)` builds every part below from
a plain `LegendCubeHostConfig`, the deployment's servers: `engine` (a `CubeEngineConfig`), and `depotServerUrl`,
`lakehouseContractUrl`, `lakehousePlatformUrl`, `marketplaceServerUrl`, `marketplaceApplicationUrl`,
`marketplaceProductionParallelUrl`, `enterpriseStereotype` and `getPreferredEnvironment`, each only where the
deployment has it. It offers each source by the rules below (no lakehouse, no data products; no platform, no ingest
data sets; no depot, no projects), links data products to the marketplace of their deployment's class, and registers
every engine client with its `engineClientSettings`, which Dev Settings changes. It always builds a store, on the
engine's query server (below). Tests give an engine, a connection explorer, a project catalog or a store as `parts`. Legend Analytics passes `buildLegendAnalyticsCubeHostConfig`; a host
whose sources are its own builds its parts
with the functions below instead.

- **The application store** gives the page its commands, user data, clipboard, theme, notifications and alerts, and
  its telemetry service, which Cube doesn't use yet: it sends no events. Cube keeps no auth or config of its own.
- **The engine:** `buildCubeEngine(config, tracerService)` builds Legend's implementation of the `CubeEngine` port.
  `config` is the engine client's configuration (`CubeEngineConfig`); Legend Analytics passes its own engine server
  URL and options.
- **The models:** `new LocalModelCatalog(engine)`. It offers `BUNDLED_MODELS` (the Northwind, Sports and Trades datasets of the Sample Data tab)
  and caches each model's outline: its tables, for the source picker, and its runtimes' connections with their
  database types, which Drop, Slice, Limit and Distinct need on some databases (PLAN §11.4), and which tell DuckDB's
  refusal of `%` and `_` in filter patterns (PLAN §8.2) and where Pivot can run (PLAN §11.12). A data product or
  ingest cube's database is the one its lakehouse runtime routes to, from one table in `CubeLakehouseRuntime.ts`
  (Snowflake for now). Users can also paste a Pure
  model.
- **Direct database connections (optional):** `buildCubeConnectionExplorer(config, tracerService)` builds the explorer
  that reads the database behind a connection through the engine's schema exploration
  (`/pure/v1/utilities/database/schemaExploration`), with its own client configured as the engine's. Without one,
  the source picker offers no database connection. H2 and DuckDB only for now, and only secret-free authentication: a
  cube saves its connection, so it never holds a password or token.
- **Data products (optional, beta):** `buildCubeDataProductCatalog(services)` lists the deployed data products of a
  class from the lakehouse's lite list and reads a product's access points from its deployed artifact and definition in
  the depot. Pass `buildCubeLakehouseEnvironment(services)` to `buildCubeEngine` as `lakehouseEnvironment`, so data
  product cubes run in the viewer's lakehouse environment. `services` holds the host's lakehouse contract and depot
  clients, its token getter and the viewer's id; Legend Analytics builds them only when its `lakehouse` is configured. With
  the optional `marketplaceServerClient`, the catalog's `search` runs the marketplace's Lakehouse Access full-text
  search instead, one page of 100 matches, never reading the lite list, and its optional `isCutShort` says whether an
  answer leaves out matches; Legend Analytics passes a client only when `marketplace.serverUrl` is also set. The optional
  `getMarketplaceLink` builds a product's page in the host's marketplace, for the preview, the Source panel and the
  "Request access" links; without it, no link shows. The catalog's `getAccess` reads the viewer's access to each access
  point group from their contracts, and the optional `enterpriseStereotype` names the stereotype marking groups open to
  everyone (Legend Analytics reads `options.dataProductConfig.publicStereotype`, as Studio and Marketplace do).

- **Ingest data sets (optional, beta):** `buildCubeIngestCatalog(config, tracerService, services)` reads the deployed
  ingest definitions as Data Cube's producer source does: the lakehouse platform's ingest environment named by the
  viewer's environment in the class, its producer deployments, a deployment's definitions deployed from SDLC, and a
  definition's grammar, which the engine Cube uses parses. It needs `services.platformServerClient` and
  `services.ingestServerClient` (an ingest client with no server of its own: each call names one), and gives none
  without them. Pass it to `buildCubeEngine` as `ingestCatalog` too, so ingest cubes type and run. Legend Analytics builds
  both clients only when `lakehouse.platformUrl` is set. With `services.deploymentNameServiceUrl`, the engine path of
  the Legend user service Marketplace's producer info reads, the Ingest tab labels each producer deployment with its
  name; without it, or when the service fails, producers show their ids alone.

- **Published projects (optional):** `buildCubeProjectCatalog(depotServerClient)` lists the depot's projects, their
  released versions, and a version's own Databases with the runtimes of it and its dependencies, for the source
  dialog's Project tab (PLAN §6.3). It reads nothing until the tab opens. Project cubes save the engine's pointer, so
  the engine must fetch from the same depot. Legend Analytics builds it from `depot.url`.

- **Saved cubes (optional):** `buildCubeStore(config, tracerService, engineClientSettings?)` builds Legend's
  implementation of the `CubeStore` port over the engine's Cube store (`pure/v1/query/cube`, legend-engine's
  `legend-engine-application-query`), on `config.queryBaseUrl`, else on `config.baseUrl`, which Dev Settings may
  change: Legend Analytics passes `engine.queryUrl`, else `engine.url`. With it, the 'Cube' menu offers Load, Save,
  Save as and Delete, the header a Save button and the cube's name with an asterisk while it has unsaved changes, and
  the page asks before they are lost (PLAN §11.13). Without it, as in Studio, the page offers none of these and tracks
  no unsaved changes; Export, Import, Copy and Paste remain. The engine's store needs a Mongo and three Vault keys
  beside the Data Cube store's, in `query.mongo.database`: `query.mongo.collection.cube`,
  `query.mongo.collection.cubeVersion` and `query.mongo.collection.cubeEvent`. An engine without the store, or
  without its Mongo, makes every call fail with the engine's message. Ownership is checked against the application
  store's current user, and the store checks it again.

Legend Analytics mounts the page at its root with no flag: deploying the application is the opt-in. Only `engine`
is required in its config; each source below needs its servers.

In Legend Analytics' config file, data products need `lakehouse.url` and `depot.url`; ingest data sets need
`lakehouse.url` and `lakehouse.platformUrl`, the key Data Cube and Marketplace use for the platform. Three keys are
optional: `marketplace.serverUrl`, for search on the marketplace server, takes the value Legend Marketplace's own config
gives `marketplace.url`; `extensions.core.dataProductConfig.publicStereotype`, for the "Enterprise access" badge, is the
stereotype Studio and Marketplace use for groups open to everyone; and
`extensions.core.dataProductConfig.producer.deploymentLegendServiceUrl`, for the producers' names in the Ingest tab,
takes the value Legend Marketplace's own config gives it.

```json
{
  "lakehouse": {
    "url": "<the lakehouse contract server>",
    "platformUrl": "<the lakehouse platform>"
  },
  "marketplace": {
    "url": "<Legend Marketplace, for links>",
    "productionParallelUrl": "<its production-parallel deployment>",
    "serverUrl": "<the marketplace server>"
  },
  "extensions": {
    "core": {
      "dataProductConfig": {
        "publicStereotype": {
          "profile": "<profile path>",
          "stereotype": "<stereotype>"
        },
        "producer": {
          "deploymentLegendServiceUrl": "<the deployment directory's user service path>"
        }
      }
    }
  }
}
```

Render the page with `<CubeEditor host={host} />`, and pass `initialDocument` to open a given cube, `initialCubeId`
to open a saved cube from the store as the page opens (a failure shows "Error loading query!" in the graph area), or
`initialSource` to start an empty cube with one data product access point, as a link would ask:
`?sourceType=dataProductAccessPoint&sourceId=<id>` (Legend Query read that link; no host reads it now, PLAN §11.24). The id is `<class>/<data product id>/<deployment id>/<access point
group>/<access point>`, each part URI-encoded (`formatCubeAccessPointEntryId` writes it), where `<class>` is
`PRODUCTION` or `PRODUCTION_PARALLEL` (`CubeDataProductEnvironmentType`), and the link encodes the
whole id once more as the parameter's value, as any query value is (`encodeURIComponent(id)`).
`onSavedCubeChange` tells the host when the saved cube shown changes (on Load, Save, Undo and Redo, and to none on
New, Paste, Import and an example). Legend Analytics opens the saved cube `/analytics/cube/<id>` names, or
`?queryId=<id>`, which it moves into the path, and then replaces the address with `/analytics/cube/<id>`, or
`/analytics/`, adding no history entry, so the address always links to the cube shown; both addresses render the same
page, which stays mounted between them. While the cube has unsaved changes, the page blocks leaving it through the
navigator (`blockNavigation`: the browser's `beforeunload`, and Legend's own navigation, which asks first). The page's
state lives as long as the page.

**The bundled model, and H2 connections, run only on an engine that allows LocalH2.** It sets up Northwind in an
in-memory H2 database through its connection's `testDataSetupSqls`. On an engine that forbids LocalH2, its queries don't
run.

## Legend Studio: Create MatView

An ingest definition's editor in Studio offers **Create MatView** in every deployment, with no feature flag
(`EmbeddedCubeState`, `src/stores/editor/embedded-cube/` of `@finos/legend-application-studio`). The page opens full
screen over the editor, as the embedded query builder does, with `LegendStudioCubeHost`:

- **The project:** `CubeHost.project` (`LegendStudioCubeWorkspace`) says the page reads one project's own sources. The
  source dialog's Ingest and Data Product tabs then list that project's definitions and products by name, each path
  muted beside it, with no class, producer deployment, search or warehouse to pick, and name the lakehouse runtime
  its runs use: the project's first, the one Studio's own queries of an ingest definition or a data product pick.
  Without one, the tabs say to add one. No sample data or examples (`offersSampleData: false`), databases or
  services; one kind of source per cube, as in Legend Analytics.
- **Ingest data sets:** `LegendStudioCubeIngestCatalog` lists the workspace's definitions under one producer that
  stands for the project, names each by the URN it would have if the project deployed it (`formatCubeIngestUrn`),
  and types their data sets from their content (`readCubeIngestDataSets`), with no engine call.
- **Data products:** `LegendStudioCubeDataProductCatalog` lists the workspace's products, as version `workspace`, and
  types their lakehouse access points with the engine (`#P{product.accessPoint}#`), a product's in one call.
- **The model typing and runs read:** the workspace, as Studio's own queries send it: the ingest catalog's
  `getModelElements` (`ingestDefinitionSource` on `buildCubeEngine`) and the workspace's `getProjectModel`
  (`dataProductModelSource`), in place of the deployed definitions and the project's deployed version. A run adds
  Cube's lakehouse runtime, in the project runtime's environment (`lakehouseEnvironment`), on the cube's warehouse,
  which starts as the runtime's.
- **Add MatView:** a button the host adds to the header (`headerActions` on `CubeEditor`) takes the step that runs
  as a lambda with no runtime and no row limit (`buildCubeRunningStepLambda`), asks for a name, a classification of
  its data and a primary key among the step's columns (`analysis.schemas` of the selected step), but the
  milestoning columns a write mode adds (`LAKE_IN_ID`, `LAKE_DIGEST`, …), and appends a
  `FunctionSource` data set to the definition. Studio sees it as a local change; Lineage and View SQL work on it.
- **Edit MatView:** the button's menu lists the definition's materialized views. Cube opens on one, read back into
  its steps (`initialLambda` on `CubeEditor`, Import Pure, PLAN §11.18): the host binds its sources as the source
  dialog would add them, and a banner says when Cube writes the view another way. The header button is then
  **Save MatView**, which replaces that view's lambda in place, keeping its name, place and other keys, and adding
  the empty lists the engine reads that it lacks. When the view has no classification of its data, or its primary
  key has a column the step no longer has or a milestoning one, Save MatView first asks for them again in Add
  MatView's dialog.
- **Loading:** Studio loads Cube with the dialog, on its first opening (`React.lazy`), so Cube's code stays out of
  Studio's main bundle.

While the page is open, Studio's own shortcuts are off (its F9 compiles), and Cube's are on: Studio's core plugin
contributes `LEGEND_CUBE_COMMAND_CONFIG`. The floating step editor is placed in the dialog that hosts the page, so the
dialog doesn't hide it. In a light theme, Cube's dialogs draw their primary button as an accent button
(`CubeDialogTheme.ts`): legend-art's light variant draws it grey.

## Shortcuts

A Legend application binds keys only through its plugins. The host returns the page's commands from one of its
plugins:

```ts
override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
  return collectKeyedCommandConfigEntriesFromConfig(LEGEND_CUBE_COMMAND_CONFIG);
}
```

The page registers the commands while it is open: F9 runs the query, Ctrl+Z or Cmd+Z undoes, and Alt+N, Alt+C and
Alt+V start a new cube, copy and paste one, with Alt+L and Alt+S to load and save with a store (Option on a Mac: the
keys are `KeyboardEvent.code` names).

## The stylesheet

- Import `@finos/legend-cube-builder/lib/index.css` in the host's stylesheet (Legend Analytics does it in
  `legend-application-analytics-bootstrap/style/index.scss`). The page's root element has the class `legend-cube`.
- The page uses Tailwind classes. The host's Tailwind build must scan the builder's sources: Legend Analytics'
  deployment scans `../legend-*/src/**/*.tsx`. So Tailwind classes go in `.tsx` files only.
- React Flow's stylesheet comes with the canvas. In a host where the page isn't the application, load it lazily, as
  Legend Studio does, to keep it and the page's libraries out of the host's main bundle.
- In the legacy light theme, the legend-art components the page uses (dialogs, menus, form fields, inputs, tooltips,
  notifications) take their light look from the application's own stylesheet: Legend Analytics copies the matching
  rules of Legend Query's light mode into `legend-application-analytics-bootstrap/style/light-mode.scss`, imported
  after every other style. A new host defaulting to the light theme needs the same.

## The dev loop

1. Start an engine on `localhost:6300` that allows LocalH2: legend-engine's `org.finos.legend.engine.server.Server`
   from an IDE, or the repo's docker compose
   (`fixtures/legend-docker-setup/grammar-test-setup/grammar-test-setup-docker-compose.yml`). Check it with
   `curl -s localhost:6300/api/server/v1/info`.
2. Run `yarn build` once: `yarn dev:ts` doesn't build the stylesheets.
3. Run `yarn dev:ts` and `yarn dev:analytics`, and open `http://localhost:9009/analytics/` (run
   `yarn workspace @finos/legend-application-analytics-deployment setup` once for its local config).
4. Run `yarn workspace @finos/legend-cube-builder dev:sass` to rebuild the stylesheet as you change it (the root
   `yarn dev:ts` already rebuilds the TypeScript).

If Tailwind classes seem to do nothing, the deployment's Tailwind watcher may have stopped: it exits when
`yarn dev:analytics` runs without a terminal. Restart it in a terminal of its own with
`yarn workspace @finos/legend-application-analytics-deployment dev:tailwindcss`, or rebuild once with
`build:tailwindcss` (again after each new class).

**A second checkout.** To run a second copy next to the first (another git worktree, say), give it its own port and
skip the watchers you don't need: in that checkout, run `yarn install`, `yarn build` and
`yarn workspace @finos/legend-application-analytics-deployment setup` once, then
`yarn workspace @finos/legend-application-analytics-deployment build:tailwindcss` and
`yarn workspace @finos/legend-application-analytics-deployment dev:webpack --port 9010 --client-web-socket-url ws://localhost:9010/ws`,
and open `http://localhost:9010/analytics/`. The dev server serves the packages' built `lib/`, so rebuild what you change
(`yarn workspace @finos/legend-cube-builder build:ts`, and `@finos/legend-cube`'s) before looking, or run `yarn dev:ts`.

**Saving cubes locally.** Run an engine with the Cube store and a Mongo (legend-engine's
`legend-engine-application-query`, PLAN §11.13, M8.3), and point the deployment's `engine.queryUrl` at it.

The manual check of the whole page is the plan's Part B (PLAN §11.2).
