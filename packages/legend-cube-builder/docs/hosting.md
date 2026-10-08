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
}
```

- **The application store** gives the page its commands, user data, clipboard, theme, notifications and alerts, and
  its telemetry service, which Cube doesn't use yet: it sends no events. Cube keeps no auth or config of its own.
- **The engine:** `buildCubeEngine(config, tracerService)` builds Legend's implementation of the `CubeEngine` port.
  `config` is the engine client's configuration (`CubeEngineConfig`); Legend Query passes its own engine server URL
  and options, so Cube talks to the engine its query editor uses.
- **The models:** `new LocalModelCatalog(engine)`. It offers `BUNDLED_MODELS` (the "Northwind (Cube fixture)" model)
  and caches each model's outline. Users can also paste a Pure model.

Render the page with `<CubeEditor host={host} />`, and pass `initialDocument` to open a given cube. The page's state
lives as long as the page; Legend Query makes a new host on each visit.

**The bundled model runs only on an engine that allows LocalH2.** It sets up Northwind in an in-memory H2 database
through its connection's `testDataSetupSqls`. On an engine that forbids LocalH2, its queries don't run.

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

The manual check of the whole page is the plan's Part B (PLAN §11.2).
