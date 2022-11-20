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
export * from './components/LegendStudioBaseStoreProvider.js';
export * from './stores/LegendStudioBaseStore.js';
export * from './application/LegendStudio.js';
export * from './application/LegendStudioApplicationConfig.js';
export * from './application/LegendStudioPluginManager.js';
export * from './stores/LegendStudioAppEvent.js';
export { queryClass } from './components/editor/edit-panel/uml-editor/ClassQueryBuilder.js';

// stores
export * from './stores/LegendStudioApplicationPlugin.js';
export * from './stores/EditorStore.js';
export * from './stores/EditorConfig.js';
export * from './stores/editor-state/ModelImporterState.js';
export * from './stores/workspace-setup/ProjectConfigurationStatus.js';
export { ClassEditorState } from './stores/editor-state/element-editor-state/ClassEditorState.js';
export { ElementEditorState } from './stores/editor-state/element-editor-state/ElementEditorState.js';
export { UnsupportedElementEditorState } from './stores/editor-state/UnsupportedElementEditorState.js';
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
} from './stores/shared/DnDUtils.js';
export { ExplorerTreeRootPackageLabel } from './stores/ExplorerTreeState.js';
export * from './stores/shared/modifier/GraphModifierHelper.js';
export * from './stores/shared/modifier/DomainGraphModifierHelper.js';
export * from './stores/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/DSL_Service_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/shared/modifier/DSL_Generation_GraphModifierHelper.js';
export * from './stores/shared/modifier/DSL_Service_GraphModifierHelper.js';

// components
export * from './components/editor/EditorStoreProvider.js';
export * from './stores/LegendStudioRouter.js';
export { ActivityBarMenu } from './components/editor/ActivityBar.js';
export * from './components/shared/ProjectSelectorUtils.js';
export * from './components/shared/WorkspaceSelectorUtils.js';
export { ClassFormEditor } from './components/editor/edit-panel/uml-editor/ClassEditor.js';
export { TypeTree } from './components/shared/TypeTree.js';

// test
export {
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
} from './components/EditorComponentTestUtils.js';
export * from './components/LegendStudioTestID.js';
export * from './stores/EditorStoreTestUtils.js';

export { PostProcessorEditorState } from './stores/editor-state/element-editor-state/connection/PostProcessorEditorState.js';
export { MappingExecutionState } from './stores/editor-state/element-editor-state/mapping/MappingExecutionState.js';
export { MappingTestState } from './stores/editor-state/element-editor-state/mapping/MappingTestState.js';
export {
  ConnectionValueState,
  RelationalDatabaseConnectionValueState,
} from './stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
export * from './stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
export { MappingElementState } from './stores/editor-state/element-editor-state/mapping/MappingElementState.js';
export { UnsupportedInstanceSetImplementationState } from './stores/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState.js';
export { getElementIcon } from './components/shared/ElementIconUtils.js';

// --------------------------------------------- DSL --------------------------------------------------
/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */

export * from './stores/DSL_Generation_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/STO_Relational_LegendStudioApplicationPlugin_Extension.js';

export { MINIMUM_SERVICE_OWNERS } from './stores/editor-state/element-editor-state/service/ServiceEditorState.js';
export { generateServiceManagementUrl } from './stores/editor-state/element-editor-state/service/ServiceRegistrationState.js';
export { ServicePureExecutionState } from './stores/editor-state/element-editor-state/service/ServiceExecutionState.js';
export { NewServiceModal } from './components/editor/edit-panel/service-editor/NewServiceModal.js';
export { GenerationFile } from './stores/shared/FileGenerationTreeUtils.js';
export { FileGenerationState } from './stores/editor-state/FileGenerationState.js';
export { DSL_ExternalFormat_LegendStudioApplicationPlugin } from './components/DSL_ExternalFormat_LegendStudioApplicationPlugin.js';
export {
  externalFormatData_setData,
  externalFormatData_setContentType,
} from './stores/shared/modifier/DSL_Data_GraphModifierHelper.js';
export { ExternalFormatDataEditor } from './components/editor/edit-panel/data-editor/DataElementEditor.js';
export {
  ExternalFormatDataState,
  EmbeddedDataState,
} from './stores/editor-state/element-editor-state/data/EmbeddedDataState.js';
export type { EmbeddedDataTypeOption } from './stores/editor-state/element-editor-state/data/DataEditorState.js';
