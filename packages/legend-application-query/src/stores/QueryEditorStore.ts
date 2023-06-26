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
} from '@finos/legend-shared';
import {
  type LightQuery,
  type RawLambda,
  GraphManagerState,
  Query,
  PureExecution,
  PackageableElementExplicitReference,
  RuntimePointer,
  GRAPH_MANAGER_EVENT,
  extractElementNameFromPath,
  Mapping,
  type Runtime,
  type Service,
  type ValueSpecification,
  createGraphBuilderReport,
  LegendSDLC,
  QuerySearchSpecification,
  toLightQuery,
  QueryParameterValue,
  type GraphInitializationReport,
  reportGraphAnalytics,
  cloneQueryStereotype,
  cloneQueryTaggedValue,
} from '@finos/legend-graph';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
  generateExistingQueryEditorRoute,
  generateMappingQueryCreatorRoute,
  generateServiceQueryCreatorRoute,
} from '../__lib__/LegendQueryNavigation.js';
import { LEGEND_QUERY_APP_EVENT } from '../__lib__/LegendQueryEvent.js';
import {
  type Entity,
  type ProjectGAVCoordinates,
  type EntitiesWithOrigin,
  parseProjectIdentifier,
} from '@finos/legend-storage';
import {
  type DepotServerClient,
  resolveVersion,
  StoreProjectData,
} from '@finos/legend-server-depot';
import {
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
} from '@finos/legend-query-builder';
import { LegendQueryUserDataHelper } from '../__lib__/LegendQueryUserDataHelper.js';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';

export const createViewProjectHandler =
  (applicationStore: LegendQueryApplicationStore) =>
  (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ): void =>
    applicationStore.navigationService.navigator.visitAddress(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
        applicationStore.config.studioApplicationUrl,
        groupId,
        artifactId,
        versionId,
        entityPath,
      ),
    );

export const createViewSDLCProjectHandler =
  (
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) =>
  async (
    groupId: string,
    artifactId: string,
    entityPath: string | undefined,
  ): Promise<void> => {
    // fetch project data
    const project = StoreProjectData.serialization.fromJson(
      await depotServerClient.getProject(groupId, artifactId),
    );
    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry = applicationStore.config.studioInstances.find(
      (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
    );
    if (matchingSDLCEntry) {
      applicationStore.navigationService.navigator.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
          matchingSDLCEntry.url,
          project.projectId,
          entityPath,
        ),
      );
    } else {
      applicationStore.notificationService.notifyWarning(
        `Can't find the corresponding SDLC instance to view the SDLC project`,
      );
    }
  };

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
    this.queryName = queryName ?? 'New Query';
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
      )) as Query;
      query.name = this.queryName;
      query.id = uuid();
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

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      queryCreatorState: observable,
      queryLoaderState: observable,
      existingQueryName: observable,
      queryBuilderState: observable,
      isPerformingBlockingAction: computed,
      setExistingQueryName: action,
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
        fetchDefaultQueries: () =>
          this.graphManagerState.graphManager.getQueries(
            LegendQueryUserDataHelper.getRecentlyViewedQueries(
              this.applicationStore.userDataService,
            ),
          ),
        generateDefaultQueriesSummaryText: (queries) =>
          queries.length
            ? `Showing ${quantifyList(
                queries,
                'recently viewed query',
                'recently viewed queries',
              )}`
            : `No recently viewed queries`,
        onQueryDeleted: (query): void =>
          LegendQueryUserDataHelper.removeRecentlyViewedQuery(
            this.applicationStore.userDataService,
            query.id,
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
      },
    );
    this.queryCreatorState = new QueryCreatorState(this, undefined);
  }

  get isViewProjectActionDisabled(): boolean {
    return false;
  }

  setExistingQueryName(val: string | undefined): void {
    this.existingQueryName = val;
  }

  get isPerformingBlockingAction(): boolean {
    return this.queryCreatorState.createQueryState.isInProgress;
  }

  abstract getProjectInfo(): ProjectGAVCoordinates;
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
  ): Promise<Query> {
    try {
      assertNonNullable(
        this.queryBuilderState,
        'Query builder state required to build query to edit',
      );
      assertNonNullable(
        this.queryBuilderState.mapping,
        'Query required mapping to update',
      );
      const runtimeValue = guaranteeType(
        this.queryBuilderState.runtimeValue,
        RuntimePointer,
        'Query runtime must be of type runtime pointer',
      );
      query.mapping = PackageableElementExplicitReference.create(
        this.queryBuilderState.mapping,
      );
      query.runtime = runtimeValue.packageableRuntime;
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
  ): QueryPersistConfiguration;

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }

    try {
      this.initState.inProgress();
      const stopWatch = new StopWatch();

      // TODO: when we genericize the way to initialize an application page
      this.applicationStore.assistantService.setIsHidden(false);

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
      this.initState.fail();
    }
  }

  *searchExistingQueryName(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    try {
      const searchSpecification = new QuerySearchSpecification();
      searchSpecification.showCurrentUserQueriesOnly = true;
      searchSpecification.exactMatchName = true;
      searchSpecification.searchTerm = isValidSearchString
        ? searchText
        : undefined;
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

    const { groupId, artifactId, versionId } = this.getProjectInfo();

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
        origin: new LegendSDLC(groupId, artifactId, resolveVersion(versionId)),
      },
      graph_buildReport,
    );
    graph_buildReport.timings[
      GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS
    ] = stopWatch.getRecord(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS);

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
    const queryBuilderState = new MappingQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      (val: Mapping) => {
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateMappingQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            val.path,
            guaranteeType(queryBuilderState.runtimeValue, RuntimePointer)
              .packageableRuntime.value.path,
          ),
        );
      },
      (val: Runtime) => {
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateMappingQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            guaranteeType(queryBuilderState.mapping, Mapping).path,
            guaranteeType(val, RuntimePointer).packageableRuntime.value.path,
          ),
        );
      },
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

    const queryBuilderState = new ServiceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
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
}

