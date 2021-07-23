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
import { flowResult, makeAutoObservable } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import type { GeneratorFn, PlainObject } from '@finos/legend-studio-shared';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import {
  ProjectMetadata,
  Project,
  ProjectType,
  Version,
} from '@finos/legend-studio';
import type { QueryStore } from './QueryStore';
import { useQueryStore } from './QueryStore';

export class QueryEditorStore {
  queryStore: QueryStore;

  loadProjectMetadataState = new ActionState();
  loadVersionsState = new ActionState();
  buildGraphState = new ActionState();

  constructor(queryStore: QueryStore) {
    makeAutoObservable(this, {
      queryStore: false,
    });

    this.queryStore = queryStore;
  }

  // *init(): GeneratorFn<void> {
  //   yield flowResult(this.loadProjects());
  // }

  // *loadProjects(): GeneratorFn<void> {
  //   this.loadProjectMetadataState.inProgress();
  //   try {
  //     if (this.useSDLC) {
  //       const projects = (
  //         (yield this.queryStore.editorStore.applicationStore.networkClientManager.sdlcClient.getProjects(
  //           ProjectType.PRODUCTION,
  //           undefined,
  //           undefined,
  //           undefined,
  //         )) as PlainObject<Project>[]
  //       ).map((project) => Project.serialization.fromJson(project));
  //       this.projectMetadatas = projects.map((project) => {
  //         const projectMetadata = new ProjectMetadata();
  //         projectMetadata.projectId = project.projectId;
  //         return projectMetadata;
  //       });
  //     } else {
  //       this.projectMetadatas = (
  //         (yield this.queryStore.editorStore.applicationStore.networkClientManager.metadataClient.getProjects()) as PlainObject<ProjectMetadata>[]
  //       ).map((project) => ProjectMetadata.serialization.fromJson(project));
  //     }
  //     this.loadProjectMetadataState.pass();
  //   } catch (error: unknown) {
  //     assertErrorThrown(error);
  //     this.loadProjectMetadataState.fail();
  //     this.queryStore.editorStore.applicationStore.notifyError(error);
  //   }
  // }

  // *loadProjectVersions(): GeneratorFn<void> {
  //   if (!this.queryStore.currentProjectMetadata) {
  //     this.queryStore.editorStore.applicationStore.notifyIllegalState(
  //       `Can't fetch versions when project is not specified`,
  //     );
  //     return;
  //   }
  //   this.loadVersionsState.inProgress();
  //   try {
  //     if (this.useSDLC) {
  //       const versionIds = (
  //         (yield this.queryStore.editorStore.applicationStore.networkClientManager.sdlcClient.getVersions(
  //           this.queryStore.currentProjectMetadata.projectId,
  //         )) as PlainObject<Version>[]
  //       ).map((project) => Version.serialization.fromJson(project).id.id);
  //       this.queryStore.currentProjectMetadata.setVersions(versionIds);
  //     }
  //     this.loadVersionsState.pass();
  //   } catch (error: unknown) {
  //     assertErrorThrown(error);
  //     this.loadVersionsState.fail();
  //     this.queryStore.editorStore.applicationStore.notifyError(error);
  //   }
  // }
}

const QueryEditorStoreContext = createContext<QueryEditorStore | undefined>(
  undefined,
);

export const QueryEditorStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const queryStore = useQueryStore();
  const store = useLocalObservable(() => new QueryEditorStore(queryStore));
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const useQueryEditorStore = (): QueryEditorStore =>
  guaranteeNonNullable(
    useContext(QueryEditorStoreContext),
    'useQueryEditorStore() hook must be used inside QueryBuilderStore context provider',
  );
