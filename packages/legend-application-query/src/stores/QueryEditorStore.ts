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
  type GraphBuilderReport,
  GraphManagerTelemetry,
  extractElementNameFromPath,
  QuerySearchSpecification,
  Mapping,
  type Runtime,
  type Service,
} from '@finos/legend-graph';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
  generateExistingQueryEditorRoute,
  generateMappingQueryCreatorRoute,
  generateServiceQueryCreatorRoute,
} from './LegendQueryRouter.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryAppEvent.js';
import {
  type Entity,
  type ProjectGAVCoordinates,
  parseProjectIdentifier,
} from '@finos/legend-storage';
import {
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import {
  TAB_SIZE,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import { LegendQueryEventService } from './LegendQueryEventService.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import {
  type QueryBuilderState,
  type ServiceExecutionContext,
  ClassQueryBuilderState,
  MappingQueryBuilderState,
  ServiceQueryBuilderState,
} from '@finos/legend-query-builder';

export const createViewProjectHandler =
  (applicationStore: LegendQueryApplicationStore) =>
  (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ): void =>
    applicationStore.navigator.visitAddress(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
        applicationStore.config.studioUrl,
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
    const project = ProjectData.serialization.fromJson(
      await depotServerClient.getProject(groupId, artifactId),
    );
    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry = applicationStore.config.studioInstances.find(
      (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
    );
    if (matchingSDLCEntry) {
      applicationStore.navigator.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
          matchingSDLCEntry.url,
          project.projectId,
          entityPath,
        ),
      );
    } else {
      applicationStore.notifyWarning(
        `Can't find the corresponding SDLC instance to view the SDLC project`,
      );
    }
  };

export interface QueryExportConfiguration {
  defaultName?: string | undefined;
  allowUpdate?: boolean | undefined;
  onQueryUpdate?: ((query: Query) => void) | undefined;
  decorator: ((query: Query) => void) | undefined;
}

export class QueryExportState {
  editorStore: QueryEditorStore;
  lambda: RawLambda;
  queryName: string;
  allowUpdate = false;
  onQueryUpdate?: ((query: Query) => void) | undefined;
  decorator?: ((query: Query) => void) | undefined;
  queryBuilderState: QueryBuilderState;
  persistQueryState = ActionState.create();

  constructor(
    editorStore: QueryEditorStore,
    queryBuilderState: QueryBuilderState,
    lambda: RawLambda,
    config: QueryExportConfiguration,
  ) {
    makeObservable(this, {
      queryName: observable,
      allowPersist: computed,
      setQueryName: action,
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
      !this.persistQueryState.isInProgress &&
      Boolean(this.queryBuilderState.mapping) &&
      this.queryBuilderState.runtimeValue instanceof RuntimePointer
    );
  }

  async persistQuery(createNew: boolean): Promise<void> {
    if (
      this.editorStore.isSaveActionDisabled ||
      !this.queryBuilderState.mapping ||
      !(this.queryBuilderState.runtimeValue instanceof RuntimePointer)
    ) {
      return;
    }
    this.persistQueryState.inProgress();
    const query = new Query();
    query.name = this.queryName;
    query.mapping = PackageableElementExplicitReference.create(
      this.queryBuilderState.mapping,
    );
    query.runtime = this.queryBuilderState.runtimeValue.packageableRuntime;
    this.decorator?.(query);
    try {
      query.content =
        await this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
          this.lambda,
        );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.persistQueryState.reset();
      return;
    }

    try {
      if (createNew) {
        query.id = uuid();
        const newQuery =
          await this.editorStore.graphManagerState.graphManager.createQuery(
            query,
            this.editorStore.graphManagerState.graph,
          );
        this.editorStore.applicationStore.notifySuccess(
          `Successfully created query!`,
        );
        LegendQueryEventService.create(
          this.editorStore.applicationStore.eventService,
        ).notify_QueryCreated({ queryId: newQuery.id });
        this.editorStore.applicationStore.navigator.goToLocation(
          generateExistingQueryEditorRoute(newQuery.id),
        );
      } else {
        const updatedQuery =
          await this.editorStore.graphManagerState.graphManager.updateQuery(
            query,
            this.editorStore.graphManagerState.graph,
          );
        this.editorStore.applicationStore.notifySuccess(
          `Successfully updated query!`,
        );
        this.onQueryUpdate?.(updatedQuery);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.persistQueryState.reset();
      this.editorStore.setExportState(undefined);
    }
  }
}

export class QueryLoaderState {
  readonly editorStore: QueryEditorStore;
  loadQueriesState = ActionState.create();
  queries: LightQuery[] = [];
  isQueryLoaderOpen = false;
  showCurrentUserQueriesOnly = false;

  constructor(editorStore: QueryEditorStore) {
    makeObservable(this, {
      isQueryLoaderOpen: observable,
      queries: observable,
      showCurrentUserQueriesOnly: observable,
      setIsQueryLoaderOpen: action,
      setQueries: action,
      setShowCurrentUserQueriesOnly: action,
      loadQueries: flow,
    });
    this.editorStore = editorStore;
  }

