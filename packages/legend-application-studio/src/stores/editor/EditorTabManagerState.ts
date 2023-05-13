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
  Association,
  Class,
  ConcreteFunctionDefinition,
  Database,
  DataElement,
  Enumeration,
  FileGenerationSpecification,
  FlatData,
  GenerationSpecification,
  Mapping,
  Measure,
  PackageableConnection,
  PackageableRuntime,
  PrimitiveType,
  Profile,
  Service,
  type PackageableElement,
} from '@finos/legend-graph';
import {
  type Clazz,
  guaranteeType,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { makeObservable, action } from 'mobx';
import type { EditorState } from './editor-state/EditorState.js';
import { ClassEditorState } from './editor-state/element-editor-state/ClassEditorState.js';
import { PackageableConnectionEditorState } from './editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { PackageableDataEditorState } from './editor-state/element-editor-state/data/DataEditorState.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { FileGenerationEditorState } from './editor-state/element-editor-state/FileGenerationEditorState.js';
import { FunctionEditorState } from './editor-state/element-editor-state/FunctionEditorState.js';
import { MappingEditorState } from './editor-state/element-editor-state/mapping/MappingEditorState.js';
import { PackageableRuntimeEditorState } from './editor-state/element-editor-state/RuntimeEditorState.js';
import { ServiceEditorState } from './editor-state/element-editor-state/service/ServiceEditorState.js';
import { UMLEditorState } from './editor-state/element-editor-state/UMLEditorState.js';
import { EntityDiffViewerState } from './editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { GenerationSpecificationEditorState } from './editor-state/GenerationSpecificationEditorState.js';
import { UnsupportedElementEditorState } from './editor-state/UnsupportedElementEditorState.js';
import type { EditorStore } from './EditorStore.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import { TabManagerState } from '@finos/legend-lego/application';

export class EditorTabManagerState extends TabManagerState {
  readonly editorStore: EditorStore;

  declare currentTab?: EditorState | undefined;
  declare tabs: EditorState[];

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      refreshCurrentEntityDiffViewer: action,
      recoverTabs: action,
    });

    this.editorStore = editorStore;
  }

  get dndType(): string {
    return 'editor.tab-manager.tab';
  }

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.currentTab,
      clazz,
      `Current editor state is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }

  createElementEditorState(
    element: PackageableElement,
  ): ElementEditorState | undefined {
    if (element instanceof PrimitiveType) {
      throw new UnsupportedOperationError(
        `Can't create element state for primitive type`,
      );
    } else if (element instanceof Class) {
      return new ClassEditorState(this.editorStore, element);
    } else if (
      element instanceof Association ||
      element instanceof Enumeration ||
      element instanceof Profile
    ) {
      return new UMLEditorState(this.editorStore, element);
    } else if (element instanceof ConcreteFunctionDefinition) {
      return new FunctionEditorState(this.editorStore, element);
    } else if (
      element instanceof Measure ||
      element instanceof Database ||
      element instanceof FlatData
    ) {
      return new UnsupportedElementEditorState(this.editorStore, element);
    } else if (element instanceof PackageableRuntime) {
      return new PackageableRuntimeEditorState(this.editorStore, element);
    } else if (element instanceof PackageableConnection) {
      return new PackageableConnectionEditorState(this.editorStore, element);
    } else if (element instanceof Mapping) {
      return new MappingEditorState(this.editorStore, element);
    } else if (element instanceof Service) {
      return new ServiceEditorState(this.editorStore, element);
    } else if (element instanceof GenerationSpecification) {
      return new GenerationSpecificationEditorState(this.editorStore, element);
    } else if (element instanceof FileGenerationSpecification) {
      return new FileGenerationEditorState(this.editorStore, element);
    } else if (element instanceof DataElement) {
      return new PackageableDataEditorState(this.editorStore, element);
    }
    const extraElementEditorStateCreators = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_LegendStudioApplicationPlugin_Extension
          ).getExtraElementEditorStateCreators?.() ?? [],
      );
    for (const creator of extraElementEditorStateCreators) {
      const elementEditorState = creator(this.editorStore, element);
      if (elementEditorState) {
        return elementEditorState;
      }
    }
    return new UnsupportedElementEditorState(this.editorStore, element);
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
    currentTabState: EditorState | undefined,
    currentTabElementPath: string | undefined,
  ): void => {
    this.tabs = openedTabEditorPaths
      .map((editorPath) => {
        const correspondingElement =
          this.editorStore.graphManagerState.graph.getNullableElement(
            editorPath,
          );
        if (correspondingElement) {
          return this.createElementEditorState(correspondingElement);
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
