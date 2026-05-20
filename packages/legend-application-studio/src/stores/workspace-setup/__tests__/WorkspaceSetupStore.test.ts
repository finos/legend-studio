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
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { flowResult } from 'mobx';
import type { PlainObject } from '@finos/legend-shared';
import { ApplicationStore } from '@finos/legend-application';
import {
  Project,
  SDLCServerClient,
  type Workspace,
  WorkspaceType,
} from '@finos/legend-server-sdlc';
import { WorkspaceSetupStore } from '../WorkspaceSetupStore.js';
import { LegendStudioPluginManager } from '../../../application/LegendStudioPluginManager.js';
import { TEST__getLegendStudioApplicationConfig } from '../../__test-utils__/LegendStudioApplicationTestUtils.js';
import { LegendStudioUserDataHelper } from '../../../__lib__/LegendStudioUserDataHelper.js';
import type { LegendStudioApplicationStore } from '../../LegendStudioBaseStore.js';

// --- Test harness ------------------------------------------------------------

const buildSetupHarness = (): {
  setupStore: WorkspaceSetupStore;
  applicationStore: LegendStudioApplicationStore;
  sdlcServerClient: SDLCServerClient;
} => {
  const pluginManager = LegendStudioPluginManager.create();
  const applicationStore = new ApplicationStore(
    TEST__getLegendStudioApplicationConfig(),
    pluginManager,
  );
  const sdlcServerClient = new SDLCServerClient({
    env: applicationStore.config.env,
    serverUrl: applicationStore.config.sdlcServerUrl,
    baseHeaders: applicationStore.config.sdlcServerBaseHeaders,
  });
  const setupStore = new WorkspaceSetupStore(
    applicationStore,
    sdlcServerClient,
  );
  return { setupStore, applicationStore, sdlcServerClient };
};

// Minimal valid Project JSON shape (matches the serializr schema).
const buildProjectJson = (
  projectId: string,
  name = `Project ${projectId}`,
): PlainObject<Project> => ({
  projectId,
  name,
  description: '',
  webUrl: '',
  tags: [],
});

// Minimal valid Workspace JSON shape.
const buildWorkspaceJson = (
  projectId: string,
  workspaceId: string,
  workspaceType: WorkspaceType,
  userId?: string,
): PlainObject<Workspace> => ({
  projectId,
  workspaceId,
  userId: userId ?? (workspaceType === WorkspaceType.USER ? 'user-1' : null),
});

// Stubs out every SDLC call that `*changeProject` makes against a non-sandbox
// project so the flow can complete without network or graph manager calls.
const stubChangeProjectSdlcCalls = (
  sdlcServerClient: SDLCServerClient,
  workspacesJson: PlainObject<Workspace>[] = [],
): void => {
  createSpy(sdlcServerClient, 'getPatches').mockResolvedValue([]);
  createSpy(sdlcServerClient, 'projectConfigurationStatus').mockResolvedValue({
    projectId: 'ignored',
    projectConfigured: true,
    reviewIds: [],
  });
  createSpy(
    sdlcServerClient,
    'getWorkspacesInConflictResolutionMode',
  ).mockResolvedValue([]);
  createSpy(sdlcServerClient, 'getWorkspaces').mockResolvedValue(
    workspacesJson,
  );
};

// --- Tests -------------------------------------------------------------------

