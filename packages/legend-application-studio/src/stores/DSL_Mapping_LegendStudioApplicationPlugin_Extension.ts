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

import type { DSL_LegendStudioApplicationPlugin_Extension } from './LegendStudioApplicationPlugin.js';
import type { ConnectionValueState } from './editor-state/element-editor-state/connection/ConnectionEditorState.js';
import type { EditorStore } from './EditorStore.js';
import type {
  Store,
  Connection,
  SetImplementation,
  InstanceSetImplementation,
} from '@finos/legend-graph';
import type { NewConnectionValueDriver } from './editor/NewElementState.js';
import type {
  MappingElement,
  MappingElementSource,
} from './editor-state/element-editor-state/mapping/MappingEditorState.js';
import type {
  InstanceSetImplementationState,
  MappingElementState,
  PropertyMappingState,
} from './editor-state/element-editor-state/mapping/MappingElementState.js';

type MappingSourceTypeInfo = {
  sourceType: string;
  sourceName: string;
};

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

export type MappingElementSourceExtractor = (
  mappingElement: MappingElement,
) => MappingElementSource | undefined;

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

/**
 * @returns a boolean indicating whether the update has ocurred or not
 */
export type InstanceSetImplementationSourceUpdater = (
  setImplementation: InstanceSetImplementation,
  newSource: unknown | undefined,
) => boolean;

export type MappingSourceTypeInfoGetter = (
  setImplementation: SetImplementation,
) => MappingSourceTypeInfo | undefined;

export type PropertyMappingEditorRenderer = (
  instanceSetImplementationState: InstanceSetImplementationState,
  propertyMappingState: PropertyMappingState,
) => React.ReactNode | undefined;

export type InstanceSetImplementationBlockingErrorChecker = (
  setImplementationState: InstanceSetImplementationState,
) => boolean | undefined;

export type InstanceSetImplementationStoreExtractor = (
  sourceElement: MappingElementSource,
) => Store | undefined;

export interface DSL_Mapping_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioApplicationPlugin_Extension {
  /**
   * Get the list of set implementation decorators.
   */
  getExtraSetImplementationDecorationCleaners?(): SetImplementationDecorationCleaner[];

  /**
   * Get the list of set implementation decorators.
   */
  getExtraSetImplementationDecorators?(): SetImplementationDecorator[];

  /**
   * Get the list of mapping element info builders for set implemenetation.
   */
  getExtraSetImplementationMappingElementLabelInfoBuilders?(): SetImplementationMappingElementLabelInfoBuilder[];

  /**
   * Get the list of the mapping element state creators for the given class mapping.
   */
  getExtraMappingElementStateCreators?(): MappingElementStateCreator[];

  /**
   * Get the list of source extractors for the specified mapping element.
   */
  getExtraMappingElementSourceExtractors?(): MappingElementSourceExtractor[];

  /**
   * Get the list of the default connection value builder for a specified store.
   */
  getExtraDefaultConnectionValueBuilders?(): DefaultConnectionValueBuilder[];

  /**
   * Get the list of editor state builders for a specified connection value.
   */
  getExtraConnectionValueEditorStateBuilders?(): ConnectionValueEditorStateBuilder[];

  /**
   * Get the list of renderers for a specified connection editor state.
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
   * Get the list of instance set implementation source updaters.
   */
  getExtraInstanceSetImplementationSourceUpdaters?(): InstanceSetImplementationSourceUpdater[];

  /**
   * Get the list of source-type info getters for mapping.
   */
  getExtraMappingSourceTypeInfoGetters?(): MappingSourceTypeInfoGetter[];

  /**
   * Get the list of renderers for property mapping editor.
   */
  getExtraPropertyMappingEditorRenderers?(): PropertyMappingEditorRenderer[];

  /**
   * Get the list of checkers for errors in the specified instance set implementation that could
   * potentially block the user interaction until fixed (e.g. parser error in some property mapping transform lambda editor).
   */
  getExtraInstanceSetImplementationBlockingErrorCheckers?(): InstanceSetImplementationBlockingErrorChecker[];

  /**
   * Get the list of store extractor for the given set implementation source.
   */
  getExtraInstanceSetImplementationStoreExtractors?(): InstanceSetImplementationStoreExtractor[];
}
