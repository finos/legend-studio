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
export * from './components/LegendStudioStoreProvider';
export * from './application/LegendStudio';
export * from './application/LegendStudioConfig';
export * from './application/LegendStudioPluginManager';
export {
  LEGEND_STUDIO_PATH_PARAM_TOKEN,
  generateRoutePatternWithSDLCServerKey,
} from './stores/LegendStudioRouter';
export { STUDIO_LOG_EVENT } from './stores/StudioLogEvent';

// stores
export * from './stores/LegendStudioPlugin';
export * from './stores/EditorStore';
export * from './stores/EditorConfig';
export { ClassEditorState } from './stores/editor-state/element-editor-state/ClassEditorState';
export { ElementEditorState } from './stores/editor-state/element-editor-state/ElementEditorState';
export { UnsupportedElementEditorState } from './stores/editor-state/UnsupportedElementEditorState';
export { NewElementState, NewElementDriver } from './stores/NewElementState';
export type { TransformDropTarget } from './stores/shared/DnDUtil';
export {
  CORE_DND_TYPE,
  ElementDragSource,
  TypeDragSource,
} from './stores/shared/DnDUtil';
export { ExplorerTreeRootPackageLabel } from './stores/ExplorerTreeState';
export * from './stores/DSLMapping_LegendStudioPlugin_Extension';
export { GenerationFile } from './stores/shared/FileGenerationTreeUtil';
export { FileGenerationState } from './stores/editor-state/FileGenerationState';

// components
export * from './components/editor/EditorStoreProvider';
export * from './components/shared/AppHeader';
export { ClassFormEditor } from './components/editor/edit-panel/uml-editor/ClassEditor';
export { AppHeaderMenu } from './components/editor/header/AppHeaderMenu';
export { TypeTree } from './components/shared/TypeTree';
export { StudioTextInputEditor } from './components/shared/StudioTextInputEditor';

// test
export {
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
} from './components/EditorComponentTestUtils';
export { STUDIO_TEST_ID } from './components/StudioTestID';
export * from './stores/EditorStoreTestUtils';

export { MappingExecutionState } from './stores/editor-state/element-editor-state/mapping/MappingExecutionState';
export { MappingTestState } from './stores/editor-state/element-editor-state/mapping/MappingTestState';
export { ConnectionValueState } from './stores/editor-state/element-editor-state/connection/ConnectionEditorState';
export { NewConnectionValueDriver } from './stores/NewElementState';
export type { UMLEditorElementDropTarget } from './stores/shared/DnDUtil';
export * from './stores/editor-state/element-editor-state/mapping/MappingEditorState';
export { MappingElementState } from './stores/editor-state/element-editor-state/mapping/MappingElementState';
export { UnsupportedInstanceSetImplementationState } from './stores/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState';
export { getElementIcon } from './components/shared/ElementIconUtils';

// --------------------------------------------- TO BE MODULARIZED --------------------------------------------------

export {
  ConnectionEditor_StringEditor,
  ConnectionEditor_BooleanEditor,
  ConnectionEditor_ArrayEditor,
} from './components/editor/edit-panel/connection-editor/RelationalDatabaseConnectionEditor';
export * from './stores/DSLGenerationSpecification_LegendStudioPlugin_Extension';

export * from './stores/StoreRelational_LegendStudioPlugin_Extension';

export { ServicePureExecutionState } from './stores/editor-state/element-editor-state/service/ServiceExecutionState';
export { NewServiceModal } from './components/editor/edit-panel/service-editor/NewServiceModal';
