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

// stores
export * from './stores/LegendStudioApplicationPlugin.js';
export * from './stores/EditorStore.js';
export * from './stores/EditorConfig.js';
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
} from './stores/shared/DnDUtil.js';
export { ExplorerTreeRootPackageLabel } from './stores/ExplorerTreeState.js';
export * from './stores/graphModifier/GraphModifierHelper.js';
export * from './stores/graphModifier/DomainGraphModifierHelper.js';
export * from './stores/DSLMapping_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/DSLService_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/DSLData_LegendStudioApplicationPlugin_Extension.js';
export * from './stores/graphModifier/DSLGeneration_GraphModifierHelper.js';
export * from './stores/graphModifier/DSLService_GraphModifierHelper.js';

// components
export * from './components/editor/EditorStoreProvider.js';
export { ClassFormEditor } from './components/editor/edit-panel/uml-editor/ClassEditor.js';
export { TypeTree } from './components/shared/TypeTree.js';
export { StudioTextInputEditor } from './components/shared/StudioTextInputEditor.js';

// test
export {
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
} from './components/EditorComponentTestUtils.js';
export * from './components/LegendStudioTestID.js';
export * from './stores/EditorStoreTestUtils.js';

export { MappingExecutionState } from './stores/editor-state/element-editor-state/mapping/MappingExecutionState.js';
export { MappingTestState } from './stores/editor-state/element-editor-state/mapping/MappingTestState.js';
export { ConnectionValueState } from './stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
export * from './stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
export { MappingElementState } from './stores/editor-state/element-editor-state/mapping/MappingElementState.js';
export { UnsupportedInstanceSetImplementationState } from './stores/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState.js';
export { getElementIcon } from './components/shared/ElementIconUtils.js';

export { ProjectSelector } from './components/workspace-setup/ProjectSelector.js';

// TO BE REMOVED: these setup are currently needed for project dependency dashboard, until we open source, we can remove them
export * from './components/workspace-setup/WorkspaceSetupStoreProvider.js';
export { WorkspaceSetupStore } from './stores/workspace-setup/WorkspaceSetupStore.js';

// --------------------------------------------- DSL --------------------------------------------------
/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */

export {
  ConnectionEditor_StringEditor,
  ConnectionEditor_BooleanEditor,
  ConnectionEditor_ArrayEditor,
} from './components/editor/edit-panel/connection-editor/RelationalDatabaseConnectionEditor.js';
export * from './stores/DSLGenerationSpecification_LegendStudioApplicationPlugin_Extension.js';

export * from './stores/StoreRelational_LegendStudioApplicationPlugin_Extension.js';

export { ServicePureExecutionState } from './stores/editor-state/element-editor-state/service/ServiceExecutionState.js';
export { NewServiceModal } from './components/editor/edit-panel/service-editor/NewServiceModal.js';
export { GenerationFile } from './stores/shared/FileGenerationTreeUtil.js';
export { FileGenerationState } from './stores/editor-state/FileGenerationState.js';
export { DSLExternalFormat_LegendStudioApplicationPlugin } from './components/DSLExternalFormat_LegendStudioApplicationPlugin.js';
export {
  externalFormatData_setData,
  externalFormatData_setContentType,
} from './stores/graphModifier/DSLData_GraphModifierHelper.js';
export { ExternalFormatDataEditor } from './components/editor/edit-panel/data-editor/DataElementEditor.js';
export {
  ExternalFormatDataState,
  EmbeddedDataState,
} from './stores/editor-state/element-editor-state/data/EmbeddedDataState.js';
export type { EmbeddedDataTypeOption } from './stores/editor-state/element-editor-state/data/DataEditorState.js';
