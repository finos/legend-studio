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

import { createContext, useContext } from 'react';
import {
  action,
  computed,
  flowResult,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  uuid,
  assertType,
  assertTrue,
  guaranteeNonNullable,
  ActionState,
} from '@finos/legend-studio-shared';
import type {
  Entity,
  LightQuery,
  Mapping,
  PackageableRuntime,
  RawLambda,
  Service,
} from '@finos/legend-studio';
import {
  ProjectConfiguration,
  Query,
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
  PackageableElementExplicitReference,
  RuntimePointer,
  ProjectMetadata,
  SDLCServerClient,
  TAB_SIZE,
  CORE_LOG_EVENT,
  Project,
  EditorStore,
  useApplicationStore,
} from '@finos/legend-studio';
import { QueryBuilderState } from './QueryBuilderState';
import type {
  CreateQueryPathParams,
  ExistingQueryPathParams,
  ServiceQueryPathParams,
} from './LegendQueryRouter';
import { generateExistingQueryRoute } from './LegendQueryRouter';

export const LATEST_VERSION_ALIAS = 'latest';
export const LATEST_SNAPSHOT_VERSION_ALIAS = 'HEAD';

export abstract class QueryInfoState {
  queryStore: QueryStore;

  constructor(queryStore: QueryStore) {
    this.queryStore = queryStore;
  }

  abstract decorateQuery(query: Query): void;
}

export class CreateQueryInfoState extends QueryInfoState {
  projectMetadata: ProjectMetadata;
  versionId: string;
  mapping: Mapping;
  runtime: PackageableRuntime;

  constructor(
    queryStore: QueryStore,
    projectMetadata: ProjectMetadata,
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

    this.projectMetadata = projectMetadata;
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

  decorateQuery(query: Query): void {
    query.id = uuid();
    query.projectId = this.projectMetadata.projectId;
    query.versionId = this.versionId;
  }
}

export class ServiceQueryInfoState extends QueryInfoState {
  projectMetadata: ProjectMetadata;
  versionId: string;
  service: Service;
  key?: string;

  constructor(
    queryStore: QueryStore,
    projectMetadata: ProjectMetadata,
    versionId: string,
    service: Service,
    key: string | undefined,
  ) {
    super(queryStore);

    this.projectMetadata = projectMetadata;
    this.versionId = versionId;
    this.service = service;
    this.key = key;
  }

  decorateQuery(query: Query): void {
    query.id = uuid();
    query.projectId = this.projectMetadata.projectId;
    query.versionId = this.versionId;
  }
}

export class ExistingQueryInfoState extends QueryInfoState {
  query: LightQuery;

  constructor(queryStore: QueryStore, query: LightQuery) {
    super(queryStore);
    this.query = query;
  }

  decorateQuery(query: Query): void {
    query.id = this.query.id;
    query.projectId = this.query.projectId;
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
        await this.queryStore.editorStore.graphState.graphManager.lambdaToPureCode(
          this.lambda,
        );
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.queryStore.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.QUERY_PROBLEM,
        error,
      );
      this.queryStore.editorStore.applicationStore.notifyError(error);
      this.persistQueryState.reset();
      return;
    }

    // TODO: remove this when we use metadata server
    let currentProjectConfiguration: ProjectConfiguration;
    if (query.versionId === LATEST_SNAPSHOT_VERSION_ALIAS) {
      currentProjectConfiguration = ProjectConfiguration.serialization.fromJson(
        await this.queryStore.editorStore.applicationStore.networkClientManager.sdlcClient.getConfiguration(
          query.projectId,
          undefined,
        ),
      );
    } else if (query.versionId === LATEST_VERSION_ALIAS) {
      // NOTE: this is not quite correct, we don't currently have a way to do this in SDLC server
      currentProjectConfiguration = ProjectConfiguration.serialization.fromJson(
        await this.queryStore.editorStore.applicationStore.networkClientManager.sdlcClient.getConfiguration(
          query.projectId,
          undefined,
        ),
      );
    } else {
      currentProjectConfiguration = ProjectConfiguration.serialization.fromJson(
        await this.queryStore.editorStore.applicationStore.networkClientManager.sdlcClient.getConfigurationByVersion(
          query.projectId,
          query.versionId,
        ),
      );
    }
    query.groupId = currentProjectConfiguration.groupId;
    query.artifactId = currentProjectConfiguration.artifactId;

