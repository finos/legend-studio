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
 * The Legend platform's latest releases, which the SDLC server lists for
 * projects to build with
 */
const GUIDE_PLATFORMS = [
  {
    name: 'legend-engine',
    groupId: 'org.finos.legend.engine',
    platformVersion: '4.95.1',
  },
  {
    name: 'legend-sdlc',
    groupId: 'org.finos.legend.sdlc',
    platformVersion: '0.201.0',
  },
];

/** The SDLC server's latest project structure, newer than the guide project's */
const GUIDE_LATEST_PROJECT_STRUCTURE_VERSION = {
  version: 13,
  extensionVersion: 2,
};

/** A project's configuration, at the workspace or at a revision */
const CONFIGURATION_PATH = new RegExp(
  `^projects/${GUIDE_PROJECT_ID}/(?:workspaces/[^/]+/)?(?:revisions/[^/]+/)?configuration$`,
  'u',
);

/**
 * What the guide's screens ask the SDLC server that the tests' in-memory SDLC
 * (see `SDLCMock.ts`) doesn't answer, or answers with nothing to show: the
 * start screen's project search, and what it checks of the project it picks
 * (its patches, its workspaces in conflict resolution and its
 * configuration); the project's release and the reviews committed since;
 * reviews the guide creates, which stay open; the platform's latest versions
 * and project structure; and the project's configuration, when a page needs
 * another one than the guide project's (`configuration`)
 */
