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
import { type Clazz, guaranteeType, isNonNullable } from '@finos/legend-shared';
import { makeObservable, action } from 'mobx';
import type { EditorState } from './editor-state/EditorState.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { EntityDiffViewerState } from './editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { GrammarTextEditorState } from './editor-state/GrammarTextEditorState.js';
import type { EditorStore } from './EditorStore.js';

export abstract class EditorTabManagerState extends TabManagerState {
  readonly editorStore: EditorStore;

  declare currentTab?: EditorState | undefined;
  declare tabs: EditorState[];

  constructor(editorStore: EditorStore) {
    super();

    this.editorStore = editorStore;
  }

  abstract recoverTabs(
    openedTabEditorPaths: string[],
    currentTabElementPath: string | undefined,
    currentTabState?: EditorState | undefined,
  ): void;

  abstract refreshCurrentEntityDiffViewer(): void;

  abstract openElementEditor(element: PackageableElement): void;

  abstract getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T;
}

export class FormEditorTabManagerState extends EditorTabManagerState {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      openElementEditor: action,
      refreshCurrentEntityDiffViewer: action,
      recoverTabs: action,
      getCurrentEditorState: action,
      findCurrentTab: action,
    });
  }

  get dndType(): string {
    return 'form-editor.tab-manager.tab';
  }

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.currentTab,
      clazz,
      `Current editor state is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }

  openElementEditor(element: PackageableElement): void {
    if (!(element instanceof Package)) {
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
   */
  recoverTabs = (
    openedTabEditorPaths: string[],
    currentTabElementPath: string | undefined,
    currentTabState?: EditorState | undefined,
  ): void => {
    this.tabs = openedTabEditorPaths
      .map((editorPath) => {
        const correspondingElement =
          this.editorStore.graphManagerState.graph.getNullableElement(
            editorPath,
          );
        if (correspondingElement) {
          return this.editorStore.createElementEditorState(
            correspondingElement,
          );
        }
        return undefined;
      })
      .filter(isNonNullable);
    this.setCurrentTab(
      this.findCurrentTab(currentTabState, currentTabElementPath),
    );
  };

  findCurrentTab = (
    tab: EditorState | undefined,
    tabElementPath: string | undefined,
  ): EditorState | undefined => {
    if (tab) {
      return tab;
    } else {
      return this.tabs.find(
        (editorState) =>
          editorState instanceof ElementEditorState &&
          editorState.elementPath === tabElementPath,
      );
    }
  };
}

export class GrammarEditorTabManagerState extends EditorTabManagerState {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      openElementEditor: action,
      recoverTabs: action,
      refreshCurrentEntityDiffViewer: action,
      getCurrentEditorState: action,
      findCurrentTab: action,
    });
  }

  get dndType(): string {
    return 'text-editor.tab-manager.tab';
  }

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.currentTab,
      clazz,
      `Current editor state is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }

  openElementEditor(element: PackageableElement): void {
    if (this.editorStore.grammarModeManagerState.isInDefaultTextMode) {
      // in text mode, we want to select the block of code that corresponds to the element if possible
      // the cheap way to do this is to search by element label text, e.g. `Mapping some::package::someMapping`
      this.editorStore.grammarModeManagerState.grammarTextEditorState.setCurrentElementLabelRegexString(
        element,
      );
    } else {
      if (!(element instanceof Package)) {
        const existingGrammarElementState = this.tabs.find(
          (state) =>
            state instanceof GrammarTextEditorState &&
            state.element?.path === element.path,
        );
        const elementState =
          existingGrammarElementState ??
          this.editorStore.grammarModeManagerState.createGrammarElementState(
            element,
          );
        if (elementState && !existingGrammarElementState) {
          this.tabs.push(elementState);
        }
        this.setCurrentTab(elementState);
      }
      // expand tree node
      this.editorStore.explorerTreeState.openNode(element);
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
   */
  recoverTabs = (
    openedTabEditorPaths: string[],
    currentTabElementPath: string | undefined,
  ): void => {
    this.tabs = openedTabEditorPaths
      .map((editorPath) => {
        const correspondingElement =
          this.editorStore.graphManagerState.graph.getNullableElement(
            editorPath,
          );
        if (correspondingElement) {
          return this.editorStore.grammarModeManagerState.createGrammarElementState(
            correspondingElement,
          );
        }
        return undefined;
      })
      .filter(isNonNullable);
    // Here we try to set the current tab. If we don't find the previous current
    // tab we set it with the last tab opened.
    let currentTab = this.findCurrentTab(currentTabElementPath);
    if (!currentTab && this.tabs.length) {
      currentTab = this.tabs[this.tabs.length - 1];
    }
    this.setCurrentTab(currentTab);
  };

  findCurrentTab = (
    tabElementPath: string | undefined,
  ): EditorState | undefined =>
    this.tabs.find(
      (editorState) =>
        editorState instanceof GrammarTextEditorState &&
        editorState.element?.path === tabElementPath,
    );
}
