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
  ActionAlertActionType,
  ActionAlertType,
  TabManagerState,
  TabState,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import type { EditorStore } from './EditorStore.js';
import { FileEditorState } from './FileEditorState.js';

export abstract class EditorTabState extends TabState {
  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    super();
    this.editorStore = editorStore;
  }
}

export class EditorTabManagerState extends TabManagerState {
  readonly editorStore: EditorStore;

  declare currentTab?: EditorTabState | undefined;
  declare tabs: EditorTabState[];

  constructor(editorStore: EditorStore) {
    super();

    this.editorStore = editorStore;
  }

  get dndType(): string {
    return 'editor.tab-manager.tab';
  }

  override closeTab(tab: TabState): void {
    if (tab instanceof FileEditorState && tab.hasChanged) {
      this.editorStore.applicationStore.setActionAlertInfo({
        message:
          'Unsaved changes will be lost if you continue. Do you still want to proceed?',
        prompt: 'To save changes, abort and compile',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Proceed',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => super.closeTab(tab),
          },
          {
            label: 'Save changes',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              flowResult(this.editorStore.executeGo())
                .then(() => {
                  super.closeTab(tab);
                })
                .catch(this.editorStore.applicationStore.alertUnhandledError);
            },
          },
          {
            label: 'Abort',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      super.closeTab(tab);
    }
  }
}
