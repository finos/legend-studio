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
  EditorExtensionState,
  queryClass,
  type EditorStore,
} from '@finos/legend-application-studio';
import type { ClassView } from '@finos/legend-extension-dsl-diagram/graph';
import {
  type GeneratorFn,
  guaranteeNonNullable,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { DataSpace } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import type { DataSpaceAnalysisResult } from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { DataSpaceViewerState } from '../DataSpaceViewerState.js';
import { InMemoryGraphData } from '@finos/legend-graph';

export class DataSpacePreviewState extends EditorExtensionState {
  readonly editorStore: EditorStore;

  readonly loadDataSpaceState = ActionState.create();

  dataSpace?: DataSpace | undefined;
  dataSpaceViewerState?: DataSpaceViewerState | undefined;

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      dataSpace: observable,
      dataSpaceViewerState: observable,
      setDataSpace: action,
      previewDataSpace: flow,
    });

    this.editorStore = editorStore;
  }

  static retrieveState(editorStore: EditorStore): DataSpacePreviewState {
    return guaranteeNonNullable(
      editorStore.editorExtensionStates.find(
        (extensionState): extensionState is DataSpacePreviewState =>
          extensionState instanceof DataSpacePreviewState,
      ),
      `Can't find data space preview state: make sure it is added as an editor extension state`,
    );
  }

  setDataSpace(val: DataSpace | undefined): void {
    this.dataSpace = val;
    if (val === undefined) {
      this.dataSpaceViewerState = undefined;
    }
  }

  *previewDataSpace(dataSpace: DataSpace): GeneratorFn<void> {
    this.setDataSpace(dataSpace);
    this.loadDataSpaceState.inProgress();
    this.loadDataSpaceState.setMessage(`Initializing...`);

    try {
      const groupId =
        this.editorStore.projectConfigurationEditorState
          .currentProjectConfiguration.groupId;
      const artifactId =
        this.editorStore.projectConfigurationEditorState
          .currentProjectConfiguration.artifactId;
      const versionId = 'LOCAL';

      // analyze data space
      const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpace.path,
        async () =>
          this.editorStore.graphManagerState.graph.allOwnElements
            .map((element) =>
              this.editorStore.graphManagerState.graphManager.elementToEntity(
                element,
              ),
            )
            .concat(
              this.editorStore.graphManagerState.graph.dependencyManager.allOwnElements.map(
                (element) =>
                  this.editorStore.graphManagerState.graphManager.elementToEntity(
                    element,
                  ),
              ),
            ),
        undefined,
        this.loadDataSpaceState,
      )) as DataSpaceAnalysisResult;

      this.dataSpaceViewerState = new DataSpaceViewerState(
        this.editorStore.applicationStore,
        this.editorStore.graphManagerState,
        groupId,
        artifactId,
        versionId,
        analysisResult,
        {
          retriveGraphData: () =>
            new InMemoryGraphData(this.editorStore.graphManagerState.graph),
          viewProject: () => {
            this.editorStore.applicationStore.notificationService.notifyWarning(
              'This feature is not supported in preview mode',
            );
          },
          viewSDLCProject: async () => {
            this.editorStore.applicationStore.notificationService.notifyWarning(
              'This feature is not supported in preview mode',
            );
          },
          onDiagramClassDoubleClick: (classView: ClassView): void => {
            queryClass(classView.class.value, this.editorStore).catch(
              this.editorStore.applicationStore.alertUnhandledError,
            );
          },
        },
      );
      this.loadDataSpaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpaceState.fail();
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.loadDataSpaceState.setMessage(undefined);
    }
  }
}
