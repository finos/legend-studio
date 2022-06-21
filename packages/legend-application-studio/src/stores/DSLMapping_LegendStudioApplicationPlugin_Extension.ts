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
  PackageableElement,
  Mapping,
  InputData,
  Property,
} from '@finos/legend-graph';
import type { MappingTestState } from './editor-state/element-editor-state/mapping/MappingTestState.js';
import type { MappingExecutionState } from './editor-state/element-editor-state/mapping/MappingExecutionState.js';
import type { NewConnectionValueDriver } from './editor/NewElementState.js';
import type {
  MappingEditorState,
  MappingElement,
  MappingElementSource,
} from './editor-state/element-editor-state/mapping/MappingEditorState.js';
import type {
  InstanceSetImplementationState,
  MappingElementState,
  PropertyMappingState,
} from './editor-state/element-editor-state/mapping/MappingElementState.js';

export type MappingSourceTypeInfo = {
  sourceType: string;
  sourceName: string;
};

export type SetImplementationDecorator = (
  setImplementation: SetImplementation,
  editorStore: EditorStore,
) => void;

export type SetImplementationDecorationCleaner = (
  setImplementation: SetImplementation,
  editorStore: EditorStore,
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
  plugins: LegendStudioPlugin[],
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

export type MappingElementTargetExtractor = (
  mappingElement: MappingElement,
) => PackageableElement | undefined;

export type MappingElementTypeGetter = (
  mappingElement: MappingElement,
) => MAPPING_ELEMENT_TYPE | undefined;

export type NewSetImplementationGetter = (
  newSource: unknown,
  setImplementation: SetImplementation,
  mapping: Mapping,
) => InstanceSetImplementation | undefined;

export type InputDataGetter = (
  source: unknown,
  editorStore: EditorStore,
) => InputData | undefined;

export type MappingElementGetter = (
  mapping: Mapping,
  mappingElementId: string,
) => MappingElement | undefined;

export type MappingElementTreeNodeDataChildIdsGetter = (
  mappingElement: MappingElement,
  nodeData: MappingExplorerTreeNodeData,
) => string[] | undefined;

export type MappingElementDeleteEntryGetter = (
  mappingElement: MappingElement,
) => void;

export type MappingElementReprocessor = (
  mappingElement: MappingElement,
  nodeData: MappingExplorerTreeNodeData,
  treeNodes: Map<string, MappingExplorerTreeNodeData>,
  openNodes: string[],
  editorStore: EditorStore,
) => void;

export type MappingExplorerTreeNodeExpandActionSetter = (
  node: MappingExplorerTreeNodeData,
  editorStore: EditorStore,
  treeData: TreeData<MappingExplorerTreeNodeData>,
) => void;

export type InputDataStateGetter = (
  source: unknown,
  editorStore: EditorStore,
  mapping: Mapping,
  populateWithMockData: boolean,
) => MappingExecutionInputDataState | undefined;

export type InputDataStateBuilder = (
  inputData: InputData,
  editorStore: EditorStore,
  mapping: Mapping,
) => MappingTestInputDataState | undefined;

export type MappingTestInputDataStateGetter = (
  source: unknown,
  editorStore: EditorStore,
  mapping: Mapping,
  populateWithMockData: boolean,
) => MappingTestInputDataState | undefined;

export type MappingInputDataStateBuilder = (
  inputDataState: MappingExecutionInputDataState,
) => React.ReactNode | undefined;

export type MappingTestInputDataStateBuilder = (
  inputDataState: MappingTestInputDataState,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

export type MappingElementVisitor = (
  instanceSetImplementationState: InstanceSetImplementationState,
  mappingEditorState: MappingEditorState,
  property: Property,
) => void;

export type MappingElementSourceFilterTextGetter = (
  value: unknown,
) => string | undefined;

export type SourceElementLabelerGetter = (
  source: unknown,
) => string | undefined;

export type MappingElementSourceOptionBuilder = (
  source: MappingElementSource,
) => MappingElementSourceSelectOption | undefined;

export type SourceOptionGetter = (editorStore: EditorStore) => unknown[];

export type ClassMappingSourceDriverGetter = (
  element: PackageableElement,
  applicationStore: ApplicationStore<LegendApplicationConfig>,
  mappingEditorState: MappingEditorState,
  setImplementation: InstanceSetImplementation,
) => unknown | undefined;

export type SourceElementTreeRenderer = (
  srcElement: unknown,
  instanceSetImplementationStat: InstanceSetImplementationState,
) => React.ReactNode | undefined;

export interface DSLMapping_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioPlugin_Extension {
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
   * Get the list of set implementation classifiers.
   */
  getExtraSetImplementationClassifiers?(): SetImplemtationClassifier[];

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
   * Get the list of actions for mapping execution query editor.
   */
  getExtraMappingExecutionQueryEditorActionConfigurations?(): MappingExecutionQueryEditorActionConfiguration[];

  /**
   * Get the list of actions for mapping test query editor.
   */
  getExtraMappingTestQueryEditorActionConfigurations?(): MappingTestQueryEditorActionConfiguration[];

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

  /**
   * Get the list of target extractors for the specified mapping element.
   */
  getExtraMappingElementTargetExtractors?(): MappingElementTargetExtractor[];

  /**
   * Get the list of mapping element types for the specified mapping element.
   */
  getExtraMappingElementTypeGetters?(): MappingElementTypeGetter[];

  /**
   * Get the list of new setImplementation for the specified source element.
   */
  getExtraNewSetImplementationGetters?(): NewSetImplementationGetter[];

  /**
   * Get the list of input data for the specified source element.
   */
  getExtraInputDataGetters?(): InputDataGetter[];

  /**
   * Get the list of mapping element for the specified mapping by type and ID.
   */
  getExtraMappingElementGetters?(): MappingElementGetter[];

  /**
   * Get the list of tree node child IDs for specified mapping element.
   */
  getExtraMappingElementTreeNodeDataChildIdsGetters?(): MappingElementTreeNodeDataChildIdsGetter[];

  /**
   * Get the list of mapping element delete entry getters for a specified mapping element.
   */
  getExtraMappingElementDeleteEntryGetters?(): MappingElementDeleteEntryGetter[];

  /**
   * Get the list of reprocessors for a specified mapping element.
   */
  getExtraMappingElementReprocessors?(): MappingElementReprocessor[];

  /**
   * Get the list of action getters on expanding mapping explorer tree node.
   */
  getExtraMappingExplorerTreeNodeExpandActionSetters?(): MappingExplorerTreeNodeExpandActionSetter[];

  /**
   * Get the list of input data state getters for mapping execution for specified source element.
   */
  getExtraInputDataStateGetters?(): InputDataStateGetter[];

  /**
   * Get the list of input data state builders for mapping execution for specified input data.
   */
  getExtraInputDataStateBuilders?(): InputDataStateBuilder[];

  /**
   * Get the list of mapping test input data state getters for mapping execution for specified source element.
   */
  getExtraMappingTestInputDataStateGetters?(): MappingTestInputDataStateGetter[];

  /**
   * Get the list of mapping execution input data state builders for mapping execution for specified source element.
   */
  getExtraMappingInputDataStateBuilders?(): MappingInputDataStateBuilder[];

  /**
   * Get the list of mapping test input data state builders for mapping execution for specified source element.
   */
  getExtraMappingTestInputDataStateBuilders?(): MappingTestInputDataStateBuilder[];

  /**
   * Get the list of mapping element visitor for a specified setimplementation state.
   */
  getExtraMappingElementVisitors?(): MappingElementVisitor[];

  /**
   * Get the list of filter text getters for a specified mapping element source.
   */
  getExtraMappingElementSourceFilterTextGetters?(): MappingElementSourceFilterTextGetter[];

  /**
   * Get the list of labelers for a specified source element.
   */
  getExtraSourceElementLabelerGetters?(): SourceElementLabelerGetter[];

  /**
   * Get the list of source option builders for a specified source element.
   */
  getExtraMappingElementSourceOptionBuilders?(): MappingElementSourceOptionBuilder[];

  /**
   * Get the list of extra source options for a mapping
   */
  getExtraSourceOptionGetters?(): SourceOptionGetter[];

  /**
   * Get the list of DnD source types for a mapping.
   */
  getExtraDnDSourceTypes?(): string[];

  /**
   * Get the list of class mapping source driver setters for a given mapping element source.
   */
  getExtraClassMappingSourceDriverGetters?(): ClassMappingSourceDriverGetter[];

  /**
   * Get the list of source element tree renderers for a specified mapping.
   */
  getExtraSourceElementTreeRenderers?(): SourceElementTreeRenderer[];
}
