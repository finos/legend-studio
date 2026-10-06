# @finos/legend-cube

The host-free core of Legend Cube, a canvas-based visual query builder: types, schemas, the query graph, inference and
validation, transforms, filters, the Cube IR and its emitter, and the saved-spec codec.

The UI and the Legend engine adapter live in [`@finos/legend-cube-builder`](../legend-cube-builder).

## Host-free rule

This package runs anywhere JavaScript runs: no browser, no Node and no Legend host code. In code outside tests:

- **Only relative imports.** The package has no runtime dependencies. ESLint enforces this, and so does
  `src/__tests__/LegendCubeHostFree.test.ts`.
- **Only ECMAScript globals.** `tsconfig.build.json` compiles against the ECMAScript library with no ambient types, so
  `window`, `document`, `fetch`, `console`, `setTimeout`, `structuredClone`, `URL`, `TextEncoder` and the like fail the
  build. The same test runs that compile, and ESLint flags the most common browser globals while you type.

Tests may use Node and Jest.
