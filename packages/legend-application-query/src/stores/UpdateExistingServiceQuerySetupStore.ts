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
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import {
  extractServiceInfo,
  type ServiceInfo,
} from '@finos/legend-query-builder';
import {
  DepotScope,
  StoreProjectData,
  type DepotServerClient,
  type StoredEntity,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
} from '@finos/legend-shared';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { flow, makeObservable, observable } from 'mobx';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl } from '../__lib__/LegendQueryNavigation.js';
import { BaseQuerySetupStore } from './QuerySetupStore.js';

export class UpdateExistingServiceQuerySetupStore extends BaseQuerySetupStore {
  readonly loadServicesState = ActionState.create();
  services: ServiceInfo[] = [];

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, depotServerClient);

    makeObservable(this, {
      services: observable,
      loadServices: flow,
    });
  }

  async loadServiceUpdater(serviceInfo: ServiceInfo): Promise<void> {
    // fetch project data
    const project = StoreProjectData.serialization.fromJson(
      await this.depotServerClient.getProject(
        serviceInfo.groupId,
        serviceInfo.artifactId,
      ),
    );

    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry = this.applicationStore.config.studioInstances.find(
      (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
    );
    if (matchingSDLCEntry) {
      this.applicationStore.alertService.setBlockingAlert({
        message: `Loading service...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      this.applicationStore.navigationService.navigator.goToAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl(
          matchingSDLCEntry.url,
          serviceInfo.groupId,
          serviceInfo.artifactId,
          serviceInfo.path,
        ),
      );
    } else {
      this.applicationStore.notificationService.notifyWarning(
        `Can't find the corresponding SDLC instance to update the service`,
      );
    }
  }

  *loadServices(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadServicesState.inProgress();
    try {
      this.services = (
        (yield this.depotServerClient.DEPRECATED_getEntitiesByClassifierPath(
          CORE_PURE_PATH.SERVICE,
          {
            search: isValidSearchString ? searchText : undefined,
            // NOTE: since this mode is meant for contribution, we want to load services
            // on the snapshot version (i.e. merged to the default branch on the projects)
            scope: DepotScope.SNAPSHOT,
            limit: DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
          },
        )) as StoredEntity[]
      ).map((storedEntity) => extractServiceInfo(storedEntity));
      this.loadServicesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadServicesState.fail();
    }
  }
}
