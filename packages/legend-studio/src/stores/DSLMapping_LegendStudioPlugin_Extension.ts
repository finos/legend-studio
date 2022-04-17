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

import type { DSL_LegendStudioPlugin_Extension } from './LegendStudioPlugin';
import type { ConnectionValueState } from './editor-state/element-editor-state/connection/ConnectionEditorState';
import type { EditorStore } from './EditorStore';
import type { Store, Connection, SetImplementation } from '@finos/legend-graph';
import type { MappingTestState } from './editor-state/element-editor-state/mapping/MappingTestState';
import type { MappingExecutionState } from './editor-state/element-editor-state/mapping/MappingExecutionState';
import type { NewConnectionValueDriver } from './NewElementState';
import type {
  MappingElement,
  MappingElementSource,
} from './editor-state/element-editor-state/mapping/MappingEditorState';
import type { MappingElementState } from './editor-state/element-editor-state/mapping/MappingElementState';

export type SetImplementationDecorator = (
  setImplementation: SetImplementation,
) => void;

export type SetImplementationDecorationCleaner = (
  setImplementation: SetImplementation,
) => void;

export interface MappingElementLabel {
  value: string;
  root: boolean;
  tooltip: string;
}

export type SetImplementationMappingElementLabelInfoBuilder = (
  setImplementation: SetImplementation,
) => MappingElementLabel | undefined;

export type MappingElementSourceGetter = (
  mappingElement: MappingElement,
) => MappingElementSource | undefined;

export type SetImplemtationClassifier = (
  setImplementation: SetImplementation,
) => string | undefined;

export type MappingElementStateCreator = (
  mappingElement: MappingElement | undefined,
  editorStore: EditorStore,
) => MappingElementState | undefined;

export type DefaultConnectionValueBuilder = (
  store: Store,
) => Connection | undefined;

export type ConnectionValueEditorStateBuilder = (
  editorStore: EditorStore,
  connection: Connection,
) => ConnectionValueState | undefined;

export type ConnectionEditorRenderer = (
  connectionValueState: ConnectionValueState,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

export type RuntimeConnectionTooltipTextBuilder = (
  connection: Connection,
) => string | undefined;

export type NewConnectionDriverCreator = (
  editorStore: EditorStore,
  store: Store,
) => NewConnectionValueDriver<Connection> | undefined;

export type MappingExecutionQueryEditorActionConfiguration = {
  key: string;
  renderer: (
    executionState: MappingExecutionState,
  ) => React.ReactNode | undefined;
};

export type MappingTestQueryEditorActionConfiguration = {
  key: string;
  renderer: (
    testState: MappingTestState,
    isReadOnly: boolean,
  ) => React.ReactNode | undefined;
};

export interface DSLMapping_LegendStudioPlugin_Extension
  extends DSL_LegendStudioPlugin_Extension {
  /**
   * Get the list of extra set implementation decorators.
   */
  getExtraSetImplementationDecorationCleaners?(): SetImplementationDecorationCleaner[];

  /**
   * Get the list of extra set implementation decorators.
   */
  getExtraSetImplementationDecorators?(): SetImplementationDecorator[];

  /**
   * Get the list of extra mapping element info builders for set implemenetation.
   */
  getExtraSetImplementationMappingElementLabelInfoBuilders?(): SetImplementationMappingElementLabelInfoBuilder[];

  /**
   * Get the list of extra set implementation classifiers.
   */
  getExtraSetImplementationClassifiers?(): SetImplemtationClassifier[];

  /**
   * Get the list of the mapping element state creators for the given class mapping.
   */
  getExtraMappingElementStateCreators?(): MappingElementStateCreator[];

  /**
   * Get the list of the element source getters for the given class mapping.
   */
  getExtraMappingElementSourceGetters?(): MappingElementSourceGetter[];

  /**
   * Get the list of the default connection value builder for a specified store.
   */
  getExtraDefaultConnectionValueBuilders?(): DefaultConnectionValueBuilder[];

  /**
   * Get the list of editor state builders for a specified connection value.
   */
  getExtraConnectionValueEditorStateBuilders?(): ConnectionValueEditorStateBuilder[];

  /**
   * Get the list renderers for a specified connection editor state.
   */
  getExtraConnectionEditorRenderers?(): ConnectionEditorRenderer[];

  /**
   * Get the list of the runtime connection tooltip text builders for a specified connection.
   */
  getExtraRuntimeConnectionTooltipTextBuilders?(): RuntimeConnectionTooltipTextBuilder[];

  /**
   * Get the list of creators for connection creation state driver given the store.
   */
  getExtraNewConnectionDriverCreators?(): NewConnectionDriverCreator[];

  /**
   * Get the list of actions for mapping execution query editor.
   */
  getExtraMappingExecutionQueryEditorActionConfigurations?(): MappingExecutionQueryEditorActionConfiguration[];

  /**
   * Get the list of actions for mapping test query editor.
   */
  getExtraMappingTestQueryEditorActionConfigurations?(): MappingTestQueryEditorActionConfiguration[];
}
