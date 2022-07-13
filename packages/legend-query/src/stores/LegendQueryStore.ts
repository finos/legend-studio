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
  flowResult,
  makeAutoObservable,
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
  assertTrue,
  guaranteeNonNullable,
  ActionState,
  StopWatch,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type Mapping,
  type PackageableRuntime,
  type RawLambda,
  type Service,
  type GraphManagerState,
  type QueryTaggedValue,
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
} from '@finos/legend-graph';
import {
  QueryBuilderState,
  StandardQueryBuilderMode,
} from './QueryBuilderState.js';
import {
  type CreateQueryPathParams,
  type ExistingQueryPathParams,
  type ServiceQueryPathParams,
  generateCreateQueryRoute,
  generateExistingQueryRoute,
} from './LegendQueryRouter.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryAppEvent.js';
import type { Entity } from '@finos/legend-model-storage';
import {
  type DepotServerClient,
  type ProjectGAVCoordinates,
  generateGAVCoordinates,
  ProjectData,
} from '@finos/legend-server-depot';
import {
  type ApplicationStore,
  APPLICATION_EVENT,
  TAB_SIZE,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryConfig } from '../application/LegendQueryConfig.js';
import { LegendQueryEventService } from './LegendQueryEventService.js';

export abstract class QueryInfoState {
  queryStore: LegendQueryStore;

  constructor(queryStore: LegendQueryStore) {
    this.queryStore = queryStore;
  }

  abstract getQueryProjectInfo(): ProjectGAVCoordinates;
  abstract decorateQuery(query: Query): void;
}

export class CreateQueryInfoState extends QueryInfoState {
  project: ProjectData;
  versionId: string;
  mapping: Mapping;
  runtime: PackageableRuntime;
  taggedValues?: QueryTaggedValue[] | undefined;

  constructor(
    queryStore: LegendQueryStore,
    project: ProjectData,
    versionId: string,
    mapping: Mapping,
    runtime: PackageableRuntime,
  ) {
    super(queryStore);

    makeObservable(this, {
      mapping: observable,
      runtime: observable,
      setMapping: action,
      setRuntime: action,
    });

    this.project = project;
    this.versionId = versionId;
    this.mapping = mapping;
    this.runtime = runtime;
  }

  setMapping(val: Mapping): void {
    this.mapping = val;
  }

  setRuntime(val: PackageableRuntime): void {
    this.runtime = val;
  }

  getQueryProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.project.groupId,
      artifactId: this.project.artifactId,
      versionId: this.versionId,
    };
  }

  decorateQuery(query: Query): void {
    query.id = uuid();
    query.groupId = this.project.groupId;
    query.artifactId = this.project.artifactId;
    query.versionId = this.versionId;
    query.taggedValues = this.taggedValues;
  }
}

export class ServiceQueryInfoState extends QueryInfoState {
  project: ProjectData;
  versionId: string;
  service: Service;
  key?: string | undefined;

  constructor(
    queryStore: LegendQueryStore,
    project: ProjectData,
    versionId: string,
    service: Service,
    key: string | undefined,
  ) {
    super(queryStore);

    this.project = project;
    this.versionId = versionId;
    this.service = service;
    this.key = key;
  }

  getQueryProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.project.groupId,
      artifactId: this.project.artifactId,
      versionId: this.versionId,
    };
  }

  decorateQuery(query: Query): void {
    query.id = uuid();
    query.groupId = this.project.groupId;
    query.artifactId = this.project.artifactId;
    query.versionId = this.versionId;
  }
}

export class ExistingQueryInfoState extends QueryInfoState {
  query: LightQuery;

  constructor(queryStore: LegendQueryStore, query: LightQuery) {
    super(queryStore);

    makeObservable(this, {
      query: observable,
      setQuery: action,
    });

    this.query = query;
  }

  setQuery(val: LightQuery): void {
    this.query = val;
  }

  getQueryProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.query.groupId,
      artifactId: this.query.artifactId,
      versionId: this.query.versionId,
    };
  }

  decorateQuery(query: Query): void {
    query.id = this.query.id;
    query.groupId = this.query.groupId;
    query.artifactId = this.query.artifactId;
    query.versionId = this.query.versionId;
  }
}

export class QueryExportState {
  queryStore: LegendQueryStore;
  lambda: RawLambda;
  persistQueryState = ActionState.create();
  queryName = 'My New Query';
  allowUpdate = false;

  constructor(
    queryStore: LegendQueryStore,
    lambda: RawLambda,
    allowUpdate: boolean,
    queryName: string | undefined,
  ) {
    makeObservable(this, {
      queryName: observable,
      allowPersist: computed,
      setQueryName: action,
    });

    this.queryStore = queryStore;
    this.lambda = lambda;
    this.allowUpdate = allowUpdate;
    this.queryName = queryName ?? 'My New Query';
  }

