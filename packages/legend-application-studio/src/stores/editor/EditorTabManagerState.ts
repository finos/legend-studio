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
  type PackageableElement,
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
  INTERNAL__UnknownFunctionActivator,
  SnowflakeApp,
  HostedService,
  DataProduct,
  IngestDefinition,
} from '@finos/legend-graph';
import {
  type Clazz,
  guaranteeType,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { makeObservable, action, observable } from 'mobx';
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
import { TabManagerState, type TabState } from '@finos/legend-lego/application';
import { INTERNAL__UnknownFunctionActivatorEdtiorState } from './editor-state/element-editor-state/function-activator/INTERNAL__UnknownFunctionActivatorEditorState.js';
import { SnowflakeAppFunctionActivatorEdtiorState } from './editor-state/element-editor-state/function-activator/SnowflakeAppFunctionActivatorEditorState.js';
import { HostedServiceFunctionActivatorEditorState } from './editor-state/element-editor-state/function-activator/HostedServiceFunctionActivatorEditorState.js';
import { ArtifactGenerationViewerState } from './editor-state/ArtifactGenerationViewerState.js';
import { DataProductEditorState } from './editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import { IngestDefinitionEditorState } from './editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import type { EditorInitialConfiguration } from './editor-state/element-editor-state/ElementEditorInitialConfiguration.js';

export class EditorTabManagerState extends TabManagerState {
  readonly editorStore: EditorStore;

  declare currentTab?: EditorState | undefined;
  declare tabs: EditorState[];
  cachedTabs:
    | {
        openedTabEditorPaths: string[];
        currentTabState: EditorState | undefined;
        currentTabElementPath: string | undefined;
      }
    | undefined;

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      refreshCurrentEntityDiffViewer: action,
      cachedTabs: observable,
      recoverTabs: action,
      clearTabCache: action,
      cacheAndClose: action,
    });

    this.editorStore = editorStore;
  }

  get dndType(): string {
    return 'editor.tab-manager.tab';
  }

  /**
   * Here we store the element paths of the
   * elements editors as element paths don't refer to the actual graph. We can find the element
   * from the new graph that is built by using element path and can reprocess the element editor states.
   * The other kind of editors we reprocess are file generation editors, we store them as is as they don't
   * hold any reference to the actual graph.
   */
  cacheAndClose(options?: { cacheGeneration?: boolean }): void {
    const openedTabPaths: string[] = [];
    this.tabs.forEach((state: TabState) => {
      if (state instanceof ElementEditorState) {
        openedTabPaths.push(state.elementPath);
      }
    });
    // Only stores editor state for file generation editors as they don't hold any references to the
    // actual graph.
    const currentTabState =
      this.currentTab instanceof ElementEditorState ||
      (options?.cacheGeneration &&
        this.currentTab instanceof ArtifactGenerationViewerState)
        ? undefined
        : this.currentTab;
    const currentTabElementPath =
      this.currentTab instanceof ElementEditorState
        ? this.currentTab.elementPath
        : undefined;
    this.cachedTabs = {
      openedTabEditorPaths: openedTabPaths,
      currentTabState,
      currentTabElementPath,
    };
    this.closeAllTabs();
  }

  clearTabCache(): void {
    this.cachedTabs = undefined;
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
    config?: EditorInitialConfiguration,
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
    } else if (element instanceof IngestDefinition) {
      return new IngestDefinitionEditorState(this.editorStore, element, config);
    } else if (element instanceof Service) {
      return new ServiceEditorState(this.editorStore, element);
    } else if (element instanceof DataProduct) {
      return new DataProductEditorState(this.editorStore, element, config);
    } else if (element instanceof GenerationSpecification) {
      return new GenerationSpecificationEditorState(this.editorStore, element);
    } else if (element instanceof FileGenerationSpecification) {
      return new FileGenerationEditorState(this.editorStore, element);
    } else if (element instanceof DataElement) {
      return new PackageableDataEditorState(this.editorStore, element);
    } else if (element instanceof SnowflakeApp) {
      return new SnowflakeAppFunctionActivatorEdtiorState(
        this.editorStore,
        element,
      );
    } else if (element instanceof HostedService) {
      return new HostedServiceFunctionActivatorEditorState(
        this.editorStore,
        element,
      );
    } else if (element instanceof INTERNAL__UnknownFunctionActivator) {
      return new INTERNAL__UnknownFunctionActivatorEdtiorState(
        this.editorStore,
        element,
      );
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
  recoverTabs = (): void => {
    if (this.cachedTabs) {
      this.tabs = this.cachedTabs.openedTabEditorPaths
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
        this.findCurrentTab(
          this.cachedTabs.currentTabState,
          this.cachedTabs.currentTabElementPath,
        ),
      );
      this.clearTabCache();
    }
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