  setIsQueryLoaderOpen(val: boolean): void {
    this.isQueryLoaderOpen = val;
  }

  setQueries(val: LightQuery[]): void {
    this.queries = val;
  }

  setShowCurrentUserQueriesOnly(val: boolean): void {
    this.showCurrentUserQueriesOnly = val;
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
        (yield this.editorStore.graphManagerState.graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      this.loadQueriesState.fail();
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  reset(): void {
    this.setShowCurrentUserQueriesOnly(false);
  }
}

export abstract class QueryEditorStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendQueryPluginManager;
  readonly graphManagerState: GraphManagerState;

  readonly initState = ActionState.create();
  queryBuilderState?: QueryBuilderState | undefined;
  exportState?: QueryExportState | undefined;
  queryLoaderState: QueryLoaderState;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      exportState: observable,
      queryLoaderState: observable,
      setExportState: action,
      initialize: flow,
      buildGraph: flow,
    });

    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.log,
    );
    this.queryLoaderState = new QueryLoaderState(this);
  }

  get isViewProjectActionDisabled(): boolean {
    return false;
  }

  get isSaveActionDisabled(): boolean {
    return false;
  }

  setExportState(val: QueryExportState | undefined): void {
    this.exportState = val;
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
  ): Promise<QueryExportConfiguration>;

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }

    try {
      this.initState.inProgress();

      // initialize the graph manager
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

      yield this.setUpEditorState();
      yield flowResult(this.buildGraph());
      this.queryBuilderState =
        (yield this.initializeQueryBuilderState()) as QueryBuilderState;

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.initState.fail();
    }
  }

  *buildGraph(): GeneratorFn<void> {
    const stopWatch = new StopWatch();

    const { groupId, artifactId, versionId } = this.getProjectInfo();

    // fetch project data
    const project = ProjectData.serialization.fromJson(
      (yield this.depotServerClient.getProject(
        groupId,
        artifactId,
      )) as PlainObject<ProjectData>,
    );

    // initialize system
    stopWatch.record();
    yield this.graphManagerState.initializeSystem();
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_SYSTEM_INITIALIZED);

    // fetch entities
    stopWatch.record();
    this.initState.setMessage(`Fetching entities...`);
    const entities = (yield this.depotServerClient.getEntities(
      project,
      versionId,
    )) as Entity[];
    this.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

    // fetch and build dependencies
    stopWatch.record();
    const dependencyManager =
      this.graphManagerState.createEmptyDependencyManager();
    this.graphManagerState.graph.dependencyManager = dependencyManager;
    this.graphManagerState.dependenciesBuildState.setMessage(
      `Fetching dependencies...`,
    );
    const dependencyEntitiesIndex = (yield flowResult(
      this.depotServerClient.getIndexedDependencyEntities(project, versionId),
    )) as Map<string, Entity[]>;
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

    const dependency_buildReport =
      (yield this.graphManagerState.graphManager.buildDependencies(
        this.graphManagerState.coreModel,
        this.graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesIndex,
        this.graphManagerState.dependenciesBuildState,
      )) as GraphBuilderReport;
    dependency_buildReport.timings[
      GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED
    ] = stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

    // build graph
    const graph_buildReport =
      (yield this.graphManagerState.graphManager.buildGraph(
        this.graphManagerState.graph,
        entities,
        this.graphManagerState.graphBuildState,
      )) as GraphBuilderReport;
    graph_buildReport.timings[GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED] =
      stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

    // report
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED);
    const graphBuilderReportData = {
      timings: {
        [GRAPH_MANAGER_EVENT.GRAPH_SYSTEM_INITIALIZED]: stopWatch.getRecord(
          GRAPH_MANAGER_EVENT.GRAPH_SYSTEM_INITIALIZED,
        ),
        [GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED]: stopWatch.getRecord(
          GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED,
        ),
      },
      dependencies: dependency_buildReport,
      graph: graph_buildReport,
    };
    this.applicationStore.log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
      graphBuilderReportData,
    );
    GraphManagerTelemetry.logEvent_GraphInitialized(
      this.applicationStore.telemetryService,
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
        this.applicationStore.navigator.updateCurrentLocation(
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
        this.applicationStore.navigator.updateCurrentLocation(
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

  async getExportConfiguration(): Promise<QueryExportConfiguration> {
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
        this.applicationStore.navigator.goToLocation(
          generateServiceQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            val.path,
          ),
        );
      },
      (val: ServiceExecutionContext): void => {
        this.applicationStore.navigator.updateCurrentLocation(
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

  async getExportConfiguration(): Promise<QueryExportConfiguration> {
    return {
      defaultName: `New Query for ${extractElementNameFromPath(
        this.servicePath,
      )}${this.executionKey ? `[${this.executionKey}]` : ''}`,
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

    return queryBuilderState;
  }

  async getExportConfiguration(): Promise<QueryExportConfiguration> {
    return {
      defaultName: `New query created from '${this.query.name}'`,
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
