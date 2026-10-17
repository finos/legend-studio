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

import { defineConfig } from '@playwright/test';

/**
 * The user guides' screenshots (docs/user-guide), not tests: each script
 * opens a page of a running Legend Analytics, marks its controls and writes
 * the images the guide shows. They need the real engine, so nothing is
 * started here: run Legend Analytics (`yarn dev:analytics`) and the engine
 * (port 6300) first, then `yarn workspace
 * @finos/legend-application-analytics-e2e user-guide:screenshots`.
 * USER_GUIDE_ANALYTICS_URL points at another Legend Analytics.
 */
export default defineConfig({
  testDir: './src/user-guide',
  testMatch: '**/*.screenshots.ts',
  outputDir: './build/user-guide-results',
  timeout: 180_000,
  expect: {
    timeout: 60_000,
  },
  // one page at a time, so the engine answers each in good time
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL:
      process.env.USER_GUIDE_ANALYTICS_URL ??
      'http://localhost:9009/analytics/',
    // the guide's images: a laptop's window, sharp on a high-density screen
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  },
});
