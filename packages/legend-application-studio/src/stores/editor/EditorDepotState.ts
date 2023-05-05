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

import { flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from './EditorStore.js';
import {
  guaranteeNonNullable,
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  type PlainObject,
} from '@finos/legend-shared';
import { StoreProjectData } from '@finos/legend-server-depot';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';

export class EditorDepotState {
  readonly editorStore: EditorStore;

  projectVersions: string[] = [];
  isFetchingProjectVersions = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      projectVersions: observable,
      isFetchingProjectVersions: observable,
      fetchProjectVersions: flow,
    });

    this.editorStore = editorStore;
  }

  *fetchProjectVersions(): GeneratorFn<void> {
    try {
      this.isFetchingProjectVersions = true;
      // NOTE: this is not necessary. groupId and artifactId could be gotten from this.editorStore.projectConfigurationEditorState
      const currentProject = (
        (yield this.editorStore.depotServerClient.getProjectById(
          this.editorStore.sdlcState.activeProject.projectId,
        )) as PlainObject<StoreProjectData>[]
      ).map((v) => StoreProjectData.serialization.fromJson(v))[0];
      this.projectVersions =
        (yield this.editorStore.depotServerClient.getVersions(
          guaranteeNonNullable(currentProject).groupId,
          guaranteeNonNullable(currentProject).artifactId,
          true,
        )) as string[];
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.isFetchingProjectVersions = false;
    }
  }
}
