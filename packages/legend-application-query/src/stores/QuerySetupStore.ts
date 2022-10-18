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
  uniq,
  isNonNullable,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type Mapping,
  type PackageableRuntime,
  type Service,
  type QueryInfo,
  QuerySearchSpecification,
  BasicGraphManagerState,
  CORE_PURE_PATH,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  type StoredEntity,
  ProjectData,
  DepotScope,
} from '@finos/legend-server-depot';
import { type Entity, parseProjectIdentifier } from '@finos/legend-storage';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryAppEvent.js';
import {
  APPLICATION_EVENT,
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  TAB_SIZE,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import {
  type MappingRuntimeCompatibilityAnalysisResult,
  type ServiceExecutionAnalysisResult,
  type ServiceInfo,
  getQueryBuilderGraphManagerExtension,
  extractServiceInfo,
} from '@finos/legend-query-builder';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl,
} from './LegendQueryRouter.js';
import type { QuerySetupActionConfiguration } from './LegendQueryApplicationPlugin.js';

export abstract class QuerySetupState {
  setupStore: QuerySetupStore;

  constructor(setupStore: QuerySetupStore) {
    this.setupStore = setupStore;
  }
}

export class EditExistingQuerySetupState extends QuerySetupState {
  queries: LightQuery[] = [];
  loadQueriesState = ActionState.create();
  loadQueryState = ActionState.create();
  currentQuery?: LightQuery | undefined;
  currentQueryInfo?: QueryInfo | undefined;
  showCurrentUserQueriesOnly = false;

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      queries: observable,
      currentQuery: observable,
      currentQueryInfo: observable,
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
        this.currentQueryInfo =
          (yield this.setupStore.graphManagerState.graphManager.getQueryInfo(
            queryId,
          )) as QueryInfo;
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
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadQueriesState.inProgress();
    try {
      const searchSpecification = new QuerySearchSpecification();
      searchSpecification.searchTerm = isValidSearchString
        ? searchText
        : undefined;
      searchSpecification.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
      searchSpecification.showCurrentUserQueriesOnly =
        this.showCurrentUserQueriesOnly;
      this.queries =
        (yield this.setupStore.graphManagerState.graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.setupStore.applicationStore.notifyError(error);
      this.loadQueriesState.fail();
    }
  }
}

