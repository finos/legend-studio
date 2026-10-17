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
import { ProjectViewerStore } from '../ProjectViewerStore.js';

test(
  unitTest(
    'Viewing a project fetches its dependencies without waiting for side panel information',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const projectViewerStore = new ProjectViewerStore(editorStore);
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
      undefined,
    );
    createSpy(sdlcServerClient, 'getEntities').mockResolvedValue([]);
    createSpy(sdlcServerClient, 'getConfiguration').mockResolvedValue({
      projectStructureVersion: { version: 13, extensionVersion: 1 },
      projectId: 'PROJECT',
      groupId: 'org.finos',
      artifactId: 'project',
      projectDependencies: [
        { projectId: 'org.finos:dependency', versionId: '1.0.0' },
      ],
      metamodelDependencies: [],
    });
    // the side panel information never arrives
    const never = new Promise<never>(() => undefined);
    createSpy(sdlcServerClient, 'getVersions').mockReturnValue(never);
    createSpy(sdlcServerClient, 'getAutorizedActions').mockReturnValue(never);
    createSpy(editorStore.depotServerClient, 'getVersions').mockReturnValue(
      never,
    );
    const collectDependencyEntities = createSpy(
      editorStore.depotServerClient,
      'collectDependencyEntities',
    ).mockResolvedValue([]);

    flowResult(projectViewerStore.initialize({ projectId: 'PROJECT' })).catch(
      noop(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(collectDependencyEntities).toHaveBeenCalledTimes(1);
  },
);
