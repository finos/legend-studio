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
import type {
  Clazz,
  GeneratorFn,
  PlainObject,
} from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  uuid,
  assertType,
  assertTrue,
  guaranteeNonNullable,
  ActionState,
} from '@finos/legend-studio-shared';
import type {
  LightQuery,
  Entity,
  Mapping,
  PackageableRuntime,
  RawLambda,
  Service,
  ProjectDependencyMetadata,
  PackageableElement,
} from '@finos/legend-studio';
import {
  toLightQuery,
  Query,
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
  PackageableElementExplicitReference,
  RuntimePointer,
  ProjectData,
  TAB_SIZE,
  SDLC_LOG_EVENT,
  EditorStore,
  useApplicationStore,
  ProjectVersionEntities,
  DependencyManager,
} from '@finos/legend-studio';
import { QueryBuilderState } from './QueryBuilderState';
import type {
  CreateQueryPathParams,
  ExistingQueryPathParams,
  ServiceQueryPathParams,
} from './LegendQueryRouter';
import { generateExistingQueryRoute } from './LegendQueryRouter';
import { QUERY_LOG_EVENT } from '../QueryLogEvent';

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
  project: ProjectData;
  versionId: string;
  mapping: Mapping;
  runtime: PackageableRuntime;

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
  key?: string;

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
        await this.queryStore.editorStore.graphState.graphManager.lambdaToPureCode(
          this.lambda,
        );
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.queryStore.editorStore.applicationStore.log.error(
        QUERY_LOG_EVENT.QUERY_PROBLEM,
        error,
      );
      this.queryStore.editorStore.applicationStore.notifyError(error);
      this.persistQueryState.reset();
      return;
    }

    try {
      if (createNew) {
        const newQuery =
          await this.queryStore.editorStore.graphState.graphManager.createQuery(
            query,
            this.queryStore.editorStore.graphState.graph,
          );
        this.queryStore.editorStore.applicationStore.notifySuccess(
          `Successfully created query!`,
        );
        this.queryStore.editorStore.applicationStore.navigator.goTo(
          generateExistingQueryRoute(newQuery.id),
        );
      } else {
        assertType(this.queryStore.queryInfoState, ExistingQueryInfoState);
        const newQuery =
          await this.queryStore.editorStore.graphState.graphManager.updateQuery(
            query,
            this.queryStore.editorStore.graphState.graph,
          );
        this.queryStore.queryInfoState.setQuery(toLightQuery(newQuery));
        this.queryStore.editorStore.applicationStore.notifySuccess(
          `Successfully updated query!`,
        );
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.queryStore.editorStore.applicationStore.log.error(
        QUERY_LOG_EVENT.QUERY_PROBLEM,
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
  buildGraphState = ActionState.create();
  initState = ActionState.create();
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

      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.editorStore.applicationStore.networkClientManager.metadataClient.getProject(
            queryInfoState.query.groupId,
            queryInfoState.query.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      yield flowResult(
        this.buildGraph(project, queryInfoState.query.versionId),
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
      this.editorStore.applicationStore.log.error(
        QUERY_LOG_EVENT.QUERY_PROBLEM,
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
            this.editorStore.applicationStore.networkClientManager.metadataClient.getProject(
              groupId,
              artifactId,
            ),
          )) as PlainObject<ProjectData>,
        );
        yield flowResult(this.buildGraph(project, versionId));

        const currentService =
          this.editorStore.graphState.graph.getService(servicePath);
        queryInfoState = new ServiceQueryInfoState(
          this,
          project,
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
      this.editorStore.applicationStore.log.error(
        QUERY_LOG_EVENT.QUERY_PROBLEM,
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
    const { groupId, artifactId, versionId, mappingPath, runtimePath } = params;
    try {
      this.editorInitState.inProgress();
      let queryInfoState: CreateQueryInfoState;
      if (this.queryInfoState instanceof CreateQueryInfoState) {
        assertTrue(this.queryInfoState.project.groupId === groupId);
        assertTrue(this.queryInfoState.project.artifactId === artifactId);
        assertTrue(this.queryInfoState.versionId === versionId);
        this.queryInfoState.setMapping(
          this.editorStore.graphState.graph.getMapping(mappingPath),
        );
        this.queryInfoState.setRuntime(
          this.editorStore.graphState.graph.getRuntime(runtimePath),
        );
        queryInfoState = this.queryInfoState;
      } else {
        const project = ProjectData.serialization.fromJson(
          (yield flowResult(
            this.editorStore.applicationStore.networkClientManager.metadataClient.getProject(
              groupId,
              artifactId,
            ),
          )) as PlainObject<ProjectData>,
        );
        yield flowResult(this.buildGraph(project, versionId));
        const currentMapping =
          this.editorStore.graphState.graph.getMapping(mappingPath);
        const currentRuntime =
          this.editorStore.graphState.graph.getRuntime(runtimePath);
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
      this.editorStore.applicationStore.log.error(
        QUERY_LOG_EVENT.QUERY_PROBLEM,
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

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.editorStore.applicationStore.notifyIllegalState(
        `Query store is already initialized`,
      );
      return;
    }
    try {
      this.initState.inProgress();
      yield flowResult(
        this.editorStore.graphState.graphManager.initialize(
          this.editorStore.applicationStore.pluginManager,
          {
            env: this.editorStore.applicationStore.config.env,
            tabSize: TAB_SIZE,
            clientConfig: {
              baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
              enableCompression: true,
              autoReAuthenticateUrl:
                this.editorStore.applicationStore.config
                  .engineAutoReAuthenticationUrl,
            },
          },
        ),
      );

      yield flowResult(this.editorStore.graphState.initializeSystem());

      this.initState.pass();
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.setBlockingAlert({
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
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.metadataClient.getLatestRevisionEntities(
            project.groupId,
            project.artifactId,
          )) as Entity[];
      } else {
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.metadataClient.getVersionEntities(
            project.groupId,
            project.artifactId,
            versionId === LATEST_VERSION_ALIAS
              ? project.latestVersion
              : versionId,
          )) as Entity[];
      }

      // build graph
      this.editorStore.graphState.resetGraph();
      // build dependencies
      const dependencyManager = new DependencyManager(
        this.getPureGraphExtensionElementClasses(),
      );
      yield flowResult(
        this.editorStore.graphState.graphManager.buildDependencies(
          this.editorStore.graphState.coreModel,
          this.editorStore.graphState.systemModel,
          dependencyManager,
          (yield flowResult(
            this.getProjectDependencyEntities(project, versionId),
          )) as Map<string, ProjectDependencyMetadata>,
        ),
      );
      this.editorStore.graphState.graph.setDependencyManager(dependencyManager);
      // build Graph
      yield flowResult(
        this.editorStore.graphState.graphManager.buildGraph(
          this.editorStore.graphState.graph,
          entities,
        ),
      );

      this.buildGraphState.pass();
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.buildGraphState.fail();
    }
  }

  *getProjectDependencyEntities(
    project: ProjectData,
    versionId: string,
  ): GeneratorFn<Map<string, ProjectDependencyMetadata>> {
    this.buildGraphState.inProgress();
    const projectDependencyMetadataMap = new Map<
      string,
      ProjectDependencyMetadata
    >();
    try {
      let dependencyEntitiesJson: PlainObject<ProjectVersionEntities>[] = [];
      if (versionId === LATEST_SNAPSHOT_VERSION_ALIAS) {
        dependencyEntitiesJson =
          (yield this.editorStore.applicationStore.networkClientManager.metadataClient.getLatestDependencyEntities(
            project.groupId,
            project.artifactId,
            true,
            false,
          )) as PlainObject<ProjectVersionEntities>[];
      } else {
        dependencyEntitiesJson =
          (yield this.editorStore.applicationStore.networkClientManager.metadataClient.getDependencyEntities(
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
            const projectDependenciesMetadata = {
              entities: dependencyInfo.entities,
              projectVersion: dependencyInfo.projectVersion,
            };
            projectDependencyMetadataMap.set(
              dependencyInfo.id,
              projectDependenciesMetadata,
            );
          });
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.buildGraphState.fail();
    }
    return projectDependencyMetadataMap;
  }

  private getPureGraphExtensionElementClasses(): Clazz<PackageableElement>[] {
    const pureGraphManagerPlugins =
      this.editorStore.applicationStore.pluginManager.getPureGraphManagerPlugins();
    return pureGraphManagerPlugins.flatMap(
      (plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? [],
    );
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
