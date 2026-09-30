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

import type { Page, Route } from '@playwright/test';
import { corsHeaders, fulfillError, getApiPath } from './MockUtils.js';
import {
  TEST_DATA__CurrentUser,
  TEST_DATA__LatestProjectStructureVersion,
  TEST_DATA__Project,
  TEST_DATA__ProjectConfiguration,
  TEST_PROJECT_ID,
  TEST_WORKSPACE_ID,
  type Entity,
} from './TEST_DATA__SDLC.js';

/**
 * The SDLC URL the app is pointed at (see `setupStudio()`): nothing listens
 * on this port, so every SDLC call must be answered by the mocks below, and a
 * real SDLC server running locally can never leak into a test.
 */
export const MOCK_SDLC_URL = 'http://localhost:6199/api';

interface Revision {
  id: string;
  authorName: string;
  authoredAt: string;
  committerName: string;
  committedAt: string;
  message: string;
}

interface RevisionWithEntities {
  revision: Revision;
  entities: Entity[];
}

interface EntityChange {
  type: 'CREATE' | 'MODIFY' | 'DELETE' | 'RENAME';
  entityPath: string;
  classifierPath?: string;
  newEntityPath?: string;
  content?: Record<string, unknown>;
}

export interface EntityChangesCommand {
  message: string;
  entityChanges: EntityChange[];
  revisionId?: string;
}

export interface BackendFailure {
  status: number;
  message: string;
}

/**
 * What the app sent to the SDLC server during a test, and a knob to make it
 * misbehave.
 */
export interface CapturedSDLCRequests {
  /** Entity changes pushed to the workspace, oldest first. */
  entityChanges: EntityChangesCommand[];
  /**
   * Endpoints (paths after `/api/`, e.g.
   * `projects/E2E-1/workspaces/e2e-workspace/entityChanges`) to answer with
   * an error until the entry is deleted.
   */
  failures: Map<string, BackendFailure>;
}

const LATEST_REVISION_ALIASES = new Set(['CURRENT', 'HEAD', 'LATEST']);
const BASE_REVISION_ALIAS = 'BASE';

const applyEntityChanges = (
  entities: Entity[],
  changes: EntityChange[],
): Entity[] => {
  const byPath = new Map(entities.map((entity) => [entity.path, entity]));
  changes.forEach((change) => {
    const existing = byPath.get(change.entityPath);
    switch (change.type) {
      case 'CREATE':
      case 'MODIFY':
        byPath.set(change.entityPath, {
          path: change.entityPath,
          classifierPath:
            change.classifierPath ?? existing?.classifierPath ?? '',
          content: change.content ?? existing?.content ?? {},
        });
        break;
      case 'DELETE':
        byPath.delete(change.entityPath);
        break;
      case 'RENAME':
        if (existing && change.newEntityPath) {
          byPath.delete(change.entityPath);
          byPath.set(change.newEntityPath, {
            ...existing,
            path: change.newEntityPath,
          });
        }
        break;
      default:
    }
  });
  return [...byPath.values()];
};

const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/**
 * Answer every SDLC call `page` makes from a small in-memory SDLC: the
 * project `E2E-1`, whose user workspace `e2e-workspace` starts with
 * `entities`. Pushing entity changes to the workspace commits a new
 * revision, which later loads serve back — so a test can push, reload and
 * see what was saved.
 *
 * Calls no handler answers get a `501` naming the endpoint, and are passed
 * to `onUnmocked`.
 */
