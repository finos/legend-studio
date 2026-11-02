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

import { inflateSync } from 'node:zlib';
import type { Page, Request, Route } from '@playwright/test';
import {
  GUIDE_DATA_SPACE_PATH,
  GUIDE_EXECUTION_CONTEXT,
  GUIDE_MODEL,
  GUIDE_PROJECT,
  GUIDE_SAVED_QUERIES,
  GUIDE_USER,
  OTHER_DATA_SPACES,
} from './GuideProject.js';

/**
 * The engine the guide's queries run on: a real one, which the scripts don't
 * start. It has no query store, and it can't read the guide's project from
 * its depot, so the routes below stand in for both.
 */
const ENGINE_URL = 'http://localhost:6300/api';

/**
 * Where the app looks for the depot and for its saved queries: ports nothing
 * listens on, so each call is answered in the browser below, or fails loudly
 */
const GUIDE_DEPOT_URL = 'http://localhost:6299/depot/api';
const GUIDE_QUERY_STORE_URL = 'http://localhost:6298/api';

const DATA_SPACE_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataSpace::DataSpace';

const CLASSIFIER_PATHS: Record<string, string> = {
  class: 'meta::pure::metamodel::type::Class',
  Enumeration: 'meta::pure::metamodel::type::Enumeration',
  association: 'meta::pure::metamodel::relationship::Association',
  profile: 'meta::pure::metamodel::extension::Profile',
  relational: 'meta::relational::metamodel::Database',
  mapping: 'meta::pure::mapping::Mapping',
  connection: 'meta::pure::runtime::PackageableConnection',
  runtime: 'meta::pure::runtime::PackageableRuntime',
  service: 'meta::legend::service::metamodel::Service',
  diagram: 'meta::pure::metamodel::diagram::Diagram',
  dataSpace: DATA_SPACE_CLASSIFIER_PATH,
};

const DAY = 24 * 60 * 60 * 1000;

type JSONObject = Record<string, unknown>;

interface Entity {
  path: string;
  classifierPath: string;
  content: JSONObject;
}

interface GuideModel {
  /** The model as the engine reads it: what a pointer to the project means */
  data: JSONObject;
  /** The model as the depot serves it */
  entities: Entity[];
  /** The data space's analytics, which the depot serves as a generated file */
  analytics: string;
}

const isObject = (value: unknown): value is JSONObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const callEngine = async (
  path: string,
  body: string,
  contentType = 'application/json',
): Promise<string> => {
  const response = await fetch(`${ENGINE_URL}/${path}`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`The engine failed to answer ${path}: ${text}`);
  }
  return text;
};

/** The guide project's model, parsed and analyzed by the engine */
const loadGuideModel = async (): Promise<GuideModel> => {
  const data = JSON.parse(
    await callEngine(
      'pure/v1/grammar/grammarToJson/model?returnSourceInformation=false',
      GUIDE_MODEL,
      'text/plain',
    ),
  ) as JSONObject & { elements: JSONObject[] };
  const entities = data.elements
    .filter((content) => content._type !== 'sectionIndex')
    .map((content) => {
      const type = String(content._type);
      const classifierPath = CLASSIFIER_PATHS[type];
      if (!classifierPath) {
        throw new Error(
          `No classifier path known for '${type}' elements: add it to CLASSIFIER_PATHS`,
        );
      }
      return {
        path: `${String(content.package)}::${String(content.name)}`,
        classifierPath,
        content,
      };
    });
  const analytics = await callEngine(
    'pure/v1/analytics/dataSpace/render',
    JSON.stringify({
      clientVersion: 'vX_X_X',
      dataSpace: GUIDE_DATA_SPACE_PATH,
      model: data,
    }),
  );
  return { data, entities, analytics };
};

let guideModel: Promise<GuideModel> | undefined;
const getGuideModel = (): Promise<GuideModel> =>
  (guideModel ??= loadGuideModel());

const corsHeaders = (request: Request): Record<string, string> => ({
  'access-control-allow-origin': request.headers().origin ?? '*',
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers':
    request.headers()['access-control-request-headers'] ??
    'content-type,accept',
});

const fulfill = (
  route: Route,
  answer: unknown,
  status = 200,
): Promise<void> => {
  const request = route.request();
  return request.method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: corsHeaders(request) })
    : route.fulfill({ status, json: answer, headers: corsHeaders(request) });
};

