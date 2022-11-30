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

import { TabManagerState } from '@finos/legend-application';
import { Package, type PackageableElement } from '@finos/legend-graph';
import {
  assertTrue,
  type Clazz,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import { makeObservable, action } from 'mobx';
import type { EditorState } from './editor-state/EditorState.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { EntityDiffViewerState } from './editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { FileGenerationViewerState } from './editor-state/FileGenerationViewerState.js';
import { ModelImporterState } from './editor-state/ModelImporterState.js';
import { ProjectConfigurationEditorState } from './editor-state/ProjectConfigurationEditorState.js';
import type { EditorStore } from './EditorStore.js';

export class EditorTabManagerState extends TabManagerState {
  readonly editorStore: EditorStore;

  declare currentTab?: EditorState | undefined;
  declare tabs: EditorState[];

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      openElementEditor: action,
      refreshCurrentEntityDiffViewer: action,
      recoverTabs: action,
    });

    this.editorStore = editorStore;
  }

  get dndType(): string {
    return 'editor.tab-manager.tab';
  }

  closeTab(tab: EditorState): void {
    const elementIndex = this.tabs.findIndex((e) => e === tab);
    assertTrue(elementIndex !== -1, `Can't close a tab which is not opened`);
    this.tabs.splice(elementIndex, 1);
    if (this.currentTab === tab) {
      if (this.tabs.length) {
        const openIndex = elementIndex - 1;
        this.setCurrentTab(
          openIndex >= 0 ? this.tabs[openIndex] : this.tabs[0],
        );
      } else {
        this.setCurrentTab(undefined);
      }
    }
  }

  openTab(tab: EditorState): void {
    const existingTab = this.tabs.find((t) => t.match(tab));
    if (!existingTab) {
      if (this.currentTab) {
        const currIndex = this.tabs.findIndex((e) => e === this.currentTab);
        this.tabs.splice(currIndex + 1, 0, tab);
      } else {
        this.tabs.push(tab);
      }
    }
    this.setCurrentTab(tab);

    if (tab instanceof ElementEditorState) {
      // expand tree node
      this.editorStore.explorerTreeState.openNode(tab.element);
    }
  }

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.currentTab,
      clazz,
      `Current editor state is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }

  openElementEditor(element: PackageableElement): void {
    if (this.editorStore.isInGrammarTextMode) {
      // in text mode, we want to select the block of code that corresponds to the element if possible
      // the cheap way to do this is to search by element label text, e.g. `Mapping some::package::someMapping`
      this.editorStore.grammarTextEditorState.setCurrentElementLabelRegexString(
        element,
      );
    } else if (!(element instanceof Package)) {
      const newTab = this.editorStore.createElementEditorState(element);
      if (newTab) {
        this.openTab(newTab);
      } else {
        this.editorStore.applicationStore.notifyWarning(
          `Can't open editor for element '${element.path}'`,
        );
      }
    }
  }

  refreshCurrentEntityDiffViewer(): void {
    if (this.currentTab instanceof EntityDiffViewerState) {
      this.currentTab.refresh();
    }
  }

  /**
   * After we do graph processing, we want to recover the tabs
   *
   * NOTE: we have to flush old tab states to ensure, we have no reference
   * to the old graph to avoid memory leak. Here, we only recreate element
   * editor tabs, and keep special editors open. Some tabs will be closed.
   * But we **ABSOLUTELY** must never make this behavior customizable by extension
   * i.e. we should not allow extension control if a tab should be kept open, because
   * the plugin implementation could accidentally reference older graph and therefore
   * cause memory issues
   *
   * See https://github.com/finos/legend-studio/issues/1713
   *
   * FIXME: we allow this so the UX stays the same but this can cause memory leak
   * we should change `reprocess` model to do something like having source information
   * on the form to navigate to it properly so that information is not dependent on the
   * graph, but on the component itself, with IDs and such.
   *
   * TODO: to be removed when we process editor states properly
   *
   * @risk memory-leak
   */
  recoverTabs(tabs: EditorState[], currentTab: EditorState | undefined): void {
    let newCurrentTab: EditorState | undefined;
    this.tabs = tabs
      .map((tab) => {
        let newTab: EditorState | undefined = undefined;
        if (tab instanceof ElementEditorState) {
          const correspondingElement =
            this.editorStore.graphManagerState.graph.getNullableElement(
              tab.element.path,
            );
          if (correspondingElement) {
            newTab = tab.reprocess(correspondingElement, this.editorStore);
          }
        } else if (
          // No need to reprocess generated file state as it has no reference to any of the graphs
          // TODO: we should do a check to see if the generated file is still around or not
          tab instanceof FileGenerationViewerState ||
          tab instanceof ModelImporterState ||
          tab instanceof ProjectConfigurationEditorState
        ) {
          newTab = tab;
        }
        if (tab === currentTab) {
          newCurrentTab = newTab;
        }
        return newTab;
      })
      .filter(isNonNullable);
    this.setCurrentTab(newCurrentTab);
  }
}
