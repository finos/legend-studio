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
  flowResult,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import { assertType } from '@finos/legend-studio-shared';
import {
  assertTrue,
  guaranteeNonNullable,
  ActionState,
} from '@finos/legend-studio-shared';
import type {
  Entity,
  LightQuery,
  Mapping,
  PackageableRuntime,
  Query,
  RawLambda,
  Service,
} from '@finos/legend-studio';
import {
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
} from '@finos/legend-studio';
import {
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

export abstract class QueryInfoState {
  queryStore: QueryStore;

  constructor(queryStore: QueryStore) {
    this.queryStore = queryStore;
  }
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
}

export class ExistingQueryInfoState extends QueryInfoState {
  query: LightQuery;

  constructor(queryStore: QueryStore, query: LightQuery) {
    super(queryStore);
    this.query = query;
  }
}

export class QueryStore {
  editorStore: EditorStore;
  queryInfoState?: QueryInfoState;
  queryBuilderState: QueryBuilderState;

  useSDLC = true; // TODO: remove this when metadata server is enabled by default

  buildGraphState = ActionState.create();
  initGraphState = ActionState.create();

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      setQueryInfoState: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = new QueryBuilderState(editorStore);
  }

  setQueryInfoState(val: QueryInfoState | undefined): void {
    this.queryInfoState = val;
  }

  *setupExistingQueryInfoState(
    params: ExistingQueryPathParams,
  ): GeneratorFn<void> {
    const { queryId } = params;

    let queryInfoState: ExistingQueryInfoState;
    if (this.queryInfoState instanceof ExistingQueryInfoState) {
      assertTrue(this.queryInfoState.query.id === queryId);
      queryInfoState = this.queryInfoState;
    } else {
      const lightQuery =
        (yield this.editorStore.graphState.graphManager.getLightQuery(
          queryId,
        )) as LightQuery;
      // TODO: handle error here more gracefully
      // TODO: fix this when we use metadata server
      const projectMetadata = new ProjectMetadata();
      projectMetadata.projectId = lightQuery.projectId;
      projectMetadata.setVersions([lightQuery.versionId]);
      yield flowResult(this.buildGraph(projectMetadata, lightQuery.versionId));
      queryInfoState = new ExistingQueryInfoState(this, lightQuery);
      this.setQueryInfoState(queryInfoState);
    }
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
        'query-lambda',
      )) as RawLambda,
    );
  }

  *setupServiceQueryInfoState(
    params: ServiceQueryPathParams,
    serviceExecutionKey: string | undefined,
  ): GeneratorFn<void> {
    const { projectId, versionId, servicePath } = params;

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
      this.queryBuilderState.querySetupState.runtime = serviceExecution.runtime;
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
    // this.queryBuilderState.resetData();
  }

  *setupCreateQueryInfoState(params: CreateQueryPathParams): GeneratorFn<void> {
    const { projectId, versionId, mappingPath, runtimePath } = params;
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
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getEntitiesByVersion(
            projectMetadata.projectId,
            versionId,
          )) as Entity[];
      } else {
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
      yield flowResult(
        this.editorStore.graphState.buildGraphForViewerMode(entities),
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
