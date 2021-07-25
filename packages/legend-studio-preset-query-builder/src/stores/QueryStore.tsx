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
import type { Entity, ProjectMetadata } from '@finos/legend-studio';
import {
  SDLCServerClient,
  TAB_SIZE,
  CORE_LOG_EVENT,
  Project,
  EditorStore,
  useApplicationStore,
} from '@finos/legend-studio';

export abstract class QueryInfoState {
  // something
}

export class CreateQueryInfoState extends QueryInfoState {
  // something
}

export class EditQueryInfoState extends QueryInfoState {
  // something
}

export class ServiceQueryInfoState extends QueryInfoState {
  // something
}

export class QueryStore {
  editorStore: EditorStore;
  queryInfoState?: QueryInfoState;

  useSDLC = true; // TODO: remove this when metadata server is enabled by default

  projectMetadatas: ProjectMetadata[] = [];
  loadProjectMetadataState = ActionState.create();
  currentProjectMetadata?: ProjectMetadata;

  // TODO: support `latest`
  currentVersionId?: string;
  loadVersionsState = ActionState.create();
  buildGraphState = ActionState.create();

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      setCurrentProjectMetadata: action,
      setCurrentVersionId: action,
      setQueryInfoState: action,
    });

    this.editorStore = editorStore;
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

  *buildGraph(): GeneratorFn<void> {
    if (!this.currentProjectMetadata || !this.currentVersionId) {
      this.editorStore.applicationStore.notifyIllegalState(
        `Can't build graph when project and version is not specified`,
      );
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

      yield this.editorStore.graphState.graphManager.setupEngine(
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
      );

      // build graph
      yield flowResult(this.editorStore.graphState.initializeSystem());
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