  setQueryName(val: string): void {
    this.queryName = val;
  }

  get allowPersist(): boolean {
    return (
      !this.persistQueryState.isInProgress &&
      Boolean(this.queryStore.queryInfoState) &&
      Boolean(this.queryStore.queryBuilderState.querySetupState.mapping) &&
      this.queryStore.queryBuilderState.querySetupState.runtimeValue instanceof
        RuntimePointer
    );
  }

  async persistQuery(createNew: boolean): Promise<void> {
    if (
      !this.queryStore.queryInfoState ||
      !this.queryStore.queryBuilderState.querySetupState.mapping ||
      !(
        this.queryStore.queryBuilderState.querySetupState
          .runtimeValue instanceof RuntimePointer
      )
    ) {
      return;
    }
    this.persistQueryState.inProgress();
    const query = new Query();
    query.name = this.queryName;
    query.mapping = PackageableElementExplicitReference.create(
      this.queryStore.queryBuilderState.querySetupState.mapping,
    );
    query.runtime =
      this.queryStore.queryBuilderState.querySetupState.runtimeValue.packageableRuntime;
    this.queryStore.queryInfoState.decorateQuery(query);
    try {
      query.content =
        await this.queryStore.graphManagerState.graphManager.lambdaToPureCode(
          this.lambda,
        );
    } catch (error) {
      assertErrorThrown(error);
      this.queryStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.queryStore.applicationStore.notifyError(error);
      this.persistQueryState.reset();
      return;
    }

    try {
      if (createNew) {
        query.id = uuid();
        const newQuery =
          await this.queryStore.graphManagerState.graphManager.createQuery(
            query,
            this.queryStore.graphManagerState.graph,
          );
        this.queryStore.applicationStore.notifySuccess(
          `Successfully created query!`,
        );
        this.queryStore.applicationStore.navigator.jumpTo(
          this.queryStore.applicationStore.navigator.generateLocation(
            generateExistingQueryRoute(newQuery.id),
          ),
        );
        LegendQueryEventService.create(
          this.queryStore.applicationStore.eventService,
        ).notify_QueryCreated({ queryId: newQuery.id });
      } else {
        assertType(this.queryStore.queryInfoState, ExistingQueryInfoState);
        const newQuery =
          await this.queryStore.graphManagerState.graphManager.updateQuery(
            query,
            this.queryStore.graphManagerState.graph,
          );
        this.queryStore.queryInfoState.setQuery(toLightQuery(newQuery));
        this.queryStore.applicationStore.notifySuccess(
          `Successfully updated query!`,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.queryStore.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.queryStore.applicationStore.notifyError(error);
    } finally {
      this.persistQueryState.reset();
      this.queryStore.setQueryExportState(undefined);
    }
  }
}

export class LegendQueryStore {
  applicationStore: ApplicationStore<LegendQueryConfig>;
  depotServerClient: DepotServerClient;
  graphManagerState: GraphManagerState;
  pluginManager: LegendQueryPluginManager;

  queryInfoState?: QueryInfoState | undefined;
  queryBuilderState: QueryBuilderState;
  queryExportState?: QueryExportState | undefined;
  buildGraphState = ActionState.create();
  initState = ActionState.create();
  editorInitState = ActionState.create();
  onSaveQuery?: ((lambda: RawLambda) => Promise<void>) | undefined;

  constructor(
    applicationStore: ApplicationStore<LegendQueryConfig>,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    pluginManager: LegendQueryPluginManager,
  ) {
    makeAutoObservable(this, {
      applicationStore: false,
      depotServerClient: false,
      graphManagerState: false,
      reset: action,
      setQueryInfoState: action,
      setQueryExportState: action,
    });

    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = graphManagerState;
    this.pluginManager = pluginManager;
    this.queryBuilderState = new QueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      new StandardQueryBuilderMode(),
    );

    // Register plugins
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
  }

  reset(): void {
    this.setQueryInfoState(undefined);
    this.queryBuilderState = new QueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      this.queryBuilderState.mode,
    );
    this.graphManagerState.resetGraph();
    this.buildGraphState.reset();
    this.editorInitState.reset();
  }

  setOnSaveQuery(
    val: ((lambda: RawLambda) => Promise<void>) | undefined,
  ): void {
    this.onSaveQuery = val;
  }

  setQueryInfoState(val: QueryInfoState | undefined): void {
    this.queryInfoState = val;
  }

  setQueryExportState(val: QueryExportState | undefined): void {
    this.queryExportState = val;
  }

