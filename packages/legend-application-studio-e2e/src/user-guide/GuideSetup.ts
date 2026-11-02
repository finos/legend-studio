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
import type { Page, Request } from '@playwright/test';
import { getExplorer } from '../support/StudioHelpers.js';
import {
  corsHeaders,
  getApiPath,
  getRequestBody,
} from '../support/MockUtils.js';
import { ENGINE_URL } from '../support/EngineSpy.js';
import { MOCK_SDLC_URL } from '../support/SDLCMock.js';
import type { Entity } from '../support/TEST_DATA__SDLC.js';
import {
  grammarToEntities,
  MOCK_DEPOT_URL,
  setupStudio,
  type StudioBackends,
} from '../support/StudioSetup.js';
import {
  GUIDE_MODEL,
  GUIDE_PROJECT,
  GUIDE_WORKSPACE_URL,
} from './GuideProject.js';

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

const { projectId: GUIDE_PROJECT_ID } = GUIDE_PROJECT.project;

/** The guide project's first release, made before its latest revision */
const GUIDE_RELEASE = {
  projectId: GUIDE_PROJECT_ID,
  revisionId: 'guide-release-1.0.0',
  notes: 'Firms and their employees',
  id: { majorVersion: 1, minorVersion: 0, patchVersion: 0 },
};

const GUIDE_RELEASE_REVISION = {
  id: GUIDE_RELEASE.revisionId,
  authorName: 'ada.lovelace',
  authoredTimestamp: '2026-10-05T14:00:00.000Z',
  committerName: 'ada.lovelace',
  committedTimestamp: '2026-10-05T14:00:00.000Z',
  message: 'Firms and the people they employ',
};

const guideReview = (review: {
  id: string;
  title: string;
  workspaceId: string;
  author: { userId: string; name: string };
  createdAt: string;
  committedAt?: string;
}): Record<string, unknown> => ({
  projectId: GUIDE_PROJECT_ID,
  workspaceType: 'USER',
  state: review.committedAt ? 'COMMITTED' : 'OPEN',
  labels: [],
  webURL: `https://gitlab.example.com/legend/firm-model/-/merge_requests/${review.id}`,
  lastUpdatedAt: review.committedAt ?? review.createdAt,
  ...review,
});

/** Reviews committed to the guide project since its first release */
const GUIDE_COMMITTED_REVIEWS = [
  guideReview({
    id: '5',
    title: 'Test the service',
    workspaceId: 'service-tests',
    author: { userId: 'grace.hopper', name: 'Grace Hopper' },
    createdAt: '2026-10-12T09:30:00.000Z',
    committedAt: '2026-10-13T16:00:00.000Z',
  }),
  guideReview({
    id: '6',
    title: 'Map employee records',
    workspaceId: 'employee-records',
    author: { userId: 'ada.lovelace', name: 'Ada Lovelace' },
    createdAt: '2026-10-19T10:00:00.000Z',
    committedAt: '2026-10-20T11:15:00.000Z',
  }),
];

/**
 * What the guide's screens ask the SDLC server that the tests' in-memory SDLC
 * (see `SDLCMock.ts`) doesn't answer, or answers with nothing to show: the
 * start screen's project search, and what it checks of the project it picks
 * (its patches, its workspaces in conflict resolution and its
 * configuration); the project's release and the reviews committed since;
 * and reviews the guide creates, which stay open
 */
const getGuideSDLCAnswer = (
  request: Request,
  openReviews: Record<string, unknown>[],
): unknown => {
  const projectId = GUIDE_PROJECT_ID;
  const path = getApiPath(request);
  const url = new URL(request.url());
  if (request.method() === 'POST') {
    if (path !== `projects/${projectId}/reviews`) {
      return undefined;
    }
    const command = request.postDataJSON() as {
      title: string;
      workspaceId: string;
    };
    const review = guideReview({
      id: '7',
      title: command.title,
      workspaceId: command.workspaceId,
      author: GUIDE_PROJECT.currentUser,
      createdAt: new Date().toISOString(),
    });
    openReviews.push(review);
    return review;
  }
  if (request.method() !== 'GET') {
    return undefined;
  }
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
    case `projects/${projectId}/versions`:
      return [GUIDE_RELEASE];
    case `projects/${projectId}/versions/latest`:
      return GUIDE_RELEASE;
    case `projects/${projectId}/revisions/${GUIDE_RELEASE.revisionId}`:
      return GUIDE_RELEASE_REVISION;
    case `projects/${projectId}/reviews`:
      switch (url.searchParams.get('state')) {
        case 'OPEN':
          return openReviews;
        case 'COMMITTED':
          // those since the release; none made the release's own revision
          return url.searchParams.has('since') ? GUIDE_COMMITTED_REVIEWS : [];
        default:
          return [];
      }
    default:
      return undefined;
  }
};

/**
 * Data spaces the other projects released, which a data space's editor offers
 * as related data spaces
 */
