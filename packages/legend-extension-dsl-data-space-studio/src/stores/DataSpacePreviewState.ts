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
import {
  DataSpaceViewerState,
  EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  DSL_DataSpace_getGraphManagerExtension,
  type DataSpaceAnalysisResult,
  type DataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import { InMemoryGraphData, type Class } from '@finos/legend-graph';
import {
  type GeneratorFn,
  guaranteeNonNullable,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';

export class DataSpacePreviewState extends EditorExtensionState {
  private static readonly IDENTIFIER = 'data-space-preview';

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

  override get INTERNAL__identifierKey(): string {
    return DataSpacePreviewState.IDENTIFIER;
  }

  static retrieveNullableState(
    editorStore: EditorStore,
  ): DataSpacePreviewState | undefined {
    return editorStore.extensionStates.find((extensionState) => {
      if (
        /**
         * In development mode, when we make changes in certain areas like utils or base states, the following `instanceof`
         * check will fail as if there were multiple copies of the classes with the same name, this could be caused by either
         * React `fast-refresh` or `webpack HMR`; we didn't have time to really do a thorough debug here, as such,
         * we will just do a simple key check to match the right state to bypass the problem for development mode.
         */
        // eslint-disable-next-line no-process-env
        process.env.NODE_ENV === 'development'
      ) {
        return (
          extensionState.INTERNAL__identifierKey ===
          DataSpacePreviewState.IDENTIFIER
        );
      }
      return extensionState instanceof DataSpacePreviewState;
    }) as DataSpacePreviewState;
  }

  static retrieveState(editorStore: EditorStore): DataSpacePreviewState {
    return guaranteeNonNullable(
      DataSpacePreviewState.retrieveNullableState(editorStore),
      `Can't find data product preview state: make sure it is added as an editor extension state`,
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

      // analyze data product
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
          retrieveGraphData: () =>
            new InMemoryGraphData(this.editorStore.graphManagerState.graph),
          queryDataSpace: () => {
            this.editorStore.applicationStore.notificationService.notifyWarning(
              'This feature is not supported in preview mode',
            );
          },
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
          queryClass: (_class: Class): void => {
            queryClass(_class, this.editorStore).catch(
              this.editorStore.applicationStore.alertUnhandledError,
            );
          },
          openServiceQuery: (servicePath: string): void => {
            if (this.editorStore.applicationStore.config.queryApplicationUrl) {
              this.editorStore.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl(
                  this.editorStore.applicationStore.config.queryApplicationUrl,
                  groupId,
                  artifactId,
                  versionId,
                  servicePath,
                ),
              );
            } else {
              this.editorStore.applicationStore.notificationService.notifyWarning(
                'Query application URL is not configured',
              );
            }
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
