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
  flow,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import type { GeneratorFn, PlainObject } from '@finos/legend-studio-shared';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import type {
  Mapping,
  PackageableElementSelectOption,
  PackageableRuntime,
  Service,
} from '@finos/legend-studio';
import {
  PureSingleExecution,
  PureMultiExecution,
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
}

export class ExistingQuerySetupState extends QuerySetupState {}

export class CreateQuerySetupState extends QuerySetupState {
  projectMetadatas: ProjectMetadata[] = [];
  loadProjectMetadataState = ActionState.create();
  loadVersionsState = ActionState.create();
  currentProjectMetadata?: ProjectMetadata;
  currentVersionId?: string;
  currentMapping?: Mapping;
  currentRuntime?: PackageableRuntime;

  constructor(queryStore: QueryStore) {
    super(queryStore);

    makeObservable(this, {
      projectMetadatas: observable,
      currentProjectMetadata: observable,
      currentVersionId: observable,
      currentMapping: observable,
      currentRuntime: observable,
      runtimeOptions: computed,
      setCurrentProjectMetadata: action,
      setCurrentVersionId: action,
      setCurrentMapping: action,
      setCurrentRuntime: action,
      loadProjects: flow,
      loadProjectVersions: flow,
    });

    this.queryStore = queryStore;
  }

  setCurrentProjectMetadata(val: ProjectMetadata | undefined): void {
    this.currentProjectMetadata = val;
  }

  setCurrentVersionId(val: string | undefined): void {
    this.currentVersionId = val;
  }

  setCurrentMapping(val: Mapping | undefined): void {
    this.currentMapping = val;
  }

  setCurrentRuntime(val: PackageableRuntime | undefined): void {
    this.currentRuntime = val;
  }

  get runtimeOptions(): PackageableElementSelectOption<PackageableRuntime>[] {
    return this.currentMapping
      ? this.queryStore.editorStore.runtimeOptions.filter((option) =>
          option.value.runtimeValue.mappings
            .map((mappingReference) => mappingReference.value)
            .includes(guaranteeNonNullable(this.currentMapping)),
        )
      : [];
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

      // TODO: auto-select first version
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.loadProjectMetadataState.fail();
      this.queryStore.editorStore.applicationStore.notifyError(error);
    }
  }

  *loadProjectVersions(): GeneratorFn<void> {
    if (!this.currentProjectMetadata) {
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
            this.currentProjectMetadata.projectId,
          )) as PlainObject<Version>[]
        ).map((project) => Version.serialization.fromJson(project).id.id);
        this.currentProjectMetadata.setVersions(versionIds);
      }
      this.loadVersionsState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.loadVersionsState.fail();
      this.queryStore.editorStore.applicationStore.notifyError(error);
    }
  }
}

export interface ServiceExecutionOption {
  label: string;
  value: { service: Service; key?: string };
}

export class ServiceQuerySetupState extends QuerySetupState {
  projectMetadatas: ProjectMetadata[] = [];
  loadProjectMetadataState = ActionState.create();
  loadVersionsState = ActionState.create();
  currentProjectMetadata?: ProjectMetadata;
  currentVersionId?: string;
  currentService?: Service;
  currentServiceExecutionKey?: string;

  constructor(queryStore: QueryStore) {
    super(queryStore);

    makeObservable(this, {
      projectMetadatas: observable,
      currentProjectMetadata: observable,
      currentVersionId: observable,
      currentService: observable,
      currentServiceExecutionKey: observable,
      setCurrentProjectMetadata: action,
      setCurrentVersionId: action,
      setCurrentServiceExecution: action,
      loadProjects: flow,
      loadProjectVersions: flow,
    });

    this.queryStore = queryStore;
  }

  setCurrentProjectMetadata(val: ProjectMetadata | undefined): void {
    this.currentProjectMetadata = val;
  }

  setCurrentVersionId(val: string | undefined): void {
    this.currentVersionId = val;
  }

  setCurrentServiceExecution(
    service: Service | undefined,
    key: string | undefined,
  ): void {
    this.currentService = service;
    this.currentServiceExecutionKey = key;
  }

  get serviceExecutionOptions(): ServiceExecutionOption[] {
    return this.queryStore.editorStore.serviceOptions.flatMap((option) => {
      const service = option.value;
      const serviceExecution = service.execution;
      if (serviceExecution instanceof PureSingleExecution) {
        return {
          label: service.name,
          value: {
            service,
          },
        };
      } else if (serviceExecution instanceof PureMultiExecution) {
        return serviceExecution.executionParameters.map((parameter) => ({
          label: `${service.name} [${parameter.key}]`,
          value: {
            service,
            key: parameter.key,
          },
        }));
      }
      return [];
    });
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

      // TODO: auto-select first version
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.loadProjectMetadataState.fail();
      this.queryStore.editorStore.applicationStore.notifyError(error);
    }
  }

  *loadProjectVersions(): GeneratorFn<void> {
    if (!this.currentProjectMetadata) {
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
            this.currentProjectMetadata.projectId,
          )) as PlainObject<Version>[]
        ).map((project) => Version.serialization.fromJson(project).id.id);
        this.currentProjectMetadata.setVersions(versionIds);
      }
      this.loadVersionsState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.loadVersionsState.fail();
      this.queryStore.editorStore.applicationStore.notifyError(error);
    }
  }
}

export class QuerySetupStore {
  queryStore: QueryStore;
  querySetupState?: QuerySetupState;

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
    this.queryStore.setQueryInfoState(undefined);
    this.queryStore.editorStore.graphState.resetGraph();
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
