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

import { TabManagerState } from '@finos/legend-art';
import {
  assertNonNullable,
  assertTrue,
  type Clazz,
  guaranteeType,
  swapEntry,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { EditorState } from './editor-state/EditorState.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { EntityChangeConflictEditorState } from './editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import { EntityDiffViewState } from './editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { FileGenerationViewerState } from './editor-state/FileGenerationViewerState.js';
import type { EditorStore } from './EditorStore.js';

export class EditorTabManagerState extends TabManagerState {
  currentTabState?: EditorState | undefined;
  openedTabStates: EditorState[] = [];
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    super();
    makeObservable(this, {
      currentTabState: observable,
      openedTabStates: observable,

      setCurrentEditorState: action,
      closeState: action,
      closeAllOtherStates: action,
      openState: action,
      closeAllStates: action,

      closeAllEditorTabs: action,
      swapStates: action,
    });

    this.editorStore = editorStore;
  }

  openEditorState(editorState: EditorState): void {
    if (this.currentTabState) {
      const currIndex = this.openedTabStates.findIndex(
        (e) => e === this.currentTabState,
      );
      this.openedTabStates.splice(currIndex + 1, 0, editorState);
    } else {
      this.openedTabStates.push(editorState);
    }
  }

  override swapStates = (
    sourceEditorState: EditorState,
    targetEditorState: EditorState,
  ): void => {
    swapEntry(this.openedTabStates, sourceEditorState, targetEditorState);
  };

  setCurrentEditorState(val: EditorState | undefined): void {
    this.currentTabState = val;
  }

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.currentTabState,
      clazz,
      `Current editor state is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }

  override closeState(editorState: EditorState): void {
    const elementIndex = this.openedTabStates.findIndex(
      (e) => e === editorState,
    );
    assertTrue(elementIndex !== -1, `Can't close a tab which is not opened`);
    this.openedTabStates.splice(elementIndex, 1);
    if (this.currentTabState === editorState) {
      if (this.openedTabStates.length) {
        const openIndex = elementIndex - 1;

        this.setCurrentEditorState(
          openIndex >= 0
            ? this.openedTabStates[openIndex]
            : this.openedTabStates[0],
        );
      } else {
        this.setCurrentEditorState(undefined);
      }
    }
    this.editorStore.explorerTreeState.reprocess();
  }

  override closeAllOtherStates(editorState: EditorState): void {
    assertNonNullable(
      this.openedTabStates.find((e) => e === editorState),
      'Editor tab should be currently opened',
    );
    this.setCurrentEditorState(editorState);
    this.openedTabStates = [editorState];
    this.editorStore.explorerTreeState.reprocess();
  }

  override closeAllStates(): void {
    this.closeAllEditorTabs();
    this.editorStore.explorerTreeState.reprocess();
  }

  override openState(editorState: EditorState): void {
    if (editorState instanceof ElementEditorState) {
      this.editorStore.openElement(editorState.element);
    } else if (editorState instanceof EntityDiffViewState) {
      this.editorStore.openEntityDiff(editorState);
    } else if (editorState instanceof EntityChangeConflictEditorState) {
      this.editorStore.openEntityChangeConflict(editorState);
    } else if (editorState instanceof FileGenerationViewerState) {
      this.editorStore.openGeneratedFile(editorState.generatedFile);
    } else if (editorState === this.editorStore.modelImporterState) {
      this.editorStore.openSingletonEditorState(
        this.editorStore.modelImporterState,
      );
    } else if (
      editorState === this.editorStore.projectConfigurationEditorState
    ) {
      this.editorStore.openSingletonEditorState(
        this.editorStore.projectConfigurationEditorState,
      );
    } else {
      throw new UnsupportedOperationError(
        `Can't open editor state`,
        editorState,
      );
    }
    this.editorStore.explorerTreeState.reprocess();
  }

  closeAllEditorTabs(): void {
    this.setCurrentEditorState(undefined);
    this.openedTabStates = [];
  }
}
