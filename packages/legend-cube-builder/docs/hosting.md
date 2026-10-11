# Hosting the Cube page

A Legend application hosts the page by giving it a `CubeHost` and contributing its shortcuts. Legend Query is the
host today: `LegendQueryCubeHost` (`src/stores/cube/`), and the lazy route and page (`src/components/cube/`) of
`@finos/legend-application-query`.

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
}
```

- **The application store** gives the page its commands, user data, clipboard, theme, notifications and alerts, and
  its telemetry service, which Cube doesn't use yet: it sends no events. Cube keeps no auth or config of its own.
- **The engine:** `buildCubeEngine(config, tracerService)` builds Legend's implementation of the `CubeEngine` port.
  `config` is the engine client's configuration (`CubeEngineConfig`); Legend Query passes its own engine server URL
  and options, so Cube talks to the engine its query editor uses.
- **The models:** `new LocalModelCatalog(engine)`. It offers `BUNDLED_MODELS` (the Northwind, Sports and Trades datasets of the Sample Data tab)
  and caches each model's outline: its tables, for the source picker, and its runtimes' connections with their
  database types, which Drop, Slice, Limit and Distinct need on some databases (PLAN §11.4). Users can also paste a Pure
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
  clients, its token getter and the viewer's id; Legend Query builds them only when its `lakehouse` is configured. With
  the optional `marketplaceServerClient`, the catalog's `search` runs the marketplace's Lakehouse Access full-text
  search instead, one page of 100 matches, never reading the lite list, and its optional `isCutShort` says whether an
  answer leaves out matches; Legend Query passes a client only when `marketplace.serverUrl` is also set. The optional
  `getMarketplaceLink` builds a product's page in the host's marketplace, for the preview, the Source panel and the
  "Request access" links; without it, no link shows. The catalog's `getAccess` reads the viewer's access to each access
  point group from their contracts, and the optional `enterpriseStereotype` names the stereotype marking groups open to
  everyone (Legend Query reads `options.dataProductConfig.publicStereotype`, as Studio and Marketplace do).

- **Ingest data sets (optional, beta):** `buildCubeIngestCatalog(config, tracerService, services)` reads the deployed
  ingest definitions as Data Cube's producer source does: the lakehouse platform's ingest environment named by the
  viewer's environment in the class, its producer deployments, a deployment's definitions deployed from SDLC, and a
  definition's grammar, which the engine Cube uses parses. It needs `services.platformServerClient` and
  `services.ingestServerClient` (an ingest client with no server of its own: each call names one), and gives none
  without them. Pass it to `buildCubeEngine` as `ingestCatalog` too, so ingest cubes type and run. Legend Query builds
  both clients only when `lakehouse.platformUrl` is set.

- **Published projects (optional):** `buildCubeProjectCatalog(depotServerClient)` lists the depot's projects, their
  released versions, and a version's own Databases with the runtimes of it and its dependencies, for the source
  dialog's Project tab (PLAN §6.3). It reads nothing until the tab opens. Project cubes save the engine's pointer, so
  the engine must fetch from the same depot. Legend Query builds it from `depot.url`.

Legend Query mounts the Cube page at `/query/cube` only where its config turns on non-production features,
since Cube is still a proof of concept: `"extensions": { "core": { "NonProductionFeatureFlag": true } }`. Without
it, as in production, the address shows nothing. To see it locally, add it to the deployment's
`dev/config.json`, which is ignored by git. `yarn setup` writes that file without the flag, since turning it on also
changes the rest of Query (its data space selector lists data products too), which Query's end-to-end tests check.

In Legend Query's config file, data products need `lakehouse.url` and `depot.url`; ingest data sets need
`lakehouse.url` and `lakehouse.platformUrl`, the key Data Cube and Marketplace use for the platform. Two keys are optional:
`marketplace.serverUrl`, for search on the marketplace server, takes the value Legend Marketplace's own config gives
`marketplace.url`; `extensions.core.dataProductConfig.publicStereotype`, for the "Enterprise access" badge, is the
stereotype Studio and Marketplace use for groups open to everyone.

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
        }
      }
    }
  }
}
```