const getGuideSDLCAnswer = (
  request: Request,
  openReviews: Record<string, unknown>[],
  configuration: Record<string, unknown> | undefined,
): unknown => {
  const projectId = GUIDE_PROJECT_ID;
  const path = getApiPath(request);
  const url = new URL(request.url());
  if (
    configuration &&
    request.method() === 'GET' &&
    CONFIGURATION_PATH.test(path)
  ) {
    return configuration;
  }
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
    case 'server/platforms':
      return GUIDE_PLATFORMS;
    case 'configuration/latestProjectStructureVersion':
      return GUIDE_LATEST_PROJECT_STRUCTURE_VERSION;
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

const GUIDE_GROUP_ID = 'org.finos.legend.guide';

/**
 * The projects in the depot: the guide's own, and the other projects of the
 * guide's group, with their released versions, oldest first, and the
 * versions of other projects each one depends on (as
 * `groupId:artifactId:versionId`). The guide project's own versions are the
 * tests' stub's.
 */
const DEPOT_PROJECTS: {
  projectId: string;
  artifactId: string;
  versions?: Record<string, string[]>;
}[] = [
  { projectId: GUIDE_PROJECT_ID, artifactId: 'firm-model' },
  {
    projectId: '1043',
    artifactId: 'trade-model',
    versions: {
      '2.2.0': [`${GUIDE_GROUP_ID}:reference-data:1.3.0`],
      '2.3.0': [`${GUIDE_GROUP_ID}:reference-data:1.4.0`],
    },
  },
  {
    projectId: '1044',
    artifactId: 'reference-data',
    versions: { '1.2.0': [], '1.3.0': [], '1.4.0': [] },
  },
  {
    projectId: '1045',
    artifactId: 'address-model',
    versions: {
      '1.0.0': [`${GUIDE_GROUP_ID}:reference-data:1.3.0`],
      '1.1.0': [`${GUIDE_GROUP_ID}:reference-data:1.4.0`],
    },
  },
];

const getDepotProject = (
  groupId: string,
  artifactId: string,
): (typeof DEPOT_PROJECTS)[number] | undefined =>
  groupId === GUIDE_GROUP_ID
    ? DEPOT_PROJECTS.find((project) => project.artifactId === artifactId)
    : undefined;

/** A project's version, as the depot's dependency endpoints take it */
interface DependencyCoordinates {
  groupId: string;
  artifactId: string;
  versionId: string;
  exclusions?: { groupId: string; artifactId: string }[];
}

interface DependencyNode {
  projectId: string;
  groupId: string;
  artifactId: string;
  versionId: string;
  id: string;
  forwardEdges: string[];
  backEdges: string[];
}

/**
 * The depot's dependency tree of the direct dependencies: one node per
 * version (`groupId:artifactId:versionId`), the direct dependencies' as its
 * roots, without what each one excludes; and a conflict for each project the
 * tree holds at more than one version
 */
const getDependencyTree = (
  dependencies: DependencyCoordinates[],
): {
  graph: { nodes: Record<string, DependencyNode>; rootNodes: string[] };
  conflicts: { groupId: string; artifactId: string; versions: string[] }[];
} => {
  const nodes: Record<string, DependencyNode> = {};
  const visit = (
    id: string,
    parent: DependencyNode | undefined,
    excluded: Set<string>,
  ): void => {
    const [groupId = '', artifactId = '', versionId = ''] = id.split(':');
    if (excluded.has(`${groupId}:${artifactId}`)) {
      return;
    }
    const known = nodes[id];
    const node = known ?? {
      projectId: getDepotProject(groupId, artifactId)?.projectId ?? '',
      groupId,
      artifactId,
      versionId,
      id,
      forwardEdges: [],
      backEdges: [],
    };
    nodes[id] = node;
    if (parent) {
      parent.forwardEdges.push(id);
      node.backEdges.push(parent.id);
    }
    if (!known) {
      const project = getDepotProject(groupId, artifactId);
      for (const dependency of project?.versions?.[versionId] ?? []) {
        visit(dependency, node, excluded);
      }
    }
  };
  const rootNodes = dependencies.map((dependency) => {
    const id = `${dependency.groupId}:${dependency.artifactId}:${dependency.versionId}`;
    visit(
      id,
      undefined,
      new Set(
        (dependency.exclusions ?? []).map(
          (exclusion) => `${exclusion.groupId}:${exclusion.artifactId}`,
        ),
      ),
    );
    return id;
  });
  const versionsByProject = new Map<string, DependencyNode[]>();
  for (const node of Object.values(nodes)) {
    const project = `${node.groupId}:${node.artifactId}`;
    versionsByProject.set(project, [
      ...(versionsByProject.get(project) ?? []),
      node,
    ]);
  }
  return {
    graph: { nodes, rootNodes },
    conflicts: [...versionsByProject.values()]
      .filter((versions) => versions.length > 1)
      .map((versions) => ({
        groupId: versions[0]?.groupId ?? '',
        artifactId: versions[0]?.artifactId ?? '',
        versions: versions.map((node) => node.id),
      })),
  };
};

/**
 * The newest versions of the direct dependencies, among the latest
 * `backtrackVersions` of each, whose tree has no conflict: every combination,
 * newest first, until one has none
 */
const resolveCompatibleDependencies = (
  dependencies: DependencyCoordinates[],
  backtrackVersions: number,
): Record<string, unknown> => {
  const candidates = dependencies.map((dependency) => {
    const versions = Object.keys(
      getDepotProject(dependency.groupId, dependency.artifactId)?.versions ??
        {},
    )
      .reverse()
      .slice(0, backtrackVersions);
    return versions.length ? versions : [dependency.versionId];
  });
  const combinations = candidates.reduce<string[][]>(
    (result, versions) =>
      result.flatMap((combination) =>
        versions.map((version) => [...combination, version]),
      ),
    [[]],
  );
  const withVersions = (versions: string[]): DependencyCoordinates[] =>
    dependencies.map((dependency, index) => ({
      ...dependency,
      versionId: versions[index] ?? dependency.versionId,
    }));
  const compatible = combinations.find(
    (versions) => !getDependencyTree(withVersions(versions)).conflicts.length,
  );
  if (compatible) {
    return {
      success: true,
      resolvedVersions: withVersions(compatible).map(
        ({ groupId, artifactId, versionId }) => ({
          groupId,
          artifactId,
          versionId,
        }),
      ),
      conflicts: [],
      failureReason: null,
    };
  }
  const { graph, conflicts } = getDependencyTree(dependencies);
  return {
    success: false,
    resolvedVersions: [],
    conflicts: conflicts.map((conflict) => ({
      groupId: conflict.groupId,
      artifactId: conflict.artifactId,
      conflictingVersions: conflict.versions.map((id) => ({
        version: graph.nodes[id]?.versionId,
        requiredBy: (graph.nodes[id]?.backEdges ?? []).map((parentId) => {
          const [groupId, artifactId, versionId] = parentId.split(':');
          return { groupId, artifactId, versionId };
        }),
      })),
    })),
    failureReason: 'No compatible versions found',
  };
};

/**
 * What the guide's screens ask the depot that the tests' stub doesn't
 * answer: the data spaces released in other projects; the projects in the
 * depot and the versions of the other projects; and, for the projects the
 * guide project depends on, their dependency tree, their elements (none: the
 * guide's pages show none of them) and versions of them that don't conflict
 */
const getGuideDepotAnswer = (request: Request): unknown => {
  const path = decodeURIComponent(getApiPath(request));
  if (request.method() === 'POST') {
    const dependencies = request.postDataJSON() as DependencyCoordinates[];
    const parameters = new URL(request.url()).searchParams;
    switch (path) {
      case 'projects/analyzeDependencyTreeFromArtifactDependencies':
        return getDependencyTree(dependencies);
      case 'projects/dependenciesFromArtifactDependencies': {
        const { graph } = getDependencyTree(dependencies);
        return Object.values(graph.nodes)
          .filter(
            (node) =>
              (parameters.get('transitive') !== 'false' ||
                graph.rootNodes.includes(node.id)) &&
              (parameters.get('includeOrigin') !== 'false' ||
                !graph.rootNodes.includes(node.id)),
          )
          .map(({ groupId, artifactId, versionId }) => ({
            groupId,
            artifactId,
            versionId,
            versionedEntity: false,
            entities: [],
          }));
      }
      case 'projects/resolveCompatibleDependencies':
        return resolveCompatibleDependencies(
          dependencies,
          Number(parameters.get('backtrackVersions') ?? 5),
        );
      default:
        return undefined;
    }
  }
  if (request.method() !== 'GET') {
    return undefined;
  }
  if (path === 'classifiers/meta::pure::metamodel::dataSpace::DataSpace') {
    return OTHER_DATA_SPACES;
  }
  if (path === 'project-configurations') {
    return DEPOT_PROJECTS.map(({ projectId, artifactId }) => ({
      projectId,
      groupId: GUIDE_GROUP_ID,
      artifactId,
    }));
  }
  const { groupId = '', artifactId = '' } =
    /^projects\/(?<groupId>[^/]+)\/(?<artifactId>[^/]+)\/versions$/u.exec(path)
      ?.groups ?? {};
  const versions = getDepotProject(groupId, artifactId)?.versions;
  return versions ? Object.keys(versions) : undefined;
};

/** How the Legend language marks an accessor to an ingest's data set: `#I{…}#` */
const INGEST_ACCESSOR = 'I';
/** How it marks an accessor to a relational store's table: `#>{…}#` */
const RELATION_STORE_ACCESSOR = '>';

/**
 * The guide's database that each of the guide's ingests copies: an ingest's
 * data sets are the database's tables, with the same names and columns
 */
const INGEST_DATABASES: Record<string, string> = {
  'guide::ingest::FirmIngest': 'guide::store::FirmDatabase',
};

/** The kinds of element the open-source engine can't read */
const LAKEHOUSE_ELEMENT_TYPES = new Set(['dataProduct', 'ingestDefinition']);

/**
 * The lambda in protocol JSON with each accessor to an ingest's data set
 * turned into a relation store accessor, and the paths of the accessors it
 * turned, e.g. `guide::ingest::FirmIngest.PERSON`. With `onDatabase`, each
 * accessor reads the database table the data set copies (see
 * `INGEST_DATABASES`); otherwise it keeps the data set's path.
 */
const toRelationStoreAccessors = (
  value: unknown,
  paths: Set<string>,
  onDatabase = false,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      toRelationStoreAccessors(item, paths, onDatabase),
    );
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const json = value as Record<string, unknown>;
  if (json._type === 'classInstance' && json.type === INGEST_ACCESSOR) {
    const { path } = json.value as { path: string[] };
    paths.add(path.join('.'));
    const [ingest = '', ...dataSet] = path;
    return {
      ...json,
      type: RELATION_STORE_ACCESSOR,
      ...(onDatabase
        ? { value: { path: [INGEST_DATABASES[ingest] ?? ingest, ...dataSet] } }
        : {}),
    };
  }
  return Object.fromEntries(
    Object.entries(json).map(([key, item]) => [
      key,
      toRelationStoreAccessors(item, paths, onDatabase),
    ]),
  );
};

