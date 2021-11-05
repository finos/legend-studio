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
  generateViewEntityRoute,
  generateViewProjectByGAVRoute,
  generateViewRevisionRoute,
  generateViewVersionRoute,
} from '../LegendStudioRouter';
import { EditorMode } from '../editor/EditorMode';
import type { ViewerStore } from '../ViewerStore';

export class ViewerEditorMode extends EditorMode {
  viewerStore: ViewerStore;

  constructor(viewerStore: ViewerStore) {
    super();
    this.viewerStore = viewerStore;
  }

  generateElementLink(elementPath: string): string {
    return this.viewerStore.projectGAVCoordinates
      ? generateViewProjectByGAVRoute(
          this.viewerStore.projectGAVCoordinates.groupId,
          this.viewerStore.projectGAVCoordinates.artifactId,
          this.viewerStore.projectGAVCoordinates.versionId,
          elementPath,
        )
      : this.viewerStore.version
      ? generateViewVersionRoute(
          this.viewerStore.editorStore.applicationStore.config
            .currentSDLCServerOption,
          this.viewerStore.editorStore.sdlcState.activeProject.projectId,
          this.viewerStore.version.id.id,
          elementPath,
        )
      : this.viewerStore.revision
      ? generateViewRevisionRoute(
          this.viewerStore.editorStore.applicationStore.config
            .currentSDLCServerOption,
          this.viewerStore.editorStore.sdlcState.activeProject.projectId,
          this.viewerStore.revision.id,
          elementPath,
        )
      : generateViewEntityRoute(
          this.viewerStore.editorStore.applicationStore.config
            .currentSDLCServerOption,
          this.viewerStore.editorStore.sdlcState.activeProject.projectId,
          elementPath,
        );
  }
}
