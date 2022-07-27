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
  getNullableFirstElement,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type RawLambda,
  GraphManagerState,
  getAllClassMappings,
  toLightQuery,
  Query,
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
  PackageableElementExplicitReference,
  RuntimePointer,
  GRAPH_MANAGER_EVENT,
  type GraphBuilderReport,
  GraphManagerTelemetry,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import {
  QueryBuilderState,
  StandardQueryBuilderMode,
} from './QueryBuilderState.js';
import { generateExistingQueryEditorRoute } from './LegendQueryRouter.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryAppEvent.js';
import type { Entity } from '@finos/legend-storage';
import {
  type DepotServerClient,
  type ProjectGAVCoordinates,
  ProjectData,
} from '@finos/legend-server-depot';
import { TAB_SIZE, APPLICATION_EVENT } from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import { LegendQueryEventService } from './LegendQueryEventService.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';

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
  persistQueryState = ActionState.create();

  constructor(
    editorStore: QueryEditorStore,
    lambda: RawLambda,
    config: QueryExportConfiguration,
  ) {
    makeObservable(this, {
      queryName: observable,
      allowPersist: computed,
      setQueryName: action,
    });

    this.editorStore = editorStore;
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
      Boolean(this.editorStore.queryBuilderState.querySetupState.mapping) &&
      this.editorStore.queryBuilderState.querySetupState.runtimeValue instanceof
        RuntimePointer
    );
  }

  async persistQuery(createNew: boolean): Promise<void> {
    if (
      !this.editorStore.queryBuilderState.querySetupState.mapping ||
      !(
        this.editorStore.queryBuilderState.querySetupState
          .runtimeValue instanceof RuntimePointer
      )
    ) {
      return;
    }
    this.persistQueryState.inProgress();
    const query = new Query();
    query.name = this.queryName;
    query.mapping = PackageableElementExplicitReference.create(
      this.editorStore.queryBuilderState.querySetupState.mapping,
    );
    query.runtime =
      this.editorStore.queryBuilderState.querySetupState.runtimeValue.packageableRuntime;
    this.decorator?.(query);
    try {
      query.content =
        await this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
          this.lambda,
        );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
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
        this.editorStore.applicationStore.navigator.jumpTo(
          this.editorStore.applicationStore.navigator.generateLocation(
            generateExistingQueryEditorRoute(newQuery.id),
          ),
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
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.persistQueryState.reset();
      this.editorStore.setExportState(undefined);
    }
  }
}

export abstract class QueryEditorStore {
  applicationStore: LegendQueryApplicationStore;
  depotServerClient: DepotServerClient;
  pluginManager: LegendQueryPluginManager;
  graphManagerState: GraphManagerState;

