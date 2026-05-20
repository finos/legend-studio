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

import { beforeEach, describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import type { UserDataService } from '@finos/legend-application';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import {
  LEGEND_STUDIO_USER_DATA_KEY,
  LegendStudioUserDataHelper,
} from '../LegendStudioUserDataHelper.js';

// A minimal in-memory stand-in for `UserDataService` that exposes just the
// two methods the recents helpers actually use. This avoids having to wire up
// a real `ApplicationStore` + `StorageService` (and the underlying
// `localStorage`) just to exercise pure serialization/LRU logic.
const createFakeUserDataService = (
  initial?: Record<string, unknown>,
): { service: UserDataService; store: Map<string, unknown> } => {
  const store = new Map<string, unknown>(Object.entries(initial ?? {}));
  const service = {
    getObjectValue: (key: string): object | undefined => {
      const v = store.get(key);
      return v && typeof v === 'object' ? v : undefined;
    },
    persistValue: (key: string, value: unknown): void => {
      if (value === undefined) {
        store.delete(key);
      } else {
        store.set(key, value);
      }
    },
  } as unknown as UserDataService;
  return { service, store };
};

const RECENTS_KEY = LEGEND_STUDIO_USER_DATA_KEY.WORKSPACE_SETUP_RECENTS;

describe('LegendStudioUserDataHelper — workspace setup recents', () => {
  let service: UserDataService;
  let store: Map<string, unknown>;

  beforeEach(() => {
    ({ service, store } = createFakeUserDataService());
  });

  test(unitTest('returns empty lists when nothing is persisted'), () => {
    expect(
      LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service),
    ).toEqual([]);
    expect(
      LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service),
    ).toEqual([]);
  });

  test(unitTest('records a project and reads it back'), () => {
    LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
      projectId: 'p1',
      name: 'Project One',
    });
    const projects =
      LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service);
    expect(projects).toHaveLength(1);
    expect(projects[0]?.projectId).toBe('p1');
    expect(projects[0]?.name).toBe('Project One');
    expect(typeof projects[0]?.lastOpenedAt).toBe('number');
  });

  test(unitTest('records a workspace and reads it back'), () => {
    LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
      projectId: 'p1',
      workspaceId: 'ws1',
      workspaceType: WorkspaceType.GROUP,
    });
    const workspaces =
      LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service);
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toMatchObject({
      projectId: 'p1',
      workspaceId: 'ws1',
      workspaceType: WorkspaceType.GROUP,
    });
  });

  test(unitTest('most-recently recorded project is first (LRU order)'), () => {
    LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
      projectId: 'p1',
      name: 'One',
    });
    LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
      projectId: 'p2',
      name: 'Two',
    });
    LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
      projectId: 'p3',
      name: 'Three',
    });
    const projects =
      LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service);
    expect(projects.map((p) => p.projectId)).toEqual(['p3', 'p2', 'p1']);
  });

  test(
    unitTest('re-recording an existing project dedupes and bumps to top'),
    () => {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
        projectId: 'p1',
        name: 'One',
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
        projectId: 'p2',
        name: 'Two',
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
        projectId: 'p1',
        name: 'One (renamed)',
      });
      const projects =
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service);
      expect(projects).toHaveLength(2);
      expect(projects[0]?.projectId).toBe('p1');
      expect(projects[0]?.name).toBe('One (renamed)');
      expect(projects[1]?.projectId).toBe('p2');
    },
  );

  test(
    unitTest(
      're-recording an existing workspace dedupes (same id + same type)',
    ),
    () => {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.USER,
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.USER,
      });
      const workspaces =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service);
      expect(workspaces).toHaveLength(1);
    },
  );

  test(
    unitTest(
      'same workspaceId under different workspaceType is treated as distinct',
    ),
    () => {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.USER,
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.GROUP,
      });
      const workspaces =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service);
      expect(workspaces).toHaveLength(2);
    },
  );

  test(unitTest('enforces the LRU cap when recording projects'), () => {
    // Record 12 distinct projects; only the most recent 10 should survive.
    for (let i = 0; i < 12; i++) {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
        projectId: `p${i}`,
        name: `Project ${i}`,
      });
    }
    const projects =
      LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service);
    expect(projects).toHaveLength(10);
    expect(projects[0]?.projectId).toBe('p11');
    expect(projects[projects.length - 1]?.projectId).toBe('p2');
  });

  test(unitTest('enforces the LRU cap when recording workspaces'), () => {
    // Record 25 distinct workspaces; only the most recent 20 should survive.
    for (let i = 0; i < 25; i++) {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: `ws${i}`,
        workspaceType: WorkspaceType.USER,
      });
    }
    const workspaces =
      LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service);
    expect(workspaces).toHaveLength(20);
    expect(workspaces[0]?.workspaceId).toBe('ws24');
    expect(workspaces[workspaces.length - 1]?.workspaceId).toBe('ws5');
  });

  test(
    unitTest(
      'removeRecentProject drops the project AND cascades to its workspaces',
    ),
    () => {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
        projectId: 'p1',
        name: 'One',
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
        projectId: 'p2',
        name: 'Two',
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws-a',
        workspaceType: WorkspaceType.USER,
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p2',
        workspaceId: 'ws-b',
        workspaceType: WorkspaceType.GROUP,
      });

      LegendStudioUserDataHelper.workspaceSetup_removeRecentProject(
        service,
        'p1',
      );

      const projects =
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service);
      const workspaces =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service);
      expect(projects.map((p) => p.projectId)).toEqual(['p2']);
      expect(workspaces.map((w) => w.workspaceId)).toEqual(['ws-b']);
    },
  );

  test(
    unitTest('removeRecentWorkspace removes only the matching entry'),
    () => {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.USER,
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws2',
        workspaceType: WorkspaceType.USER,
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.GROUP, // same id, different type
      });

      LegendStudioUserDataHelper.workspaceSetup_removeRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.USER,
      });

      const remaining =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service);
      expect(remaining).toHaveLength(2);
      expect(
        remaining.some(
          (w) =>
            w.workspaceId === 'ws1' && w.workspaceType === WorkspaceType.USER,
        ),
      ).toBe(false);
      expect(
        remaining.some(
          (w) =>
            w.workspaceId === 'ws1' && w.workspaceType === WorkspaceType.GROUP,
        ),
      ).toBe(true);
    },
  );

  test(unitTest('clearRecents wipes both lists'), () => {
    LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
      projectId: 'p1',
      name: 'One',
    });
    LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
      projectId: 'p1',
      workspaceId: 'ws1',
      workspaceType: WorkspaceType.USER,
    });
    LegendStudioUserDataHelper.workspaceSetup_clearRecents(service);
    expect(
      LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service),
    ).toEqual([]);
    expect(
      LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service),
    ).toEqual([]);
  });

  test(unitTest('corrupted persisted blob falls back to empty recents'), () => {
    const corrupted = createFakeUserDataService({
      [RECENTS_KEY]: { totally: 'wrong', shape: 42 },
    });
    expect(
      LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
        corrupted.service,
      ),
    ).toEqual([]);
    expect(
      LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(
        corrupted.service,
      ),
    ).toEqual([]);
  });

  test(
    unitTest(
      'workspace entries with invalid workspaceType are filtered out on read',
    ),
    () => {
      const blob = {
        version: 1,
        projects: [],
        workspaces: [
          {
            projectId: 'p1',
            workspaceId: 'good',
            workspaceType: WorkspaceType.USER,
            lastOpenedAt: 1,
          },
          {
            projectId: 'p1',
            workspaceId: 'bad',
            workspaceType: 'NOT_A_REAL_TYPE',
            lastOpenedAt: 2,
          },
        ],
      };
      const { service: s } = createFakeUserDataService({
        [RECENTS_KEY]: blob,
      });
      const workspaces =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(s);
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0]?.workspaceId).toBe('good');
    },
  );

  test(
    unitTest('oversized persisted blob is clipped to the LRU cap on read'),
    () => {
      const overflowProjects = Array.from({ length: 25 }, (_, i) => ({
        projectId: `p${i}`,
        name: `Project ${i}`,
        lastOpenedAt: i,
      }));
      const overflowWorkspaces = Array.from({ length: 50 }, (_, i) => ({
        projectId: 'p1',
        workspaceId: `ws${i}`,
        workspaceType: WorkspaceType.USER,
        lastOpenedAt: i,
      }));
      const { service: s } = createFakeUserDataService({
        [RECENTS_KEY]: {
          version: 1,
          projects: overflowProjects,
          workspaces: overflowWorkspaces,
        },
      });
      expect(
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(s),
      ).toHaveLength(10);
      expect(
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(s),
      ).toHaveLength(20);
    },
  );

  test(
    unitTest(
      'persisted blob round-trips through SerializationFactory toJson/fromJson',
    ),
    () => {
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(service, {
        projectId: 'p1',
        name: 'One',
      });
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(service, {
        projectId: 'p1',
        workspaceId: 'ws1',
        workspaceType: WorkspaceType.GROUP,
      });
      // Persisted shape is a plain object (the serializr toJson output), not
      // a class instance — this is what the StorageService expects.
      const raw = store.get(RECENTS_KEY) as {
        version: number;
        projects: unknown[];
        workspaces: unknown[];
      };
      expect(raw).toBeDefined();
      expect(raw.version).toBe(1);
      expect(Array.isArray(raw.projects)).toBe(true);
      expect(Array.isArray(raw.workspaces)).toBe(true);
      // Re-reading round-trips the entries back into the typed view.
      expect(
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(service),
      ).toHaveLength(1);
      expect(
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(service),
      ).toHaveLength(1);
    },
  );
});
