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

import { AbstractPlugin } from '@finos/legend-shared';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager';
import type { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState';
import type { EditorExtensionState, EditorStore } from './EditorStore';
import type { NewElementDriver, NewElementState } from './NewElementState';
import type { Class, PackageableElement } from '@finos/legend-graph';

export type ApplicationSetup = (
  pluginManager: LegendStudioPluginManager,
) => Promise<void>;

export type ApplicationPageRenderEntry = {
  key: string;
  urlPatterns: string[];
  component: React.FC | React.ReactElement;
};

export type ExplorerContextMenuItemRendererConfiguration = {
  key: string;
  renderer: (
    editorStore: EditorStore,
    element: PackageableElement | undefined,
  ) => React.ReactNode | undefined;
};

export type EditorExtensionComponentRendererConfiguration = {
  key: string;
  renderer: (editorStore: EditorStore) => React.ReactNode | undefined;
};

export type EditorExtensionStateCreator = (
  editorStore: EditorStore,
) => EditorExtensionState | undefined;

export type ClassPreviewRenderer = (
  _class: Class,
) => React.ReactNode | undefined;

export abstract class LegendStudioPlugin extends AbstractPlugin {
  private readonly _$nominalTypeBrand!: 'LegendStudioPlugin';

  /**
   * Get the list of setup procedures to be run when booting up the application.
   *
   * NOTE: The application will call the setup provedures from all extensions concurrently.
   */
  getExtraApplicationSetups?(): ApplicationSetup[];

  /**
   * Get the list of application pages to be rendered.
   */
  getExtraApplicationPageRenderEntries?(): ApplicationPageRenderEntry[];

  /**
   * Get the list of items to be rendered in the explorer context menu.
   */
  getExtraExplorerContextMenuItemRendererConfigurations?(): ExplorerContextMenuItemRendererConfiguration[];

  /**
   * Get the list of creators for editor extension state.
   *
   * This is a mechanism to extend the editor store.
   */
  getExtraEditorExtensionStateCreators?(): EditorExtensionStateCreator[];

  /**
   * Get the list of renderers for the preview panel of a class.
   */
  getExtraClassPreviewRenderers?(): ClassPreviewRenderer[];

  /**
   * Get the list of configurations for the renderer of editor extension states.
   */
  getExtraEditorExtensionComponentRendererConfigurations?(): EditorExtensionComponentRendererConfiguration[];
}

export type ElementTypeGetter = (
  metamodel: PackageableElement,
) => string | undefined;

export type ElementTypeLabelGetter = (type: string) => string | undefined;

export type ElementIconGetter = (type: string) => React.ReactNode | undefined;

export type NewElementFromStateCreator = (
  type: string,
  name: string,
  state: NewElementState,
) => PackageableElement | undefined;

export type NewElementDriverCreator = (
  type: string,
  editorStore: EditorStore,
) => NewElementDriver<PackageableElement> | undefined;

export type NewElementDriverEditorRenderer = (
  type: string,
) => React.ReactNode | undefined;

export type ElementEditorPostCreateAction = (
  editorStore: EditorStore,
  element: PackageableElement,
) => void;

export type ElementEditorPostRenameAction = (
  editorStore: EditorStore,
  element: PackageableElement,
) => void;

export type ElementEditorPostDeleteAction = (
  editorStore: EditorStore,
  element: PackageableElement,
  // newPath?
) => void;

export type ElementEditorRenderer = (
  elementEditorState: ElementEditorState,
) => React.ReactNode | undefined;

export type ElementEditorStateCreator = (
  editorStore: EditorStore,
  element: PackageableElement,
) => ElementEditorState | undefined;

export type ElementProjectExplorerDnDTypeGetter = (
  element: PackageableElement,
) => string | undefined;

/**
 * Studio plugins for new DSL extension.
 */
export interface DSL_LegendStudioPlugin_Extension extends LegendStudioPlugin {
  /**
   * Get the list of the supported packageable element type specifiers.
   */
  getExtraSupportedElementTypes?(): string[];

  /**
   * Get the list of classifiers for a packageable element.
   */
  getExtraElementTypeGetters?(): ElementTypeGetter[];

  /**
   * Get the list of (user-friendly) type labelers for a packageable element.
   */
  getExtraElementTypeLabelGetters?(): ElementTypeLabelGetter[];

  /**
   * Get the list of icon renderers for a packageable element.
   */
  getExtraElementIconGetters?(): ElementIconGetter[];

  /**
   * Get the list of creators for packageable element given the creation state.
   */
  getExtraNewElementFromStateCreators?(): NewElementFromStateCreator[];

  /**
   * Get the list of creators for element creation state driver given the element type specifier.
   */
  getExtraNewElementDriverCreators?(): NewElementDriverCreator[];

  /**
   * Get the list of renderers for the editor for an element creation state driver given the element type specifier.
   */
  getExtraNewElementDriverEditorRenderers?(): NewElementDriverEditorRenderer[];

  /**
   * Get the list of actions to perform after creating a new packageable element.
   */
  getExtraElementEditorPostCreateActions?(): ElementEditorPostCreateAction[];

  /**
   * Get the list of actions to perform after renaming a packageable element.
   */
  getExtraElementEditorPostRenameActions?(): ElementEditorPostRenameAction[];

  /**
   * Get the list of actions to perform after deleting a packageable element.
   */
  getExtraElementEditorPostDeleteActions?(): ElementEditorPostDeleteAction[];

  /**
   * Get the list of renderers for the editor for a packageable element.
   */
  getExtraElementEditorRenderers?(): ElementEditorRenderer[];

  /**
   * Get the list of creators for element editor state.
   */
  getExtraElementEditorStateCreators?(): ElementEditorStateCreator[];

  /**
   * Get the list of the supported drag-and-drop type speficiers.
   */
  getExtraElementProjectExplorerDnDTypeGetters?(): ElementProjectExplorerDnDTypeGetter[];

  /**
   * Get the list of the supported drag-and-drop type speficiers for grammar text editor.
   */
  getExtraGrammarTextEditorDnDTypes?(): string[];
}