export class QueryProductionizationSetupState extends QuerySetupState {
  queries: LightQuery[] = [];
  loadQueriesState = ActionState.create();
  loadQueryState = ActionState.create();
  currentQuery?: LightQuery | undefined;
  currentQueryInfo?: QueryInfo | undefined;

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      queries: observable,
      currentQuery: observable,
      currentQueryInfo: observable,
      setCurrentQuery: flow,
      loadQueries: flow,
    });
  }

  async loadQueryProductionizer(): Promise<void> {
    if (!this.currentQuery) {
      return;
    }

    // fetch project data
    const project = ProjectData.serialization.fromJson(
      await this.setupStore.depotServerClient.getProject(
        this.currentQuery.groupId,
        this.currentQuery.artifactId,
      ),
    );

    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry =
      this.setupStore.applicationStore.config.studioInstances.find(
        (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
      );
    if (matchingSDLCEntry) {
      this.setupStore.applicationStore.setBlockingAlert({
        message: `Loading query...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      this.setupStore.applicationStore.navigator.goToAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl(
          matchingSDLCEntry.url,
          this.currentQuery.id,
        ),
      );
    } else {
      this.setupStore.applicationStore.notifyWarning(
        `Can't find the corresponding SDLC instance to productionize the query`,
      );
    }
  }

  *setCurrentQuery(queryId: string | undefined): GeneratorFn<void> {
    if (queryId) {
      try {
        this.loadQueryState.inProgress();
        this.currentQuery =
          (yield this.setupStore.graphManagerState.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
        this.currentQueryInfo =
          (yield this.setupStore.graphManagerState.graphManager.getQueryInfo(
            queryId,
          )) as QueryInfo;
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
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadQueriesState.inProgress();
    try {
      const searchSpecification = new QuerySearchSpecification();
      searchSpecification.searchTerm = isValidSearchString
        ? searchText
        : undefined;
      searchSpecification.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
      this.queries =
        (yield this.setupStore.graphManagerState.graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.setupStore.applicationStore.notifyError(error);
      this.loadQueriesState.fail();
    }
  }
}

export class UpdateExistingServiceQuerySetupState extends QuerySetupState {
  services: ServiceInfo[] = [];
  loadServicesState = ActionState.create();

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      services: observable,
      loadServices: flow,
    });
  }

  async loadServiceUpdater(serviceInfo: ServiceInfo): Promise<void> {
    // fetch project data
    const project = ProjectData.serialization.fromJson(
      await this.setupStore.depotServerClient.getProject(
        serviceInfo.groupId,
        serviceInfo.artifactId,
      ),
    );

    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry =
      this.setupStore.applicationStore.config.studioInstances.find(
        (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
      );
    if (matchingSDLCEntry) {
      this.setupStore.applicationStore.setBlockingAlert({
        message: `Loading service...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      this.setupStore.applicationStore.navigator.goToAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl(
          matchingSDLCEntry.url,
          serviceInfo.groupId,
          serviceInfo.artifactId,
          serviceInfo.path,
        ),
      );
    } else {
      this.setupStore.applicationStore.notifyWarning(
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
        (yield this.setupStore.depotServerClient.getEntitiesByClassifierPath(
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
      this.setupStore.applicationStore.notifyError(error);
      this.loadServicesState.fail();
    }
  }
}

export class CreateMappingQuerySetupState extends QuerySetupState {
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
      this.setupStore.applicationStore.notifyError(error);
      this.loadProjectsState.fail();
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
      assertErrorThrown(error);
      this.setupStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.setupStore.applicationStore.notifyError(error);
      this.surveyMappingRuntimeCompatibilityState.fail();
    }
  }
}

export class LoadProjectServiceQuerySetupState extends QuerySetupState {
  projects: ProjectData[] = [];
  loadProjectsState = ActionState.create();

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      projects: observable,
      loadProjects: flow,
    });
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
      this.setupStore.applicationStore.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  async loadProjectServiceUpdater(project: ProjectData): Promise<void> {
    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry =
      this.setupStore.applicationStore.config.studioInstances.find(
        (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
      );
    if (matchingSDLCEntry) {
      this.setupStore.applicationStore.setBlockingAlert({
        message: `Loading service project...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      this.setupStore.applicationStore.navigator.goToAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl(
          matchingSDLCEntry.url,
          project.projectId,
        ),
      );
    } else {
      this.setupStore.applicationStore.notifyWarning(
        `Can't find the corresponding SDLC instance to load project '${project.projectId}'`,
      );
    }
  }
}

export interface ServiceExecutionOption {
  service: Service;
  key?: string | undefined;
}

export class CloneServiceQuerySetupState extends QuerySetupState {
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
      this.setupStore.applicationStore.notifyError(error);
      this.loadProjectsState.fail();
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
      assertErrorThrown(error);
      this.setupStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.setupStore.applicationStore.notifyError(error);
      this.loadServiceExecutionsState.fail();
    }
  }
}

export class QuerySetupStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly graphManagerState: BasicGraphManagerState;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendQueryPluginManager;

  readonly initState = ActionState.create();
  querySetupState?: QuerySetupState | undefined;

  actions: QuerySetupActionConfiguration[] = [];
  actionGroups: string[] = [];
  showAllGroups = false;
  showAdvancedActions = false;
  actionGroupToFocus?: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      querySetupState: observable,
      showAllGroups: observable,
      showAdvancedActions: observable,
      actionGroupToFocus: observable,
      isCustomized: computed,
      setSetupState: action,
      setShowAllGroups: action,
      setShowAdvancedActions: action,
      setActionGroupToFocus: action,
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = new BasicGraphManagerState(
      applicationStore.pluginManager,
      applicationStore.log,
    );
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;
    this.actions = this.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) => plugin.getExtraQuerySetupActionConfigurations?.() ?? [],
      )
      .sort((a, b) => (a.isAdvanced ? 1 : 0) - (b.isAdvanced ? 1 : 0));
    this.actionGroups = uniq(
      this.actions.map((config) => config.tag).filter(isNonNullable),
    ).sort();
  }

  get isCustomized(): boolean {
    return (
      this.showAllGroups ||
      this.showAdvancedActions ||
      Boolean(this.actionGroupToFocus)
    );
  }

  setSetupState(val: QuerySetupState | undefined): void {
    this.querySetupState = val;
  }

  setShowAllGroups(val: boolean): void {
    this.showAllGroups = val;
  }

  setShowAdvancedActions(val: boolean): void {
    this.showAdvancedActions = val;
  }

  setActionGroupToFocus(val: string | undefined): void {
    if (val && !this.actionGroups.includes(val)) {
      return;
    }
    this.actionGroupToFocus = val;
  }

  resetConfig(): void {
    this.setShowAdvancedActions(false);
    this.setShowAllGroups(false);
    this.setActionGroupToFocus(undefined);
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
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.setBlockingAlert({
        message: `Can't initialize query setup store`,
      });
      this.initState.fail();
    }
  }
}
