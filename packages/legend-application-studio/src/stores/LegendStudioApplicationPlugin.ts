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
import type { ElementEditorState } from './editor/editor-state/element-editor-state/ElementEditorState.js';
import type {
  EditorExtensionState,
  EditorStore,
} from './editor/EditorStore.js';
import type {
  NewElementDriver,
  NewElementState,
} from './editor/NewElementState.js';
import type { Class, PackageableElement, Testable } from '@finos/legend-graph';
import { LegendApplicationPlugin } from '@finos/legend-application';
import type { TestableMetadata } from './editor/sidebar-state/testable/GlobalTestRunnerState.js';
import type {
  ExtensionModelImportRendererState,
  ModelImporterState,
} from './editor/editor-state/ModelImporterState.js';
import type { PureGrammarTextSuggestion } from '@finos/legend-lego/code-editor';
import type { DocumentationEntry } from '@finos/legend-shared';

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

export type EditorExtensionStateBuilder = (
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

export type TestRunnerViewConfiguration = {
  key: string;
  title: string;
  renderer: (editorStore: EditorStore) => React.ReactNode | undefined;
};

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
   * Get the list of extension state builders for editor store.
   *
   * This is a mechanism to have the store holds references to extension states
   * so that we can refer back to these states when needed or do cross-extensions
   * operations
   */
  getExtraEditorExtensionStateBuilders?(): EditorExtensionStateBuilder[];

  /**
   * Get the list of items to be rendered in the explorer context menu.
   */
  getExtraExplorerContextMenuItemRendererConfigurations?(): ExplorerContextMenuItemRendererConfiguration[];

  /**
   * Get the list of configurations for the renderer of editor extension states.
   */
  getExtraEditorExtensionComponentRendererConfigurations?(): EditorExtensionComponentRendererConfiguration[];

  /**
   * Get the list of renderers for the preview panel of a class.
   */
  getExtraClassPreviewRenderers?(): ClassPreviewRenderer[];

  /**
   * Get the list of extension configurations for model importer.
   */
  getExtraModelImporterExtensionConfigurations?(): ModelImporterExtensionConfiguration[];

  /**
   * Get the list of extension for testables
   */
  getExtraTestableMetadata?(): TestableMetadataGetter[];

  /**
   * Get the list of view configurations for test runner.
   */
  getExtraTestRunnerViewConfigurations?(): TestRunnerViewConfiguration[];
}

export type PureGrammarElementLabeler = (
  metamodel: PackageableElement,
) => string | undefined;

export type ElementClassifier = (
  metamodel: PackageableElement,
) => string | undefined;

// TODO: we should consider restrict the usage of type classifier and consider using the element instead
// the only mechanism that really needs the type classifier is element creation, which we could refactor
// to have a plugin that produces a single configuration for the creation ceremony
// e.g.
// export type ElementCreatorConfiguration = {
//   key: string;
//   label: string;
//   icon: React.ReactNode;
//   ...
// }
export type ElementIconGetter = (
  type: string,
  element: PackageableElement | undefined,
) => React.ReactNode | undefined;
export type ElementTypeLabelGetter = (type: string) => string | undefined;
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

export type DragElementClassifier = (
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
   * Get the list of supported Pure grammar keywords.
   */
  getExtraPureGrammarKeywords?(): string[];

  /**
   * Get the list of the supported packageable element type specifiers.
   */
  getExtraSupportedElementTypes?(): string[];

  /**
   * Get the Map of the supported packageable element type specifiers with its category.
   */
  getExtraSupportedElementTypesWithCategory?(): Map<string, string[]>;

  /**
   * Get the list of classifiers for a packageable element.
   */
  getExtraElementClassifiers?(): ElementClassifier[];

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
   * Get the list of the classifiers for draggable elements from explorer tree
   */
  getExtraDragElementClassifiers?(): DragElementClassifier[];

  /**
   * Get the list of the supported drag element type speficiers for Pure grammar text editor.
   */
  getExtraPureGrammarTextEditorDragElementTypes?(): string[];

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

  /**
   * Get a string of the Pure grammar element name for auto-folding the element
   * (e.g. Diagram, or Text)
   */
  getExtraGrammarTextEditorAutoFoldingElementCreatorKeywords?(): string[];
}
