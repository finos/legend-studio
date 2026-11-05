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
 * GIFs of a few Legend Studio tasks (docs/user-guide/studio/recordings), kept
 * to reuse; the guide's pages don't show them. Each script walks Legend Studio
 * through the tasks on the guide's project, as the screenshots' scripts do
 * (see playwright.user-guide.config.ts), and ffmpeg makes the GIFs: run Legend
 * Studio and the engine (port 6300) first, then `yarn workspace
 * @finos/legend-application-studio-e2e user-guide:recordings`.
 */
export default defineConfig({
  testDir: './src/user-guide',
  testMatch: '**/*.recordings.ts',
  outputDir: './build/user-guide-recordings-results',
  timeout: 300_000,
  expect: {
    timeout: 60_000,
  },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL:
      process.env.USER_GUIDE_STUDIO_URL ?? 'http://localhost:9000/studio/',
    // a GIF's frame: big enough to read, small enough to share
    viewport: { width: 1280, height: 960 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
  },
});
