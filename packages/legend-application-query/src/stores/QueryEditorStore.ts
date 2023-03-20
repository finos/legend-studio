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
  LogEvent,
  assertErrorThrown,
  uuid,
  assertType,
  guaranteeNonNullable,
  ActionState,
  StopWatch,
  guaranteeType,
  SerializationFactory,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type RawLambda,
  GraphManagerState,
  toLightQuery,
  Query,
  PureExecution,
  PackageableElementExplicitReference,
  RuntimePointer,
  GRAPH_MANAGER_EVENT,
  extractElementNameFromPath,
  Mapping,
  type Runtime,
  type Service,
  createGraphBuilderReport,
  LegendSDLC,
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
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import { LegendQueryEventHelper } from '../__lib__/LegendQueryEventHelper.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import {
  type QueryBuilderState,
  type ServiceExecutionContext,
  ClassQueryBuilderState,
  MappingQueryBuilderState,
  ServiceQueryBuilderState,
  QueryLoaderState,
} from '@finos/legend-query-builder';
import {
  LEGEND_QUERY_USER_DATA_KEY,
  USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT,
} from '../application/LegendQueryUserData.js';
import { createModelSchema, list, primitive } from 'serializr';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';

export class QueryStorageState {
  persistedQueries: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(QueryStorageState, {
      persistedQueries: list(primitive()),
    }),
  );

  static create(json: PlainObject<QueryStorageState>): QueryStorageState {
    return QueryStorageState.serialization.fromJson(json);
  }
}

export const removePersistedQuery = (
  persistedQueries: string[],
  idx: number,
  applicationStore: GenericLegendApplicationStore,
): void => {
  persistedQueries.splice(idx, 1);
  const queryStorageState = new QueryStorageState();
  queryStorageState.persistedQueries = persistedQueries;
  applicationStore.userDataService.persistValue(
    LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    QueryStorageState.serialization.toJson(queryStorageState),
  );
};

/**
 * This function persists the queryIds in the local storage.
 * Number of queryIds we want to persist is `USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT`.
 * We always want the order in which the queries are stored in a way that
 * queries owned and recently edited by users comes first, followed by
 * recently viewed and owned by user, followed by queries recently viewed and not
 * owned by the user.
 */
export const persistQueryIds = (
  persistedQueries: string[],
  val: LightQuery | Query,
  applicationStore: GenericLegendApplicationStore,
): void => {
  let persistQuery = false;
  if (
    persistedQueries.length < USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT &&
    !persistedQueries.find((queryId) => queryId === val.id)
  ) {
    persistQuery = true;
  } else if (persistedQueries.find((queryId) => queryId === val.id)) {
    persistQuery = true;
    const idx = persistedQueries.findIndex((queryId) => queryId === val.id);
    persistedQueries.splice(idx, 1);
  }
  if (persistQuery) {
    persistedQueries.unshift(val.id);
  }
  const queryStorageState = new QueryStorageState();
  queryStorageState.persistedQueries = persistedQueries;
  applicationStore.userDataService.persistValue(
    LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    queryStorageState,
  );
};

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

export class QuerySaveAsState {
  editorStore: QueryEditorStore;
  lambda: RawLambda;
  queryName: string;
  allowUpdate = false;
  onQueryUpdate?: ((query: Query) => void) | undefined;
  decorator?: ((query: Query) => void) | undefined;
  queryBuilderState: QueryBuilderState;
  createQueryState = ActionState.create();