  initState = ActionState.create();
  queryBuilderState: QueryBuilderState;
  exportState?: QueryExportState | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    pluginManager: LegendQueryPluginManager,
  ) {
    makeObservable(this, {
      exportState: observable,
      setExportState: action,
      initialize: flow,
      buildGraph: flow,
    });

    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.pluginManager = pluginManager;
    this.graphManagerState = new GraphManagerState(
      this.pluginManager,
      this.applicationStore.log,
    );
    this.queryBuilderState = new QueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      new StandardQueryBuilderMode(),
    );
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
  protected abstract setUpBuilderState(): Promise<void>;
  abstract getExportConfiguration(
    lambda: RawLambda,
  ): Promise<QueryExportConfiguration>;

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
        `Query editor store is already initialized`,
      );
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
      const { groupId, artifactId, versionId } = this.getProjectInfo();
      yield flowResult(this.buildGraph(groupId, artifactId, versionId));
      yield this.setUpBuilderState();

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.notifyError(error);
      this.initState.fail();
    }
  }

  *buildGraph(
    groupId: string,
    artifactId: string,
    versionId: string,
  ): GeneratorFn<void> {
    const stopWatch = new StopWatch();

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

export class CreateQueryEditorStore extends QueryEditorStore {
  groupId: string;
  artifactId: string;
  versionId: string;
  mappingPath: string;
  runtimePath: string;
  classPath: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    pluginManager: LegendQueryPluginManager,
    groupId: string,
    artifactId: string,
    versionId: string,
    mappingPath: string,
    runtimePath: string,
    classPath: string | undefined,
  ) {
    super(applicationStore, depotServerClient, pluginManager);

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.mappingPath = mappingPath;
    this.runtimePath = runtimePath;
    this.classPath = classPath;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  async setUpBuilderState(): Promise<void> {
    this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
    this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);
    this.queryBuilderState.querySetupState.setMapping(
      this.graphManagerState.graph.getMapping(this.mappingPath),
    );
    this.queryBuilderState.querySetupState.setRuntimeValue(
      new RuntimePointer(
        PackageableElementExplicitReference.create(
          this.graphManagerState.graph.getRuntime(this.runtimePath),
        ),
      ),
    );
    if (this.classPath) {
      this.queryBuilderState.querySetupState._class =
        this.queryBuilderState.graphManagerState.graph.getClass(this.classPath);
      this.queryBuilderState.querySetupState.setClassIsReadOnly(true);
    } else {
      this.queryBuilderState.querySetupState._class = getNullableFirstElement(
        this.queryBuilderState.querySetupState.mapping
          ? getAllClassMappings(
              this.queryBuilderState.querySetupState.mapping,
            ).map((classMapping) => classMapping.class.value)
          : [],
      );
    }

    // initialize query builder state after setting up
    this.queryBuilderState.resetQueryBuilder();
    this.queryBuilderState.resetQuerySetup();
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

export class ServiceQueryEditorStore extends QueryEditorStore {
  groupId: string;
  artifactId: string;
  versionId: string;
  servicePath: string;
  executionKey: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    pluginManager: LegendQueryPluginManager,
    groupId: string,
    artifactId: string,
    versionId: string,
    servicePath: string,
    executionKey: string | undefined,
  ) {
    super(applicationStore, depotServerClient, pluginManager);

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

  async setUpBuilderState(): Promise<void> {
    this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
    this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);

    const service = this.graphManagerState.graph.getService(this.servicePath);
    assertType(
      service.execution,
      PureExecution,
      `Can't process service execution: only Pure execution is supported`,
    );
    if (this.executionKey) {
      assertType(
        service.execution,
        PureMultiExecution,
        `Can't process service execution: an execution key is provided, expecting Pure multi execution`,
      );
      const serviceExecution = guaranteeNonNullable(
        service.execution.executionParameters.find(
          (parameter) => parameter.key === this.executionKey,
        ),
        `Can't process service execution: execution with key '${this.executionKey}' is not found`,
      );
      this.queryBuilderState.querySetupState.setMapping(
        serviceExecution.mapping.value,
      );
      this.queryBuilderState.querySetupState.setRuntimeValue(
        serviceExecution.runtime,
      );
    } else {
      assertType(
        service.execution,
        PureSingleExecution,
        `Can't process service execution: no execution key is provided, expecting Pure single execution`,
      );
      this.queryBuilderState.querySetupState.setMapping(
        service.execution.mapping.value,
      );
      this.queryBuilderState.querySetupState.setRuntimeValue(
        service.execution.runtime,
      );
    }
    // leverage initialization of query builder state to ensure we handle unsupported queries
    this.queryBuilderState.initialize(service.execution.func);
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
    pluginManager: LegendQueryPluginManager,
    queryId: string,
  ) {
    super(applicationStore, depotServerClient, pluginManager);

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

  async setUpBuilderState(): Promise<void> {
    this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
    this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);

    const query = await this.graphManagerState.graphManager.getQuery(
      this.queryId,
      this.graphManagerState.graph,
    );
    this.queryBuilderState.querySetupState.setMapping(query.mapping.value);
    this.queryBuilderState.querySetupState.setRuntimeValue(
      new RuntimePointer(
        PackageableElementExplicitReference.create(query.runtime.value),
      ),
    );
    // leverage initialization of query builder state to ensure we handle unsupported queries
    this.queryBuilderState.initialize(
      await this.graphManagerState.graphManager.pureCodeToLambda(query.content),
    );
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
