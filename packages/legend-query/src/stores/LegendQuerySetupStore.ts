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
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type Mapping,
  type PackageableRuntime,
  QuerySearchSpecification,
  getAllIncludedMappings,
} from '@finos/legend-graph';
import type { LegendQueryStore } from './LegendQueryStore.js';
import {
  LATEST_VERSION_ALIAS,
  ProjectData,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-application';
import type { Entity } from '@finos/legend-model-storage';
import { getQueryBuilderGraphManagerExtension } from '../graphManager/protocol/QueryBuilder_PureGraphManagerExtension.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryAppEvent.js';
import type { ServiceExecutionAnalysisResult } from '../graphManager/action/analytics/ServiceExecutionAnalysis.js';

export abstract class QuerySetupState {
  setupStore: QuerySetupStore;
  queryStore: LegendQueryStore;

  constructor(setupStore: QuerySetupStore) {
    this.setupStore = setupStore;
    this.queryStore = setupStore.queryStore;
  }
}

export class ExistingQuerySetupState extends QuerySetupState {
  queries: LightQuery[] = [];
  loadQueriesState = ActionState.create();
  loadQueryState = ActionState.create();
  currentQuery?: LightQuery | undefined;
  showCurrentUserQueriesOnly = false;

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      queries: observable,
      currentQuery: observable,
      showCurrentUserQueriesOnly: observable,
      setShowCurrentUserQueriesOnly: action,
      setCurrentQuery: flow,
      loadQueries: flow,
    });
  }

  setShowCurrentUserQueriesOnly(val: boolean): void {
    this.showCurrentUserQueriesOnly = val;
  }

  *setCurrentQuery(queryId: string | undefined): GeneratorFn<void> {
    if (queryId) {
      try {
        this.loadQueryState.inProgress();
        this.currentQuery =
          (yield this.queryStore.graphManagerState.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
      } catch (error) {
        assertErrorThrown(error);
        this.queryStore.applicationStore.notifyError(error);
      } finally {
        this.loadQueryState.reset();
      }
    } else {
      this.currentQuery = undefined;
    }
  }

  *loadQueries(searchText: string): GeneratorFn<void> {
    if (this.queryStore.initState.isInInitialState) {
      yield flowResult(this.queryStore.initialize());
    } else if (this.queryStore.initState.isInProgress) {
      return;
    }
    const isValidSearchString = searchText.length >= 3;
    this.loadQueriesState.inProgress();
    try {
      const searchSpecification = new QuerySearchSpecification();
      searchSpecification.searchTerm = isValidSearchString
        ? searchText
        : undefined;
      searchSpecification.limit = 10;
      searchSpecification.showCurrentUserQueriesOnly =
        this.showCurrentUserQueriesOnly;
      this.queries =
        (yield this.queryStore.graphManagerState.graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadQueriesState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }
}

export class CreateQuerySetupState extends QuerySetupState {
  projects: ProjectData[] = [];
  loadProjectsState = ActionState.create();
  currentProject?: ProjectData | undefined;
  currentVersionId?: string | undefined;
  currentMapping?: Mapping | undefined;
  currentRuntime?: PackageableRuntime | undefined;
  mappingOptions: PackageableElementOption<Mapping>[] = [];

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      projects: observable,
      currentProject: observable,
      currentVersionId: observable,
      currentMapping: observable,
      currentRuntime: observable,
      mappingOptions: observable,
      runtimeOptions: computed,
      setCurrentProject: action,
      setCurrentVersionId: action,
      setCurrentMapping: action,
      setCurrentRuntime: action,
      setMappingOptions: action,
      loadProjects: flow,
    });
  }

  setCurrentProject(val: ProjectData | undefined): void {
    this.currentProject = val;
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

  setMappingOptions(val: PackageableElementOption<Mapping>[]): void {
    this.mappingOptions = val;
  }

  get runtimeOptions(): PackageableElementOption<PackageableRuntime>[] {
    const currentMapping = this.currentMapping;
    if (!currentMapping) {
      return [];
    }
    return this.queryStore.queryBuilderState.runtimes
      .map(
        (e) =>
          buildElementOption(e) as PackageableElementOption<PackageableRuntime>,
      )
      .filter((runtime) =>
        runtime.value.runtimeValue.mappings
          .map((mappingReference) => [
            mappingReference.value,
            ...getAllIncludedMappings(mappingReference.value),
          ])
          .flat()
          .includes(currentMapping),
      );
  }

  *loadProjects(): GeneratorFn<void> {
    this.loadProjectsState.inProgress();
    try {
      this.projects = (
        (yield this.queryStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
      ).map((v) => ProjectData.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadProjectsState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }
}

export interface ServiceExecutionOption {
  label: string;
  value: {
    path: string;
    name: string;
    package: string;
    key?: string | undefined;
  };
}

const buildServiceExecutionOption = (
  result: ServiceExecutionAnalysisResult,
  key?: string | undefined,
): ServiceExecutionOption => ({
  label: `${result.name}${key ? ` [${key}]` : ''}`,
  value: {
    path: result.path,
    name: result.name,
    package: result.package,
    key,
  },
});

export class ServiceQuerySetupState extends QuerySetupState {
  projects: ProjectData[] = [];
  loadProjectsState = ActionState.create();
  loadServiceExecutionsState = ActionState.create();
  currentProject?: ProjectData | undefined;
  currentVersionId?: string | undefined;
  currentServiceExecutionOption?: ServiceExecutionOption | undefined;
  serviceExecutionOptions: ServiceExecutionOption[] = [];

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      serviceExecutionOptions: observable,
      projects: observable,
      currentProject: observable,
      currentVersionId: observable,
      currentServiceExecutionOption: observable,
      setCurrentProject: action,
      setCurrentVersionId: action,
      setCurrentServiceExecutionOption: action,
      setServiceExecutionOptions: action,
      loadProjects: flow,
      loadServiceExecutionOptions: flow,
    });
  }

  setCurrentProject(val: ProjectData | undefined): void {
    this.currentProject = val;
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
        (yield this.queryStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
      ).map((v) => ProjectData.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadProjectsState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }

  *loadServiceExecutionOptions(
    project: ProjectData,
    versionId: string,
  ): GeneratorFn<void> {
    this.loadServiceExecutionsState.inProgress();
    try {
      // fetch entities
      let entities: Entity[] = [];
      if (versionId === SNAPSHOT_VERSION_ALIAS) {
        entities =
          (yield this.queryStore.depotServerClient.getLatestRevisionEntities(
            project.groupId,
            project.artifactId,
          )) as Entity[];
      } else {
        entities = (yield this.queryStore.depotServerClient.getVersionEntities(
          project.groupId,
          project.artifactId,
          versionId === LATEST_VERSION_ALIAS
            ? project.latestVersion
            : versionId,
        )) as Entity[];
      }

      // fetch and build dependencies
      const dependencyEntitiesMap = (yield flowResult(
        this.queryStore.depotServerClient.getIndexedDependencyEntities(
          project,
          versionId,
        ),
      )) as Map<string, Entity[]>;

      const serviceExecutionAnalysisResults = (yield flowResult(
        getQueryBuilderGraphManagerExtension(
          this.queryStore.graphManagerState.graphManager,
        ).surveyServiceExecution(
          this.queryStore.graphManagerState.createEmptyGraph(),
          entities,
          dependencyEntitiesMap,
        ),
      )) as ServiceExecutionAnalysisResult[];

      this.setServiceExecutionOptions(
        serviceExecutionAnalysisResults.flatMap((result) => {
          if (result.executionKeys && result.executionKeys.length) {
            return result.executionKeys.map((key) =>
              buildServiceExecutionOption(result, key),
            );
          }
          return buildServiceExecutionOption(result);
        }),
      );
      this.loadServiceExecutionsState.pass();
    } catch (error) {
      this.loadServiceExecutionsState.fail();
      assertErrorThrown(error);
      this.queryStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.queryStore.applicationStore.notifyError(error);
    }
  }
}

export class QuerySetupStore {
  queryStore: LegendQueryStore;
  querySetupState?: QuerySetupState | undefined;

  constructor(queryStore: LegendQueryStore) {
    makeObservable(this, {
      querySetupState: observable,
      setSetupState: action,
      initialize: flow,
    });

    this.queryStore = queryStore;
  }

  setSetupState(val: QuerySetupState | undefined): void {
    this.querySetupState = val;
  }

  *initialize(): GeneratorFn<void> {
    this.queryStore.reset();
  }
}