export const installSDLCMock = async (
  page: Page,
  entities: Entity[],
  onUnmocked: (call: string) => void,
): Promise<CapturedSDLCRequests> => {
  const captured: CapturedSDLCRequests = {
    entityChanges: [],
    failures: new Map(),
  };

  let revisionCounter = 0;
  const commit = (
    message: string,
    revisionEntities: Entity[],
  ): RevisionWithEntities => {
    revisionCounter += 1;
    const now = new Date().toISOString();
    return {
      revision: {
        id: `e2e-revision-${revisionCounter}`,
        authorName: TEST_DATA__CurrentUser.userId,
        authoredAt: now,
        committerName: TEST_DATA__CurrentUser.userId,
        committedAt: now,
        message,
      },
      entities: revisionEntities,
    };
  };

  // the project's history, and the workspace's since it branched off
  // (oldest first; the workspace's first revision is its base)
  const initialCommit = commit('initial commit', entities);
  const projectRevisions = [initialCommit];
  const workspaceRevisions = [initialCommit];
  const getLatest = (revisions: RevisionWithEntities[]): RevisionWithEntities =>
    revisions[revisions.length - 1] as RevisionWithEntities;
  const findRevision = (
    revisions: RevisionWithEntities[],
    revisionId: string,
  ): RevisionWithEntities | undefined => {
    if (LATEST_REVISION_ALIASES.has(revisionId.toUpperCase())) {
      return getLatest(revisions);
    }
    if (revisionId.toUpperCase() === BASE_REVISION_ALIAS) {
      return revisions[0];
    }
    return revisions.find((candidate) => candidate.revision.id === revisionId);
  };

  /**
   * Endpoints the project and the workspace share: their revisions, the
   * entities and configuration at each, and — for the workspace — pushing
   * entity changes. Returns whether it answered the call.
   */
  const respondWithHistory = async (
    route: Route,
    path: string[],
    revisions: RevisionWithEntities[],
    workspace: Record<string, string> | undefined,
  ): Promise<boolean> => {
    const request = route.request();
    const fulfillJson = async (json: unknown): Promise<boolean> => {
      await route.fulfill({ json, headers: corsHeaders(request) });
      return true;
    };
    const [first, revisionId, third] = path;

    if (request.method() === 'GET') {
      if (first === undefined && workspace) {
        return fulfillJson(workspace);
      }
      switch (first) {
        case 'inConflictResolutionMode':
        case 'outdated':
          return fulfillJson(false);
        case 'entities':
          return fulfillJson(getLatest(revisions).entities);
        case 'configuration':
          return fulfillJson(TEST_DATA__ProjectConfiguration);
        case 'workflows':
          return fulfillJson([]);
        case 'revisions': {
          if (revisionId === undefined) {
            return fulfillJson(
              revisions.map((candidate) => candidate.revision).reverse(),
            );
          }
          const found = findRevision(revisions, revisionId);
          if (!found) {
            await fulfillError(route, 404, `Unknown revision: ${revisionId}`);
            return true;
          }
          switch (third) {
            case undefined:
              return fulfillJson(found.revision);
            case 'entities':
              return fulfillJson(found.entities);
            case 'configuration':
              return fulfillJson(TEST_DATA__ProjectConfiguration);
            default:
          }
          break;
        }
        default:
      }
    }

    if (request.method() === 'POST' && first === 'entityChanges' && workspace) {
      const command = request.postDataJSON() as EntityChangesCommand;
      const latest = getLatest(revisions);
      // like the SDLC server: changes must be made on top of the latest
      // revision, or they would silently undo someone else's
      if (command.revisionId && command.revisionId !== latest.revision.id) {
        await fulfillError(
          route,
          409,
          `Revision ${command.revisionId} is not the latest revision of the workspace (${latest.revision.id})`,
        );
        return true;
      }
      captured.entityChanges.push(command);
      const next = commit(
        command.message,
        applyEntityChanges(latest.entities, command.entityChanges),
      );
      revisions.push(next);
      return fulfillJson(next.revision);
    }

    return false;
  };

  const respond = async (route: Route): Promise<void> => {
    const request = route.request();
    const method = request.method();
    const path = getApiPath(request);
    const fulfillJson = (json: unknown): Promise<void> =>
      route.fulfill({ json, headers: corsHeaders(request) });

    // CORS preflight
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(request) });
      return;
    }

    // endpoints a test has forced to fail, so the app's error handling runs
    const failure = captured.failures.get(path);
    if (failure) {
      await fulfillError(route, failure.status, failure.message);
      return;
    }

    if (method === 'GET') {
      switch (path) {
        case 'auth/authorized':
          await fulfillJson(true);
          return;
        case 'auth/termsOfServiceAcceptance':
        case 'server/platforms':
          await fulfillJson([]);
          return;
        case 'server/features':
          await fulfillJson({ canCreateProject: true, canCreateVersion: true });
          return;
        case 'currentUser':
          await fulfillJson(TEST_DATA__CurrentUser);
          return;
        case 'configuration/latestProjectStructureVersion':
          await fulfillJson(TEST_DATA__LatestProjectStructureVersion);
          return;
        default:
      }
    }

    const [head, projectId, ...projectPath] = path
      .split('/')
      .map(decodeSegment);
    if (head === 'projects' && projectId !== undefined) {
      if (projectId !== TEST_PROJECT_ID) {
        await fulfillError(route, 404, `Unknown project: ${projectId}`);
        return;
      }

      if (projectPath[0] === 'workspaces' && projectPath.length > 1) {
        // workspace-scoped endpoints
        const [, workspaceId, ...workspacePath] = projectPath;
        if (workspaceId !== TEST_WORKSPACE_ID) {
          await fulfillError(
            route,
            404,
            `Unknown user workspace ${workspaceId} in project ${projectId}`,
          );
          return;
        }
        const workspace = {
          projectId,
          userId: TEST_DATA__CurrentUser.userId,
          workspaceId,
        };
        if (
          await respondWithHistory(
            route,
            workspacePath,
            workspaceRevisions,
            workspace,
          )
        ) {
          return;
        }
      } else {
        // project-scoped endpoints
        if (method === 'GET') {
          switch (projectPath.join('/')) {
            case '':
              await fulfillJson(TEST_DATA__Project);
              return;
            case 'authorizedActions':
              await fulfillJson([
                'CREATE_WORKSPACE',
                'SUBMIT_REVIEW',
                'COMMIT_REVIEW',
                'CREATE_VERSION',
              ]);
              return;
            case 'workspaces':
              await fulfillJson([
                {
                  projectId,
                  userId: TEST_DATA__CurrentUser.userId,
                  workspaceId: TEST_WORKSPACE_ID,
                },
              ]);
              return;
            case 'groupWorkspaces':
            case 'versions':
            case 'reviews':
              await fulfillJson([]);
              return;
            default:
          }
        }
        if (
          await respondWithHistory(
            route,
            projectPath,
            projectRevisions,
            undefined,
          )
        ) {
          return;
        }
      }
    }

    // Fail loudly on unmocked SDLC endpoints so missing mocks surface
    // immediately.
    const call = `${method} SDLC /api/${path}`;
    onUnmocked(call);
    await fulfillError(
      route,
      501,
      `Unmocked SDLC endpoint called in e2e test: ${call} — add a handler in SDLCMock.ts`,
    );
  };

  await page.route(`${MOCK_SDLC_URL}/**`, respond);

  return captured;
};