    try {
      if (createNew) {
        const newQuery =
          await this.queryStore.editorStore.graphState.graphManager.createQuery(
            query,
            this.queryStore.editorStore.graphState.graph,
          );
        this.queryStore.editorStore.applicationStore.notifySuccess(
          `Sucessfully created query!`,
        );
        this.queryStore.editorStore.applicationStore.historyApiClient.push(
          generateExistingQueryRoute(newQuery.id),
        );
      } else {
        await this.queryStore.editorStore.graphState.graphManager.updateQuery(
          query,
          this.queryStore.editorStore.graphState.graph,
        );
        this.queryStore.editorStore.applicationStore.notifySuccess(
          `Sucessfully updated query!`,
        );
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.queryStore.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.QUERY_PROBLEM,
        error,
      );
      this.queryStore.editorStore.applicationStore.notifyError(error);
    } finally {
      this.persistQueryState.reset();
      this.queryStore.setQueryExportState(undefined);
    }
  }
}

export class QueryStore {
  editorStore: EditorStore;
  queryInfoState?: QueryInfoState;
  queryBuilderState: QueryBuilderState;
  queryExportState?: QueryExportState;

  useSDLC = true; // TODO: remove this when metadata server is enabled by default

  buildGraphState = ActionState.create();
  initGraphState = ActionState.create();
  editorInitState = ActionState.create();

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      reset: action,
      setQueryInfoState: action,
      setQueryExportState: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = new QueryBuilderState(editorStore);
  }

  reset(): void {
    this.setQueryInfoState(undefined);
    this.queryBuilderState = new QueryBuilderState(this.editorStore);
    this.editorStore.graphState.resetGraph();
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
      if (this.initGraphState.isInInitialState) {
        yield flowResult(this.initGraph());
      } else if (this.initGraphState.isInProgress) {
        return;
      }

      let queryInfoState: ExistingQueryInfoState;
      if (this.queryInfoState instanceof ExistingQueryInfoState) {
        assertTrue(this.queryInfoState.query.id === queryId);
        queryInfoState = this.queryInfoState;
      } else {
        const lightQuery =
          (yield this.editorStore.graphState.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
        queryInfoState = new ExistingQueryInfoState(this, lightQuery);
        this.setQueryInfoState(queryInfoState);
      }

      // TODO: handle error here more gracefully
      // TODO: fix this when we use metadata server
      const projectMetadata = new ProjectMetadata();
      projectMetadata.projectId = queryInfoState.query.projectId;
      projectMetadata.setVersions([queryInfoState.query.versionId]);
      yield flowResult(
        this.buildGraph(projectMetadata, queryInfoState.query.versionId),
      );

      const query = (yield this.editorStore.graphState.graphManager.getQuery(
        queryId,
        this.editorStore.graphState.graph,
      )) as Query;
      this.queryBuilderState.querySetupState.mapping = query.mapping.value;
      this.queryBuilderState.querySetupState.runtime = new RuntimePointer(
        PackageableElementExplicitReference.create(query.runtime.value),
      );
      this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
      this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);
      this.queryBuilderState.buildStateFromRawLambda(
        (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
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
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.QUERY_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.editorStore.applicationStore.setBlockingAlert({
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
    const { projectId, versionId, servicePath } = params;

    try {
      this.editorInitState.inProgress();
      let queryInfoState: ServiceQueryInfoState;
      if (this.queryInfoState instanceof ServiceQueryInfoState) {
        assertTrue(this.queryInfoState.projectMetadata.projectId === projectId);
        assertTrue(this.queryInfoState.versionId === versionId);
        assertTrue(this.queryInfoState.service.path === servicePath);
        assertTrue(this.queryInfoState.key === serviceExecutionKey);
        queryInfoState = this.queryInfoState;
      } else {
        // TODO: handle error here more gracefully
        // TODO: fix this when we use metadata server
        const projectMetadata = new ProjectMetadata();
        projectMetadata.projectId = projectId;
        projectMetadata.setVersions([versionId]);
        yield flowResult(this.buildGraph(projectMetadata, versionId));
        const currentService =
          this.editorStore.graphState.graph.getService(servicePath);
        queryInfoState = new ServiceQueryInfoState(
          this,
          projectMetadata,
          versionId,
          currentService,
          serviceExecutionKey,
        );
        this.setQueryInfoState(queryInfoState);
      }
      assertType(queryInfoState.service.execution, PureExecution);
      if (serviceExecutionKey) {
        assertType(queryInfoState.service.execution, PureMultiExecution);
        const serviceExecution = guaranteeNonNullable(
          queryInfoState.service.execution.executionParameters.find(
            (parameter) => parameter.key === serviceExecutionKey,
          ),
        );
        this.queryBuilderState.querySetupState.mapping =
          serviceExecution.mapping.value;
        this.queryBuilderState.querySetupState.runtime =
          serviceExecution.runtime;
      } else {
        assertType(queryInfoState.service.execution, PureSingleExecution);
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
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.QUERY_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.editorStore.applicationStore.setBlockingAlert({
        message: `Can't initialize query editor`,
        prompt: `Reload the application or navigate to the setup page`,
      });
    } finally {
      this.editorInitState.complete();
    }
  }

  *setupCreateQueryInfoState(params: CreateQueryPathParams): GeneratorFn<void> {
    const { projectId, versionId, mappingPath, runtimePath } = params;
    try {
      this.editorInitState.inProgress();
      let queryInfoState: CreateQueryInfoState;
      if (this.queryInfoState instanceof CreateQueryInfoState) {
        assertTrue(this.queryInfoState.projectMetadata.projectId === projectId);
        assertTrue(this.queryInfoState.versionId === versionId);
        this.queryInfoState.setMapping(
          this.editorStore.graphState.graph.getMapping(mappingPath),
        );
        this.queryInfoState.setRuntime(
          this.editorStore.graphState.graph.getRuntime(runtimePath),
        );
        queryInfoState = this.queryInfoState;
      } else {
        // TODO: handle error here more gracefully
        // TODO: fix this when we use metadata server
        const projectMetadata = new ProjectMetadata();
        projectMetadata.projectId = projectId;
        projectMetadata.setVersions([versionId]);
        yield flowResult(this.buildGraph(projectMetadata, versionId));
        const currentMapping =
          this.editorStore.graphState.graph.getMapping(mappingPath);
        const currentRuntime =
          this.editorStore.graphState.graph.getRuntime(runtimePath);
        queryInfoState = new CreateQueryInfoState(
          this,
          projectMetadata,
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
      if (!this.queryBuilderState.querySetupState._class) {
        const possibleTargets =
          this.queryBuilderState.querySetupState.mapping.allClassMappings.map(
            (classMapping) => classMapping.class.value,
          );
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
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.QUERY_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.editorStore.applicationStore.setBlockingAlert({
        message: `Can't initialize query editor`,
        prompt: `Reload the application or navigate to the setup page`,
      });
    } finally {
      this.editorInitState.complete();
    }
  }

  *initGraph(): GeneratorFn<void> {
    if (!this.initGraphState.isInInitialState) {
      return;
    }
    try {
      this.initGraphState.inProgress();
      yield flowResult(
        this.editorStore.graphState.graphManager.setupEngine(
          this.editorStore.applicationStore.pluginManager,
          {
            env: this.editorStore.applicationStore.config.env,
            tabSize: TAB_SIZE,
            clientConfig: {
              baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
              enableCompression: true,
              authenticationUrl: SDLCServerClient.authenticationUrl(
                this.editorStore.applicationStore.config.sdlcServerUrl,
              ),
            },
          },
        ),
      );

      yield flowResult(this.editorStore.graphState.initializeSystem());

      this.initGraphState.pass();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.initGraphState.fail();
    }
  }

  *buildGraph(
    projectMetadata: ProjectMetadata,
    versionId: string,
  ): GeneratorFn<void> {
    if (this.initGraphState.isInInitialState) {
      yield flowResult(this.initGraph());
    } else if (this.initGraphState.isInProgress) {
      return;
    }

    this.buildGraphState.inProgress();

    try {
      let entities: Entity[] = [];
      if (this.useSDLC) {
        if (versionId === LATEST_SNAPSHOT_VERSION_ALIAS) {
          entities =
            (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getEntities(
              projectMetadata.projectId,
              undefined,
            )) as Entity[];
        } else if (versionId === LATEST_VERSION_ALIAS) {
          // NOTE: this is not quite correct, we don't currently have a way to do this in SDLC server
          entities =
            (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getEntities(
              projectMetadata.projectId,
              undefined,
            )) as Entity[];
        } else {
          entities =
            (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getEntitiesByVersion(
              projectMetadata.projectId,
              versionId,
            )) as Entity[];
        }
      } else {
        // TODO: handler aliases
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.metadataClient.getVersionEntities(
            projectMetadata.projectId,
            versionId,
          )) as Entity[];
      }

      // TODO: remove this when metadata server is enabled by default
      const project = new Project();
      project.projectId = projectMetadata.projectId;
      this.editorStore.sdlcState.setCurrentProject(project);

      // build graph
      this.editorStore.graphState.resetGraph();
      // TODO: build dependencies
      yield flowResult(
        this.editorStore.graphState.graphManager.buildGraph(
          this.editorStore.graphState.graph,
          entities,
        ),
      );

      this.buildGraphState.pass();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.buildGraphState.fail();
    }
  }
}

const QueryStoreContext = createContext<QueryStore | undefined>(undefined);

export const QueryStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const store = useLocalObservable(
    () => new QueryStore(new EditorStore(applicationStore)),
  );
  return (
    <QueryStoreContext.Provider value={store}>
      {children}
    </QueryStoreContext.Provider>
  );
};

export const useQueryStore = (): QueryStore =>
  guaranteeNonNullable(
    useContext(QueryStoreContext),
    'useQueryStore() hook must be used inside QueryBuilderStore context provider',
  );
