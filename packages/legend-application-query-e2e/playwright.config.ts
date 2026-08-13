/**
 * Copyright (c) 2020-present, Goldman Sachs
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
 * The application under test is the Legend Query webapp served by
 * `@finos/legend-application-query-deployment` dev server, backed by:
 * - the mock depot server from `@finos/legend-fixture-mock-server` (port 6200)
 * - browser-level mocks for engine endpoints (port 6300), installed per-test
 *   via `setupEngineMock()` — see `src/support/EngineMock.ts`. This avoids
 *   port conflicts with a real engine instance running locally.
 */
export default defineConfig({
  testDir: './src/tests',
  outputDir: './build/test-results',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './build/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:9001/query/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // needed by result grid tests that assert on copy-to-clipboard actions
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
      command:
        'yarn workspace @finos/legend-fixture-mock-server build:ts && yarn workspace @finos/legend-fixture-mock-server start:depot',
      url: 'http://localhost:6200/depot/api/info',
      reuseExistingServer: !IS_CI,
      timeout: 60_000,
    },
    {
      // NOTE: the workspace must have been built (`yarn build`) since the dev
      // server bundles the built workspace libraries
      command:
        'yarn workspace @finos/legend-application-query-deployment setup && yarn workspace @finos/legend-application-query-deployment build:tailwindcss && yarn workspace @finos/legend-application-query-deployment dev:webpack',
      url: 'http://localhost:9001/query/',
      reuseExistingServer: !IS_CI,
      timeout: 300_000,
    },
  ],
});
