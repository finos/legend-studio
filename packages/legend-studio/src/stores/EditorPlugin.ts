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

import { AbstractPlugin } from '@finos/legend-studio-shared';
import type { IKeyboardEvent } from 'monaco-editor';
import type { PackageableElement } from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState';
import type { LambdaEditorState } from './editor-state/element-editor-state/LambdaEditorState';
import type { MappingExecutionState } from './editor-state/element-editor-state/mapping/MappingExecutionState';
import type { MappingTestState } from './editor-state/element-editor-state/mapping/MappingTestState';
import type { ServicePureExecutionState } from './editor-state/element-editor-state/service/ServiceExecutionState';
import type { EditorExtensionState, EditorStore } from './EditorStore';
import type { NewElementDriver, NewElementState } from './NewElementState';

export type ApplicationPageRenderEntry = {
  urlPattern: string;
  component: React.FC<{}> | React.ReactElement;
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

export type LambdaEditorHotkeyConfiguration = {
  eventMatcher: (event: IKeyboardEvent) => boolean;
  skipGlobalAction: boolean;
  action: (
    editorStore: EditorStore,
    lambdaEditorState: LambdaEditorState,
    checkParseringError: boolean,
  ) => void;
};

export type MappingExecutionQueryEditorRendererConfiguration = {
  key: string;
  renderer: (
    executionState: MappingExecutionState,
  ) => React.ReactNode | undefined;
};

export type MappingTestQueryEditorRendererConfiguration = {
  key: string;
  renderer: (executionState: MappingTestState) => React.ReactNode | undefined;
};

/**
 * NOTE: this is temporary since we want to eventually move Service out to its own DSL
 * preset/plugin so this would go away
 */
export type TEMP__ServiceQueryEditorRendererConfiguration = {
  key: string;
  renderer: (
    executionState: ServicePureExecutionState,
  ) => React.ReactNode | undefined;
};

export abstract class EditorPlugin extends AbstractPlugin {
  private readonly _$nominalTypeBrand!: 'EditorPlugin';

  getExtraApplicationPageRenderEntries?(): ApplicationPageRenderEntry[];

  getExtraExplorerContextMenuItemRendererConfigurations?(): ExplorerContextMenuItemRendererConfiguration[];

  getExtraEditorExtensionStateCreators?(): EditorExtensionStateCreator[];

  getExtraEditorExtensionComponentRendererConfigurations?(): EditorExtensionComponentRendererConfiguration[];

  getExtraLambdaEditorHotkeyConfigurations?(): LambdaEditorHotkeyConfiguration[];

  getExtraMappingExecutionQueryEditorRendererConfigurations?(): MappingExecutionQueryEditorRendererConfiguration[];

  getExtraMappingTestQueryEditorRendererConfigurations?(): MappingTestQueryEditorRendererConfiguration[];

  /**
   * NOTE: this is temporary since we want to eventually move Service out to its own DSL
   * preset/plugin so this should also be moved there
   */
  TEMP__getExtraServiceQueryEditorRendererConfigurations?(): TEMP__ServiceQueryEditorRendererConfiguration[];
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

export type NewElementDriverEditorCreator = (
  type: string,
) => React.ReactNode | undefined;

export type ElementEditorPostCreationAction = (
  element: PackageableElement,
) => void;

export type ElementEditorCreator = (
  elementEditorState: ElementEditorState,
) => React.ReactNode | undefined;

export type ElementEditorStateCreator = (
  editorStore: EditorStore,
  metamodel: PackageableElement,
) => ElementEditorState | undefined;

export type ElementProjectExplorerDnDTypeGetter = (
  metamodel: PackageableElement,
) => string | undefined;

export type PureGrammarElementLabeler = (
  metamodel: PackageableElement,
) => string | undefined;

export interface DSL_EditorPlugin_Extension extends EditorPlugin {
  getExtraSupportedElementTypes?(): string[];

  getExtraElementTypeGetters?(): ElementTypeGetter[];

  getExtraElementTypeLabelGetters?(): ElementTypeLabelGetter[];

  getExtraElementIconGetters?(): ElementIconGetter[];

  getExtraNewElementFromStateCreators?(): NewElementFromStateCreator[];

  getExtraNewElementDriverCreators?(): NewElementDriverCreator[];

  getExtraNewElementDriverEditorCreators?(): NewElementDriverEditorCreator[];

  getExtraElementEditorPostCreationActions?(): ElementEditorPostCreationAction[];

  getExtraElementEditorCreators?(): ElementEditorCreator[];

  getExtraElementEditorStateCreators?(): ElementEditorStateCreator[];

  getExtraElementProjectExplorerDnDTypeGetters?(): ElementProjectExplorerDnDTypeGetter[];

  getExtraPureGrammarElementLabelers?(): PureGrammarElementLabeler[];

  getExtraPureGrammarParserNames?(): string[];

  getExtraPureGrammarKeywords?(): string[];
}
