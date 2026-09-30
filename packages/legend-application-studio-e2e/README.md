# @finos/legend-application-studio-e2e

End-to-end tests for the Legend Studio web application, built with [Playwright](https://playwright.dev/).

## Architecture

The tests exercise the Legend Studio webapp served by the `@finos/legend-application-studio-deployment` dev server (`http://localhost:9000/studio/`), backed by:

- **Engine**: a real engine on port 6300, run in Docker from the same compose file as the engine round-trip tests ([`fixtures/legend-docker-setup/grammar-test-setup`](../../fixtures/legend-docker-setup/grammar-test-setup)). The flows this suite exists for — switching between form and text mode, compiling, and the errors that come back — need the real grammar parser and compiler; mocking them would test the mock. Every engine call goes through [`EngineSpy.ts`](./src/support/EngineSpy.ts), which records it and can make any endpoint fail or hang on demand.
- **SDLC**: an in-memory SDLC server, answered in the browser by [`SDLCMock.ts`](./src/support/SDLCMock.ts). It holds one project (`E2E-1`) with one user workspace (`e2e-workspace`) holding a small model (see [`TEST_DATA__SDLC.ts`](./src/support/TEST_DATA__SDLC.ts)). Pushing changes commits a new revision that later loads serve back, so a test can push, reload and see what was saved.
- **Depot and showcase**: stubbed in the browser; the test project has no dependencies, published versions or showcases.

[`setupStudio()`](./src/support/StudioSetup.ts) wires all of this up per test, by intercepting the app's `config.json` with Playwright's [`page.route()`](https://playwright.dev/docs/network#modify-requests): the SDLC, depot and showcase URLs point at ports where nothing listens, so a real SDLC server running locally can never leak into a test.

## Running the tests

```sh
# one-time: build the workspace and download the browser binary
yarn setup # or `yarn build` if the workspace is already set up
yarn workspace @finos/legend-application-studio-e2e test:e2e:setup

# run the tests (starts the engine in Docker, and the app, automatically)
yarn workspace @finos/legend-application-studio-e2e test:e2e
```

Docker must be running. Playwright's [`webServer`](https://playwright.dev/docs/test-webserver) config starts the engine with `docker compose` unless one already answers on port 6300. The first run pulls the engine image, which takes a few minutes. The engine is reused across runs, and by the engine round-trip tests; stop it with:

```sh
docker compose --file=fixtures/legend-docker-setup/grammar-test-setup/grammar-test-setup-docker-compose.yml down
```

The compose file names its container `engine`. If you already have a container by that name (e.g. from another Legend setup), `docker compose up` fails with a name conflict: start any engine on port 6300 yourself instead, and the tests reuse it.

> The workspace must be built before running, since the app dev server bundles the built workspace libraries. If your test fails against code you just changed, rebuild (or keep `yarn dev:ts` running).

The debugging commands are the same as the Legend Query suite's (`test:e2e:ui`, `test:e2e:headed`, `test:e2e:report`, `--debug`, `--trace on`); see its [README](../legend-application-query-e2e/README.md#debugging-failures).

## Adding new tests

1. Create a spec in [`src/tests/`](./src/tests/) named `<Feature>.spec.ts`.
2. Set up the backends and open the workspace in a `beforeEach`, and drive the editor with the helpers in [`StudioHelpers.ts`](./src/support/StudioHelpers.ts):

   ```ts
   import { test, expect } from '@playwright/test';
   import { setupStudio, type StudioBackends } from '../support/StudioSetup.js';
   import {
     clickExitTextMode,
     enterTextMode,
     expectFormMode,
     openWorkspace,
     replaceInGrammar,
   } from '../support/StudioHelpers.js';

   let backends: StudioBackends;

   test.beforeEach(async ({ page }) => {
     backends = await setupStudio(page);
     await openWorkspace(page);
   });

   test.afterEach(() => {
     expect(backends.unmockedCalls).toEqual([]);
   });

   test('my new flow', async ({ page }) => {
     await enterTextMode(page);
     await replaceInGrammar(page, 'age: Integer[0..1];', 'age: Integer[1];');
     await clickExitTextMode(page);
     await expectFormMode(page);
   });
   ```

3. The same guidelines as the Legend Query suite apply: prefer user-facing locators, and rely on web-first assertions rather than `waitForTimeout()`.

### Editing grammar

The text mode editor is Monaco, which only renders the lines in view and auto-closes brackets and quotes as you type. So `getGrammarText()` copies the whole grammar out through the clipboard rather than reading the DOM, and `setGrammarText()` / `replaceInGrammar()` insert text the way a paste does. Assert on fragments of the grammar (`toContain`) rather than all of it: the engine decides the exact formatting.

### Opening a workspace in a broken state

Pass `setupStudio()` the entities to start with, e.g. a model the form editors can't build (a property of an unknown type) to test how the app recovers:

```ts
backends = await setupStudio(page, { entities: [...] });
```

### Testing error paths

- **Engine**: set an endpoint on `backends.engine.failures` to answer it with an error instead of calling the engine, or hold its answers back with `holdEngineEndpoint()` to see what the app does meanwhile. `getEngineCalls()` lists the calls made to an endpoint, with the payload and the engine's response status.
- **SDLC**: set an endpoint on `backends.sdlc.failures`. Entity changes pushed on top of anything but the workspace's latest revision are rejected with a `409`, as the SDLC server does.

### When your flow needs SDLC, depot or showcase calls that aren't mocked yet

Unmocked calls fail loudly with a `501` whose message names the endpoint, and are recorded in `backends.unmockedCalls`. Add a handler in [`SDLCMock.ts`](./src/support/SDLCMock.ts) (or, for depot and showcase, [`StudioSetup.ts`](./src/support/StudioSetup.ts)), following the SDLC server's JSON shapes in `@finos/legend-server-sdlc`.

## CI

The `run-studio-e2e-tests` job in [`.github/workflows/test.yml`](../../.github/workflows/test.yml) runs this suite on every PR and on pushes to `master`. It starts the engine in Docker first, so the engine boots while the workspace installs and builds, then lets the Playwright `webServer` config boot the app. Failed runs retry twice, print the engine's logs, and upload the HTML report as an artifact (`studio-e2e-test-report`).