/** A call the guide has no answer for: an error the app shows, and a log */
const fail = (route: Route, backend: string): Promise<void> => {
  const request = route.request();
  const message = `No ${backend} answer for the guide: ${request.method()} ${request.url()}`;
  // eslint-disable-next-line no-console
  console.warn(message);
  return fulfill(route, { status: 501, message }, 501);
};

/**
 * The part of a backend URL after `/api/`, without its query parameters,
 * decoded, e.g. `classifiers/meta::pure::metamodel::dataSpace::DataSpace`
 */
const getApiPath = (request: Request): string =>
  decodeURIComponent(
    /\/api\/(?<path>[^?]*)/u.exec(request.url())?.groups?.path ?? '',
  );

/** The app deflates what it sends the engine (see `compressData()`) */
const readBody = (request: Request): string | undefined => {
  const buffer = request.postDataBuffer();
  if (!buffer) {
    return undefined;
  }
  try {
    return inflateSync(buffer).toString('utf-8');
  } catch {
    return buffer.toString('utf-8');
  }
};

const isGuideProjectPointer = (value: JSONObject): boolean =>
  value._type === 'pointer' &&
  isObject(value.sdlcInfo) &&
  value.sdlcInfo.groupId === GUIDE_PROJECT.groupId &&
  value.sdlcInfo.artifactId === GUIDE_PROJECT.artifactId;

/** `value`, with each pointer to the guide project replaced by its model */
const withModel = (value: unknown, model: JSONObject): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => withModel(item, model));
  }
  if (!isObject(value)) {
    return value;
  }
  if (isGuideProjectPointer(value)) {
    return model;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, withModel(item, model)]),
  );
};

// ---------------------------------- depot ----------------------------------

const isGuideProject = (groupId?: string, artifactId?: string): boolean =>
  groupId === GUIDE_PROJECT.groupId && artifactId === GUIDE_PROJECT.artifactId;

/** A data space as the depot lists it: where it's released, and its content */
const storedDataSpace = (
  coordinates: { groupId: string; artifactId: string; versionId: string },
  path: string,
  content: JSONObject,
): JSONObject => ({
  ...coordinates,
  entity: { path, classifierPath: DATA_SPACE_CLASSIFIER_PATH, content },
});

const getDepotAnswer = (
  request: Request,
  { entities, analytics, data }: GuideModel,
): unknown => {
  if (request.method() !== 'GET') {
    return undefined;
  }
  const path = getApiPath(request);
  const project = {
    projectId: GUIDE_PROJECT.projectId,
    groupId: GUIDE_PROJECT.groupId,
    artifactId: GUIDE_PROJECT.artifactId,
  };
  if (path === `classifiers/${DATA_SPACE_CLASSIFIER_PATH}/entities`) {
    const dataSpace = entities.find(
      (entity) => entity.path === GUIDE_DATA_SPACE_PATH,
    );
    return [
      ...(dataSpace
        ? [storedDataSpace(GUIDE_PROJECT, dataSpace.path, dataSpace.content)]
        : []),
      ...OTHER_DATA_SPACES.map((other) => {
        const [name, ...packagePath] = other.path.split('::').reverse();
        return storedDataSpace(other, other.path, {
          _type: 'dataSpace',
          package: packagePath.reverse().join('::'),
          name,
          title: other.title,
          defaultExecutionContext: other.executionContext,
          executionContexts: [
            {
              name: other.executionContext,
              title: other.executionContext,
              mapping: { path: `${other.path}Mapping`, type: 'MAPPING' },
              defaultRuntime: {
                path: `${other.path}Runtime`,
                type: 'RUNTIME',
              },
            },
          ],
        });
      }),
    ];
  }
  if (/^classifiers\/[^/]+\/entities$/u.test(path)) {
    return [];
  }
  if (path === 'project-configurations') {
    return [project];
  }
  const match =
    /^(?:project-configurations|projects|versions|generationFileContent)\/(?<groupId>[^/]+)\/(?<artifactId>[^/]+)(?<rest>.*)$/u.exec(
      path,
    );
  const { groupId, artifactId, rest = '' } = match?.groups ?? {};
  if (!isGuideProject(groupId, artifactId)) {
    return undefined;
  }
  if (path.startsWith('project-configurations/')) {
    return project;
  }
  if (path.startsWith('versions/') && rest === '/latest') {
    return { ...project, versionId: GUIDE_PROJECT.versionId };
  }
  if (path.startsWith('generationFileContent/')) {
    return rest.endsWith('/dataSpace-analytics/AnalyticsResult.json')
      ? JSON.parse(analytics)
      : undefined;
  }
  if (rest === '/versions') {
    return [GUIDE_PROJECT.versionId];
  }
  if (/^\/versions\/[^/]+$/u.test(rest)) {
    return entities;
  }
  if (/^\/versions\/[^/]+\/dependencies$/u.test(rest)) {
    return [];
  }
  if (/^\/versions\/[^/]+\/pureModelContextData$/u.test(rest)) {
    return data;
  }
  if (/^\/versions\/[^/]+\/classifiers\/[^/]+$/u.test(rest)) {
    return entities.filter((entity) => rest.endsWith(entity.classifierPath));
  }
  return undefined;
};

