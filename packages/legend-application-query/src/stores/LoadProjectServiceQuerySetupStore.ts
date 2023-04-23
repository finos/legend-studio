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
  StoreProjectData,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  type PlainObject,
  type GeneratorFn,
} from '@finos/legend-shared';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { flow, makeObservable, observable } from 'mobx';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl } from '../__lib__/LegendQueryNavigation.js';
import { BaseQuerySetupStore } from './QuerySetupStore.js';

export class LoadProjectServiceQuerySetupStore extends BaseQuerySetupStore {
  readonly loadProjectsState = ActionState.create();
  projects: StoreProjectData[] = [];

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, depotServerClient);

    makeObservable(this, {
      projects: observable,
      loadProjects: flow,
    });
  }

  *loadProjects(): GeneratorFn<void> {
    this.loadProjectsState.inProgress();
    try {
      this.projects = (
        (yield this.depotServerClient.getProjects()) as PlainObject<StoreProjectData>[]
      ).map((v) => StoreProjectData.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  async loadProjectServiceUpdater(project: StoreProjectData): Promise<void> {
    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry = this.applicationStore.config.studioInstances.find(
      (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
    );
    if (matchingSDLCEntry) {
      this.applicationStore.alertService.setBlockingAlert({
        message: `Loading service project...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      this.applicationStore.navigationService.navigator.goToAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl(
          matchingSDLCEntry.url,
          project.projectId,
        ),
      );
    } else {
      this.applicationStore.notificationService.notifyWarning(
        `Can't find the corresponding SDLC instance to load project '${project.projectId}'`,
      );
    }
  }
}
