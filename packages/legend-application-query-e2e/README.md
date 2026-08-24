# @finos/legend-application-query-e2e

End-to-end tests for the Legend Query web application, built with [Playwright](https://playwright.dev/).

## Architecture

The tests exercise the Legend Query webapp served by the `@finos/legend-application-query-deployment` dev server (`http://localhost:9001/query/`), backed by:

- **Depot**: the mock depot server from `@finos/legend-fixture-mock-server` (port 6200), which serves a small test project (`org.finos.legend.test:legend-query-test`) with a data space.
- **Engine**: browser-level network mocks installed per-test via `setupEngineMock()` (see [`src/support/EngineMock.ts`](./src/support/EngineMock.ts)). The app's `config.json` is intercepted with Playwright's [`page.route()`](https://playwright.dev/docs/network#modify-requests) to point the engine URL at a dead port, where every call is answered by the mocks — so tests behave identically locally and in CI, a real engine running on port 6300 can never leak into a test, and CI needs no engine at all.

Both the app dev server and the mock depot server are started automatically by Playwright's [`webServer`](https://playwright.dev/docs/test-webserver) config. Outside CI, already-running instances (e.g. your own `yarn dev:query` session) are reused instead, which makes local runs fast.

## Running the tests

```sh
# one-time: build the workspace and download the browser binary
yarn setup # or `yarn build` if the workspace is already set up
yarn workspace @finos/legend-application-query-e2e test:e2e:setup

# run the tests (starts the app + mock depot server automatically)
yarn workspace @finos/legend-application-query-e2e test:e2e
```

> The workspace must be built before running, since the app dev server bundles the built workspace libraries. If your test fails against code you just changed, rebuild (or keep `yarn dev:ts` running).

### Debugging failures

| Command                                                          | What it does                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `yarn workspace @finos/legend-application-query-e2e test:e2e:ui` | Opens Playwright UI mode: watch mode, time-travel through each step, live locator picker |
| `... test:e2e:headed`                                            | Runs tests in a visible browser window                                                   |
| `... test:e2e:report`                                            | Opens the HTML report of the last run                                                    |
| `... test:e2e --debug`                                           | Steps through a test with the Playwright inspector                                       |
| `... test:e2e --trace on`                                        | Records a full trace (DOM snapshots, network, console) for every test                    |

On failure, screenshots land in `build/test-results/`; in CI, traces are recorded on retry and the whole HTML report is uploaded as a workflow artifact (`e2e-test-report`) on the failed run's summary page.

## Adding new tests

1. Create a spec in [`src/tests/`](./src/tests/) named `<Feature>.spec.ts`.
2. Install the engine mocks in a `beforeEach`:

   ```ts
   import { test, expect } from '@playwright/test';
   import { setupEngineMock } from '../support/EngineMock.js';

   test.beforeEach(async ({ page }) => {
     await setupEngineMock(page);
   });

   test('my new flow', async ({ page }) => {
     await page.goto('setup'); // relative to baseURL http://localhost:9001/query/
     // ...
   });
   ```

3. Prefer user-facing locators (`getByRole`, `getByText`, `getByPlaceholder`, `getByTitle`) over CSS class selectors, per our [component testing guidelines](../../docs/technical/test-strategy.md#frontend-component-testing-guidelines). Fall back to class selectors only where the DOM offers nothing better (e.g. `react-select` internals).
4. Rely on Playwright's auto-waiting web-first assertions (`await expect(locator).toBeVisible()`) — never `waitForTimeout()`.
5. Playwright UI mode (`test:e2e:ui`) and `npx playwright codegen localhost:9001/query/` are the fastest ways to author locators.

### Asserting the generated query (lambda)

UI assertions prove panels render, not that the query the app _builds_ is correct. To check semantics, assert on the lambda the app sends to the engine: `setupEngineMock()` returns a `CapturedEngineRequests` handle recording every `executeInputs` (from `Run Query`) and `lambdas` (from saving) payload, and [`QueryProtocol.ts`](./src/support/QueryProtocol.ts) provides typed helpers to navigate the Pure V1 protocol — `getFunctionChain()` for the operation order, plus `asFunction`/`asProperty`/`getValue`/`getCollectionValues` for the details. See `QueryBuilderProtocol.spec.ts`.

Prefer this over scraping the `Show Protocol` viewer: the captured payload is exactly what a real engine would receive, and it needs no DOM parsing. Assert on meaningful fragments (function chain, properties, values) rather than snapshotting the whole JSON, which would break on every unrelated protocol change.

### Testing error paths

`setupEngineMock()`'s handle carries a `failures` map: set an engine path on it and the mock answers that endpoint with an error until you delete the entry, so the app's real error handling runs. Deleting mid-test lets you assert recovery.

```ts
captured.failures.set('pure/v1/execution/execute', {
  status: 500,
  message: 'table COVID_DATA does not exist',
});
// ... drive the UI, assert the message reaches the user ...
captured.failures.delete('pure/v1/execution/execute'); // next call succeeds
```

See `QueryBuilderErrorHandling.spec.ts`. Assert on the user-visible message text rather than notification CSS classes — engine errors surface through more than one component.

### Enriching depot data

The mock depot server holds a single data space with a single execution
context. Rather than growing that shared fixture — it backs local development
for every Legend app — [`DepotMock.ts`](./src/support/DepotMock.ts) intercepts
its responses and enriches them per-test: `mockAdditionalDataSpaces()` pads the
listing out to N data spaces, and `mockSecondExecutionContext()` gives the
fixture's data space a second execution context (patched into the project
entities the graph is built from, not the analytics artifact). See
`QueryBuilderDataSpaceSetup.spec.ts`.

Two things to know about the setup panel's selectors: they are virtualized
with `react-window`, so only the options in view exist in the DOM — assert on
the selector's own "N results available" status message for list size, and
search to reach entries beyond the rendered window. And the execution context
selector only renders when a data space has more than one context.

### When your flow needs backend data that isn't mocked yet

- **Result grid**: the app renders ag-grid's _community_ grid unless `TEMPORARY__enableGridEnterpriseMode` is set, and this suite runs against a dev build with no ag-grid license. Enterprise-only interactions — multi-cell range selection (needed for `Filter By` to build an `in` list) and `Copy Row Value` (needs row selection) — therefore cannot be covered here; `Filter By`/`Filter Out` fall back to the single right-clicked cell.
- **Save/load round-trip**: the engine mock is stateful per test — created queries (`POST /pure/v1/query`) are stored in-memory and served back by id, and the lambda JSON sent to `jsonToGrammar/lambda` on save is echoed back by `grammarToJson/lambda` on load, so the app's own serialization round-trips without the mock needing a Pure grammar parser (see `QuerySaveLoad.spec.ts`).
- **Engine endpoints**: unmocked engine calls fail loudly with a `501` response whose message names the endpoint (`Unmocked engine endpoint called in e2e test: ...`) — check the Playwright trace or browser console to find it. To add one: add a `case` for the endpoint in [`EngineMock.ts`](./src/support/EngineMock.ts), and put its response payload in [`TEST_DATA__EngineResponses.ts`](./src/support/TEST_DATA__EngineResponses.ts) (captured from a live engine when possible).
- **Depot data**: extend the mock depot server in [`fixtures/legend-mock-server`](../../fixtures/legend-mock-server) (`src/depot.ts` / `src/depot-data.ts`) when a flow needs additional depot routes or entities.

## CI

The `run-e2e-tests` job in [`.github/workflows/test.yml`](../../.github/workflows/test.yml) runs this suite on every PR and on pushes to `master`. It builds the workspace, installs Chromium, and lets the Playwright `webServer` config boot the app and mock depot server — no engine backend, Docker, or secrets involved. Failed runs retry twice and upload the HTML report as an artifact.
