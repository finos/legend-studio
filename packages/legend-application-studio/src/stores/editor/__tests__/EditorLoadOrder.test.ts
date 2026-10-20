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
import {
  Project,
  ProjectConfiguration,
  Workspace,
} from '@finos/legend-server-sdlc';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';

test(
  unitTest(
    'Opening a workspace fetches its dependencies while it fetches its entities',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    editorStore.sdlcState.setCurrentProject(
      Project.serialization.fromJson({
        projectId: 'PROJECT',
        name: 'Project',
        description: '',
        tags: [],
      }),
    );
    const workspace = new Workspace();
    workspace.projectId = 'PROJECT';
    workspace.workspaceId = 'workspace';
    editorStore.sdlcState.setCurrentWorkspace(workspace);
    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      ProjectConfiguration.serialization.fromJson({
        projectStructureVersion: { version: 13, extensionVersion: 1 },
        projectId: 'PROJECT',
        groupId: 'org.finos',
        artifactId: 'project',
        projectDependencies: [
          { projectId: 'org.finos:dependency', versionId: '1.0.0' },
        ],
        metamodelDependencies: [],
      }),
    );
    // the workspace entities never arrive
    createSpy(editorStore.sdlcServerClient, 'getEntities').mockReturnValue(
      new Promise(() => undefined),
    );
    const collectDependencyEntities = createSpy(
      editorStore.depotServerClient,
      'collectDependencyEntities',
    ).mockResolvedValue([]);

    flowResult(editorStore.buildGraph()).catch(noop());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(collectDependencyEntities).toHaveBeenCalledTimes(1);
  },
);
