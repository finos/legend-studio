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
  override,
} from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  assertErrorThrown,
  uuid,
  assertType,
  guaranteeNonNullable,
  ActionState,
  StopWatch,
  guaranteeType,
  quantifyList,
  assertNonNullable,
  returnUndefOnError,
  UnsupportedOperationError,
  filterByType,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type RawLambda,
  type Runtime,
  type Service,
  type QueryGridConfig,
  type ValueSpecification,
  type GraphInitializationReport,
  type PackageableRuntime,
  GraphManagerState,
  Query,
  PureExecution,
  PackageableElementExplicitReference,
  RuntimePointer,
  GRAPH_MANAGER_EVENT,
  extractElementNameFromPath,
  Mapping,
  createGraphBuilderReport,
  LegendSDLC,
  QuerySearchSpecification,
  toLightQuery,
  QueryParameterValue,
  reportGraphAnalytics,
  cloneQueryStereotype,
  cloneQueryTaggedValue,
  QueryDataSpaceExecutionContext,
  QueryExplicitExecutionContext,
  QueryProjectCoordinates,
  buildLambdaVariableExpressions,
  VariableExpression,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  generateExistingQueryEditorRoute,
  generateMappingQueryCreatorRoute,
  generateServiceQueryCreatorRoute,
} from '../__lib__/LegendQueryNavigation.js';
import { LEGEND_QUERY_APP_EVENT } from '../__lib__/LegendQueryEvent.js';
import {
  type Entity,
  type ProjectGAVCoordinates,
  type EntitiesWithOrigin,
  parseGACoordinates,
} from '@finos/legend-storage';
import {
  type DepotServerClient,
  resolveVersion,
  StoreProjectData,
  LATEST_VERSION_ALIAS,
  VersionedProjectData,
} from '@finos/legend-server-depot';
import {
  ActionAlertActionType,
  ActionAlertType,
  DEFAULT_TAB_SIZE,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import { LegendQueryEventHelper } from '../__lib__/LegendQueryEventHelper.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import {
  type QueryBuilderState,
  type ServiceExecutionContext,
  type QueryBuilderDiffViewState,
  ClassQueryBuilderState,
  MappingQueryBuilderState,
  ServiceQueryBuilderState,
  QueryLoaderState,
  QueryBuilderDataBrowserWorkflow,
  QueryBuilderActionConfig,
  QUERY_LOADER_DEFAULT_QUERY_SEARCH_LIMIT,
} from '@finos/legend-query-builder';
import { LegendQueryUserDataHelper } from '../__lib__/LegendQueryUserDataHelper.js';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';
import {
  DataSpaceQueryBuilderState,
  type DataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  DSL_DataSpace_getGraphManagerExtension,
  type DataSpace,
  type DataSpaceExecutionContext,
  getOwnDataSpace,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space/graph';
import { generateDataSpaceQueryCreatorRoute } from '../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { hasDataSpaceInfoBeenVisited } from '../__lib__/LegendQueryUserDataSpaceHelper.js';
import { createDataSpaceDepoRepo } from './data-space/DataSpaceQueryBuilderHelper.js';

export interface QueryPersistConfiguration {
  defaultName?: string | undefined;
  allowUpdate?: boolean | undefined;
  onQueryUpdate?: ((query: Query) => void) | undefined;
  decorator: ((query: Query) => void) | undefined;
}

export class QueryCreatorState {
  readonly editorStore: QueryEditorStore;
  readonly createQueryState = ActionState.create();
  queryName: string;
  showCreateModal = false;
  originalQuery: Query | undefined;

  constructor(editorStore: QueryEditorStore, queryName: string | undefined) {
    makeObservable(this, {
      queryName: observable,
      showCreateModal: observable,
      createQueryState: observable,
      originalQuery: observable,
      open: action,
      setQueryName: action,
      close: action,
      createQuery: flow,
    });
    this.editorStore = editorStore;
    this.queryName = queryName ?? '';
  }

  setQueryName(val: string): void {
    this.queryName = val;
  }

  open(originalQuery?: Query | undefined): void {
    this.showCreateModal = true;
    this.originalQuery = originalQuery;
  }

  close(): void {
    this.showCreateModal = false;
    this.originalQuery = undefined;
    this.editorStore.setExistingQueryName(undefined);
  }

  *createQuery(): GeneratorFn<void> {
    try {
      const queryBuilderState = guaranteeNonNullable(
        this.editorStore.queryBuilderState,
        'Query builder state required to build query to edit',
      );
      this.createQueryState.inProgress();
      const rawLambda = queryBuilderState.buildQuery();
      const config = this.editorStore.getPersistConfiguration(rawLambda, {
        update: true,
      });
      const query = (yield this.editorStore.buildQueryForPersistence(
        new Query(),
        rawLambda,
        queryBuilderState.getCurrentParameterValues(),
        config,
        queryBuilderState.getGridConfig(),
      )) as Query;
      query.name = this.queryName;
      query.id = uuid();
      query.originalVersionId =
        query.versionId === LATEST_VERSION_ALIAS
          ? VersionedProjectData.serialization.fromJson(
              (yield this.editorStore.depotServerClient.getLatestVersion(
                query.groupId,
                query.artifactId,
              )) as PlainObject<VersionedProjectData>,
            ).versionId
          : query.versionId;
      if (this.originalQuery) {
        query.stereotypes =
          this.originalQuery.stereotypes?.map(cloneQueryStereotype);
        query.taggedValues = this.originalQuery.taggedValues?.map(
          cloneQueryTaggedValue,
        );
      }
      const newQuery =
        (yield this.editorStore.graphManagerState.graphManager.createQuery(
          query,
          this.editorStore.graphManagerState.graph,
        )) as Query;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Successfully created query!`,
      );
      LegendQueryEventHelper.notify_QueryCreateSucceeded(
        this.editorStore.applicationStore.eventService,
        { queryId: newQuery.id },
      );

      LegendQueryTelemetryHelper.logEvent_CreateQuerySucceeded(
        this.editorStore.applicationStore.telemetryService,
        {
          query: {
            id: query.id,
            name: query.name,
            groupId: query.groupId,
            artifactId: query.artifactId,
            versionId: query.versionId,
          },
        },
      );
      queryBuilderState.changeDetectionState.initialize(rawLambda);
      // turn off change detection at this point
      // TODO: to make performance better, refrain from refreshing like this
      this.editorStore.applicationStore.navigationService.navigator.goToLocation(
        generateExistingQueryEditorRoute(newQuery.id),
      );
      this.createQueryState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createQueryState.reset();
    }
  }
}

export abstract class QueryEditorStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendQueryPluginManager;
  readonly graphManagerState: GraphManagerState;
  readonly queryLoaderState: QueryLoaderState;

  readonly initState = ActionState.create();

  queryBuilderState?: QueryBuilderState | undefined;
  queryCreatorState: QueryCreatorState;
  existingQueryName: string | undefined;
  showRegisterServiceModal = false;
  showAppInfo = false;
  showDataspaceInfo = false;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      queryCreatorState: observable,
      queryLoaderState: observable,
      existingQueryName: observable,
      showRegisterServiceModal: observable,
      showAppInfo: observable,
      showDataspaceInfo: observable,
      queryBuilderState: observable,
      isPerformingBlockingAction: computed,
      setExistingQueryName: action,
      setShowRegisterServiceModal: action,
      setShowAppInfo: action,
      setShowDataspaceInfo: action,
      initialize: flow,
      buildGraph: flow,
      searchExistingQueryName: flow,
    });

    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.queryLoaderState = new QueryLoaderState(
      applicationStore,
      this.graphManagerState,
      {
        loadQuery: (query: LightQuery): void => {
          this.queryBuilderState?.changeDetectionState.alertUnsavedChanges(
            () => {
              this.queryLoaderState.setQueryLoaderDialogOpen(false);
              applicationStore.navigationService.navigator.goToLocation(
                generateExistingQueryEditorRoute(query.id),
                { ignoreBlocking: true },
              );
            },
          );
        },
        fetchDefaultQueries: async (): Promise<LightQuery[]> => {
          const recentReviewedQueries =
            await this.graphManagerState.graphManager.getQueries(
              LegendQueryUserDataHelper.getRecentlyViewedQueries(
                this.applicationStore.userDataService,
              ),
            );
          if (recentReviewedQueries.length <= 0) {
            const searchSpecification = new QuerySearchSpecification();
            searchSpecification.limit = QUERY_LOADER_DEFAULT_QUERY_SEARCH_LIMIT;
            return this.graphManagerState.graphManager.searchQueries(
              this.decorateSearchSpecification(searchSpecification),
            );
          }
          return recentReviewedQueries;
        },
        generateDefaultQueriesSummaryText: (queries) =>
          queries.length
            ? `Showing ${quantifyList(
                queries,
                'recently viewed query',
                'recently viewed queries',
              )}`
            : `No recently viewed queries`,
        onQueryDeleted: (queryId): void =>
          LegendQueryUserDataHelper.removeRecentlyViewedQuery(
            this.applicationStore.userDataService,
            queryId,
          ),
        onQueryRenamed: (query): void => {
          LegendQueryTelemetryHelper.logEvent_RenameQuerySucceeded(
            applicationStore.telemetryService,
            {
              query: {
                id: query.id,
                name: query.name,
                groupId: query.groupId,
                artifactId: query.artifactId,
                versionId: query.versionId,
              },
            },
          );
        },
        handleFetchDefaultQueriesFailure: (): void =>
          LegendQueryUserDataHelper.removeRecentlyViewedQueries(
            this.applicationStore.userDataService,
          ),
      },
    );
    this.queryCreatorState = new QueryCreatorState(this, undefined);
  }

  get isViewProjectActionDisabled(): boolean {
    return false;
  }

  get canPersistToSavedQuery(): boolean {
    return true;
  }

  setExistingQueryName(val: string | undefined): void {
    this.existingQueryName = val;
  }

  setShowAppInfo(val: boolean): void {
    this.showAppInfo = val;
  }

  setShowDataspaceInfo(val: boolean): void {
    this.showDataspaceInfo = val;
  }

  setShowRegisterServiceModal(val: boolean): void {
    this.showRegisterServiceModal = val;
  }

  get isPerformingBlockingAction(): boolean {
    return this.queryCreatorState.createQueryState.isInProgress;
  }

  decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    return val;
  }

  abstract getProjectInfo(): ProjectGAVCoordinates | undefined;
  /**
   * Set up the editor state before building the graph
   */

  protected async setUpEditorState(): Promise<void> {
    // do nothing
  }

  async buildQueryForPersistence(
    query: Query,
    rawLambda: RawLambda,
    parameters: Map<string, ValueSpecification> | undefined,
    config: QueryPersistConfiguration | undefined,
    gridConfigConfig?: QueryGridConfig,
  ): Promise<Query> {
    try {
      assertNonNullable(
        this.queryBuilderState,
        'Query builder state required to build query to edit',
      );
      assertNonNullable(
        this.queryBuilderState.executionContextState.mapping,
        'Query required mapping to update',
      );
      query.executionContext =
        this.queryBuilderState.getQueryExecutionContext();
      query.content =
        await this.graphManagerState.graphManager.lambdaToPureCode(rawLambda);
      config?.decorator?.(query);
      // any error in default parameters we will ignore and only log
      query.defaultParameterValues = undefined;
      try {
        if (parameters?.size) {
          const defaultParameterValues =
            await this.graphManagerState.graphManager.valueSpecificationsToPureCode(
              parameters,
            );
          query.defaultParameterValues = Array.from(
            defaultParameterValues.entries(),
          ).map(([key, val]) => {
            const queryParam = new QueryParameterValue();
            queryParam.name = key;
            queryParam.content = val;
            return queryParam;
          });
        }
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
          error,
        );
      }
      query.gridConfig = gridConfigConfig ?? undefined;
      return query;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      throw error;
    }
  }

  /**
   * Set up the query builder state after building the graph
   */
  protected abstract initializeQueryBuilderState(
    stopWatch?: StopWatch | undefined,
  ): Promise<QueryBuilderState>;

  abstract getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration | undefined;

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }

    try {
      this.initState.inProgress();
      const stopWatch = new StopWatch();

      // TODO: when we genericize the way to initialize an application page
      this.applicationStore.assistantService.setIsHidden(true);

      // initialize the graph manager
      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
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

      yield this.setUpEditorState();
      yield flowResult(this.buildGraph());
      this.queryBuilderState = (yield this.initializeQueryBuilderState(
        stopWatch,
      )) as QueryBuilderState;
      this.queryLoaderState.initialize(this.queryBuilderState);
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.onInitializeFailure();
      this.initState.fail();
    }
  }

  onInitializeFailure(): void {
    // Do Nothing
  }

  *searchExistingQueryName(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    try {
      const searchSpecification = QuerySearchSpecification.createDefault(
        isValidSearchString ? searchText : undefined,
      );
      searchSpecification.showCurrentUserQueriesOnly = true;
      searchSpecification.limit = 1;
      const queries = (yield this.graphManagerState.graphManager.searchQueries(
        searchSpecification,
      )) as LightQuery[];

      if (queries.length > 0 && queries[0]?.name === searchText) {
        this.setExistingQueryName(queries[0]?.name);
      } else {
        this.setExistingQueryName(undefined);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    }
  }

  logBuildGraphMetrics(
    graphBuilderReportData: GraphInitializationReport,
  ): void {
    LegendQueryTelemetryHelper.logEvent_GraphInitializationSucceeded(
      this.applicationStore.telemetryService,
      graphBuilderReportData,
    );
  }

  *buildGraph(): GeneratorFn<void> {
    const stopWatch = new StopWatch();

    const projectInfo = this.getProjectInfo();

    if (projectInfo) {
      const { groupId, artifactId, versionId } = projectInfo;

      // fetch project data
      const project = StoreProjectData.serialization.fromJson(
        (yield this.depotServerClient.getProject(
          groupId,
          artifactId,
        )) as PlainObject<StoreProjectData>,
      );

      // initialize system
      stopWatch.record();
      yield this.graphManagerState.initializeSystem();
      stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH_SYSTEM__SUCCESS);

      // fetch entities
      stopWatch.record();
      this.initState.setMessage(`Fetching entities...`);
      const entities = (yield this.depotServerClient.getEntities(
        project,
        versionId,
      )) as Entity[];
      this.initState.setMessage(undefined);
      stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS);

      // fetch and build dependencies
      stopWatch.record();
      const dependencyManager =
        this.graphManagerState.graphManager.createDependencyManager();
      this.graphManagerState.graph.dependencyManager = dependencyManager;
      this.graphManagerState.dependenciesBuildState.setMessage(
        `Fetching dependencies...`,
      );
      const dependencyEntitiesIndex = (yield flowResult(
        this.depotServerClient.getIndexedDependencyEntities(project, versionId),
      )) as Map<string, EntitiesWithOrigin>;
      stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS);

      const dependency_buildReport = createGraphBuilderReport();
      yield this.graphManagerState.graphManager.buildDependencies(
        this.graphManagerState.coreModel,
        this.graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesIndex,
        this.graphManagerState.dependenciesBuildState,
        {},
        dependency_buildReport,
      );
      dependency_buildReport.timings[
        GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS
      ] = stopWatch.getRecord(
        GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS,
      );

      // build graph
      const graph_buildReport = createGraphBuilderReport();
      yield this.graphManagerState.graphManager.buildGraph(
        this.graphManagerState.graph,
        entities,
        this.graphManagerState.graphBuildState,
        {
          origin: new LegendSDLC(
            groupId,
            artifactId,
            resolveVersion(versionId),
          ),
        },
        graph_buildReport,
      );
      graph_buildReport.timings[
        GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS
      ] = stopWatch.getRecord(
        GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS,
      );

      // report
      stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS);
      const graphBuilderReportData = {
        timings:
          this.applicationStore.timeService.finalizeTimingsRecord(stopWatch),
        dependencies: dependency_buildReport,
        dependenciesCount:
          this.graphManagerState.graph.dependencyManager.numberOfDependencies,
        graph: graph_buildReport,
      };
      this.logBuildGraphMetrics(graphBuilderReportData);

      this.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
        graphBuilderReportData,
      );
    }
  }
}

export class QueryBuilderActionConfig_QueryApplication extends QueryBuilderActionConfig {
  editorStore: QueryEditorStore;

  constructor(editorStore: QueryEditorStore) {
    super();
    this.editorStore = editorStore;
  }
}

export class MappingQueryCreatorStore extends QueryEditorStore {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly mappingPath: string;
  readonly runtimePath: string;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    mappingPath: string,
    runtimePath: string,
  ) {
    super(applicationStore, depotServerClient);

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.mappingPath = mappingPath;
    this.runtimePath = runtimePath;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    const projectInfo = this.getProjectInfo();
    const sourceInfo = {
      groupId: projectInfo.groupId,
      artifactId: projectInfo.artifactId,
      versionId: projectInfo.versionId,
    };
    const queryBuilderState = new MappingQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      (val: Mapping) => {
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateMappingQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            val.path,
            guaranteeType(
              queryBuilderState.executionContextState.runtimeValue,
              RuntimePointer,
            ).packageableRuntime.value.path,
          ),
        );
      },
      (val: Runtime) => {
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateMappingQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            guaranteeType(
              queryBuilderState.executionContextState.mapping,
              Mapping,
            ).path,
            guaranteeType(val, RuntimePointer).packageableRuntime.value.path,
          ),
        );
      },
      undefined,
      sourceInfo,
    );

    const mapping = this.graphManagerState.graph.getMapping(this.mappingPath);
    queryBuilderState.changeMapping(mapping);
    queryBuilderState.propagateMappingChange(mapping);
    queryBuilderState.changeRuntime(
      new RuntimePointer(
        PackageableElementExplicitReference.create(
          this.graphManagerState.graph.getRuntime(this.runtimePath),
        ),
      ),
    );
    return queryBuilderState;
  }

  getPersistConfiguration(): QueryPersistConfiguration {
    return {
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
      },
    };
  }

  override decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    const currentProjectCoordinates = new QueryProjectCoordinates();
    currentProjectCoordinates.groupId = this.groupId;
    currentProjectCoordinates.artifactId = this.artifactId;
    val.projectCoordinates = [
      // either get queries for the current project
      currentProjectCoordinates,
      // or any of its dependencies
      ...Array.from(
        this.graphManagerState.graph.dependencyManager.projectDependencyModelsIndex.keys(),
      ).map((dependencyKey) => {
        const { groupId, artifactId } = parseGACoordinates(dependencyKey);
        const coordinates = new QueryProjectCoordinates();
        coordinates.groupId = groupId;
        coordinates.artifactId = artifactId;
        return coordinates;
      }),
    ];
    return val;
  }
}

export class ServiceQueryCreatorStore extends QueryEditorStore {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly servicePath: string;
  readonly executionKey: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    servicePath: string,
    executionKey: string | undefined,
  ) {
    super(applicationStore, depotServerClient);

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.servicePath = servicePath;
    this.executionKey = executionKey;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    const service = this.graphManagerState.graph.getService(this.servicePath);
    assertType(
      service.execution,
      PureExecution,
      `Can't process service execution: only Pure execution is supported`,
    );

    const projectInfo = this.getProjectInfo();
    const sourceInfo = {
      groupId: projectInfo.groupId,
      artifactId: projectInfo.artifactId,
      versionId: projectInfo.versionId,
      service: service.path,
    };
    const queryBuilderState = new ServiceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      service,
      this.graphManagerState.usableServices,
      this.executionKey,
      (val: Service): void => {
        this.applicationStore.navigationService.navigator.goToLocation(
          generateServiceQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            val.path,
          ),
        );
      },
      (val: ServiceExecutionContext): void => {
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateServiceQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            service.path,
            val.key,
          ),
        );
      },
      this.applicationStore.config.options.queryBuilderConfig,
      sourceInfo,
    );

    // leverage initialization of query builder state to ensure we handle unsupported queries
    queryBuilderState.initializeWithQuery(service.execution.func);

    return queryBuilderState;
  }

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration {
    return {
      defaultName: options?.update
        ? `${extractElementNameFromPath(this.servicePath)}`
        : `New Query for ${extractElementNameFromPath(this.servicePath)}${
            this.executionKey ? `[${this.executionKey}]` : ''
          }`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
      },
    };
  }

  override decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    const currentProjectCoordinates = new QueryProjectCoordinates();
    currentProjectCoordinates.groupId = this.groupId;
    currentProjectCoordinates.artifactId = this.artifactId;
    val.projectCoordinates = [
      // either get queries for the current project
      currentProjectCoordinates,
      // or any of its dependencies
      ...Array.from(
        this.graphManagerState.graph.dependencyManager.projectDependencyModelsIndex.keys(),
      ).map((dependencyKey) => {
        const { groupId, artifactId } = parseGACoordinates(dependencyKey);
        const coordinates = new QueryProjectCoordinates();
        coordinates.groupId = groupId;
        coordinates.artifactId = artifactId;
        return coordinates;
      }),
    ];
    return val;
  }
}

