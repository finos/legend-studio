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
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import { StoreProjectData } from '@finos/legend-server-depot';
import type { LegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStore.js';
import { type LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import { action, flow, makeObservable, observable, runInAction } from 'mobx';
import {
  V1_LegendSDLC,
  type V1_PackageableRuntime,
  V1_PureModelContextPointer,
  V1_serializePureModelContext,
  type V1_Mapping,
  V1_Lambda,
} from '@finos/legend-graph';
import {
  _lambda,
  type DataCubeAlertService,
  RawAdhocQueryDataCubeSource,
} from '@finos/legend-data-cube';
import { AdHocCodeEditorState } from './AdHocCodeEditorState.js';

export class AdhocQueryDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  builderStore: LegendDataCubeBuilderStore;
  projects: StoreProjectData[] = [];
  currentProject?: StoreProjectData | undefined;
  currentProjectVersions?: string[] | undefined;
  currentVersionId?: string | undefined;
  runtimes?: V1_PackageableRuntime[] | undefined;
  currentRuntime?: V1_PackageableRuntime | undefined;
  mappings?: V1_Mapping[] | undefined;
  currentMapping?: V1_Mapping | undefined;
  modelPointer: PlainObject<V1_PureModelContextPointer> | undefined;

  codeEditorState: AdHocCodeEditorState;
  queryCompileState = ActionState.create();
  code = '';

  readonly loadProjectsState = ActionState.create();

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    alertService: DataCubeAlertService,
    builderStore: LegendDataCubeBuilderStore,
  ) {
    super(application, engine, alertService);
    this.builderStore = builderStore;

    makeObservable(this, {
      loadProjects: flow,
      projects: observable,
      currentProject: observable,
      currentProjectVersions: observable,
      currentVersionId: observable,
      currentRuntime: observable,
      currentMapping: observable,
      setCurrentProject: action,
      setCurrentProjectVersions: action,
      setCurrentVersionId: action,
      setCurrentRuntime: action,
      setCurrentMapping: action,
      setMappings: action,
      setRuntimes: action,
      codeEditorState: observable,
      // compileQueryCheck: flow,
    });

    this.modelPointer = this.buildPureModelContextPointer();
    this.codeEditorState = new AdHocCodeEditorState(
      application.alertUnhandledError,
      this.modelPointer,
      this.compileQueryCallback,
      this.queryLambda,
      engine,
    );
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

  setCurrentRuntime(val: V1_PackageableRuntime | undefined): void {
    this.currentRuntime = val;
  }

  setRuntimes(val: V1_PackageableRuntime[] | undefined): void {
    this.runtimes = val;
  }

  setCurrentMapping(val: V1_Mapping | undefined): void {
    runInAction(() => {
      this.currentMapping = val;
    });
  }

  setMappings(val: V1_Mapping[] | undefined): void {
    this.mappings = val;
  }

  setModelPointer(
    val: PlainObject<V1_PureModelContextPointer> | undefined,
  ): void {
    this.modelPointer = val;
    this.codeEditorState.setModel(val);
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
    return LegendDataCubeSourceBuilderType.ADHOC_QUERY;
  }

  override get isValid(): boolean {
    return Boolean(
      this.currentProject &&
        this.currentVersionId &&
        this.currentRuntime &&
        !this.codeEditorState.hasErrors &&
        this.codeEditorState.code,
    );
  }

  async queryLambdaHelper(): Promise<V1_Lambda> {
    const query = await this._engine.parseValueSpecification(
      this.codeEditorState.code,
      false,
    );
    const lambda = query instanceof V1_Lambda ? query : _lambda([], [query]);
    return lambda;
  }

  queryLambda = (): V1_Lambda => {
    this.queryLambdaHelper()
      .then((lambda) => {
        return lambda;
      })
      .catch((error) => {
        assertErrorThrown(error);
      });
    return _lambda([], []);
  };

  compileQueryCallback = () => {
    return this.compileQueryHelper();
  };

  async compileQueryHelper() {
    const query = await this.queryLambdaHelper();
    const lambda = this.builderStore.engine.serializeValueSpecification(query);
    return Boolean(
      (
        await this.builderStore.engine._getLambdaRelationType(
          lambda,
          guaranteeNonNullable(this.modelPointer),
        )
      ).columns,
    );
  }

  buildPureModelContextPointer():
    | PlainObject<V1_PureModelContextPointer>
    | undefined {
    if (this.currentProject && this.currentVersionId) {
      const sdlc = new V1_LegendSDLC(
        this.currentProject.groupId,
        this.currentProject.artifactId,
        this.currentVersionId,
      );
      return V1_serializePureModelContext(
        new V1_PureModelContextPointer(undefined, sdlc),
      );
    } else {
      return undefined;
    }
  }

  override async generateSourceData(): Promise<PlainObject> {
    if (!this.isValid) {
      throw new IllegalStateError(
        `Can't generate source data: project, version, runtime, or query are not set`,
      );
    }

    const source = new RawAdhocQueryDataCubeSource();
    if (this.currentMapping) {
      source.mapping = this.currentMapping.path;
    }
    if (this.currentRuntime && this.codeEditorState.code) {
      source.runtime = this.currentRuntime.path;
      source.query = this.codeEditorState.code;
      const modelContextPointer = this.buildPureModelContextPointer();
      if (modelContextPointer) {
        source.model = modelContextPointer;
      } else {
        throw new IllegalStateError(
          `Can't generate source data: Pure Model Context Pointer could not be made. Ensure project and version are set properly`,
        );
      }
    }
    return RawAdhocQueryDataCubeSource.serialization.toJson(source);
  }
}