describe('WorkspaceSetupStore — recents wiring', () => {
  beforeEach(() => {
    // The user data service is backed by jsdom's localStorage; clear it so
    // tests don't bleed cached recents into each other.
    window.localStorage.clear();
  });

  test(
    unitTest('constructor hydrates recents observables from user data'),
    () => {
      // Seed user data via a throwaway harness so we exercise the helper
      // exactly like real code does.
      const seedHarness = buildSetupHarness();
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(
        seedHarness.applicationStore.userDataService,
        {
          projectId: 'p1',
          name: 'Seeded Project',
          description: '',
          webUrl: '',
          tags: [],
        },
      );
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(
        seedHarness.applicationStore.userDataService,
        {
          projectId: 'p1',
          workspaceId: 'ws1',
          workspaceType: WorkspaceType.GROUP,
        },
      );

      // New harness reads the same backing localStorage on construction.
      const { setupStore } = buildSetupHarness();
      expect(setupStore.recentProjects).toHaveLength(1);
      expect(setupStore.recentProjects[0]?.projectId).toBe('p1');
      expect(setupStore.recentWorkspaces).toHaveLength(1);
      expect(setupStore.recentWorkspaces[0]?.workspaceId).toBe('ws1');
      expect(setupStore.recentWorkspaces[0]?.workspaceType).toBe(
        WorkspaceType.GROUP,
      );
    },
  );

  test(
    unitTest('clearRecents empties both observables and the persisted blob'),
    () => {
      const { setupStore, applicationStore } = buildSetupHarness();
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(
        applicationStore.userDataService,
        {
          projectId: 'p1',
          name: 'One',
          description: '',
          webUrl: '',
          tags: [],
        },
      );
      // Re-read into the observable to mirror what construction does.
      setupStore.recentProjects =
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
          applicationStore.userDataService,
        );
      expect(setupStore.recentProjects).toHaveLength(1);

      setupStore.clearRecents();

      expect(setupStore.recentProjects).toEqual([]);
      expect(setupStore.recentWorkspaces).toEqual([]);
      expect(
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
          applicationStore.userDataService,
        ),
      ).toEqual([]);
    },
  );

  test(
    unitTest('initialize prunes the project from recents on getProject 404'),
    async () => {
      const { setupStore, applicationStore, sdlcServerClient } =
        buildSetupHarness();
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(
        applicationStore.userDataService,
        {
          projectId: 'p-missing',
          name: 'Will Be Pruned',
          description: '',
          webUrl: '',
          tags: [],
        },
      );
      setupStore.recentProjects =
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
          applicationStore.userDataService,
        );

      createSpy(sdlcServerClient, 'getProject').mockRejectedValue(
        new Error('404'),
      );

      await flowResult(
        setupStore.initialize('p-missing', undefined, undefined),
      );

      expect(
        setupStore.recentProjects.find((p) => p.projectId === 'p-missing'),
      ).toBeUndefined();
      expect(
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
          applicationStore.userDataService,
        ).find((p) => p.projectId === 'p-missing'),
      ).toBeUndefined();
    },
  );

  test(
    unitTest(
      'changeProject prunes a recent workspace when workspaceInfo no longer matches any loaded workspace',
    ),
    async () => {
      const { setupStore, applicationStore, sdlcServerClient } =
        buildSetupHarness();
      // Seed a stale recent workspace.
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(
        applicationStore.userDataService,
        {
          projectId: 'p1',
          workspaceId: 'ws-gone',
          workspaceType: WorkspaceType.USER,
        },
      );
      setupStore.recentWorkspaces =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(
          applicationStore.userDataService,
        );

      // SDLC returns no workspaces, so the deep-linked one won't match.
      stubChangeProjectSdlcCalls(sdlcServerClient, []);

      const project = Project.serialization.fromJson(buildProjectJson('p1'));
      await flowResult(
        setupStore.changeProject(project, {
          workspaceId: 'ws-gone',
          workspaceType: WorkspaceType.USER,
        }),
      );

      expect(setupStore.recentWorkspaces).toEqual([]);
      expect(
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(
          applicationStore.userDataService,
        ),
      ).toEqual([]);
    },
  );

  test(
    unitTest(
      'changeProject does NOT prune a recent workspace when it still exists',
    ),
    async () => {
      const { setupStore, applicationStore, sdlcServerClient } =
        buildSetupHarness();
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(
        applicationStore.userDataService,
        {
          projectId: 'p1',
          workspaceId: 'ws-alive',
          workspaceType: WorkspaceType.USER,
        },
      );
      setupStore.recentWorkspaces =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(
          applicationStore.userDataService,
        );

      stubChangeProjectSdlcCalls(sdlcServerClient, [
        buildWorkspaceJson('p1', 'ws-alive', WorkspaceType.USER),
      ]);

      const project = Project.serialization.fromJson(buildProjectJson('p1'));
      await flowResult(
        setupStore.changeProject(project, {
          workspaceId: 'ws-alive',
          workspaceType: WorkspaceType.USER,
        }),
      );

      expect(setupStore.recentWorkspaces).toHaveLength(1);
      expect(setupStore.currentWorkspace?.workspaceId).toBe('ws-alive');
    },
  );

  test(
    unitTest(
      'selectRecentProject fetches the project and switches to it on success',
    ),
    async () => {
      const { setupStore, sdlcServerClient } = buildSetupHarness();
      createSpy(sdlcServerClient, 'getProject').mockResolvedValue(
        buildProjectJson('p1', 'Project One'),
      );
      stubChangeProjectSdlcCalls(sdlcServerClient, []);

      await flowResult(setupStore.selectRecentProject('p1'));

      expect(setupStore.currentProject?.projectId).toBe('p1');
      expect(setupStore.currentProject?.name).toBe('Project One');
      expect(setupStore.selectRecentProjectState.hasSucceeded).toBe(true);
    },
  );

  test(
    unitTest(
      'selectRecentProject prunes the entry from recents on fetch failure',
    ),
    async () => {
      const { setupStore, applicationStore, sdlcServerClient } =
        buildSetupHarness();
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(
        applicationStore.userDataService,
        {
          projectId: 'p-missing',
          name: 'Will Be Pruned',
          description: '',
          webUrl: '',
          tags: [],
        },
      );
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(
        applicationStore.userDataService,
        {
          projectId: 'p-kept',
          name: 'Survives',
          description: '',
          webUrl: '',
          tags: [],
        },
      );
      setupStore.recentProjects =
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
          applicationStore.userDataService,
        );
      expect(setupStore.recentProjects).toHaveLength(2);

      createSpy(sdlcServerClient, 'getProject').mockRejectedValue(
        new Error('404'),
      );

      await flowResult(setupStore.selectRecentProject('p-missing'));

      expect(
        setupStore.recentProjects.find((p) => p.projectId === 'p-missing'),
      ).toBeUndefined();
      expect(
        setupStore.recentProjects.find((p) => p.projectId === 'p-kept'),
      ).toBeDefined();
      expect(setupStore.selectRecentProjectState.hasFailed).toBe(true);
    },
  );

  test(
    unitTest(
      'removeRecentProject cascades to its workspaces in both observables and storage',
    ),
    () => {
      const { setupStore, applicationStore } = buildSetupHarness();
      LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(
        applicationStore.userDataService,
        {
          projectId: 'p1',
          name: 'One',
          description: '',
          webUrl: '',
          tags: [],
        },
      );
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(
        applicationStore.userDataService,
        {
          projectId: 'p1',
          workspaceId: 'ws-a',
          workspaceType: WorkspaceType.USER,
        },
      );
      LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(
        applicationStore.userDataService,
        {
          projectId: 'p2',
          workspaceId: 'ws-b',
          workspaceType: WorkspaceType.GROUP,
        },
      );
      // Sync observables from the seeded storage.
      setupStore.recentProjects =
        LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
          applicationStore.userDataService,
        );
      setupStore.recentWorkspaces =
        LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(
          applicationStore.userDataService,
        );

      setupStore.removeRecentProject('p1');

      expect(setupStore.recentProjects.map((p) => p.projectId)).not.toContain(
        'p1',
      );
      expect(
        setupStore.recentWorkspaces.map((w) => w.workspaceId),
      ).not.toContain('ws-a');
      expect(setupStore.recentWorkspaces.map((w) => w.workspaceId)).toContain(
        'ws-b',
      );
    },
  );
});
