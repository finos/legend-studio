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

// application
export * from './application/LegendStudio.js';
export * from './application/LegendStudioApplicationConfig.js';
export * from './application/LegendStudioPluginManager.js';
export * from './__lib__/LegendStudioEvent.js';
export {
  generateEditorRoute,
  generateReviewRoute,
  generateViewProjectRoute,
} from './__lib__/LegendStudioNavigation.js';
export * from './__lib__/LegendStudioTesting.js';
export * from './__lib__/LegendStudioApplicationNavigationContext.js';
export {
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from './components/LegendStudioFrameworkProvider.js';
export { type LegendStudioApplicationStore } from './stores/LegendStudioBaseStore.js';

// stores
export * from './stores/LegendStudioApplicationPlugin.js';
export * from './stores/editor/EditorTabManagerState.js';
export * from './stores/editor/EditorStore.js';
export * from './stores/editor/EditorConfig.js';
export * from './stores/editor/editor-state/ModelImporterState.js';
export * from './stores/workspace-setup/ProjectConfigurationStatus.js';
export { ClassEditorState } from './stores/editor/editor-state/element-editor-state/ClassEditorState.js';
export { ConstraintState } from './stores/editor/editor-state/element-editor-state/ClassState.js';
export { ElementEditorState } from './stores/editor/editor-state/element-editor-state/ElementEditorState.js';
export { UnsupportedElementEditorState } from './stores/editor/editor-state/UnsupportedElementEditorState.js';
export {
  NewElementState,
  NewElementDriver,
  NewConnectionValueDriver,
} from './stores/editor/NewElementState.js';
export {
  CORE_DND_TYPE,
  ElementDragSource,
  TypeDragSource,
  type UMLEditorElementDropTarget,
  type TransformDropTarget,
} from './stores/editor/utils/DnDUtils.js';
export { ExplorerTreeRootPackageLabel } from './stores/editor/ExplorerTreeState.js';
export * from './stores/graph-modifier/GraphModifierHelper.js';
export * from './stores/graph-modifier/DomainGraphModifierHelper.js';
export * from './stores/graph-modifier/DSL_Generation_GraphModifierHelper.js';
export * from './stores/graph-modifier/DSL_Service_GraphModifierHelper.js';
export * from './stores/graph-modifier/RawValueSpecificationGraphModifierHelper.js';
export * from './stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/extensions/DSL_Service_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';

// components
export { queryClass } from './components/editor/editor-group/uml-editor/ClassQueryBuilder.js';
export * from './components/editor/EditorStoreProvider.js';
export { ActivityBarMenu } from './components/editor/ActivityBar.js';
export * from './components/workspace-setup/ProjectSelectorUtils.js';
export * from './components/workspace-setup/WorkspaceSelectorUtils.js';
export { ClassFormEditor } from './components/editor/editor-group/uml-editor/ClassEditor.js';
export { TypeTree } from './components/editor/editor-group/mapping-editor/TypeTree.js';
export * from './stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';

export { PostProcessorEditorState } from './stores/editor/editor-state/element-editor-state/connection/PostProcessorEditorState.js';
export { MappingExecutionState } from './stores/editor/editor-state/element-editor-state/mapping/MappingExecutionState.js';
export { DEPRECATED__MappingTestState } from './stores/editor/editor-state/element-editor-state/mapping/legacy/DEPRECATED__MappingTestState.js';
export {
  ConnectionValueState,
  RelationalDatabaseConnectionValueState,
} from './stores/editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
export * from './stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
export { MappingElementState } from './stores/editor/editor-state/element-editor-state/mapping/MappingElementState.js';
export { UnsupportedInstanceSetImplementationState } from './stores/editor/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState.js';
export { getElementIcon } from './components/ElementIconUtils.js';

// --------------------------------------------- DSL --------------------------------------------------
/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */

export * from './stores/extensions/DSL_Generation_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/extensions/STO_Relational_LegendStudioApplicationPlugin_Extension.js';

export { MINIMUM_SERVICE_OWNERS } from './stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
export { generateServiceManagementUrl } from './stores/editor/editor-state/element-editor-state/service/ServiceRegistrationState.js';
export { ServicePureExecutionState } from './stores/editor/editor-state/element-editor-state/service/ServiceExecutionState.js';
export { NewServiceModal } from './components/editor/editor-group/service-editor/NewServiceModal.js';
export { FileSystem_File as GenerationFile } from './stores/editor/utils/FileSystemTreeUtils.js';
export { PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY } from './stores/editor/utils/ModelClassifierUtils.js';
export {
  FileGenerationState,
  GeneratedFileStructureState,
} from './stores/editor/editor-state/FileGenerationState.js';
export {
  externalFormatData_setData,
  externalFormatData_setContentType,
} from './stores/graph-modifier/DSL_Data_GraphModifierHelper.js';
export { ExternalFormatDataEditor } from './components/editor/editor-group/data-editor/DataElementEditor.js';
export {
  ExternalFormatDataState,
  EmbeddedDataState,
} from './stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
export type { EmbeddedDataTypeOption } from './stores/editor/editor-state/element-editor-state/data/DataEditorState.js';

export { SnowflakeAppFunctionActivatorEdtiorState } from './stores/editor/editor-state/element-editor-state/function-activator/SnowflakeAppFunctionActivatorEditorState.js';
export { SnowflakeAppFunctionActivatorEditor } from './components/editor/editor-group/function-activator/SnowflakeAppFunctionActivatorEditor.js';
export { SnowflakeM2MUdfFunctionActivatorEdtiorState } from './stores/editor/editor-state/element-editor-state/function-activator/SnowflakeM2MUdfFunctionActivatorEditorState.js';
export { SnowflakeM2MUdfFunctionActivatorEditor } from './components/editor/editor-group/function-activator/SnowflakeM2MUdfFunctionActivatorEditor.js';
export { HostedServiceFunctionActivatorEditorState } from './stores/editor/editor-state/element-editor-state/function-activator/HostedServiceFunctionActivatorEditorState.js';
export { MemSQLFunctionActivatorEditorState } from './stores/editor/editor-state/element-editor-state/function-activator/MemSQLFunctionActivatorEditorState.js';
export { MemSQLFunctionActivatorEditor } from './components/editor/editor-group/function-activator/MemSQLFunctionActivatorEditor.js';
