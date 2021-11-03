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
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  LogEvent,
  assertErrorThrown,
  uuid,
  assertType,
  assertTrue,
  guaranteeNonNullable,
  ActionState,
} from '@finos/legend-shared';
import type {
  LightQuery,
  Mapping,
  PackageableRuntime,
  RawLambda,
  Service,
  GraphManagerState,
  Class,
} from '@finos/legend-graph';
import {
  getAllClassMappings,
  toLightQuery,
  Query,
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import { QueryBuilderState } from './QueryBuilderState';
import type {
  CreateQueryPathParams,
  ExistingQueryPathParams,
  ServiceQueryPathParams,
} from './LegendQueryRouter';
import { generateExistingQueryRoute } from './LegendQueryRouter';
import { QUERY_LOG_EVENT } from '../QueryLogEvent';
import type { Entity } from '@finos/legend-model-storage';
import type { DepotServerClient } from '@finos/legend-server-depot';
import {
  generateGAVCoordinates,
  ProjectData,
  ProjectVersionEntities,
} from '@finos/legend-server-depot';
import type { ApplicationStore } from '@finos/legend-application';
import { APPLICATION_LOG_EVENT, TAB_SIZE } from '@finos/legend-application';
import type { QueryPluginManager } from '../application/QueryPluginManager';
import type { QueryConfig } from '../application/QueryConfig';

export const LATEST_VERSION_ALIAS = 'latest';
export const LATEST_SNAPSHOT_VERSION_ALIAS = 'HEAD';

interface QueryProjectInfo {
  groupId: string;
  artifactId: string;
  versionId: string;
}

export abstract class QueryInfoState {
  queryStore: QueryStore;

  constructor(queryStore: QueryStore) {
    this.queryStore = queryStore;
  }

  abstract getQueryProjectInfo(): QueryProjectInfo;
  abstract decorateQuery(query: Query): void;
}

export class CreateQueryInfoState extends QueryInfoState {
  project: ProjectData;
  versionId: string;
  mapping: Mapping;
  runtime: PackageableRuntime;
  class?: Class | undefined;

  constructor(
    queryStore: QueryStore,
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

  getQueryProjectInfo(): QueryProjectInfo {
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

export class ServiceQueryInfoState extends QueryInfoState {
  project: ProjectData;
  versionId: string;
  service: Service;
  key?: string | undefined;

  constructor(
    queryStore: QueryStore,
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

  getQueryProjectInfo(): QueryProjectInfo {
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

  constructor(queryStore: QueryStore, query: LightQuery) {
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

  getQueryProjectInfo(): QueryProjectInfo {
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
  queryStore: QueryStore;
  lambda: RawLambda;
  persistQueryState = ActionState.create();
  queryName = 'My New Query';
  allowUpdate = false;

  constructor(
    queryStore: QueryStore,
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
      this.queryStore.queryBuilderState.querySetupState.runtime instanceof
        RuntimePointer
    );
  }

  async persistQuery(createNew: boolean): Promise<void> {
    if (
      !this.queryStore.queryInfoState ||
      !this.queryStore.queryBuilderState.querySetupState.mapping ||
      !(
        this.queryStore.queryBuilderState.querySetupState.runtime instanceof
        RuntimePointer
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
      this.queryStore.queryBuilderState.querySetupState.runtime.packageableRuntime;
    this.queryStore.queryInfoState.decorateQuery(query);
    try {
      query.content =
        await this.queryStore.graphManagerState.graphManager.lambdaToPureCode(
          this.lambda,
        );
    } catch (error) {
      assertErrorThrown(error);
      this.queryStore.applicationStore.log.error(
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
        error,
      );
      this.queryStore.applicationStore.notifyError(error);
      this.persistQueryState.reset();
      return;
    }

    try {
      if (createNew) {
        const newQuery =
          await this.queryStore.graphManagerState.graphManager.createQuery(
            query,
            this.queryStore.graphManagerState.graph,
          );
        this.queryStore.applicationStore.notifySuccess(
          `Successfully created query!`,
        );
        this.queryStore.applicationStore.navigator.goTo(
          generateExistingQueryRoute(newQuery.id),
        );
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
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
        error,
      );
      this.queryStore.applicationStore.notifyError(error);
    } finally {
      this.persistQueryState.reset();
      this.queryStore.setQueryExportState(undefined);
    }
  }
}

export class QueryStore {
  applicationStore: ApplicationStore<QueryConfig>;
  depotServerClient: DepotServerClient;
  graphManagerState: GraphManagerState;
  pluginManager: QueryPluginManager;

  queryInfoState?: QueryInfoState | undefined;
  queryBuilderState: QueryBuilderState;
  queryExportState?: QueryExportState | undefined;
  buildGraphState = ActionState.create();
  initState = ActionState.create();
  editorInitState = ActionState.create();

  constructor(
    applicationStore: ApplicationStore<QueryConfig>,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    pluginManager: QueryPluginManager,
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
      {},
    );
  }

  reset(): void {
    this.setQueryInfoState(undefined);
    this.queryBuilderState = new QueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      this.queryBuilderState.config,
    );
    this.graphManagerState.resetGraph();
    this.buildGraphState.reset();
    this.editorInitState.reset();
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
      this.queryBuilderState.querySetupState.runtime = new RuntimePointer(
        PackageableElementExplicitReference.create(query.runtime.value),
      );
      this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
      this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);
      this.queryBuilderState.buildStateFromRawLambda(
        (yield this.graphManagerState.graphManager.pureCodeToLambda(
          query.content,
        )) as RawLambda,
      );
      this.queryBuilderState.querySetupState.setOnSaveQuery(
        async (lambda: RawLambda) => {
          this.setQueryExportState(
            new QueryExportState(
              this,
              lambda,
              queryInfoState.query.isCurrentUserQuery,
              queryInfoState.query.name,
            ),
          );
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
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
      let queryInfoState: ServiceQueryInfoState;
      if (this.queryInfoState instanceof ServiceQueryInfoState) {
        assertTrue(this.queryInfoState.project.groupId === groupId);
        assertTrue(this.queryInfoState.project.artifactId === artifactId);
        assertTrue(this.queryInfoState.versionId === versionId);
        assertTrue(this.queryInfoState.service.path === servicePath);
        assertTrue(this.queryInfoState.key === serviceExecutionKey);
        queryInfoState = this.queryInfoState;
      } else {
        const project = ProjectData.serialization.fromJson(
          (yield flowResult(
            this.depotServerClient.getProject(groupId, artifactId),
          )) as PlainObject<ProjectData>,
        );
        yield flowResult(this.buildGraph(project, versionId));

        const currentService =
          this.graphManagerState.graph.getService(servicePath);
        queryInfoState = new ServiceQueryInfoState(
          this,
          project,
          versionId,
          currentService,
          serviceExecutionKey,
        );
        this.setQueryInfoState(queryInfoState);
      }
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
        this.queryBuilderState.querySetupState.runtime =
          serviceExecution.runtime;
      } else {
        assertType(
          queryInfoState.service.execution,
          PureSingleExecution,
          `Can't process service execution: no execution key is provided, expecting Pure single execution`,
        );
        this.queryBuilderState.querySetupState.mapping =
          queryInfoState.service.execution.mapping.value;
        this.queryBuilderState.querySetupState.runtime =
          queryInfoState.service.execution.runtime;
      }
      this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
      this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);
      this.queryBuilderState.buildStateFromRawLambda(
        queryInfoState.service.execution.func,
      );
      this.queryBuilderState.querySetupState.setOnSaveQuery(
        async (lambda: RawLambda) => {
          this.setQueryExportState(
            new QueryExportState(this, lambda, false, undefined),
          );
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
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
    const { groupId, artifactId, versionId, mappingPath, runtimePath } = params;
    try {
      this.editorInitState.inProgress();
      let queryInfoState: CreateQueryInfoState;
      if (this.queryInfoState instanceof CreateQueryInfoState) {
        assertTrue(this.queryInfoState.project.groupId === groupId);
        assertTrue(this.queryInfoState.project.artifactId === artifactId);
        assertTrue(this.queryInfoState.versionId === versionId);
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
      this.queryBuilderState.querySetupState.runtime = new RuntimePointer(
        PackageableElementExplicitReference.create(queryInfoState.runtime),
      );
      this.queryBuilderState.querySetupState._class = queryInfoState.class;
      if (!this.queryBuilderState.querySetupState._class) {
        const possibleTargets = getAllClassMappings(
          this.queryBuilderState.querySetupState.mapping,
        ).map((classMapping) => classMapping.class.value);
        if (possibleTargets.length !== 0) {
          this.queryBuilderState.querySetupState._class = possibleTargets[0];
        }
      }
      this.queryBuilderState.resetData();
      this.queryBuilderState.querySetupState.setOnSaveQuery(
        async (lambda: RawLambda) => {
          this.setQueryExportState(
            new QueryExportState(this, lambda, false, undefined),
          );
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
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
          LogEvent.create(APPLICATION_LOG_EVENT.DEVELOPMENT_ISSUE),
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
      yield flowResult(
        this.graphManagerState.graphManager.initialize(
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
            tracerServicePlugins: this.pluginManager.getTracerServicePlugins(),
          },
        ),
      );

      yield flowResult(this.graphManagerState.initializeSystem());

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
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
      let entities: Entity[] = [];

      if (versionId === LATEST_SNAPSHOT_VERSION_ALIAS) {
        entities = (yield this.depotServerClient.getLatestRevisionEntities(
          project.groupId,
          project.artifactId,
        )) as Entity[];
      } else {
        entities = (yield this.depotServerClient.getVersionEntities(
          project.groupId,
          project.artifactId,
          versionId === LATEST_VERSION_ALIAS
            ? project.latestVersion
            : versionId,
        )) as Entity[];
      }

      this.graphManagerState.resetGraph();
      // build dependencies
      const dependencyManager =
        this.graphManagerState.createEmptyDependencyManager();
      yield flowResult(
        this.graphManagerState.graphManager.buildDependencies(
          this.graphManagerState.coreModel,
          this.graphManagerState.systemModel,
          dependencyManager,
          (yield flowResult(
            this.getProjectDependencyEntities(project, versionId),
          )) as Map<string, Entity[]>,
        ),
      );
      this.graphManagerState.graph.setDependencyManager(dependencyManager);
      // build graph
      yield flowResult(
        this.graphManagerState.graphManager.buildGraph(
          this.graphManagerState.graph,
          entities,
        ),
      );

      this.buildGraphState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.notifyError(error);
      this.buildGraphState.fail();
    }
  }

  *getProjectDependencyEntities(
    project: ProjectData,
    versionId: string,
  ): GeneratorFn<Map<string, Entity[]>> {
    this.buildGraphState.inProgress();
    const dependencyEntitiesMap = new Map<string, Entity[]>();
    try {
      let dependencyEntitiesJson: PlainObject<ProjectVersionEntities>[] = [];
      if (versionId === LATEST_SNAPSHOT_VERSION_ALIAS) {
        dependencyEntitiesJson =
          (yield this.depotServerClient.getLatestDependencyEntities(
            project.groupId,
            project.artifactId,
            true,
            false,
          )) as PlainObject<ProjectVersionEntities>[];
      } else {
        dependencyEntitiesJson =
          (yield this.depotServerClient.getDependencyEntities(
            project.groupId,
            project.artifactId,
            versionId === LATEST_VERSION_ALIAS
              ? project.latestVersion
              : versionId,
            true,
            false,
          )) as PlainObject<ProjectVersionEntities>[];
        dependencyEntitiesJson
          .map((e) => ProjectVersionEntities.serialization.fromJson(e))
          .forEach((dependencyInfo) => {
            dependencyEntitiesMap.set(
              dependencyInfo.id,
              dependencyInfo.entities,
            );
          });
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(QUERY_LOG_EVENT.QUERY_PROBLEM),
        error,
      );
      this.applicationStore.notifyError(error);
      this.buildGraphState.fail();
    }
    return dependencyEntitiesMap;
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
      }/-/view/gav/${generateGAVCoordinates(groupId, artifactId, versionId)}${
        entityPath ? `/entity/${entityPath}` : ''
      }`,
    );
  }
}
