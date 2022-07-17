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
  type Service,
  QuerySearchSpecification,
  BasicGraphManagerState,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-model-storage';
import { getQueryBuilderGraphManagerExtension } from '../graphManager/protocol/QueryBuilder_PureGraphManagerExtension.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryAppEvent.js';
import type { ServiceExecutionAnalysisResult } from '../graphManager/action/analytics/ServiceExecutionAnalysis.js';
import type { MappingRuntimeCompatibilityAnalysisResult } from '../graphManager/action/analytics/MappingRuntimeCompatibilityAnalysis.js';
import {
  APPLICATION_EVENT,
  TAB_SIZE,
  type ApplicationStore,
} from '@finos/legend-application';
import type { LegendQueryConfig } from '../application/LegendQueryConfig.js';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';

export abstract class QuerySetupState {
  setupStore: QuerySetupStore;

  constructor(setupStore: QuerySetupStore) {
    this.setupStore = setupStore;
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
          (yield this.setupStore.graphManagerState.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
      } catch (error) {
        assertErrorThrown(error);
        this.setupStore.applicationStore.notifyError(error);
      } finally {
        this.loadQueryState.reset();
      }
    } else {
      this.currentQuery = undefined;
    }
  }

  *loadQueries(searchText: string): GeneratorFn<void> {
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
        (yield this.setupStore.graphManagerState.graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadQueriesState.fail();
      this.setupStore.applicationStore.notifyError(error);
    }
  }
}

export class CreateQuerySetupState extends QuerySetupState {
  projects: ProjectData[] = [];
  loadProjectsState = ActionState.create();
  surveyMappingRuntimeCompatibilityState = ActionState.create();
  currentProject?: ProjectData | undefined;
  currentVersionId?: string | undefined;
  currentMapping?: Mapping | undefined;
  currentRuntime?: PackageableRuntime | undefined;
  mappingRuntimeCompatibilitySurveyResult: MappingRuntimeCompatibilityAnalysisResult[] =
    [];

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      projects: observable,
      currentProject: observable,
      currentVersionId: observable,
      currentMapping: observable,
      currentRuntime: observable,
      mappingRuntimeCompatibilitySurveyResult: observable,
      compatibleRuntimes: computed,
      setCurrentProject: action,
      setCurrentVersionId: action,
      setCurrentMapping: action,
      setCurrentRuntime: action,
      loadProjects: flow,
      surveyMappingRuntimeCompatibility: flow,
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
        (yield this.setupStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
      ).map((v) => ProjectData.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadProjectsState.fail();
      this.setupStore.applicationStore.notifyError(error);
    }
  }

  *surveyMappingRuntimeCompatibility(
    project: ProjectData,
    versionId: string,
  ): GeneratorFn<void> {
    this.surveyMappingRuntimeCompatibilityState.inProgress();
    try {
      // fetch entities and dependencies
      const entities = (yield this.setupStore.depotServerClient.getEntities(
        project,
        versionId,
      )) as Entity[];
      const dependencyEntitiesIndex = (yield flowResult(
        this.setupStore.depotServerClient.getIndexedDependencyEntities(
          project,
          versionId,
        ),
      )) as Map<string, Entity[]>;

      this.mappingRuntimeCompatibilitySurveyResult = (yield flowResult(
        getQueryBuilderGraphManagerExtension(
          this.setupStore.graphManagerState.graphManager,
        ).surveyMappingRuntimeCompatibility(entities, dependencyEntitiesIndex),
      )) as MappingRuntimeCompatibilityAnalysisResult[];

      this.surveyMappingRuntimeCompatibilityState.pass();
    } catch (error) {
      this.surveyMappingRuntimeCompatibilityState.fail();
      assertErrorThrown(error);
      this.setupStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.setupStore.applicationStore.notifyError(error);
    }
  }
}

export interface ServiceExecutionOption {
  service: Service;
  key?: string | undefined;
}

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
        (yield this.setupStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
      ).map((v) => ProjectData.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadProjectsState.fail();
      this.setupStore.applicationStore.notifyError(error);
    }
  }

  *loadServiceExecutionOptions(
    project: ProjectData,
    versionId: string,
  ): GeneratorFn<void> {
    this.loadServiceExecutionsState.inProgress();
    try {
      // fetch entities and dependencies
      const entities = (yield this.setupStore.depotServerClient.getEntities(
        project,
        versionId,
      )) as Entity[];
      const dependencyEntitiesIndex = (yield flowResult(
        this.setupStore.depotServerClient.getIndexedDependencyEntities(
          project,
          versionId,
        ),
      )) as Map<string, Entity[]>;

      const serviceExecutionAnalysisResults = (yield flowResult(
        getQueryBuilderGraphManagerExtension(
          this.setupStore.graphManagerState.graphManager,
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
      this.loadServiceExecutionsState.fail();
      assertErrorThrown(error);
      this.setupStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.setupStore.applicationStore.notifyError(error);
    }
  }
}

export class QuerySetupStore {
  applicationStore: ApplicationStore<LegendQueryConfig>;
  graphManagerState: BasicGraphManagerState;
  depotServerClient: DepotServerClient;
  pluginManager: LegendQueryPluginManager;

  querySetupState?: QuerySetupState | undefined;
  initState = ActionState.create();

  constructor(
    applicationStore: ApplicationStore<LegendQueryConfig>,
    depotServerClient: DepotServerClient,
    pluginManager: LegendQueryPluginManager,
  ) {
    makeObservable(this, {
      querySetupState: observable,
      setSetupState: action,
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = new BasicGraphManagerState(
      pluginManager,
      applicationStore.log,
    );
    this.depotServerClient = depotServerClient;
    this.pluginManager = pluginManager;
  }

  setSetupState(val: QuerySetupState | undefined): void {
    this.querySetupState = val;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'development') {
        this.applicationStore.log.info(
          LogEvent.create(APPLICATION_EVENT.DEVELOPMENT_ISSUE),
          `Fast-refreshing the app - preventing initialize() recall...`,
        );
        return;
      }
      this.applicationStore.notifyIllegalState(
        `Query setup store is already initialized`,
      );
      return;
    }
    try {
      this.initState.inProgress();
      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      );

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.setBlockingAlert({
        message: `Can't initialize query setup store`,
      });
      this.initState.fail();
    }
  }
}