/** The real engine's answer to the request, with another body */
const askEngine = async (request: Request, body: unknown): Promise<unknown> => {
  const response = await fetch(request.url(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok ? response.json() : undefined;
};

/**
 * What the guide's screens ask the engine that it can't answer, about a data
 * product's access points, whose functions read an ingest's data sets
 * (`#I{guide::ingest::FirmIngest.PERSON}#`): the open-source engine has no
 * grammar for those, nor for data products. The rest of each answer is the
 * engine's own:
 * - their text: the engine writes the same functions with relation store
 *   accessors (`#>{…}#`) in their place, and the answer marks those back as
 *   ingest accessors;
 * - their columns, for their sample values: the engine works them out for
 *   the same functions on the database tables the data sets copy, in the
 *   project without its data products and ingests.
 */
const getGuideEngineAnswer = async (request: Request): Promise<unknown> => {
  const apiPath = getApiPath(request);
  if (request.method() !== 'POST') {
    return undefined;
  }
  const body = getRequestBody(request);
  if (!body.includes(`"type":"${INGEST_ACCESSOR}"`)) {
    return undefined;
  }
  if (apiPath === 'pure/v1/compilation/lambdaRelationType') {
    const input = JSON.parse(body) as {
      lambda: unknown;
      model: { elements?: { _type: string }[] };
    };
    return askEngine(request, {
      lambda: toRelationStoreAccessors(input.lambda, new Set(), true),
      model: {
        ...input.model,
        elements: input.model.elements?.filter(
          (element) => !LAKEHOUSE_ELEMENT_TYPES.has(element._type),
        ),
      },
    });
  }
  if (apiPath !== 'pure/v1/grammar/jsonToGrammar/lambda/batch') {
    return undefined;
  }
  const paths = new Set<string>();
  const texts = (await askEngine(
    request,
    toRelationStoreAccessors(JSON.parse(body), paths),
  )) as Record<string, string> | undefined;
  if (!texts) {
    return undefined;
  }
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

/** What one page of the guide changes of the guide's project */
export interface GuideProjectOptions {
  /**
   * Elements the project has on top of its model, e.g. ones the engine this
   * runs against can't parse
   */
  extraEntities?: Entity[];
  /**
   * The project's configuration, instead of the guide project's (see
   * `GUIDE_PROJECT`), e.g. with dependencies, which the other pages'
   * explorer would show
   */
  configuration?: Record<string, unknown>;
}

/**
 * Wires Legend Studio's backends up for the guide's screenshots, as the tests
 * do (see `setupStudio()`), on the guide's project, with the SDLC, depot and
 * engine answers the guide's screens need on top (see `getGuideSDLCAnswer()`,
 * `getGuideDepotAnswer()` and `getGuideEngineAnswer()`).
 */
export const setupGuideStudio = async (
  page: Page,
  options: GuideProjectOptions = {},
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
    const answer = getGuideSDLCAnswer(
      request,
      openReviews,
      options.configuration,
    );
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
  options: GuideProjectOptions = {},
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