  *setupExistingQueryInfoState(
    params: ExistingQueryPathParams,
  ): GeneratorFn<void> {
    const { queryId } = params;

    try {
      this.editorInitState.inProgress();
      let queryInfoState: ExistingQueryInfoState;
      if (this.queryInfoState instanceof ExistingQueryInfoState) {
        assertTrue(this.queryInfoState.query.id === queryId);
        queryInfoState = this.queryInfoState;
      } else {
        const lightQuery =
          (yield this.graphManagerState.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
        queryInfoState = new ExistingQueryInfoState(this, lightQuery);
        this.setQueryInfoState(queryInfoState);
      }

      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(
            queryInfoState.query.groupId,
            queryInfoState.query.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      yield flowResult(
        this.buildGraph(project, queryInfoState.query.versionId),
      );

      const query = (yield this.graphManagerState.graphManager.getQuery(
        queryId,
        this.graphManagerState.graph,
      )) as Query;
      this.queryBuilderState.querySetupState.mapping = query.mapping.value;
      this.queryBuilderState.querySetupState.runtimeValue = new RuntimePointer(
        PackageableElementExplicitReference.create(query.runtime.value),
      );
      this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
      this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);

      // leverage initialization of query builder state to ensure we handle unsupported queries
      this.queryBuilderState.initialize(
        (yield this.graphManagerState.graphManager.pureCodeToLambda(
          query.content,
        )) as RawLambda,
      );
      this.setOnSaveQuery(async (lambda: RawLambda) => {
        this.setQueryExportState(
          new QueryExportState(
            this,
            lambda,
            queryInfoState.query.isCurrentUserQuery,
            queryInfoState.query.name,
          ),
        );
      });
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.notifyError(error);
      this.applicationStore.setBlockingAlert({
        message: `Can't initialize query editor`,
        prompt: `Reload the application or navigate to the setup page`,
      });
    } finally {
      this.editorInitState.complete();
    }
  }

  *setupServiceQueryInfoState(
    params: ServiceQueryPathParams,
    serviceExecutionKey: string | undefined,
  ): GeneratorFn<void> {
    const { groupId, artifactId, versionId, servicePath } = params;

    try {
      this.editorInitState.inProgress();
      let project: ProjectData;
      if (this.queryInfoState instanceof ServiceQueryInfoState) {
        assertTrue(this.queryInfoState.project.groupId === groupId);
        assertTrue(this.queryInfoState.project.artifactId === artifactId);
        assertTrue(this.queryInfoState.versionId === versionId);
        assertTrue(this.queryInfoState.service.path === servicePath);
        assertTrue(this.queryInfoState.key === serviceExecutionKey);
        project = this.queryInfoState.project;
      } else {
        project = ProjectData.serialization.fromJson(
          (yield flowResult(
            this.depotServerClient.getProject(groupId, artifactId),
          )) as PlainObject<ProjectData>,
        );
      }
      yield flowResult(this.buildGraph(project, versionId));
      const currentService =
        this.graphManagerState.graph.getService(servicePath);
      const queryInfoState = new ServiceQueryInfoState(
        this,
        project,
        versionId,
        currentService,
        serviceExecutionKey,
      );
      this.setQueryInfoState(queryInfoState);
      assertType(
        queryInfoState.service.execution,
        PureExecution,
        `Can't process service execution: only Pure execution is supported`,
      );
      if (serviceExecutionKey) {
        assertType(
          queryInfoState.service.execution,
          PureMultiExecution,
          `Can't process service execution: an execution key is provided, expecting Pure multi execution`,
        );
        const serviceExecution = guaranteeNonNullable(
          queryInfoState.service.execution.executionParameters.find(
            (parameter) => parameter.key === serviceExecutionKey,
          ),
          `Can't process service execution: execution with key '${serviceExecutionKey}' is not found`,
        );
        this.queryBuilderState.querySetupState.mapping =
          serviceExecution.mapping.value;
        this.queryBuilderState.querySetupState.runtimeValue =
          serviceExecution.runtime;
      } else {
        assertType(
          queryInfoState.service.execution,
          PureSingleExecution,
          `Can't process service execution: no execution key is provided, expecting Pure single execution`,
        );
        this.queryBuilderState.querySetupState.mapping =
          queryInfoState.service.execution.mapping.value;
        this.queryBuilderState.querySetupState.runtimeValue =
          queryInfoState.service.execution.runtime;
      }
      this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
      this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);
      // leverage initialization of query builder state to ensure we handle unsupported queries
      this.queryBuilderState.initialize(queryInfoState.service.execution.func);
      this.setOnSaveQuery(async (lambda: RawLambda) => {
        this.setQueryExportState(
          new QueryExportState(this, lambda, false, undefined),
        );
      });
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.notifyError(error);
      this.applicationStore.setBlockingAlert({
        message: `Can't initialize query editor`,
        prompt: `Reload the application or navigate to the setup page`,
      });
    } finally {
      this.editorInitState.complete();
    }
  }

