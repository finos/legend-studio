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
  type DataSpaceAnalysisResult,
  DataSpaceViewerState,
  DSL_DataSpace_getGraphManagerExtension,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space';
import type { ClassView } from '@finos/legend-extension-dsl-diagram';
import {
  ProjectData,
  retrieveProjectEntitiesWithDependencies,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  makeObservable,
  flow,
  observable,
  action,
  flowResult,
  computed,
} from 'mobx';
import { EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl } from './LegendTaxonomyRouter.js';
import type {
  DataSpaceTaxonomyContext,
  TaxonomyExplorerStore,
  TaxonomyTreeNodeData,
} from './TaxonomyExplorerStore.js';
import {
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from './LegendTaxonomyDataSpaceViewerHelper.js';

interface TaxonomyNodeDataSpaceOption {
  label: string;
  value: DataSpaceTaxonomyContext;
}

export const buildTaxonomyNodeDataSpaceOption = (
  value: DataSpaceTaxonomyContext,
): TaxonomyNodeDataSpaceOption => ({
  label: value.path,
  value,
});

export class TaxonomyNodeViewerState {
  readonly explorerStore: TaxonomyExplorerStore;
  readonly taxonomyNode: TaxonomyTreeNodeData;
  readonly initDataSpaceViewerState = ActionState.create();

  dataSpaceViewerState?: DataSpaceViewerState | undefined;
  currentDataSpace?: DataSpaceTaxonomyContext | undefined;
  dataSpaceSearchText = '';

  constructor(
    explorerStore: TaxonomyExplorerStore,
    taxonomyNode: TaxonomyTreeNodeData,
  ) {
    makeObservable(this, {
      dataSpaceViewerState: observable,
      currentDataSpace: observable,
      dataSpaceSearchText: observable,
      dataSpaceOptions: computed,
      clearDataSpaceViewerState: action,
      setDataSpaceSearchText: action,
      initializeDataSpaceViewer: flow,
    });
    this.explorerStore = explorerStore;
    this.taxonomyNode = taxonomyNode;
  }

  get dataSpaceOptions(): TaxonomyNodeDataSpaceOption[] {
    return this.taxonomyNode.dataSpaceTaxonomyContexts
      .map(buildTaxonomyNodeDataSpaceOption)
      .filter(
        (option) =>
          !this.dataSpaceSearchText ||
          option.value.path
            .toLowerCase()
            .includes(this.dataSpaceSearchText.trim().toLowerCase()),
      );
  }

  setDataSpaceSearchText(val: string): void {
    this.dataSpaceSearchText = val;
  }

  clearDataSpaceViewerState(): void {
    this.dataSpaceViewerState = undefined;
    this.currentDataSpace = undefined;
  }

  *initializeDataSpaceViewer(
    dataSpaceTaxonomyContext: DataSpaceTaxonomyContext,
  ): GeneratorFn<void> {
    const { groupId, artifactId, versionId } = dataSpaceTaxonomyContext;
    this.initDataSpaceViewerState.inProgress();
    this.clearDataSpaceViewerState();

    try {
      this.currentDataSpace = dataSpaceTaxonomyContext;

      // fetch project
      this.initDataSpaceViewerState.setMessage(`Fetching project...`);
      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.explorerStore.depotServerClient.getProject(groupId, artifactId),
        )) as PlainObject<ProjectData>,
      );
      // analyze data space
      const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
        this.explorerStore.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpaceTaxonomyContext.path,
        () =>
          retrieveProjectEntitiesWithDependencies(
            project,
            versionId,
            this.explorerStore.depotServerClient,
          ),
        () =>
          retrieveAnalyticsResultCache(
            project,
            versionId,
            dataSpaceTaxonomyContext.path,
            this.explorerStore.depotServerClient,
          ),
        this.initDataSpaceViewerState,
      )) as DataSpaceAnalysisResult;
      const dataSpaceViewerState = new DataSpaceViewerState(
        this.explorerStore.applicationStore,
        this.explorerStore.graphManagerState,
        dataSpaceTaxonomyContext.groupId,
        dataSpaceTaxonomyContext.artifactId,
        dataSpaceTaxonomyContext.versionId,
        analysisResult,
        {
          viewProject: createViewProjectHandler(
            this.explorerStore.applicationStore,
          ),
          viewSDLCProject: createViewSDLCProjectHandler(
            this.explorerStore.applicationStore,
            this.explorerStore.depotServerClient,
          ),
          onDiagramClassDoubleClick: (classView: ClassView): void =>
            this.queryDataSpace(classView.class.value.path),
        },
      );
      this.dataSpaceViewerState = dataSpaceViewerState;
    } catch (error) {
      assertErrorThrown(error);
      this.explorerStore.applicationStore.notificationService.notifyError(
        error,
      );
      this.clearDataSpaceViewerState();
    } finally {
      this.initDataSpaceViewerState.complete();
      this.initDataSpaceViewerState.setMessage(undefined);
    }
  }

  queryDataSpace(classPath?: string | undefined): void {
    if (this.dataSpaceViewerState) {
      this.explorerStore.applicationStore.navigationService.navigator.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl(
          this.explorerStore.applicationStore.config.queryUrl,
          this.dataSpaceViewerState.groupId,
          this.dataSpaceViewerState.artifactId,
          this.dataSpaceViewerState.versionId,
          this.dataSpaceViewerState.dataSpaceAnalysisResult.path,
          this.dataSpaceViewerState.currentExecutionContext.name,
          this.dataSpaceViewerState.currentRuntime ===
            this.dataSpaceViewerState.currentExecutionContext.defaultRuntime
            ? undefined
            : this.dataSpaceViewerState.currentRuntime.path,
          classPath,
        ),
      );
    }
  }
}