const OTHER_DATA_SPACES = [
  {
    groupId: 'org.finos.legend.guide',
    artifactId: 'trade-model',
    versionId: '2.3.0',
    path: 'trades::dataspace::TradeData',
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
  {
    groupId: 'org.finos.legend.guide',
    artifactId: 'reference-data',
    versionId: '1.4.0',
    path: 'refdata::dataspace::Countries',
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
];

/**
 * What the guide's screens ask the depot that the tests' stub doesn't
 * answer: the data spaces released in other projects
 */
const getGuideDepotAnswer = (request: Request): unknown =>
  request.method() === 'GET' &&
  decodeURIComponent(getApiPath(request)) ===
    'classifiers/meta::pure::metamodel::dataSpace::DataSpace'
    ? OTHER_DATA_SPACES
    : undefined;

/** How the Legend language marks an accessor to an ingest's data set: `#I{…}#` */
const INGEST_ACCESSOR = 'I';
/** How it marks an accessor to a relational store's table: `#>{…}#` */
const RELATION_STORE_ACCESSOR = '>';

/**
 * The lambda in protocol JSON with each accessor to an ingest's data set
 * turned into a relation store accessor of the same path, and the paths of
 * the accessors it turned, e.g. `guide::ingest::FirmIngest.PERSON`
 */
const toRelationStoreAccessors = (
  value: unknown,
  paths: Set<string>,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => toRelationStoreAccessors(item, paths));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const json = value as Record<string, unknown>;
  if (json._type === 'classInstance' && json.type === INGEST_ACCESSOR) {
    const { path } = json.value as { path: string[] };
    paths.add(path.join('.'));
    return { ...json, type: RELATION_STORE_ACCESSOR };
  }
  return Object.fromEntries(
    Object.entries(json).map(([key, item]) => [
      key,
      toRelationStoreAccessors(item, paths),
    ]),
  );
};

/**
 * What the guide's screens ask the engine that it can't answer: the text of
 * a data product's access points, whose functions read an ingest's data sets
 * (`#I{guide::ingest::FirmIngest.PERSON}#`), which the open-source engine has
 * no grammar for. The engine writes the same functions with relation store
 * accessors (`#>{…}#`) in their place, and the answer marks those back as
 * ingest accessors: the rest of the text is the engine's own.
 */
const getGuideEngineAnswer = async (request: Request): Promise<unknown> => {
  if (
    request.method() !== 'POST' ||
    getApiPath(request) !== 'pure/v1/grammar/jsonToGrammar/lambda/batch'
  ) {
    return undefined;
  }
  const body = getRequestBody(request);
  if (!body.includes(`"type":"${INGEST_ACCESSOR}"`)) {
    return undefined;
  }
  const paths = new Set<string>();
  const lambdas = toRelationStoreAccessors(JSON.parse(body), paths);
  const response = await fetch(request.url(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(lambdas),
  });
  if (!response.ok) {
    return undefined;
  }
  const texts = (await response.json()) as Record<string, string>;
  return Object.fromEntries(
    Object.entries(texts).map(([key, text]) => [
      key,
      [...paths].reduce(
        (result, path) =>
          result.replaceAll(
            `#${RELATION_STORE_ACCESSOR}{${path}}#`,
            `#${INGEST_ACCESSOR}{${path}}#`,
          ),
        text,
      ),
    ]),
  );
};

/**
 * Wires Legend Studio's backends up for the guide's screenshots, as the tests
 * do (see `setupStudio()`), on the guide's project, with the SDLC, depot and
 * engine answers the guide's screens need on top (see `getGuideSDLCAnswer()`,
 * `getGuideDepotAnswer()` and `getGuideEngineAnswer()`).
 */
export const setupGuideStudio = async (
  page: Page,
  options: {
    /**
     * Elements the project has on top of its model, e.g. ones the engine
     * this runs against can't parse
     */
    extraEntities?: Entity[];
  } = {},
): Promise<StudioBackends> => {
  const backends = await setupStudio(page, {
    entities: [
      ...(await grammarToEntities(GUIDE_MODEL)),
      ...(options.extraEntities ?? []),
    ],
    project: GUIDE_PROJECT,
  });
  const openReviews: Record<string, unknown>[] = [];
  // routed after the in-memory SDLC, so asked first: what it doesn't answer
  // falls through to it
  await page.context().route(`${MOCK_SDLC_URL}/**`, async (route) => {
    const request = route.request();
    const answer = getGuideSDLCAnswer(request, openReviews);
    if (answer === undefined) {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: answer, headers: corsHeaders(request) });
  });
  await page.context().route(`${MOCK_DEPOT_URL}/**`, async (route) => {
    const request = route.request();
    const answer = getGuideDepotAnswer(request);
    if (answer === undefined) {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: answer, headers: corsHeaders(request) });
  });
  // routed after the engine's spy, so asked first: the rest goes to the engine
  await page.context().route(`${ENGINE_URL}/**`, async (route) => {
    const request = route.request();
    const answer = await getGuideEngineAnswer(request);
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

/**
 * Opens the guide's workspace in the editor, with the Showcases panel, which
 * opens with the workspace, closed
 */
export const openGuideWorkspace = async (
  page: Page,
  options: { extraEntities?: Entity[] } = {},
): Promise<void> => {
  await setupGuideStudio(page, options);
  await page.goto(GUIDE_WORKSPACE_URL);
  await getExplorer(page).getByText('guide', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close Showcases' }).click();
  await hideAssistant(page);
};

/**
 * Opens an element of the guide's workspace from the explorer, e.g.
 * `guide::model::Firm`
 */
export const openGuideElement = async (
  page: Page,
  path: string,
): Promise<void> => {
  await openGuideWorkspace(page);
  for (const node of path.split('::')) {
    await getExplorer(page).getByText(node, { exact: true }).first().click();
  }
};
