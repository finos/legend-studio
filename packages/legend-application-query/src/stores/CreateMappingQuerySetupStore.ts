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

import type { Mapping, PackageableRuntime } from '@finos/legend-graph';
import {
  getQueryBuilderGraphManagerExtension,
  type MappingRuntimeCompatibilityAnalysisResult,
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
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { LEGEND_QUERY_APP_EVENT } from '../__lib__/LegendQueryEvent.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { BaseQuerySetupStore } from './QuerySetupStore.js';

export class CreateMappingQuerySetupStore extends BaseQuerySetupStore {
  readonly loadProjectsState = ActionState.create();
  readonly surveyMappingRuntimeCompatibilityState = ActionState.create();

  projects: StoreProjectData[] = [];
  currentProject?: StoreProjectData | undefined;
  currentProjectVersions?: string[] | undefined;
  currentVersionId?: string | undefined;
  currentMapping?: Mapping | undefined;
  currentRuntime?: PackageableRuntime | undefined;
  mappingRuntimeCompatibilitySurveyResult: MappingRuntimeCompatibilityAnalysisResult[] =
    [];

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, depotServerClient);

    makeObservable(this, {
      projects: observable,
      currentProject: observable,
      currentProjectVersions: observable,
      currentVersionId: observable,
      currentMapping: observable,
      currentRuntime: observable,
      mappingRuntimeCompatibilitySurveyResult: observable,
      compatibleRuntimes: computed,
      setCurrentProject: action,
      setCurrentProjectVersions: action,
      setCurrentVersionId: action,
      setCurrentMapping: action,
      setCurrentRuntime: action,
      loadProjects: flow,
      surveyMappingRuntimeCompatibility: flow,
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

  setCurrentMapping(val: Mapping | undefined): void {
    this.currentMapping = val;
  }

  setCurrentRuntime(val: PackageableRuntime | undefined): void {
    this.currentRuntime = val;
  }

  get compatibleRuntimes(): PackageableRuntime[] {
    const currentMapping = this.currentMapping;
    if (!currentMapping) {
      return [];
    }
    return (
      this.mappingRuntimeCompatibilitySurveyResult.find(
        (result) => result.mapping === currentMapping,
      )?.runtimes ?? []
    );
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

  *surveyMappingRuntimeCompatibility(
    project: StoreProjectData,
    versionId: string,
  ): GeneratorFn<void> {
    this.surveyMappingRuntimeCompatibilityState.inProgress();
    try {
      // fetch entities and dependencies
      const entities = (yield this.depotServerClient.getEntities(
        project,
        versionId,
      )) as Entity[];
      const dependencyEntitiesIndex = (yield flowResult(
        this.depotServerClient.getIndexedDependencyEntities(project, versionId),
      )) as Map<string, EntitiesWithOrigin>;

      this.mappingRuntimeCompatibilitySurveyResult = (yield flowResult(
        getQueryBuilderGraphManagerExtension(
          this.graphManagerState.graphManager,
        ).surveyMappingRuntimeCompatibility(entities, dependencyEntitiesIndex),
      )) as MappingRuntimeCompatibilityAnalysisResult[];

      this.surveyMappingRuntimeCompatibilityState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.surveyMappingRuntimeCompatibilityState.fail();
    }
  }
}