// ------------------------------- query store -------------------------------

/** A saved query, as the query store holds it */
export interface GuideStoredQuery extends JSONObject {
  id: string;
  name: string;
  owner: string;
  createdAt: number;
  lastUpdatedAt: number;
  lastOpenAt: number;
  /** Set on earlier revisions only, as the history endpoint serves them */
  version?: string;
}

interface QuerySearchSpecification {
  searchTermSpecification?: { searchTerm: string; exactMatchName?: boolean };
  showCurrentUserQueriesOnly?: boolean;
  limit?: number;
  sortByOption?: string;
}

const SORT_FIELDS: Record<
  string,
  'createdAt' | 'lastUpdatedAt' | 'lastOpenAt'
> = {
  SORT_BY_CREATE: 'createdAt',
  SORT_BY_UPDATE: 'lastUpdatedAt',
  SORT_BY_VIEW: 'lastOpenAt',
};

/**
 * The saved queries, and their earlier revisions, for one page: the guide's
 * seeds (see `GUIDE_SAVED_QUERIES`) and what the guide saves
 */
export class GuideQueryStore {
  readonly queries = new Map<string, GuideStoredQuery>();
  readonly revisions = new Map<string, GuideStoredQuery[]>();

  constructor() {
    const now = Date.now();
    GUIDE_SAVED_QUERIES.forEach(({ daysAgo, ...seed }) => {
      const time = now - daysAgo * DAY;
      this.queries.set(seed.id, {
        ...seed,
        groupId: GUIDE_PROJECT.groupId,
        artifactId: GUIDE_PROJECT.artifactId,
        versionId: GUIDE_PROJECT.versionId,
        originalVersionId: GUIDE_PROJECT.versionId,
        executionContext: {
          _type: 'dataSpaceExecutionContext',
          dataSpacePath: GUIDE_DATA_SPACE_PATH,
          executionKey: GUIDE_EXECUTION_CONTEXT,
        },
        taggedValues: [],
        stereotypes: [],
        createdAt: time,
        lastUpdatedAt: time,
        lastOpenAt: time,
      });
    });
  }

  /** The newest saved query named `name` */
  find(name: string): GuideStoredQuery | undefined {
    return Array.from(this.queries.values())
      .filter((query) => query.name === name)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
  }

  search(spec: QuerySearchSpecification): GuideStoredQuery[] {
    const term = spec.searchTermSpecification?.searchTerm.toLowerCase();
    const exact = Boolean(spec.searchTermSpecification?.exactMatchName);
    const sortField = spec.sortByOption
      ? SORT_FIELDS[spec.sortByOption]
      : undefined;
    const matches = Array.from(this.queries.values())
      .filter(
        (query) =>
          (!term ||
            (exact
              ? query.name.toLowerCase() === term
              : query.name.toLowerCase().includes(term) ||
                query.id.toLowerCase().includes(term))) &&
          (!spec.showCurrentUserQueriesOnly || query.owner === GUIDE_USER),
      )
      .sort((a, b) => (sortField ? b[sortField] - a[sortField] : 0));
    return spec.limit === undefined ? matches : matches.slice(0, spec.limit);
  }