export class ExistingQueryUpdateState {
  readonly editorStore: ExistingQueryEditorStore;
  readonly updateQueryState = ActionState.create();
  fetchProjectVersionState = ActionState.create();
  queryRenamer = false;
  saveModal = false;
  showQueryInfo = false;
  queryVersionId: string | undefined;
  projectVersions: string[] = [];
  updateDiffState: QueryBuilderDiffViewState | undefined;

  constructor(editorState: ExistingQueryEditorStore) {
    this.editorStore = editorState;

    makeObservable(this, {
      queryRenamer: observable,
      saveModal: observable,
      showQueryInfo: observable,
      queryVersionId: observable,
      projectVersions: observable,
      updateDiffState: observable,
      updateQueryState: observable,
      fetchProjectVersionState: observable,
      showSaveModal: action,
      setShowQueryInfo: action,
      setProjectVersions: action,
      setQueryVersionId: action,
      closeSaveModal: action,
      setQueryRenamer: action,
      updateQuery: flow,
      fetchProjectVersions: flow,
      updateQueryVersionId: flow,
    });
    this.queryVersionId = this.editorStore.query?.versionId;
  }

  setQueryRenamer(val: boolean): void {
    this.queryRenamer = val;
  }

  setShowQueryInfo(val: boolean): void {
    this.showQueryInfo = val;
  }

