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

import {
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import type { ProjectDependency } from '@finos/legend-server-sdlc';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { EditorStore } from './EditorStore.js';
import {
  generateEditorRoute,
  generateViewProjectByGAVRoute,
} from '../../application/LegendStudioNavigation.js';
import { EditorMode } from './EditorMode.js';

export class StandardEditorMode extends EditorMode {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    super();
    this.editorStore = editorStore;
  }

  generateElementLink(elementPath: string): string {
    return generateEditorRoute(
      this.editorStore.sdlcState.activeProject.projectId,
      this.editorStore.sdlcState.activeWorkspace.workspaceId,
      this.editorStore.sdlcState.activeWorkspace.workspaceType,
      elementPath,
    );
  }

  generateDependencyElementLink(
    elementPath: string,
    dependencyProject: ProjectDependency,
  ): string {
    return generateViewProjectByGAVRoute(
      guaranteeNonNullable(dependencyProject.groupId),
      guaranteeNonNullable(dependencyProject.artifactId),
      dependencyProject.versionId === MASTER_SNAPSHOT_ALIAS
        ? SNAPSHOT_VERSION_ALIAS
        : dependencyProject.versionId,
      elementPath,
    );
  }
}