  answer(request: Request): unknown {
    const path = getApiPath(request);
    const method = request.method();
    const body = (): GuideStoredQuery =>
      JSON.parse(request.postData() ?? '{}') as GuideStoredQuery;
    const now = Date.now();
    if (path === 'pure/v1/query/search' && method === 'POST') {
      return this.search(body() as QuerySearchSpecification);
    }
    if (path === 'pure/v1/query/batch' && method === 'GET') {
      return new URL(request.url()).searchParams
        .getAll('queryIds')
        .map((id) => this.queries.get(id))
        .filter(Boolean);
    }
    if (path === 'pure/v1/query' && method === 'POST') {
      const query: GuideStoredQuery = {
        ...body(),
        owner: GUIDE_USER,
        createdAt: now,
        lastUpdatedAt: now,
        lastOpenAt: now,
      };
      this.queries.set(query.id, query);
      return query;
    }
    const match =
      /^pure\/v1\/query\/(?<id>[^/]+)(?<action>\/history|\/patchQuery)?$/u.exec(
        path,
      );
    const id = match?.groups?.id;
    const query = id ? this.queries.get(id) : undefined;
    if (!id || !query) {
      return undefined;
    }
    const action = match.groups?.action;
    if (action === '/history' && method === 'GET') {
      const version = new URL(request.url()).searchParams.get('version');
      const revisions = this.revisions.get(id) ?? [];
      return version === null
        ? revisions
        : revisions.filter((revision) => revision.version === version);
    }
    if (method === 'GET' && !action) {
      query.lastOpenAt = now;
      return query;
    }
    if (method === 'PUT') {
      const revisions = this.revisions.get(id) ?? [];
      revisions.push({ ...query, version: String(revisions.length + 1) });
      this.revisions.set(id, revisions);
      const updated: GuideStoredQuery = {
        ...query,
        ...body(),
        owner: query.owner,
        createdAt: query.createdAt,
        lastUpdatedAt: now,
        lastOpenAt: now,
      };
      this.queries.set(id, updated);
      return updated;
    }
    if (method === 'DELETE' && !action) {
      this.queries.delete(id);
      return query;
    }
    return undefined;
  }
}

/**
 * Wires Legend Query's backends up for the guide's screenshots:
 * - the depot, answered in the browser, serves the guide's project (see
 *   `GuideProject.ts`), released, and the data spaces of a few others;
 * - the query store, answered in the browser, holds the guide's saved
 *   queries (see `GuideQueryStore`);
 * - the real engine runs everything else, with the guide project's model in
 *   place of each pointer to the project, which it can't resolve.
 * Returns the query store, to find the queries the guide saves.
 */
export const setupGuideQuery = async (page: Page): Promise<GuideQueryStore> => {
  const model = await getGuideModel();
  const store = new GuideQueryStore();

  await page.route(/\/query\/config\.json$/u, async (route) => {
    const response = await route.fetch();
    const config = (await response.json()) as {
      engine: JSONObject;
      depot: JSONObject;
    };
    config.engine = {
      ...config.engine,
      url: ENGINE_URL,
      queryUrl: GUIDE_QUERY_STORE_URL,
    };
    config.depot = { ...config.depot, url: GUIDE_DEPOT_URL };
    await route.fulfill({ json: config });
  });

  await page.route(`${GUIDE_DEPOT_URL}/**`, async (route) => {
    const answer = getDepotAnswer(route.request(), model);
    await (answer === undefined
      ? fail(route, 'depot')
      : fulfill(route, answer));
  });

  await page.route(`${GUIDE_QUERY_STORE_URL}/**`, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await fulfill(route, undefined);
      return;
    }
    const answer = store.answer(route.request());
    await (answer === undefined
      ? fail(route, 'query store')
      : fulfill(route, answer));
  });

  await page.route(`${ENGINE_URL}/**`, async (route) => {
    const request = route.request();
    if (
      request.method() === 'GET' &&
      getApiPath(request) === 'server/v1/currentUser'
    ) {
      await fulfill(route, GUIDE_USER);
      return;
    }
    const body = readBody(request);
    if (!body?.includes(GUIDE_PROJECT.artifactId)) {
      await route.continue();
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      await route.continue();
      return;
    }
    await route.continue({
      postData: JSON.stringify(withModel(json, model.data)),
      headers: { ...request.headers(), 'content-type': 'application/json' },
    });
  });

  return store;
};