export class ExistingQueryUpdateState {
  readonly editorStore: ExistingQueryEditorStore;
  readonly updateQueryState = ActionState.create();
  queryRenamer = false;
  saveModal = false;
  updateDiffState: QueryBuilderDiffViewState | undefined;

  constructor(editorState: ExistingQueryEditorStore) {
    this.editorStore = editorState;

    makeObservable(this, {
      queryRenamer: observable,
      saveModal: observable,
      updateDiffState: observable,
      updateQueryState: observable,
      showSaveModal: action,
      closeSaveModal: action,
      setQueryRenamer: action,
      updateQuery: flow,
    });
  }

  setQueryRenamer(val: boolean): void {
    this.queryRenamer = val;
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

  *updateQuery(queryName: string | undefined): GeneratorFn<void> {
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
      )) as Query;
      query.name = queryName ?? query.name;
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
}

export class ExistingQueryEditorStore extends QueryEditorStore {
  private queryId: string;
  private _lightQuery?: LightQuery | undefined;
  query: Query | undefined;
  updateState: ExistingQueryUpdateState;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    queryId: string,
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
    let queryBuilderState: QueryBuilderState | undefined;
    const existingQueryEditorStateBuilders = this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) => plugin.getExtraExistingQueryEditorStateBuilders?.() ?? [],
      );
    for (const builder of existingQueryEditorStateBuilders) {
      queryBuilderState = builder(query, this);
      if (queryBuilderState) {
        break;
      }
    }

    // if no extension found, fall back to basic `class -> mapping -> runtime` mode
    queryBuilderState =
      queryBuilderState ??
      new ClassQueryBuilderState(this.applicationStore, this.graphManagerState);

    queryBuilderState.setMapping(query.mapping.value);
    queryBuilderState.setRuntimeValue(
      new RuntimePointer(
        PackageableElementExplicitReference.create(query.runtime.value),
      ),
    );

    // leverage initialization of query builder state to ensure we handle unsupported queries
    let defaultParameters: Map<string, ValueSpecification> | undefined =
      undefined;
    if (query.defaultParameterValues?.length) {
      const params = new Map<string, string>();
      query.defaultParameterValues.forEach((e) => {
        params.set(e.name, e.content);
      });
      defaultParameters =
        await this.graphManagerState.graphManager.pureCodeToValueSpecifications(
          params,
          this.graphManagerState.graph,
        );
    }

    const initailizeQueryStateStopWatch = new StopWatch();
    const initailizeQueryStateReport = reportGraphAnalytics(
      this.graphManagerState.graph,
    );
    queryBuilderState.initializeWithQuery(
      await this.graphManagerState.graphManager.pureCodeToLambda(query.content),
      defaultParameters,
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
}
