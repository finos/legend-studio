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
import { action, flowResult, makeAutoObservable } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import { ActionState, guaranteeNonNullable } from '@finos/legend-studio-shared';
import type {
  Entity,
  Mapping,
  PackageableRuntime,
  ProjectMetadata,
} from '@finos/legend-studio';
import {
  SDLCServerClient,
  TAB_SIZE,
  CORE_LOG_EVENT,
  Project,
  EditorStore,
  useApplicationStore,
} from '@finos/legend-studio';
import { QueryBuilderState } from './QueryBuilderState';

export abstract class QueryInfoState {
  queryStore: QueryStore;

  constructor(queryStore: QueryStore) {
    this.queryStore = queryStore;
  }
}

export class CreateQueryInfoState extends QueryInfoState {
  mapping: Mapping;
  runtime: PackageableRuntime;
  // lambda: RawLambda;

  constructor(
    queryStore: QueryStore,
    mapping: Mapping,
    runtime: PackageableRuntime,
  ) {
    super(queryStore);
    this.mapping = mapping;
    this.runtime = runtime;
  }
}

export class EditQueryInfoState extends QueryInfoState {
  // query: Query;
  // constructor(queryStore: QueryStore) {
  //   this.queryStore = queryStore;
  // }
}

export class ServiceQueryInfoState extends QueryInfoState {
  // service: Service;
  // key?: string;
  // constructor(queryStore: QueryStore) {
  //   this.queryStore = queryStore;
  // }
}

export class QueryStore {
  editorStore: EditorStore;
  queryInfoState?: QueryInfoState;
  queryBuilderState: QueryBuilderState;

  useSDLC = true; // TODO: remove this when metadata server is enabled by default

  projectMetadatas: ProjectMetadata[] = [];
  loadProjectMetadataState = ActionState.create();
  currentProjectMetadata?: ProjectMetadata;

  // TODO: support `latest`
  currentVersionId?: string;
  loadVersionsState = ActionState.create();
  buildGraphState = ActionState.create();
  initGraphState = ActionState.create();

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      setCurrentProjectMetadata: action,
      setCurrentVersionId: action,
      setQueryInfoState: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = new QueryBuilderState(editorStore);
  }

  setCurrentProjectMetadata(val: ProjectMetadata | undefined): void {
    this.currentProjectMetadata = val;
  }

  setCurrentVersionId(val: string | undefined): void {
    this.currentVersionId = val;
  }

  setQueryInfoState(val: QueryInfoState | undefined): void {
    this.queryInfoState = val;
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

  *buildGraph(): GeneratorFn<void> {
    if (!this.currentProjectMetadata || !this.currentVersionId) {
      this.editorStore.applicationStore.notifyIllegalState(
        `Can't build graph when project and version is not specified`,
      );
      return;
    }
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
            this.currentProjectMetadata.projectId,
            this.currentVersionId,
          )) as Entity[];
      } else {
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.metadataClient.getVersionEntities(
            this.currentProjectMetadata.projectId,
            this.currentVersionId,
          )) as Entity[];
      }

      // TODO: remove this when metadata server is enabled by default
      const project = new Project();
      project.projectId = this.currentProjectMetadata.projectId;
      this.editorStore.sdlcState.setCurrentProject(project);
      yield flowResult(
        this.editorStore.graphState.buildGraphForViewerMode(entities),
      );

      this.loadVersionsState.pass();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.loadVersionsState.fail();
    }
  }

  // const customRuntime = new EngineRuntime();
  // customRuntime.addMapping(
  //   PackageableElementExplicitReference.create(mapping),
  // );
  // await queryBuilderState.querySetupState.setup(
  //   testState.queryState.query,
  //   mapping,
  //   customRuntime,
  //   (lambda: RawLambda): Promise<void> =>
  //     testState.queryState
  //       .updateLamba(lambda)
  //       .then(() =>
  //         editorStore.applicationStore.notifySuccess(
  //           `Mapping test query is updated`,
  //         ),
  //       )
  //       .catch(applicationStore.alertIllegalUnhandledError),
  //   testState.queryState.query.isStub,
  // );
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
