/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineConfig, devices } from '@playwright/test';

const IS_CI = Boolean(process.env.CI);

/**
 * The application under test is the Legend Studio webapp served by
 * `@finos/legend-application-studio-deployment` dev server, backed by:
 * - a real engine (port 6300), run in Docker from the same compose file as
 *   the engine round-trip tests: switching between form and text mode,
 *   compiling and the errors that come back all need the real grammar
 *   parser and compiler
 * - browser-level mocks for the SDLC server (an in-memory SDLC holding the
 *   test workspace), depot and showcase, installed per-test via
 *   `setupStudio()` — see `src/support/StudioSetup.ts`
 */
export default defineConfig({
  testDir: './src/tests',
  outputDir: './build/test-results',
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './build/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:9000/studio/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // needed to read the text mode editor's content (see `getGrammarText()`)
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Reused when already up (e.g. started by CI, or by the engine
      // round-trip tests); otherwise started here, which pulls the image on
      // first use and can take a few minutes.
      command: 'docker compose --file=grammar-test-setup-docker-compose.yml up',
      cwd: '../../fixtures/legend-docker-setup/grammar-test-setup',
      url: 'http://localhost:6300/api/server/v1/info',
      reuseExistingServer: true,
      timeout: 600_000,
    },
    {
      // NOTE: the workspace must have been built (`yarn build`) since the dev
      // server bundles the built workspace libraries
      command:
        'yarn workspace @finos/legend-application-studio-deployment setup && yarn workspace @finos/legend-application-studio-deployment build:tailwindcss && yarn workspace @finos/legend-application-studio-deployment dev:webpack',
      url: 'http://localhost:9000/studio/',
      reuseExistingServer: !IS_CI,
      timeout: 300_000,
    },
  ],
});