  setProjectVersions(val: string[]): void {
    this.projectVersions = val;
  }

  setQueryVersionId(val: string): void {
    this.queryVersionId = val;
  }

  showSaveModal(): void {
    this.saveModal = true;
    const queryBuilderState = this.editorStore.queryBuilderState;
    if (queryBuilderState) {
      this.updateDiffState = returnUndefOnError(() =>
        queryBuilderState.changeDetectionState.buildQueryBuilderDiffViewState(),
      );
    }
  }

  closeSaveModal(): void {
    this.saveModal = false;
    this.updateDiffState = undefined;
  }

  *fetchProjectVersions(
    groupId: string,
    artifactId: string,
  ): GeneratorFn<void> {
    try {
      this.fetchProjectVersionState.inProgress();
      const versions = (yield this.editorStore.depotServerClient.getVersions(
        groupId,
        artifactId,
        true,
      )) as string[];
      this.setProjectVersions(versions);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.fetchProjectVersionState.complete();
    }
  }

  *updateQuery(
    queryName: string | undefined,
    queryVersionId: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.updateQueryState.inProgress();
      const queryBuilderState = guaranteeNonNullable(
        this.editorStore.queryBuilderState,
        'Query builder state required to build query to edit',
      );
      const rawLambda = queryBuilderState.buildQuery();
      const config = this.editorStore.getPersistConfiguration(rawLambda, {
        update: true,
      });
      const query = (yield this.editorStore.buildQueryForPersistence(
        this.editorStore.query ?? new Query(),
        rawLambda,
        queryBuilderState.getCurrentParameterValues(),
        config,
        queryBuilderState.getGridConfig(),
      )) as Query;
      query.name = queryName ?? query.name;
      query.versionId = queryVersionId ?? query.versionId;
      const updatedQuery =
        (yield this.editorStore.graphManagerState.graphManager.updateQuery(
          query,
          this.editorStore.graphManagerState.graph,
        )) as Query;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Successfully updated query!`,
      );
      LegendQueryTelemetryHelper.logEvent_UpdateQuerySucceeded(
        this.editorStore.applicationStore.telemetryService,
        {
          query: {
            id: query.id,
            name: query.name,
            groupId: query.groupId,
            artifactId: query.artifactId,
            versionId: query.versionId,
          },
        },
      );
      config.onQueryUpdate?.(updatedQuery);
      queryBuilderState.changeDetectionState.initialize(rawLambda);
      this.closeSaveModal();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.updateQueryState.complete();
    }
  }

  *updateQueryVersionId(
    queryId: string,
    queryVersionId: string,
  ): GeneratorFn<void> {
    try {
      this.updateQueryState.inProgress();
      const newQuery = new Query();
      // since we only need to update version id, we just need to provide value for version id and keep others undefined/null
      newQuery.id = queryId;
      newQuery.versionId = queryVersionId;
      const updatedQuery =
        (yield this.editorStore.graphManagerState.graphManager.patchQuery(
          newQuery,
          this.editorStore.graphManagerState.graph,
        )) as Query;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Successfully updated query!`,
      );
      LegendQueryTelemetryHelper.logEvent_UpdateQuerySucceeded(
        this.editorStore.applicationStore.telemetryService,
        {
          query: {
            id: updatedQuery.id,
            name: updatedQuery.name,
            groupId: updatedQuery.groupId,
            artifactId: updatedQuery.artifactId,
            versionId: updatedQuery.versionId,
          },
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.updateQueryState.complete();
    }
  }
}

