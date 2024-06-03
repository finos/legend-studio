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
  type Query,
  extractElementNameFromPath,
  RuntimePointer,
  PackageableElementExplicitReference,
  type Runtime,
  type Class,
  type RawLambda,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
  LATEST_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  LogEvent,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
  uuid,
  type GeneratorFn,
} from '@finos/legend-shared';
import { QueryBuilderDataBrowserWorkflow } from '@finos/legend-query-builder';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import {
  type DataSpaceExecutionContext,
  DSL_DataSpace_getGraphManagerExtension,
  getDataSpace,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  QueryBuilderActionConfig_QueryApplication,
  QueryEditorStore,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
  type QueryPersistConfiguration,
} from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import {
  DataSpaceProjectInfo,
  DataSpaceQueryBuilderState,
  createQueryClassTaggedValue,
  type DataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/application';
import { generateDataSpaceQueryCreatorRoute } from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import {
  createVisitedDataSpaceId,
  hasDataSpaceInfoBeenVisited,
  createSimpleVisitedDataspace,
} from '../../__lib__/LegendQueryUserDataSpaceHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../../__lib__/LegendQueryEvent.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';

export class DataSpaceQueryCreatorStore extends QueryEditorStore {
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpacePath: string;
  executionContext: string;
  runtimePath: string | undefined;
  classPath: string | undefined;
  dataSpaceCache: DataSpaceInfo[] | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    executionContext: string,
    runtimePath: string | undefined,
    executionKey: string | undefined,
  ) {
    super(applicationStore, depotServerClient);

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.dataSpacePath = dataSpacePath;
    this.executionContext = executionContext;
    this.runtimePath = runtimePath;
    this.classPath = executionKey;
    makeObservable(this, {
      changeDataSpace: flow,
      dataSpaceCache: observable,
      setDataSpaceCache: action,
    });
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  setDataSpaceCache(val: DataSpaceInfo[]): void {
    this.dataSpaceCache = val;
  }

  reConfigureWithDataSpaceInfo(info: DataSpaceInfo): boolean {
    if (
      info.groupId &&
      info.artifactId &&
      info.versionId &&
      info.defaultExecutionContext
    ) {
      this.groupId = info.groupId;
      this.artifactId = info.artifactId;
      this.versionId = LATEST_VERSION_ALIAS;
      this.dataSpacePath = info.path;
      this.executionContext = info.defaultExecutionContext;
      return true;
    }
    return false;
  }

  async initializeQueryBuilderState(): Promise<DataSpaceQueryBuilderState> {
    const dataSpace = getDataSpace(
      this.dataSpacePath,
      this.graphManagerState.graph,
    );
    const executionContext = guaranteeNonNullable(
      dataSpace.executionContexts.find(
        (context) => context.name === this.executionContext,
      ),
      `Can't find execution context '${this.executionContext}'`,
    );
    let dataSpaceAnalysisResult;
    try {
      const project = StoreProjectData.serialization.fromJson(
        await this.depotServerClient.getProject(this.groupId, this.artifactId),
      );
      dataSpaceAnalysisResult = await DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).retrieveDataSpaceAnalysisFromCache(() =>
        retrieveAnalyticsResultCache(
          project,
          this.versionId,
          dataSpace.path,
          this.depotServerClient,
        ),
      );
    } catch {
      // do nothing
    }
    const projectInfo = new DataSpaceProjectInfo(
      this.groupId,
      this.artifactId,
      this.versionId,
      createViewProjectHandler(this.applicationStore),
      createViewSDLCProjectHandler(
        this.applicationStore,
        this.depotServerClient,
      ),
    );
    const sourceInfo = {
      groupId: projectInfo.groupId,
      artifactId: projectInfo.artifactId,
      versionId: projectInfo.versionId,
      dataSpace: dataSpace.path,
    };
    const visitedDataSpaces =
      LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
        this.applicationStore.userDataService,
      );
    const queryBuilderState = new DataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      dataSpace,
      executionContext,
      (dataSpaceInfo: DataSpaceInfo) => {
        if (dataSpaceInfo.defaultExecutionContext) {
          flowResult(this.changeDataSpace(dataSpaceInfo));
        } else {
          this.applicationStore.notificationService.notifyWarning(
            `Can't switch data space: default execution context not specified`,
          );
        }
      },
      true,
      dataSpaceAnalysisResult,
      (ec: DataSpaceExecutionContext) => {
        // runtime should already be set
        const runtimePointer = guaranteeType(
          queryBuilderState.executionContextState.runtimeValue,
          RuntimePointer,
        );
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateDataSpaceQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            dataSpace.path,
            ec.name,
            runtimePointer.packageableRuntime.value ===
              queryBuilderState.executionContext.defaultRuntime.value
              ? undefined
              : runtimePointer.packageableRuntime.value.path,
            queryBuilderState.class?.path,
          ),
        );
        returnUndefOnError(() =>
          LegendQueryUserDataHelper.updateVisitedDataSpaceExecContext(
            this.applicationStore.userDataService,
            this.groupId,
            this.artifactId,
            dataSpace.path,
            ec.name,
          ),
        );
      },
      (runtimeValue: Runtime) => {
        const runtimePointer = guaranteeType(runtimeValue, RuntimePointer);
        queryBuilderState.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateDataSpaceQueryCreatorRoute(
            guaranteeNonNullable(queryBuilderState.projectInfo).groupId,
            guaranteeNonNullable(queryBuilderState.projectInfo).artifactId,
            guaranteeNonNullable(queryBuilderState.projectInfo).versionId,
            queryBuilderState.dataSpace.path,
            queryBuilderState.executionContext.name,
            runtimePointer.packageableRuntime.value ===
              queryBuilderState.executionContext.defaultRuntime.value
              ? undefined
              : runtimePointer.packageableRuntime.value.path,
            queryBuilderState.class?.path,
          ),
        );
      },
      (_class: Class) => {
        // runtime should already be set
        const runtimePointer = guaranteeType(
          queryBuilderState.executionContextState.runtimeValue,
          RuntimePointer,
        );
        queryBuilderState.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateDataSpaceQueryCreatorRoute(
            guaranteeNonNullable(queryBuilderState.projectInfo).groupId,
            guaranteeNonNullable(queryBuilderState.projectInfo).artifactId,
            guaranteeNonNullable(queryBuilderState.projectInfo).versionId,
            queryBuilderState.dataSpace.path,
            queryBuilderState.executionContext.name,
            runtimePointer.packageableRuntime.value ===
              queryBuilderState.executionContext.defaultRuntime.value
              ? undefined
              : runtimePointer.packageableRuntime.value.path,
            _class.path,
          ),
        );
      },
      projectInfo,
      this.applicationStore.config.options.queryBuilderConfig,
      sourceInfo,
      (dataSpaceInfo: DataSpaceInfo) =>
        hasDataSpaceInfoBeenVisited(dataSpaceInfo, visitedDataSpaces),
    );
    if (this.dataSpaceCache?.length) {
      queryBuilderState.configureDataSpaceOptions(this.dataSpaceCache);
    }
    queryBuilderState.setExecutionContext(executionContext);
    queryBuilderState.propagateExecutionContextChange(executionContext);

    // set runtime if already chosen
    if (this.runtimePath) {
      queryBuilderState.changeRuntime(
        new RuntimePointer(
          PackageableElementExplicitReference.create(
            this.graphManagerState.graph.getRuntime(this.runtimePath),
          ),
        ),
      );
    }

    // set class if already chosen
    if (this.classPath) {
      queryBuilderState.changeClass(
        this.graphManagerState.graph.getClass(this.classPath),
      );
    }

    // add to visited dataspaces
    this.addVisitedDataSpace(executionContext.name);
    return queryBuilderState;
  }

  *changeDataSpace(val: DataSpaceInfo): GeneratorFn<void> {
    try {
      assertTrue(
        this.reConfigureWithDataSpaceInfo(val),
        'Dataspace selected does not contain valid inputs, groupId, artifactId, and version',
      );

      this.initState.inProgress();
      this.applicationStore.navigationService.navigator.updateCurrentLocation(
        generateDataSpaceQueryCreatorRoute(
          guaranteeNonNullable(val.groupId),
          guaranteeNonNullable(val.artifactId),
          LATEST_VERSION_ALIAS, //always default to latest
          val.path,
          guaranteeNonNullable(val.defaultExecutionContext),
          undefined,
          undefined,
        ),
      );
      if (
        this.queryBuilderState instanceof DataSpaceQueryBuilderState &&
        this.queryBuilderState.dataSpaces?.length
      ) {
        this.setDataSpaceCache(this.queryBuilderState.dataSpaces);
      }
      this.graphManagerState.resetGraph();
      yield flowResult(this.buildGraph());
      this.queryBuilderState =
        (yield this.initializeQueryBuilderState()) as DataSpaceQueryBuilderState;
      this.queryLoaderState.initialize(this.queryBuilderState);
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notify(
        `Unable to change dataspace: ${error.message}`,
      );
      this.onInitializeFailure();
      this.initState.fail();
    }
  }

  addVisitedDataSpace(execName: string | undefined): void {
    try {
      LegendQueryUserDataHelper.addVisitedDatspace(
        this.applicationStore.userDataService,
        createSimpleVisitedDataspace(
          this.groupId,
          this.artifactId,
          this.versionId,
          this.dataSpacePath,
          execName,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.LOCAL_STORAGE_PERSIST_ERROR),
        error.message,
      );
    }
  }

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration {
    return {
      defaultName: options?.update
        ? `${extractElementNameFromPath(this.dataSpacePath)}`
        : `New Query for ${extractElementNameFromPath(this.dataSpacePath)}[${
            this.executionContext
          }]`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
        if (this.queryBuilderState?.class) {
          query.taggedValues = [
            createQueryClassTaggedValue(this.queryBuilderState.class.path),
          ];
        }
      },
    };
  }

  override onInitializeFailure(): void {
    LegendQueryUserDataHelper.removeRecentlyViewedDataSpace(
      this.applicationStore.userDataService,
      createVisitedDataSpaceId(
        this.groupId,
        this.artifactId,
        this.dataSpacePath,
      ),
    );
  }
}
