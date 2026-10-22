# @finos/legend-application-studio-e2e

End-to-end tests for the Legend Studio web application, built with [Playwright](https://playwright.dev/).

## Architecture

The tests exercise the Legend Studio webapp served by the `@finos/legend-application-studio-deployment` dev server (`http://localhost:9000/studio/`), backed by:

- **Engine**: a real engine on port 6300, run in Docker from the same compose file as the engine round-trip tests ([`fixtures/legend-docker-setup/grammar-test-setup`](../../fixtures/legend-docker-setup/grammar-test-setup)). The flows this suite exists for — switching between form and text mode, compiling, and the errors that come back — need the real grammar parser and compiler; mocking them would test the mock. Every engine call goes through [`EngineSpy.ts`](./src/support/EngineSpy.ts), which records it and can make any endpoint fail or hang on demand.
- **SDLC**: an in-memory SDLC server, answered in the browser by [`SDLCMock.ts`](./src/support/SDLCMock.ts). It holds one project (`E2E-1`) with one user workspace (`e2e-workspace`) holding a small model (see [`TEST_DATA__SDLC.ts`](./src/support/TEST_DATA__SDLC.ts)). Pushing changes commits a new revision that later loads serve back, so a test can push, reload and see what was saved.
- **Depot and showcase**: stubbed in the browser; the test project has no dependencies, published versions or showcases.

[`setupStudio()`](./src/support/StudioSetup.ts) wires all of this up per test, by intercepting the app's `config.json` with Playwright's [`route()`](https://playwright.dev/docs/network#modify-requests): the SDLC, depot and showcase URLs point at ports where nothing listens, so a real SDLC server running locally can never leak into a test. It routes the test's whole browser context rather than one page, so a tab the app opens (e.g. the full editor, opened from strict text mode) gets the same backends, and sees the same SDLC state.

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

## Screenshots

[`playwright.screenshots.config.ts`](./playwright.screenshots.config.ts) is a screenshot-and-recording run rather than a test run, and no CI job uses it. It reuses everything the tests set up — above all the in-browser SDLC mock, which is why the only backend it needs is the engine — and writes images of a feature in each colour theme, so a change to an editor can be shown as it looks rather than described:

```sh
yarn workspace @finos/legend-application-studio-e2e screenshots:generation-spec
```

Images land in `build/screenshots`, or wherever `GENERATION_SPEC_SHOT_DIR` points. Each run also leaves a `video.webm` of every script under `build/screenshots-output`, which `ffmpeg` turns into a GIF for a pull request:

```sh
ffmpeg -ss 2.8 -i video.webm -vf "crop=920:620:348:28,fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse" -loop 0 gestures.gif
```

A script lives in [`src/screenshots/`](./src/screenshots/) and is named `<Feature>.screenshots.ts`, so the test run never picks it up. Two things to know when writing one:

- **The colour theme** is seeded into `localStorage` with `addInitScript()` before the app loads, under the application's storage key — there is no UI step for it. [`GenerationSpecification.screenshots.ts`](./src/screenshots/GenerationSpecification.screenshots.ts) loops over `default-dark`, `default-light` and `legacy-light`, which is what catches a token that only works against one ground.
- **`devices['Desktop Chrome']` carries its own viewport**, so a viewport set in the top-level `use` is overridden: set it in the project's `use`, after the device is spread in.

Drag-and-drop goes through react-dnd's HTML5 backend, so a gesture is driven with the real drag events (`dragstart` / `dragenter` / `dragover` / `drop`) with mouse moves in between — the moves are what makes the recording legible, and a pause before the drop is what captures the drop target's own treatment.

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

The text mode editor is Monaco, which only renders the lines in view, and auto-indents and auto-closes brackets as you type. So `getGrammarText()` copies the whole grammar out through the clipboard rather than reading the DOM (normalizing line endings to `\n`), and `setGrammarText()` / `replaceInGrammar()` paste text in, so every line and column is exactly what the test wrote. Assert on fragments of the grammar (`toContain`) rather than all of it: the engine decides the exact formatting.

### Asserting on errors

Check _where_ an error is reported, not just that one is: `getErrorLines()` gives the lines the editor marks with an error squiggle, `getCursorLine()` the line the cursor is on (the app takes it to the error), and `getProblemLocation()` the `[Ln, Col]` the Problems panel lists. Work out the expected line from the grammar the test wrote with `getLineNumber()`, and call `moveCursorToStart()` before compiling, so the cursor's position proves the app moved it (see `TextModeErrors.spec.ts`). Match engine messages on their stable part (`/Can't find type 'Integr'/`): the real engine words them, and may add detail over time. Regexes passed to locators can't use the `u` flag, which Playwright can't pass on to its selector engine.

### Starting from another model

Pass `setupStudio()` the model the workspace should start with — written in grammar, which it converts to SDLC entities through the real engine, or as the entities themselves:

```ts
backends = await setupStudio(page, {
  grammar: `Class model::Person
{
  firstName: String[1];
  fullName() {$this.firstName}: String[1];
}`,
});
backends = await setupStudio(page, { entities: [...] });
```

Grammar keeps models with logic in them (derived properties, constraints, functions) readable; see `FormModeErrors.spec.ts`. Entities let a test start from a model the engine wouldn't produce, e.g. one the form editors can't build, to test how the app recovers.

### Compilation errors in form mode

In form mode, the app can show a compilation error on the derived property, constraint or function it is in — but only in logic edited in the form during the session: the form's code editors tag the logic they parse with where it belongs, while logic loaded from the workspace carries no such tag, so the app opens the model in text mode to debug instead. So to test an error shown in the form, make the broken edit in the form: `pasteIntoCodeEditor()` a body into one of `getLambdaEditors()`, wait for the form to take it in (the element then counts as changed), and compile; the error shows in `getLambdaErrors()`.

### Testing error paths

- **Engine**: set an endpoint on `backends.engine.failures` to answer it with an error instead of calling the engine, or hold its answers back with `holdEngineEndpoint()` to see what the app does meanwhile. `getEngineCalls()` lists the calls made to an endpoint, with the payload and the engine's response status.
- **SDLC**: set an endpoint on `backends.sdlc.failures`. Entity changes pushed on top of anything but the workspace's latest revision are rejected with a `409`, as the SDLC server does.

### When your flow needs SDLC, depot or showcase calls that aren't mocked yet

Unmocked calls fail loudly with a `501` whose message names the endpoint, and are recorded in `backends.unmockedCalls`. Add a handler in [`SDLCMock.ts`](./src/support/SDLCMock.ts) (or, for depot and showcase, [`StudioSetup.ts`](./src/support/StudioSetup.ts)), following the SDLC server's JSON shapes in `@finos/legend-server-sdlc`.

## CI

The `run-studio-e2e-tests` job in [`.github/workflows/test.yml`](../../.github/workflows/test.yml) runs this suite on every PR and on pushes to `master`. Like the `run-tests` job, it starts the engine in Docker in the background, so pulling the image and booting the engine overlap with installing and building (from the shared build cache), and waits for the engine right before running the tests — failing fast, with its logs, if it doesn't come up. The Playwright `webServer` config then reuses that engine, and boots the app. Failed runs retry twice, print the engine's logs, and upload the HTML report as an artifact (`studio-e2e-test-report`).
