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

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { corsHeaders, getApiPath } from '../support/MockUtils.js';
import { MOCK_SDLC_URL } from '../support/SDLCMock.js';
import { setupStudio, type StudioBackends } from '../support/StudioSetup.js';
import { GUIDE_MODEL, GUIDE_PROJECT } from './GuideProject.js';

/** Legend Studio's icon, which the start screen shows as its logo */
const STUDIO_ICON = fileURLToPath(
  new URL(
    '../../../legend-application-studio-deployment/assets/favicon.ico',
    import.meta.url,
  ),
);

/** Projects the start screen's search lists beside the guide's own */
const OTHER_PROJECTS = [
  {
    projectId: '1043',
    name: 'trade-model',
    description: 'Trades and their settlement',
    tags: [],
    webUrl: 'https://gitlab.example.com/legend/trade-model',
  },
  {
    projectId: '1044',
    name: 'reference-data',
    description: 'Countries, currencies and calendars',
    tags: [],
    webUrl: 'https://gitlab.example.com/legend/reference-data',
  },
];

/**
 * What the guide's screens ask the SDLC server that the tests' in-memory SDLC
 * (see `SDLCMock.ts`) doesn't answer, by path after `/api/`: the start
 * screen's project search, and what it checks of the project it picks:
 * its patches, its workspaces in conflict resolution and its configuration
 */
const getGuideSDLCAnswer = (path: string, url: URL): unknown => {
  const { projectId } = GUIDE_PROJECT.project;
  switch (path) {
    case 'projects': {
      // the search comes quoted, e.g. "firm"
      const search = (url.searchParams.get('search') ?? '')
        .replace(/"/gu, '')
        .toLowerCase();
      return [GUIDE_PROJECT.project, ...OTHER_PROJECTS].filter((project) =>
        project.name.includes(search),
      );
    }
    case `projects/${projectId}/patches`:
    case `projects/${projectId}/conflictResolution`:
      return [];
    case `projects/${projectId}/configuration/projectConfigurationStatus`:
      return { projectId, projectConfigured: true, reviewIds: [] };
    default:
      return undefined;
  }
};

/**
 * Wires Legend Studio's backends up for the guide's screenshots, as the tests
 * do (see `setupStudio()`), on the guide's project, with the SDLC answers the
 * guide's screens need on top (see `getGuideSDLCAnswer()`).
 */
export const setupGuideStudio = async (page: Page): Promise<StudioBackends> => {
  const backends = await setupStudio(page, {
    grammar: GUIDE_MODEL,
    project: GUIDE_PROJECT,
  });
  // routed after the in-memory SDLC, so asked first: what it doesn't answer
  // falls through to it
  await page.context().route(`${MOCK_SDLC_URL}/**`, async (route) => {
    const request = route.request();
    const answer =
      request.method() === 'GET'
        ? getGuideSDLCAnswer(getApiPath(request), new URL(request.url()))
        : undefined;
    if (answer === undefined) {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: answer, headers: corsHeaders(request) });
  });
  return backends;
};

/**
 * Shows Legend Studio's logo on the start screen, as a deployment does. The
 * logo is the application's icon, `favicon.ico`, which the browser doesn't
 * load while Playwright routes its requests, so the image stays empty: this
 * gives it the icon's data instead.
 */
export const showStudioLogo = async (page: Page): Promise<void> => {
  const icon = await readFile(STUDIO_ICON);
  await page.locator('.workspace-setup__logo__icon').evaluate(
    async (image, source) => {
      const logo = image as HTMLImageElement;
      logo.src = source;
      await logo.decode();
    },
    `data:image/png;base64,${icon.toString('base64')}`,
  );
};

/**
 * Hides the assistant's floating button, which would cover part of each
 * screenshot; the status bar's Toggle assistant brings it back
 */
export const hideAssistant = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Hide assistant' }).click();
};