  constructor(
    editorStore: QueryEditorStore,
    queryBuilderState: QueryBuilderState,
    lambda: RawLambda,
    config: QueryPersistConfiguration,
  ) {
    makeObservable(this, {
      queryName: observable,
      allowPersist: computed,
      setQueryName: action,
      createQuery: flow,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.lambda = lambda;
    this.allowUpdate = config.allowUpdate ?? false;
    this.queryName = config.defaultName ?? 'New Query';
    this.decorator = config.decorator;
    this.onQueryUpdate = config.onQueryUpdate;
  }

  setQueryName(val: string): void {
    this.queryName = val;
  }

  get allowPersist(): boolean {
    return (
      !this.createQueryState.isInProgress &&
      Boolean(this.queryBuilderState.mapping) &&
      this.queryBuilderState.runtimeValue instanceof RuntimePointer
    );
  }

  *createQuery(createNew: boolean): GeneratorFn<void> {
    if (
      this.editorStore.isSaveActionDisabled ||
      !this.queryBuilderState.mapping ||
      !(this.queryBuilderState.runtimeValue instanceof RuntimePointer)
    ) {
      return;
    }
    this.createQueryState.inProgress();
    const query = new Query();
    query.name = this.queryName;
    query.mapping = PackageableElementExplicitReference.create(
      this.queryBuilderState.mapping,
    );
    query.runtime = this.queryBuilderState.runtimeValue.packageableRuntime;
    this.decorator?.(query);
    try {
      query.content =
        (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
          this.lambda,
        )) as string;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.createQueryState.reset();
      return;
    }

    try {
      if (createNew) {
        query.id = uuid();
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

        this.queryBuilderState.changeDetectionState.initialize(this.lambda);
        // turn off change detection at this point
        // TODO: to make performance better, refrain from refreshing like this
        this.editorStore.setTitle(query.name);
        this.editorStore.applicationStore.navigationService.navigator.goToLocation(
          generateExistingQueryEditorRoute(newQuery.id),
        );
      } else {
        const updatedQuery =
          (yield this.editorStore.graphManagerState.graphManager.updateQuery(
            query,
            this.editorStore.graphManagerState.graph,
          )) as Query;
        this.editorStore.setTitle(updatedQuery.name);
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

        this.onQueryUpdate?.(updatedQuery);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createQueryState.reset();
      this.editorStore.setSaveAsState(undefined);
    }
  }
}

export class QuerySaveState {
  editorStore: QueryEditorStore;
  lambda: RawLambda;
  queryName: string;
  allowUpdate = false;
  onQueryUpdate?: ((query: Query) => void) | undefined;
  decorator?: ((query: Query) => void) | undefined;
  queryBuilderState: QueryBuilderState;
  saveQueryState = ActionState.create();

  constructor(
    editorStore: QueryEditorStore,
    queryBuilderState: QueryBuilderState,
    lambda: RawLambda,
    config: QueryPersistConfiguration,
  ) {
    makeObservable(this, {
      queryName: observable,
      allowPersist: computed,
      saveQuery: flow,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.lambda = lambda;
    this.allowUpdate = config.allowUpdate ?? false;
    this.queryName = config.defaultName ?? 'New Query';
    this.decorator = config.decorator;
    this.onQueryUpdate = config.onQueryUpdate;
  }

  get allowPersist(): boolean {
    return (
      !this.saveQueryState.isInProgress &&
      Boolean(this.queryBuilderState.mapping) &&
      this.queryBuilderState.runtimeValue instanceof RuntimePointer
    );
  }

  *saveQuery(): GeneratorFn<void> {
    if (
      this.editorStore.isSaveActionDisabled ||
      !this.queryBuilderState.mapping ||
      !(this.queryBuilderState.runtimeValue instanceof RuntimePointer)
    ) {
      return;
    }
    this.saveQueryState.inProgress();
    const query = new Query();
    query.name = this.queryName;
    query.mapping = PackageableElementExplicitReference.create(
      this.queryBuilderState.mapping,
    );
    query.runtime = this.queryBuilderState.runtimeValue.packageableRuntime;
    this.decorator?.(query);
    try {
      query.content =
        (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
          this.lambda,
        )) as string;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.saveQueryState.reset();
      return;
    }

    try {
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
      this.onQueryUpdate?.(updatedQuery);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.saveQueryState.reset();
      this.editorStore.setSaveState(undefined);
    }
  }
}

export class QueryRenameState {
  editorStore: QueryEditorStore;
  lambda: RawLambda;
  queryName: string;
  allowUpdate = false;
  onQueryUpdate?: ((query: Query) => void) | undefined;
  decorator?: ((query: Query) => void) | undefined;
  queryBuilderState: QueryBuilderState;
  saveQueryState = ActionState.create();

  constructor(
    editorStore: QueryEditorStore,
    queryBuilderState: QueryBuilderState,
    lambda: RawLambda,
    config: QueryPersistConfiguration,
  ) {
    makeObservable(this, {
      queryName: observable,
      setQueryName: action,
      renameQuery: flow,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.lambda = lambda;
    this.allowUpdate = config.allowUpdate ?? false;
    this.queryName = config.defaultName ?? 'New Query';
    this.decorator = config.decorator;
    this.onQueryUpdate = config.onQueryUpdate;
  }

  setQueryName(val: string): void {
    this.queryName = val;
  }

  *renameQuery(): GeneratorFn<void> {
    if (
      this.editorStore.isSaveActionDisabled ||
      !this.queryBuilderState.mapping ||
      !(this.queryBuilderState.runtimeValue instanceof RuntimePointer)
    ) {
      return;
    }
    this.saveQueryState.inProgress();
    const query = new Query();
    query.name = this.queryName;
    query.mapping = PackageableElementExplicitReference.create(
      this.queryBuilderState.mapping,
    );
    query.runtime = this.queryBuilderState.runtimeValue.packageableRuntime;
    this.decorator?.(query);
    try {
      query.content =
        (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
          this.lambda,
        )) as string;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.saveQueryState.reset();
      return;
    }

    try {
      const updatedQuery =
        (yield this.editorStore.graphManagerState.graphManager.updateQuery(
          query,
          this.editorStore.graphManagerState.graph,
        )) as Query;
      this.editorStore.setTitle(updatedQuery.name);
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Successfully renamed query!`,
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
      this.onQueryUpdate?.(updatedQuery);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.saveQueryState.reset();
      this.editorStore.setRenameState(undefined);
    }
  }
}

export abstract class QueryEditorStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendQueryPluginManager;
  readonly graphManagerState: GraphManagerState;

  readonly initState = ActionState.create();
  queryBuilderState?: QueryBuilderState | undefined;
  saveAsState?: QuerySaveAsState | undefined;
  saveState?: QuerySaveState | undefined;
  renameState?: QueryRenameState | undefined;

  // if the implementation of QueryEditorStore does not support save
  // saveState = undefined

  queryLoaderState: QueryLoaderState;
  title: string | undefined;
  existingQueryName: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      saveAsState: observable,
      queryLoaderState: observable,
      renameState: observable,
      saveState: observable,
      existingQueryName: observable,
      title: observable,
      setRenameState: action,
      setExistingQueryName: action,
      setSaveAsState: action,
      setSaveState: action,
      setTitle: action,
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
    const queryStorage = applicationStore.userDataService.getValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    );
    const queryStorageState = QueryStorageState.create(
      queryStorage ? (queryStorage as PlainObject<QueryStorageState>) : {},
    );
    this.queryLoaderState = new QueryLoaderState(
      applicationStore,
      queryStorageState.persistedQueries,
      persistQueryIds,
      removePersistedQuery,
    );
  }

  get isViewProjectActionDisabled(): boolean {
    return false;
  }

  get isSaveActionDisabled(): boolean {
    return false;
  }

  setTitle(val: string | undefined): void {
    document.title = `${val} - Legend Query`;
    this.title = val;
  }

  setSaveAsState(val: QuerySaveAsState | undefined): void {
    this.saveAsState = val;
  }

  setSaveState(val: QuerySaveState | undefined): void {
    this.saveState = val;
  }

  setRenameState(val: QueryRenameState | undefined): void {
    this.renameState = val;
  }

  setExistingQueryName(val: string | undefined): void {
    this.existingQueryName = val;
  }

  abstract getProjectInfo(): ProjectGAVCoordinates;
  /**
   * Set up the editor state before building the graph
   */

  protected async setUpEditorState(): Promise<void> {
    // do nothing
  }

  /**
   * Set up the query builder state after building the graph
   */
  protected abstract initializeQueryBuilderState(): Promise<QueryBuilderState>;

  abstract getExportConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): Promise<QueryPersistConfiguration>;

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }

    try {
      this.initState.inProgress();

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
      this.queryBuilderState =
        (yield this.initializeQueryBuilderState()) as QueryBuilderState;
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
    LegendQueryTelemetryHelper.logEvent_GraphInitializationSucceeded(
      this.applicationStore.telemetryService,
      graphBuilderReportData,
    );

    this.applicationStore.logService.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
      graphBuilderReportData,
    );
  }
}

export class MappingQueryCreatorStore extends QueryEditorStore {
  groupId: string;
  artifactId: string;
  versionId: string;
  mappingPath: string;
  runtimePath: string;

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

  async getExportConfiguration(): Promise<QueryPersistConfiguration> {
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
  groupId: string;
  artifactId: string;
  versionId: string;
  servicePath: string;
  executionKey: string | undefined;

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

  async getExportConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): Promise<QueryPersistConfiguration> {
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

export class ExistingQueryEditorStore extends QueryEditorStore {
  private queryId: string;
  private _query?: LightQuery | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    queryId: string,
  ) {
    super(applicationStore, depotServerClient);

    makeObservable<ExistingQueryEditorStore, '_query'>(this, {
      _query: observable,
      query: computed,
      setQuery: action,
    });

    this.queryId = queryId;
  }

  get query(): LightQuery {
    return guaranteeNonNullable(this._query, `Query has not been loaded`);
  }

  setQuery(val: LightQuery): void {
    this._query = val;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.query.groupId,
      artifactId: this.query.artifactId,
      versionId: this.query.versionId,
    };
  }

  override async setUpEditorState(): Promise<void> {
    this.setQuery(
      await this.graphManagerState.graphManager.getLightQuery(this.queryId),
    );
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    const query = await this.graphManagerState.graphManager.getQuery(
      this.queryId,
      this.graphManagerState.graph,
    );
    persistQueryIds(
      this.queryLoaderState.intialQueries,
      query,
      this.applicationStore,
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
    queryBuilderState.initializeWithQuery(
      await this.graphManagerState.graphManager.pureCodeToLambda(query.content),
    );

    // send analytics
    LegendQueryTelemetryHelper.logEvent_ViewQuerySucceeded(
      this.applicationStore.telemetryService,
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
    this.setTitle(this.query.name);
    return queryBuilderState;
  }

  async getExportConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): Promise<QueryPersistConfiguration> {
    return {
      defaultName: options?.update
        ? `${this.query.name}`
        : `Copy of ${this.query.name}`,
      allowUpdate: this.query.isCurrentUserQuery,
      decorator: (query: Query): void => {
        query.id = this.query.id;
        query.groupId = this.query.groupId;
        query.artifactId = this.query.artifactId;
        query.versionId = this.query.versionId;
      },
      onQueryUpdate: (query: Query): void => {
        this.setQuery(toLightQuery(query));
      },
    };
  }
}
