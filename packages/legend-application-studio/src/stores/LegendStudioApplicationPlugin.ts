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

import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import type { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import type { EditorExtensionState, EditorStore } from './EditorStore.js';
import type {
  NewElementDriver,
  NewElementState,
} from './editor/NewElementState.js';
import type { Class, PackageableElement, Testable } from '@finos/legend-graph';
import {
  type DocumentationEntry,
  LegendApplicationPlugin,
} from '@finos/legend-application';
import type { TestableMetadata } from './sidebar-state/testable/GlobalTestRunnerState.js';
import type {
  ExtensionModelImportRendererState,
  ModelImporterState,
} from './editor-state/ModelImporterState.js';

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

export type ModelImporterExtensionConfiguration = {
  key: string;
  label?: string | undefined;
  allowHardReplace?: boolean;
  getExtensionModelImportRendererStateCreator: (
    modelImporterState: ModelImporterState,
  ) => ExtensionModelImportRendererState;
  renderer: (
    rendererState: ExtensionModelImportRendererState,
  ) => React.ReactNode | undefined;
  loadModel: (
    rendererState: ExtensionModelImportRendererState,
  ) => Promise<void>;
};

export type TestableMetadataGetter = (
  testable: Testable,
  editorStore: EditorStore,
) => TestableMetadata | undefined;

export abstract class LegendStudioApplicationPlugin extends LegendApplicationPlugin {
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendStudioApplicationPlugin';

  install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

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

  /**
   * Get the list of extension configurations for model importer.
   */
  getExtraModelImporterExtensionConfigurations?(): ModelImporterExtensionConfiguration[];

  /**
   * Get the list of extension for testables
   */
  getExtraTestableMetadata?(): TestableMetadataGetter[];
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
  editorStore: EditorStore,
  type: string,
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
  // newPath?
) => void;

export type ElementEditorPostDeleteAction = (
  editorStore: EditorStore,
  element: PackageableElement,
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

export type PureGrammarParserDocumentationGetter = (
  editorStore: EditorStore,
  parserKeyword: string,
) => DocumentationEntry | undefined;

export type PureGrammarParserElementDocumentationGetter = (
  editorStore: EditorStore,
  parserKeyword: string,
  elementKeyword: string,
) => DocumentationEntry | undefined;

/**
 * This snippet suggestion is meant for an embedded content of an element
 * In other words, it is used to construct element snippet suggestions
 *
 * Because of that, it is expected that there are text content wrapping around
 * this snippet, so the first suggestion might not start from index 1.
 */
export interface ElementEmbeddedContentSnippetSuggestion {
  /**
   * Brief description about the suggestion item to enable the users to quickly
   * differentiate between one suggestions from another
   */
  description?: string | undefined;
  /**
   * The snippet text to be embedded in the full snippet suggestion text for the element
   *
   * NOTE: The snippet syntax follows that of `monaco-editor`
   * See https://code.visualstudio.com/docs/editor/userdefinedsnippets#_create-your-own-snippets
   */
  text: string;
}

/**
 * This mirrors `monaco-editor` completion item structure
 * See https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.CompletionItem.html
 */
export interface PureGrammarTextSuggestion {
  /**
   * The text label of the suggestion.
   */
  text: string;
  /**
   * Brief description about the suggestion item to enable the users to quickly
   * differentiate between one suggestions from another
   */
  description?: string | undefined;
  /**
   * Detailed documentation that explains/elaborates the suggestion item.
   */
  documentation?: DocumentationEntry | undefined;
  /**
   * A string or snippet that should be inserted when selecting this suggestion.
   *
   * NOTE: The snippet syntax follows that of `monaco-editor`
   * See https://code.visualstudio.com/docs/editor/userdefinedsnippets#_create-your-own-snippets
   */
  insertText: string;
}

export type PureGrammarParserKeywordSuggestionGetter = (
  editorStore: EditorStore,
) => PureGrammarTextSuggestion[];

export type PureGrammarParserElementSnippetSuggestionsGetter = (
  editorStore: EditorStore,
  parserKeyword: string,
) => PureGrammarTextSuggestion[] | undefined;

/**
 * Studio plugins for new DSL extension.
 */
export interface DSL_LegendStudioApplicationPlugin_Extension
  extends LegendStudioApplicationPlugin {
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
   * Get the list of the supported drag-and-drop type speficiers for Pure grammar text editor.
   */
  getExtraPureGrammarTextEditorDnDTypes?(): string[];

  /**
   * Get the list of Pure grammar parser description getters based on parser section keyword
   * (e.g. ###Pure, ###Mapping, etc.)
   */
  getExtraPureGrammarParserDocumentationGetters?(): PureGrammarParserDocumentationGetter[];

  /**
   * Get the list of Pure grammar element documentation getters based on the value of the
   * element and the parser keywords (e.g. Class, Enum in ###Pure section)
   */
  getExtraPureGrammarParserElementDocumentationGetters?(): PureGrammarParserElementDocumentationGetter[];

  /**
   * Get the list of Pure grammar parser keyword suggestion getters (e.g. ###Pure, ###Mapping)
   */
  getExtraPureGrammarParserKeywordSuggestionGetters?(): PureGrammarParserKeywordSuggestionGetter[];

  /**
   * Get the list of Pure grammar element suggestion snippet getters based on the parser section
   * (e.g. Class, Enum in ###Pure)
   */
  getExtraPureGrammarParserElementSnippetSuggestionsGetters?(): PureGrammarParserElementSnippetSuggestionsGetter[];
}
