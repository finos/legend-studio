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

/**
 * Screenshots and a recording, not tests, and not part of CI: this drives the
 * real app the way the end-to-end suite does - the same in-browser SDLC mock,
 * so the only backend needed is the engine - and writes images of the
 * generation specification editor in each colour theme, plus a recording of
 * the drag gestures, under `build/screenshots` (or `GENERATION_SPEC_SHOT_DIR`).
 *
 *   yarn workspace @finos/legend-application-studio-e2e screenshots:generation-spec
 *
 * Like the tests, it starts the engine with `docker compose` unless one
 * already answers on port 6300, and boots the app unless one is already
 * serving port 9000. The workspace must have been built (`yarn build`), since
 * the dev server bundles the built workspace libraries.
 */
const VIEWPORT = { width: 1800, height: 1100 };

export default defineConfig({
  testDir: './src/screenshots',
  testMatch: '**/*.screenshots.ts',
  outputDir: './build/screenshots-output',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:9000/studio/',
    viewport: VIEWPORT,
    video: { mode: 'on', size: VIEWPORT },
  },
  projects: [
    {
      name: 'chromium',
      // the viewport and the scale factor go after the device preset, which carries its own of
      // both - a 1x shot of this board is legible but soft on a high-density screen
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: [
    {
      // the same engine the end-to-end tests use, reused when already up
      command: 'docker compose --file=grammar-test-setup-docker-compose.yml up',
      cwd: '../../fixtures/legend-docker-setup/grammar-test-setup',
      url: 'http://localhost:6300/api/server/v1/info',
      reuseExistingServer: true,
      timeout: 600_000,
    },
    {
      command:
        'yarn workspace @finos/legend-application-studio-deployment setup && yarn workspace @finos/legend-application-studio-deployment build:tailwindcss && yarn workspace @finos/legend-application-studio-deployment dev:webpack',
      url: 'http://localhost:9000/studio/',
      reuseExistingServer: true,
      timeout: 600_000,
    },
  ],
});
