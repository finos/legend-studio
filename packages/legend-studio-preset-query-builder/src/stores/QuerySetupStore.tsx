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

export abstract class QuerySetupState {
  queryStore: QueryStore;
  constructor(queryStore: QueryStore) {
    this.queryStore = queryStore;
  }
  // something
}
export class EditQuerySetupState extends QuerySetupState {
  // something
}
export class CreateQuerySetupState extends QuerySetupState {
  // something
}
export class ServiceQuerySetupState extends QuerySetupState {
  // something
}

export class QuerySetupStore {
  queryStore: QueryStore;

  querySetupState?: QuerySetupState;
  projectMetadatas: ProjectMetadata[] = [];
  loadProjectMetadataState = new ActionState();
  loadVersionsState = new ActionState();
  buildGraphState = new ActionState();

  constructor(queryStore: QueryStore) {
    makeAutoObservable(this, {
      queryStore: false,
      setSetupState: action,
    });

    this.queryStore = queryStore;
  }

  setSetupState(val: QuerySetupState | undefined): void {
    this.querySetupState = val;
  }

  *init(): GeneratorFn<void> {
    // NOTE: load query
    yield flowResult(this.loadProjects());
  }

  *loadProjects(): GeneratorFn<void> {
    this.loadProjectMetadataState.inProgress();
    try {
      if (this.queryStore.useSDLC) {
        const projects = (
          (yield this.queryStore.editorStore.applicationStore.networkClientManager.sdlcClient.getProjects(
            ProjectType.PRODUCTION,
            undefined,
            undefined,
            undefined,
          )) as PlainObject<Project>[]
        ).map((project) => Project.serialization.fromJson(project));
        this.projectMetadatas = projects.map((project) => {
          const projectMetadata = new ProjectMetadata();
          projectMetadata.projectId = project.projectId;
          return projectMetadata;
        });
      } else {
        this.projectMetadatas = (
          (yield this.queryStore.editorStore.applicationStore.networkClientManager.metadataClient.getProjects()) as PlainObject<ProjectMetadata>[]
        ).map((project) => ProjectMetadata.serialization.fromJson(project));
      }
      this.loadProjectMetadataState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.loadProjectMetadataState.fail();
      this.queryStore.editorStore.applicationStore.notifyError(error);
    }
  }

  *loadProjectVersions(): GeneratorFn<void> {
    if (!this.queryStore.currentProjectMetadata) {
      this.queryStore.editorStore.applicationStore.notifyIllegalState(
        `Can't fetch versions when project is not specified`,
      );
      return;
    }
    this.loadVersionsState.inProgress();
    try {
      if (this.queryStore.useSDLC) {
        const versionIds = (
          (yield this.queryStore.editorStore.applicationStore.networkClientManager.sdlcClient.getVersions(
            this.queryStore.currentProjectMetadata.projectId,
          )) as PlainObject<Version>[]
        ).map((project) => Version.serialization.fromJson(project).id.id);
        this.queryStore.currentProjectMetadata.setVersions(versionIds);
      }
      this.loadVersionsState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.loadVersionsState.fail();
      this.queryStore.editorStore.applicationStore.notifyError(error);
    }
  }
}

const QuerySetupStoreContext = createContext<QuerySetupStore | undefined>(
  undefined,
);

export const QuerySetupStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const queryStore = useQueryStore();
  const store = useLocalObservable(() => new QuerySetupStore(queryStore));
  return (
    <QuerySetupStoreContext.Provider value={store}>
      {children}
    </QuerySetupStoreContext.Provider>
  );
};

export const useQuerySetupStore = (): QuerySetupStore =>
  guaranteeNonNullable(
    useContext(QuerySetupStoreContext),
    'useQuerySetupStore() hook must be used inside QueryBuilderStore context provider',
  );