const resolveExecutionContext = (
  dataSpace: DataSpace,
  ex: string | undefined,
  queryMapping: Mapping | undefined,
  queryRuntime: PackageableRuntime | undefined,
): DataSpaceExecutionContext | undefined => {
  if (!ex) {
    if (queryMapping && queryRuntime) {
      if (
        dataSpace.defaultExecutionContext.mapping.value !== queryMapping &&
        dataSpace.defaultExecutionContext.defaultRuntime.value.path !==
          queryRuntime.path
      ) {
        const matchingExecContexts = dataSpace.executionContexts.filter(
          (ec) => ec.mapping.value === queryMapping,
        );
        if (matchingExecContexts.length > 1) {
          const matchRuntime = matchingExecContexts.find(
            (exec) => exec.defaultRuntime.value.path === queryRuntime.path,
          );
          // TODO: we will safely do this for now. Long term we should save exec context key into query store
          // we should make runtime/mapping optional
          return matchRuntime ?? matchingExecContexts[0];
        }
        return matchingExecContexts[0];
      }
    }
    return dataSpace.defaultExecutionContext;
  }
  const matchingExecContexts = dataSpace.executionContexts.filter(
    (ec) => ec.name === ex,
  );
  return matchingExecContexts[0];
};

const processQueryParams = (
  query: RawLambda,
  savedQueryParams: QueryParameterValue[] | undefined,
  urlParams: Record<string, string> | undefined,
  graphManagerState: GraphManagerState,
): Map<string, string> | undefined => {
  const resolvedStringParams = new Map<string, string>();
  savedQueryParams?.forEach((e) => {
    resolvedStringParams.set(e.name, e.content);
  });
  // here we overwrite any params coming from the url
  if (urlParams && Object.values(urlParams).length > 0) {
    const compiledParams = returnUndefOnError(() =>
      buildLambdaVariableExpressions(query, graphManagerState),
    )?.filter(filterByType(VariableExpression));
    Object.entries(urlParams).forEach(([key, value]) => {
      const cP = compiledParams?.find((e) => e.name === key);
      if (cP?.genericType?.value.rawType === PrimitiveType.STRING) {
        resolvedStringParams.set(key, `'${value}'`);
      } else {
        resolvedStringParams.set(key, value);
      }
    });
  }
  return resolvedStringParams.size > 0 ? resolvedStringParams : undefined;
};