  *setupCreateQueryInfoState(params: CreateQueryPathParams): GeneratorFn<void> {
    const {
      groupId,
      artifactId,
      versionId,
      mappingPath,
      runtimePath,
      classPath,
    } = params;
    try {
      this.editorInitState.inProgress();
      let queryInfoState: CreateQueryInfoState;
      if (this.queryInfoState instanceof CreateQueryInfoState) {
        assertTrue(this.queryInfoState.project.groupId === groupId);
        assertTrue(this.queryInfoState.project.artifactId === artifactId);
        assertTrue(this.queryInfoState.versionId === versionId);
        yield flowResult(
          this.buildGraph(this.queryInfoState.project, versionId),
        );
        this.queryInfoState.setMapping(
          this.graphManagerState.graph.getMapping(mappingPath),
        );
        this.queryInfoState.setRuntime(
          this.graphManagerState.graph.getRuntime(runtimePath),
        );
        queryInfoState = this.queryInfoState;
      } else {
        const project = ProjectData.serialization.fromJson(
          (yield flowResult(
            this.depotServerClient.getProject(groupId, artifactId),
          )) as PlainObject<ProjectData>,
        );
        yield flowResult(this.buildGraph(project, versionId));
        const currentMapping =
          this.graphManagerState.graph.getMapping(mappingPath);
        const currentRuntime =
          this.graphManagerState.graph.getRuntime(runtimePath);
        queryInfoState = new CreateQueryInfoState(
          this,
          project,
          versionId,
          currentMapping,
          currentRuntime,
        );
        this.setQueryInfoState(queryInfoState);
      }
      this.queryBuilderState.querySetupState.mapping = queryInfoState.mapping;
      this.queryBuilderState.querySetupState.runtimeValue = new RuntimePointer(
        PackageableElementExplicitReference.create(queryInfoState.runtime),
      );
      if (classPath) {
        this.queryBuilderState.querySetupState._class =
          this.queryBuilderState.graphManagerState.graph.getClass(classPath);
        this.applicationStore.navigator.goTo(
          generateCreateQueryRoute(
            groupId,
            artifactId,
            versionId,
            mappingPath,
            runtimePath,
            undefined,
          ),
        );
      }
      if (!this.queryBuilderState.querySetupState._class) {
        const possibleTargets = getAllClassMappings(
          this.queryBuilderState.querySetupState.mapping,
        ).map((classMapping) => classMapping.class.value);
        if (possibleTargets.length !== 0) {
          this.queryBuilderState.querySetupState._class = possibleTargets[0];
        }
      }
      this.queryBuilderState.resetQueryBuilder();
      this.queryBuilderState.resetQuerySetup();
      this.setOnSaveQuery(async (lambda: RawLambda) => {
        this.setQueryExportState(
          new QueryExportState(this, lambda, false, undefined),
        );
      });
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.notifyError(error);
      this.applicationStore.setBlockingAlert({
        message: `Can't initialize query editor`,
        prompt: `Reload the application or navigate to the setup page`,
      });
    } finally {
      this.editorInitState.complete();
    }
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'development') {
        this.applicationStore.log.info(
          LogEvent.create(APPLICATION_EVENT.DEVELOPMENT_ISSUE),
          `Fast-refreshing the app - undoing cleanUp() and preventing initialize() recall...`,
        );
        return;
      }
      this.applicationStore.notifyIllegalState(
        `Query store is already initialized`,
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

      yield this.graphManagerState.initializeSystem();

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.setBlockingAlert({
        message: `Can't initialize Legend Query`,
      });
      this.initState.fail();
    }
  }

  *buildGraph(project: ProjectData, versionId: string): GeneratorFn<void> {
    try {
      this.buildGraphState.inProgress();
      const stopWatch = new StopWatch();

      // reset
      this.graphManagerState.resetGraph();

      // fetch entities
      stopWatch.record();
      this.buildGraphState.setMessage(`Fetching entities...`);
      const entities = (yield this.depotServerClient.getEntities(
        project,
        versionId,
      )) as Entity[];
      this.buildGraphState.setMessage(undefined);
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

      this.buildGraphState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.notifyError(error);
      this.buildGraphState.fail();
    }
  }

  viewStudioProject(
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ): void {
    this.applicationStore.navigator.openNewWindow(
      `${
        this.applicationStore.config.studioUrl
      }/view/archive/${generateGAVCoordinates(groupId, artifactId, versionId)}${
        entityPath ? `/entity/${entityPath}` : ''
      }`,
    );
  }
}
