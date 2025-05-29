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

import { flow, flowResult, makeObservable } from 'mobx';
import type { EditorStore } from '../editor/EditorStore.js';
import { EDITOR_MODE } from '../editor/EditorConfig.js';
import type { WorkspaceType } from '@finos/legend-server-sdlc';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import { generateEditorRoute } from '../../__lib__/LegendStudioNavigation.js';
import { GraphEditGrammarModeState } from '../editor/GraphEditGrammarModeState.js';

export class LazyTextEditorStore {
  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    makeObservable(this, {
      init: flow,
    });
  }

  *init(
    projectId: string,
    patchReleaseVersionId: string | undefined,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): GeneratorFn<void> {
    this.editorStore.setMode(EDITOR_MODE.LAZY_TEXT_EDITOR);
    yield flowResult(
      this.editorStore.initialize(
        projectId,
        patchReleaseVersionId,
        workspaceId,
        workspaceType,
        undefined,
      ),
    );
  }
}

export class GraphEditLazyGrammarModeState extends GraphEditGrammarModeState {
  override get disableLeaveMode(): boolean {
    return true;
  }

  override get headerLabel(): string {
    return 'Strict Text Mode (BETA)';
  }

  override *onLeave(): GeneratorFn<void> {
    this.editorStore.applicationStore.alertService.setBlockingAlert(undefined);
    this.editorStore.applicationStore.alertService.setActionAlertInfo({
      message: `Form Mode Not Supported in Text Studio`,
      prompt: `Text Studio only provides a light weight editor for editing studio projects to improve performance. If you want to do more actions, please open full edit mode`,
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Open Studio Full Edit Mode',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          default: true,
          handler: () => {
            this.editorStore.applicationStore.navigationService.navigator.visitAddress(
              this.editorStore.applicationStore.navigationService.navigator.generateAddress(
                generateEditorRoute(
                  this.editorStore.sdlcState.activeProject.projectId,
                  this.editorStore.sdlcState.activePatch?.patchReleaseVersionId
                    .id,
                  this.editorStore.sdlcState.activeWorkspace.workspaceId,
                  this.editorStore.sdlcState.activeWorkspace.workspaceType,
                ),
              ),
            );
          },
        },
        {
          label: 'Cancel',
          type: ActionAlertActionType.PROCEED,
          default: true,
        },
      ],
    });
  }
}
