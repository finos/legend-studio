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
  ActionState,
  IllegalStateError,
  assertErrorThrown,
  type PlainObject,
} from '@finos/legend-shared';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import { StoreProjectData } from '@finos/legend-server-depot';
import type { LegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import { action, flow, makeObservable, observable, runInAction } from 'mobx';
import {
  V1_LegendSDLC,
  type V1_PackageableRuntime,
  V1_PureModelContextPointer,
  V1_serializePureModelContext,
  type V1_ConcreteFunctionDefinition,
} from '@finos/legend-graph';
import {
  type DataCubeConfiguration,
  RawUserDefinedFunctionDataCubeSource,
} from '@finos/legend-data-cube';

export class UserDefinedFunctionDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  projects: StoreProjectData[] = [];
  currentProject?: StoreProjectData | undefined;
  currentProjectVersions?: string[] | undefined;
  currentVersionId?: string | undefined;
  builderStore: LegendDataCubeBuilderStore;
  functions: V1_ConcreteFunctionDefinition[] | undefined;
  currentFunction?: V1_ConcreteFunctionDefinition | undefined;
  currentRuntime?: V1_PackageableRuntime | undefined;
  runtimes?: V1_PackageableRuntime[] | undefined;

  readonly loadProjectsState = ActionState.create();

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    builderStore: LegendDataCubeBuilderStore,
  ) {
    super(application, engine);
    this.builderStore = builderStore;

    makeObservable(this, {
      loadProjects: flow,
      currentFunction: observable,
      projects: observable,
      currentProject: observable,
      currentProjectVersions: observable,
      currentVersionId: observable,
      currentRuntime: observable,
      setCurrentProject: action,
      setCurrentProjectVersions: action,
      setCurrentVersionId: action,
      setCurrentRuntime: action,
    });
  }

  setCurrentProject(val: StoreProjectData | undefined): void {
    this.currentProject = val;
  }

  setCurrentProjectVersions(val: string[] | undefined): void {
    this.currentProjectVersions = val;
  }

  setCurrentVersionId(val: string | undefined): void {
    this.currentVersionId = val;
  }

  getProjects(): StoreProjectData[] {
    return this.projects;
  }

  setFunctions(val: V1_ConcreteFunctionDefinition[] | undefined): void {
    this.functions = val;
  }

  setCurrentFunction(val: V1_ConcreteFunctionDefinition | undefined): void {
    runInAction(() => {
      this.currentFunction = val;
    });
  }

  setCurrentRuntime(val: V1_PackageableRuntime | undefined): void {
    this.currentRuntime = val;
  }

  setRuntimes(val: V1_PackageableRuntime[] | undefined): void {
    this.runtimes = val;
  }

  *loadProjects() {
    this.loadProjectsState.inProgress();
    try {
      this.projects = (
        (yield this.builderStore.depotServerClient.getProjects()) as PlainObject<StoreProjectData>[]
      ).map((v) => StoreProjectData.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.builderStore.application.notificationService.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.USER_DEFINED_FUNCTION;
  }

  override get isValid(): boolean {
    return Boolean(
      this.currentFunction &&
        this.currentRuntime &&
        this.currentProject &&
        this.currentVersionId,
    );
  }

  override async generateSourceData(): Promise<PlainObject> {
    if (!this.isValid) {
      throw new IllegalStateError(
        `Can't generate source data: project, version, function, or runtime are not set`,
      );
    }

    const source = new RawUserDefinedFunctionDataCubeSource();
    if (
      this.currentProject &&
      this.currentVersionId &&
      this.currentRuntime &&
      this.currentFunction
    ) {
      source.functionPath = this.currentFunction.path;
      source.runtime = this.currentRuntime.path;
      const sdlc = new V1_LegendSDLC(
        this.currentProject.groupId,
        this.currentProject.artifactId,
        this.currentVersionId,
      );
      const modelContextPointer = new V1_PureModelContextPointer(
        undefined,
        sdlc,
      );
      source.model = V1_serializePureModelContext(modelContextPointer);
    }
    return RawUserDefinedFunctionDataCubeSource.serialization.toJson(source);
  }

  override finalizeConfiguration(configuration: DataCubeConfiguration) {
    if (this.currentFunction) {
      configuration.name = this.currentFunction.name;
    }
  }
}
