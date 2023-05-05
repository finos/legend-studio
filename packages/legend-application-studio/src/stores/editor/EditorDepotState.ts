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

import { action, computed, flow, makeObservable, observable } from 'mobx';
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

  currentProject?: StoreProjectData | undefined;
  projectVersions: string[] = [];
  isFetchingProjectVersions = false;
  isFetchingProject = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      currentProject: observable,
      projectVersions: observable,
      isFetchingProjectVersions: observable,
      isFetchingProject: observable,
      activeProject: computed,
      setCurrentProject: action,
      fetchCurrentProject: flow,
      fetchProjectVersions: flow,
    });

    this.editorStore = editorStore;
  }

  get activeProject(): StoreProjectData {
    return guaranteeNonNullable(
      this.currentProject,
      `Active project has not been properly set`,
    );
  }

  setCurrentProject(val: StoreProjectData): void {
    this.currentProject = val;
  }

  *fetchCurrentProject(
    projectId: string,
    options?: { suppressNotification?: boolean },
  ): GeneratorFn<void> {
    try {
      this.isFetchingProject = true;
      this.currentProject = (
        (yield this.editorStore.depotServerClient.getProjectById(
          projectId,
        )) as PlainObject<StoreProjectData>[]
      ).map((v) => StoreProjectData.serialization.fromJson(v))[0];
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      if (!options?.suppressNotification) {
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    } finally {
      this.isFetchingProject = false;
    }
  }

  *fetchProjectVersions(): GeneratorFn<void> {
    try {
      this.isFetchingProjectVersions = true;
      this.projectVersions =
        (yield this.editorStore.depotServerClient.getVersions(
          this.activeProject.groupId,
          this.activeProject.artifactId,
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
