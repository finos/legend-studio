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
  getQueryBuilderGraphManagerExtension,
  type ServiceExecutionAnalysisResult,
} from '@finos/legend-query-builder';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  type PlainObject,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { EntitiesWithOrigin, Entity } from '@finos/legend-storage';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { LEGEND_QUERY_APP_EVENT } from '../__lib__/LegendQueryEvent.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { BaseQuerySetupStore } from './QuerySetupStore.js';
import type { Service } from '@finos/legend-graph';

export interface ServiceExecutionOption {
  service: Service;
  key?: string | undefined;
}

export class CloneServiceQuerySetupStore extends BaseQuerySetupStore {
  projects: StoreProjectData[] = [];
  loadProjectsState = ActionState.create();
  loadServiceExecutionsState = ActionState.create();
  currentProject?: StoreProjectData | undefined;
  currentProjectVersions?: string[] | undefined;
  currentVersionId?: string | undefined;
  currentServiceExecutionOption?: ServiceExecutionOption | undefined;
  serviceExecutionOptions: ServiceExecutionOption[] = [];

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, depotServerClient);

    makeObservable(this, {
      serviceExecutionOptions: observable,
      projects: observable,
      currentProject: observable,
      currentVersionId: observable,
      currentProjectVersions: observable,
      currentServiceExecutionOption: observable,
      setCurrentProject: action,
      setCurrentProjectVersions: action,
      setCurrentVersionId: action,
      setCurrentServiceExecutionOption: action,
      setServiceExecutionOptions: action,
      loadProjects: flow,
      loadServiceExecutionOptions: flow,
    });
  }

  setCurrentProject(val: StoreProjectData | undefined): void {
    this.currentProject = val;
  }

  setCurrentProjectVersions(val: string[] | undefined): void {
    this.currentProjectVersions = val;
  }

  setCurrentVersionId(val: string | undefined): void {
    this.currentVersionId = val;
  }

  setCurrentServiceExecutionOption(
    val: ServiceExecutionOption | undefined,
  ): void {
    this.currentServiceExecutionOption = val;
  }

  setServiceExecutionOptions(val: ServiceExecutionOption[]): void {
    this.serviceExecutionOptions = val;
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

  *loadServiceExecutionOptions(
    project: StoreProjectData,
    versionId: string,
  ): GeneratorFn<void> {
    this.loadServiceExecutionsState.inProgress();
    try {
      // fetch entities and dependencies
      const entities = (yield this.depotServerClient.getEntities(
        project,
        versionId,
      )) as Entity[];
      const dependencyEntitiesIndex = (yield flowResult(
        this.depotServerClient.getIndexedDependencyEntities(project, versionId),
      )) as Map<string, EntitiesWithOrigin>;

      const serviceExecutionAnalysisResults = (yield flowResult(
        getQueryBuilderGraphManagerExtension(
          this.graphManagerState.graphManager,
        ).surveyServiceExecution(entities, dependencyEntitiesIndex),
      )) as ServiceExecutionAnalysisResult[];

      this.setServiceExecutionOptions(
        serviceExecutionAnalysisResults.flatMap((result) => {
          if (result.executionKeys?.length) {
            return result.executionKeys.map((key) => ({
              service: result.service,
              key,
            }));
          }
          return {
            service: result.service,
          };
        }),
      );
      this.loadServiceExecutionsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.loadServiceExecutionsState.fail();
    }
  }
}
