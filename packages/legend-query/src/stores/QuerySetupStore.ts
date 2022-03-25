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
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type Mapping,
  type PackageableRuntime,
  type Service,
  QuerySearchSpecification,
  PureSingleExecution,
  PureMultiExecution,
} from '@finos/legend-graph';
import type { LegendQueryStore } from './LegendQueryStore';
import { ProjectData } from '@finos/legend-server-depot';
import type { PackageableElementOption } from '@finos/legend-application';

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

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      projects: observable,
      currentProject: observable,
      currentVersionId: observable,
      currentMapping: observable,
      currentRuntime: observable,
      runtimeOptions: computed,
      setCurrentProject: action,
      setCurrentVersionId: action,
      setCurrentMapping: action,
      setCurrentRuntime: action,
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

  get runtimeOptions(): PackageableElementOption<PackageableRuntime>[] {
    const currentMapping = this.currentMapping;
    if (!currentMapping) {
      return [];
    }
    return this.queryStore.queryBuilderState.runtimeOptions.filter((runtime) =>
      runtime.value.runtimeValue.mappings
        .map((mappingReference) => [
          mappingReference.value,
          ...mappingReference.value.allIncludedMappings,
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
      ).map((project) => ProjectData.serialization.fromJson(project));
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
  value: { service: Service; key?: string };
}

export class ServiceQuerySetupState extends QuerySetupState {
  projects: ProjectData[] = [];
  loadProjectsState = ActionState.create();
  currentProject?: ProjectData | undefined;
  currentVersionId?: string | undefined;
  currentService?: Service | undefined;
  currentServiceExecutionKey?: string | undefined;

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      projects: observable,
      currentProject: observable,
      currentVersionId: observable,
      currentService: observable,
      currentServiceExecutionKey: observable,
      setCurrentProject: action,
      setCurrentVersionId: action,
      setCurrentServiceExecution: action,
      loadProjects: flow,
    });
  }

  setCurrentProject(val: ProjectData | undefined): void {
    this.currentProject = val;
  }

  setCurrentVersionId(val: string | undefined): void {
    this.currentVersionId = val;
  }

  setCurrentServiceExecution(
    service: Service | undefined,
    key: string | undefined,
  ): void {
    this.currentService = service;
    this.currentServiceExecutionKey = key;
  }

  get serviceExecutionOptions(): ServiceExecutionOption[] {
    return this.queryStore.queryBuilderState.serviceOptions.flatMap(
      (option) => {
        const service = option.value;
        const serviceExecution = service.execution;
        if (serviceExecution instanceof PureSingleExecution) {
          return {
            label: service.name,
            value: {
              service,
            },
          };
        } else if (serviceExecution instanceof PureMultiExecution) {
          return serviceExecution.executionParameters.map((parameter) => ({
            label: `${service.name} [${parameter.key}]`,
            value: {
              service,
              key: parameter.key,
            },
          }));
        }
        return [];
      },
    );
  }

  *loadProjects(): GeneratorFn<void> {
    this.loadProjectsState.inProgress();
    try {
      this.projects = (
        (yield this.queryStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
      ).map((project) => ProjectData.serialization.fromJson(project));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadProjectsState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }
}

export class QuerySetupStore {
  queryStore: LegendQueryStore;
  querySetupState?: QuerySetupState | undefined;

  constructor(queryStore: LegendQueryStore) {
    makeAutoObservable(this, {
      queryStore: false,
      setSetupState: action,
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
