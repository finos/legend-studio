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

import { test, expect } from '@jest/globals';
import { flowResult } from 'mobx';
import { noop } from '@finos/legend-shared';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { TEST__getTestEditorStore } from '../../editor/__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../../editor/EditorStore.js';
import type { ProjectViewerPathParams } from '../../../__lib__/LegendStudioNavigation.js';
import { ProjectViewerStore } from '../ProjectViewerStore.js';

const never = new Promise<never>(() => undefined);

const TEST_DATA__configuration = {
  projectStructureVersion: { version: 13, extensionVersion: 1 },
  projectId: 'PROJECT',
  groupId: 'org.finos',
  artifactId: 'project',
  projectDependencies: [
    { projectId: 'org.finos:dependency', versionId: '1.0.0' },
  ],
  metamodelDependencies: [],
};

const TEST_DATA__latestVersion = {
  projectId: 'PROJECT',
  revisionId: 'revision',
  notes: 'notes',
  id: { majorVersion: 1, minorVersion: 0, patchVersion: 0 },
};

/**
 * Mock the SDLC calls made before the entities are fetched. The side panel
 * information never arrives.
 */
const mockProjectInformation = (
  editorStore: EditorStore,
  latestVersion: object | undefined,
): void => {
  const sdlcServerClient = editorStore.sdlcServerClient;
  createSpy(sdlcServerClient, 'getProject').mockResolvedValue({
    projectId: 'PROJECT',
    name: 'Project',
    description: '',
    tags: [],
  });
  createSpy(sdlcServerClient, 'getRevision').mockResolvedValue({
    id: 'revision',
    authorName: 'author',
    authoredTimestamp: '2026-10-17T12:00:00.000+0000',
    committerName: 'author',
    committedTimestamp: '2026-10-17T12:00:00.000+0000',
    message: 'message',
  });
  createSpy(sdlcServerClient, 'getLatestVersion').mockResolvedValue(
    latestVersion,
  );
  createSpy(sdlcServerClient, 'getVersions').mockReturnValue(never);
  createSpy(sdlcServerClient, 'getAutorizedActions').mockReturnValue(never);
  createSpy(editorStore.depotServerClient, 'getVersions').mockReturnValue(
    never,
  );
};

const startViewer = async (
  editorStore: EditorStore,
  params: ProjectViewerPathParams,
): Promise<void> => {
  flowResult(new ProjectViewerStore(editorStore).initialize(params)).catch(
    noop(),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
};

test(
  unitTest(
    'Viewing a project fetches its dependencies without waiting for side panel information',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    mockProjectInformation(editorStore, undefined);
    createSpy(editorStore.sdlcServerClient, 'getEntities').mockResolvedValue(
      [],
    );
    createSpy(
      editorStore.sdlcServerClient,
      'getConfiguration',
    ).mockResolvedValue(TEST_DATA__configuration);
    const collectDependencyEntities = createSpy(
      editorStore.depotServerClient,
      'collectDependencyEntities',
    ).mockResolvedValue([]);

    await startViewer(editorStore, { projectId: 'PROJECT' });

    expect(collectDependencyEntities).toHaveBeenCalledTimes(1);
  },
);

test(
  unitTest(
    'Viewing the latest commit of a project fetches its dependencies while its entities download',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    mockProjectInformation(editorStore, undefined);
    createSpy(editorStore.sdlcServerClient, 'getEntities').mockReturnValue(
      never,
    );
    createSpy(
      editorStore.sdlcServerClient,
      'getConfiguration',
    ).mockResolvedValue(TEST_DATA__configuration);
    const collectDependencyEntities = createSpy(
      editorStore.depotServerClient,
      'collectDependencyEntities',
    ).mockResolvedValue([]);

    await startViewer(editorStore, { projectId: 'PROJECT' });

    expect(collectDependencyEntities).toHaveBeenCalledTimes(1);
  },
);

test(
  unitTest(
    'Viewing a version of a project fetches its dependencies while its entities download',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    mockProjectInformation(editorStore, TEST_DATA__latestVersion);
    createSpy(
      editorStore.sdlcServerClient,
      'getEntitiesByVersion',
    ).mockReturnValue(never);
    createSpy(
      editorStore.sdlcServerClient,
      'getConfigurationByVersion',
    ).mockResolvedValue(TEST_DATA__configuration);
    const collectDependencyEntities = createSpy(
      editorStore.depotServerClient,
      'collectDependencyEntities',
    ).mockResolvedValue([]);

    await startViewer(editorStore, {
      projectId: 'PROJECT',
      versionId: '1.0.0',
    });

    expect(collectDependencyEntities).toHaveBeenCalledTimes(1);
  },
);

test(
  unitTest(
    'Viewing a revision of a project fetches its dependencies while its entities download',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    mockProjectInformation(editorStore, undefined);
    createSpy(
      editorStore.sdlcServerClient,
      'getEntitiesByRevision',
    ).mockReturnValue(never);
    createSpy(
      editorStore.sdlcServerClient,
      'getConfigurationByRevision',
    ).mockResolvedValue(TEST_DATA__configuration);
    const collectDependencyEntities = createSpy(
      editorStore.depotServerClient,
      'collectDependencyEntities',
    ).mockResolvedValue([]);

    await startViewer(editorStore, {
      projectId: 'PROJECT',
      revisionId: 'revision',
    });

    expect(collectDependencyEntities).toHaveBeenCalledTimes(1);
  },
);

test(
  unitTest(
    'Viewing a published project by its coordinates fetches its dependencies while its entities download',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const depotServerClient = editorStore.depotServerClient;
    createSpy(depotServerClient, 'getProject').mockResolvedValue({
      projectId: 'PROJECT',
      groupId: 'org.finos',
      artifactId: 'project',
    });
    createSpy(depotServerClient, 'getVersionEntities').mockReturnValue(never);
    const getDependencyEntities = createSpy(
      depotServerClient,
      'getDependencyEntities',
    ).mockResolvedValue([]);

    await startViewer(editorStore, { gav: 'org.finos:project:1.0.0' });

    expect(getDependencyEntities).toHaveBeenCalledTimes(1);
  },
);