export class ExistingQueryEditorStore extends QueryEditorStore {
  private queryId: string;
  private _lightQuery?: LightQuery | undefined;
  query: Query | undefined;
  urlQueryParamValues: Record<string, string> | undefined;
  updateState: ExistingQueryUpdateState;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    queryId: string,
    urlQueryParamValues: Record<string, string> | undefined,
  ) {
    super(applicationStore, depotServerClient);

    makeObservable<ExistingQueryEditorStore, '_lightQuery'>(this, {
      query: observable,
      updateState: observable,
      _lightQuery: observable,
      lightQuery: computed,
      setLightQuery: action,
      setQuery: action,
      isPerformingBlockingAction: override,
    });

    this.queryId = queryId;
    this.urlQueryParamValues = urlQueryParamValues;
    this.updateState = new ExistingQueryUpdateState(this);
  }

  get lightQuery(): LightQuery {
    return guaranteeNonNullable(this._lightQuery, `Query has not been loaded`);
  }

  override get isPerformingBlockingAction(): boolean {
    return (
      super.isPerformingBlockingAction ||
      this.updateState.updateQueryState.isInProgress
    );
  }

  override logBuildGraphMetrics(
    graphBuilderReportData: GraphInitializationReport,
  ): void {
    const currentQuery = guaranteeNonNullable(this._lightQuery);
    LegendQueryTelemetryHelper.logEvent_GraphInitializationSucceeded(
      this.applicationStore.telemetryService,
      {
        graph: graphBuilderReportData,
        query: {
          id: currentQuery.id,
          name: currentQuery.name,
          groupId: currentQuery.groupId,
          artifactId: currentQuery.artifactId,
          versionId: currentQuery.versionId,
        },
      },
    );
  }

  setLightQuery(val: LightQuery): void {
    this._lightQuery = val;
  }

  setQuery(val: Query): void {
    this.query = val;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.lightQuery.groupId,
      artifactId: this.lightQuery.artifactId,
      versionId: this.lightQuery.versionId,
    };
  }

  override async setUpEditorState(): Promise<void> {
    this.setLightQuery(
      await this.graphManagerState.graphManager.getLightQuery(this.queryId),
    );
  }

  async initQueryBuildStateFromQuery(query: Query): Promise<QueryBuilderState> {
    const exec = query.executionContext;
    if (exec instanceof QueryDataSpaceExecutionContext) {
      const dataSpace = getOwnDataSpace(
        exec.dataSpacePath,
        this.graphManagerState.graph,
      );
      const matchingExecutionContext = resolveExecutionContext(
        dataSpace,
        exec.executionKey,
        query.mapping?.value,
        query.runtime?.value,
      );
      if (matchingExecutionContext) {
        let dataSpaceAnalysisResult;
        try {
          const project = StoreProjectData.serialization.fromJson(
            await this.depotServerClient.getProject(
              query.groupId,
              query.artifactId,
            ),
          );
          dataSpaceAnalysisResult =
            await DSL_DataSpace_getGraphManagerExtension(
              this.graphManagerState.graphManager,
            ).retrieveDataSpaceAnalysisFromCache(() =>
              retrieveAnalyticsResultCache(
                project,
                query.versionId,
                dataSpace.path,
                this.depotServerClient,
              ),
            );
        } catch {
          // do nothing
        }
        const sourceInfo = {
          groupId: query.groupId,
          artifactId: query.artifactId,
          versionId: query.versionId,
          dataSpace: dataSpace.path,
        };
        const visitedDataSpaces =
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            this.applicationStore.userDataService,
          );
        const dataSpaceQueryBuilderState = new DataSpaceQueryBuilderState(
          this.applicationStore,
          this.graphManagerState,
          QueryBuilderDataBrowserWorkflow.INSTANCE,
          new QueryBuilderActionConfig_QueryApplication(this),
          dataSpace,
          matchingExecutionContext,
          createDataSpaceDepoRepo(
            this,
            query.groupId,
            query.artifactId,
            query.versionId,
            (dataSpaceInfo: DataSpaceInfo) =>
              hasDataSpaceInfoBeenVisited(dataSpaceInfo, visitedDataSpaces),
          ),
          (dataSpaceInfo: DataSpaceInfo) => {
            if (dataSpaceInfo.defaultExecutionContext) {
              const proceed = (): void =>
                this.applicationStore.navigationService.navigator.goToLocation(
                  generateDataSpaceQueryCreatorRoute(
                    guaranteeNonNullable(dataSpaceInfo.groupId),
                    guaranteeNonNullable(dataSpaceInfo.artifactId),
                    LATEST_VERSION_ALIAS, //always default to latest
                    dataSpaceInfo.path,
                    guaranteeNonNullable(dataSpaceInfo.defaultExecutionContext),
                    undefined,
                    undefined,
                  ),
                );
              const updateQueryAndProceed = async (): Promise<void> => {
                try {
                  await flowResult(
                    this.updateState.updateQuery(undefined, undefined),
                  );
                  proceed();
                } catch (error) {
                  assertErrorThrown(error);
                  this.applicationStore.logService.error(
                    LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
                    error,
                  );
                  this.applicationStore.notificationService.notifyError(error);
                }
              };
              if (
                !query.isCurrentUserQuery ||
                !this.queryBuilderState?.changeDetectionState.hasChanged
              ) {
                proceed();
              } else {
                this.applicationStore.alertService.setActionAlertInfo({
                  message: `To change the data space, you need to save the current query
                     to proceed`,
                  type: ActionAlertType.CAUTION,
                  actions: [
                    {
                      label: 'Save query and Proceed',
                      type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                      handler: () => {
                        updateQueryAndProceed().catch(
                          this.applicationStore.alertUnhandledError,
                        );
                      },
                    },
                    {
                      label: 'Abort',
                      type: ActionAlertActionType.PROCEED,
                      default: true,
                    },
                  ],
                });
              }
            } else {
              this.applicationStore.notificationService.notifyWarning(
                `Can't switch data space: default execution context not specified`,
              );
            }
          },
          dataSpaceAnalysisResult,
          undefined,
          undefined,
          undefined,
          this.applicationStore.config.options.queryBuilderConfig,
          sourceInfo,
        );
        const mappingModelCoverageAnalysisResult =
          dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
            matchingExecutionContext.mapping.value.path,
          );
        if (mappingModelCoverageAnalysisResult) {
          dataSpaceQueryBuilderState.explorerState.mappingModelCoverageAnalysisResult =
            mappingModelCoverageAnalysisResult;
        }
        dataSpaceQueryBuilderState.executionContextState.setMapping(
          matchingExecutionContext.mapping.value,
        );
        dataSpaceQueryBuilderState.executionContextState.setRuntimeValue(
          new RuntimePointer(
            PackageableElementExplicitReference.create(
              matchingExecutionContext.defaultRuntime.value,
            ),
          ),
        );
        return dataSpaceQueryBuilderState;
      } else {
        throw new UnsupportedOperationError(
          `Unsupported execution context ${exec.executionKey}`,
        );
      }
    } else if (exec instanceof QueryExplicitExecutionContext) {
      const projectInfo = this.getProjectInfo();
      const sourceInfo = {
        groupId: projectInfo.groupId,
        artifactId: projectInfo.artifactId,
        versionId: projectInfo.versionId,
      };
      const classQueryBuilderState = new ClassQueryBuilderState(
        this.applicationStore,
        this.graphManagerState,
        QueryBuilderDataBrowserWorkflow.INSTANCE,
        this.applicationStore.config.options.queryBuilderConfig,
        sourceInfo,
      );
      classQueryBuilderState.workflowState.updateActionConfig(
        new QueryBuilderActionConfig_QueryApplication(this),
      );
      classQueryBuilderState.executionContextState.setMapping(
        exec.mapping.value,
      );
      classQueryBuilderState.executionContextState.setRuntimeValue(
        new RuntimePointer(
          PackageableElementExplicitReference.create(exec.runtime.value),
        ),
      );
      return classQueryBuilderState;
    }
    throw new UnsupportedOperationError(`Unsupported query execution context`);
  }

  async initializeQueryBuilderState(
    stopWatch: StopWatch,
  ): Promise<QueryBuilderState> {
    const query = await this.graphManagerState.graphManager.getQuery(
      this.queryId,
      this.graphManagerState.graph,
    );
    this.setQuery(query);
    LegendQueryUserDataHelper.addRecentlyViewedQuery(
      this.applicationStore.userDataService,
      query.id,
    );

    // if no extension found, fall back to basic `class -> mapping -> runtime` mode
    const queryBuilderState = await this.initQueryBuildStateFromQuery(query);

    const initailizeQueryStateStopWatch = new StopWatch();
    const initailizeQueryStateReport = reportGraphAnalytics(
      this.graphManagerState.graph,
    );
    const existingQueryLambda =
      await this.graphManagerState.graphManager.pureCodeToLambda(query.content);

    // leverage initialization of query builder state to ensure we handle unsupported queries
    let defaultParameters: Map<string, ValueSpecification> | undefined =
      undefined;
    const processedQueryParamValues = processQueryParams(
      existingQueryLambda,
      query.defaultParameterValues,
      this.urlQueryParamValues,
      this.graphManagerState,
    );
    if (processedQueryParamValues?.size) {
      try {
        defaultParameters =
          await this.graphManagerState.graphManager.pureCodeToValueSpecifications(
            processedQueryParamValues,
            this.graphManagerState.graph,
          );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
          `Error resolving preset query param values: ${error.message}`,
        );
      }
    }

    queryBuilderState.initializeWithQuery(
      existingQueryLambda,
      defaultParameters,
      query.gridConfig,
    );
    initailizeQueryStateReport.timings =
      this.applicationStore.timeService.finalizeTimingsRecord(
        initailizeQueryStateStopWatch,
        initailizeQueryStateReport.timings,
      );
    const report = reportGraphAnalytics(this.graphManagerState.graph);
    report.timings = this.applicationStore.timeService.finalizeTimingsRecord(
      stopWatch,
      report.timings,
    );

    // send analytics
    LegendQueryTelemetryHelper.logEvent_InitializeQueryStateSucceeded(
      this.applicationStore.telemetryService,
      {
        ...initailizeQueryStateReport,
        query: {
          id: query.id,
          name: query.name,
          groupId: query.groupId,
          artifactId: query.artifactId,
          versionId: query.versionId,
        },
      },
    );
    LegendQueryTelemetryHelper.logEvent_ViewQuerySucceeded(
      this.applicationStore.telemetryService,
      {
        ...report,
        query: {
          id: query.id,
          name: query.name,
          groupId: query.groupId,
          artifactId: query.artifactId,
          versionId: query.versionId,
        },
      },
    );
    return queryBuilderState;
  }

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration {
    return {
      defaultName: options?.update
        ? `${this.lightQuery.name}`
        : `Copy of ${this.lightQuery.name}`,
      allowUpdate: this.lightQuery.isCurrentUserQuery,
      decorator: (query: Query): void => {
        query.id = this.lightQuery.id;
        query.groupId = this.lightQuery.groupId;
        query.artifactId = this.lightQuery.artifactId;
        query.versionId = this.lightQuery.versionId;
      },
      onQueryUpdate: (query: Query): void => {
        this.setLightQuery(toLightQuery(query));
        this.setQuery(query);
      },
    };
  }

  override decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    const currentProjectCoordinates = new QueryProjectCoordinates();
    if (this.query) {
      currentProjectCoordinates.groupId = this.query.groupId;
      currentProjectCoordinates.artifactId = this.query.artifactId;
    }
    val.projectCoordinates = [
      // either get queries for the current project
      currentProjectCoordinates,
      // or any of its dependencies
      ...Array.from(
        this.graphManagerState.graph.dependencyManager.projectDependencyModelsIndex.keys(),
      ).map((dependencyKey) => {
        const { groupId, artifactId } = parseGACoordinates(dependencyKey);
        const coordinates = new QueryProjectCoordinates();
        coordinates.groupId = groupId;
        coordinates.artifactId = artifactId;
        return coordinates;
      }),
    ];
    return val;
  }
}