Render the page with `<CubeEditor host={host} />`, and pass `initialDocument` to open a given cube, or
`initialSource` to start an empty cube with one data product access point, as a link to Legend Query's Cube page does:
`?sourceType=dataProductAccessPoint&sourceId=<id>`. The id is `<class>/<data product id>/<deployment id>/<access point
group>/<access point>`, each part URI-encoded (`formatCubeAccessPointEntryId` writes it), where `<class>` is
`PRODUCTION` or `PRODUCTION_PARALLEL` (`CubeDataProductEnvironmentType`), and the link encodes the
whole id once more as the parameter's value, as any query value is (`encodeURIComponent(id)`). Legend Query reads the
two parameters and takes them out of the address, keeping the others; a `?queryId=` wins and stays, for when Cube
saves queries (M8). The page's state
lives as long as the page; Legend Query makes a new host on each visit.

**The bundled model, and H2 connections, run only on an engine that allows LocalH2.** It sets up Northwind in an
in-memory H2 database through its connection's `testDataSetupSqls`. On an engine that forbids LocalH2, its queries don't
run.

## Shortcuts

A Legend application binds keys only through its plugins. The host returns the page's commands from one of its
plugins:

```ts
override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
  return collectKeyedCommandConfigEntriesFromConfig(LEGEND_CUBE_COMMAND_CONFIG);
}
```

The page registers the commands while it is open: F9 runs the query, and Ctrl+Z or Cmd+Z undoes.

## The stylesheet

- Import `@finos/legend-cube-builder/lib/index.css` in the host's stylesheet (Legend Query does it in
  `legend-application-query-bootstrap/style/index.scss`). The page's root element has the class `legend-cube`.
- The page uses Tailwind classes. The host's Tailwind build must scan the builder's sources: Legend Query's deployment
  scans `../legend-*/src/**/*.tsx`. So Tailwind classes go in `.tsx` files only.
- React Flow's stylesheet comes with the canvas. Load the page lazily, as Legend Query does, to keep it and the page's
  libraries out of the host's main bundle.

## The dev loop

1. Start an engine on `localhost:6300` that allows LocalH2: legend-engine's `org.finos.legend.engine.server.Server`
   from an IDE, or the repo's docker compose
   (`fixtures/legend-docker-setup/grammar-test-setup/grammar-test-setup-docker-compose.yml`). Check it with
   `curl -s localhost:6300/api/server/v1/info`.
2. Run `yarn build` once: `yarn dev:ts` doesn't build the stylesheets.
3. Run `yarn dev:ts` and `yarn dev:query`, and open `http://localhost:9001/query/cube`.
4. Run `yarn workspace @finos/legend-cube-builder dev:sass` to rebuild the stylesheet as you change it (the root
   `yarn dev:ts` already rebuilds the TypeScript).

If Tailwind classes seem to do nothing, the deployment's Tailwind watcher may have stopped: it exits when
`yarn dev:query` runs without a terminal. Restart it in a terminal of its own with
`yarn workspace @finos/legend-application-query-deployment dev:tailwindcss`, or rebuild once with `build:tailwindcss`
(again after each new class).

**A second checkout.** To run a second copy next to the first (another git worktree, say), give it its own port and
skip the watchers you don't need: in that checkout, run `yarn install`, `yarn build` and
`yarn workspace @finos/legend-application-query-deployment setup` once, then
`yarn workspace @finos/legend-application-query-deployment build:tailwindcss` and
`yarn workspace @finos/legend-application-query-deployment dev:webpack --port 9002`, and open
`http://localhost:9002/query/cube`. The dev server serves the packages' built `lib/`, so rebuild what you change
(`yarn workspace @finos/legend-cube-builder build:ts`, and `@finos/legend-cube`'s) before looking, or run `yarn dev:ts`.

The manual check of the whole page is the plan's Part B (PLAN §11.2).
