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
} from '../../__lib__/LegendStudioNavigation.js';
import { EditorMode, LegendStudioSourceType } from './EditorMode.js';
import type { LegendSourceInfo } from '@finos/legend-storage';

export interface WorkspaceProjectQuerySDLC extends LegendSourceInfo {
  sourceType: LegendStudioSourceType.PROJECT_WORKSPACE;
  projectId: string;
  workspaceId: string;
  workspaceType: string;
  /** Set only for USER workspaces (owner id); undefined for GROUP. */
  userId?: string | undefined;
  /**
   * Optional SDLC-side hint about where the workspace originated
   * (e.g. `legend-query` productionization). Free-form string until SDLC
   * formalizes a `SourceType` enum.
   */
  source?: string | undefined;
  /**
   * Patch release the workspace is targeting, when the workspace lives on a
   * patch branch. Undefined for regular workspaces on main.
   */
  patchReleaseVersionId?: string | undefined;
}

export class StandardEditorMode extends EditorMode {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    super();
    this.editorStore = editorStore;
  }

  generateElementLink(elementPath: string): string {
    return generateEditorRoute(
      this.editorStore.sdlcState.activeProject.projectId,
      this.editorStore.sdlcState.activePatch?.patchReleaseVersionId.id,
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

  override get isInitialized(): boolean {
    return Boolean(
      this.editorStore.sdlcState.currentProject &&
        this.editorStore.sdlcState.currentWorkspace,
    );
  }

  getSourceInfo(): WorkspaceProjectQuerySDLC | undefined {
    if (this.isInitialized) {
      const workspace = guaranteeNonNullable(
        this.editorStore.sdlcState.currentWorkspace,
      );
      return {
        sourceType: LegendStudioSourceType.PROJECT_WORKSPACE,
        projectId: this.editorStore.sdlcState.activeProject.projectId,
        workspaceId: workspace.workspaceId,
        workspaceType: workspace.workspaceType,
        userId: workspace.userId,
        source: workspace.source,
        patchReleaseVersionId:
          this.editorStore.sdlcState.activePatch?.patchReleaseVersionId.id,
      };
    } else {
      return undefined;
    }
  }
}
