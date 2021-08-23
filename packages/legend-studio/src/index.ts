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
export * from './components/StudioStoreProvider';
export * from './application/LegendStudio';
export * from './application/StudioPluginManager';
export { LEGEND_STUDIO_PATH_PARAM_TOKEN } from './stores/LegendStudioRouter';

// stores
export * from './stores/EditorPlugin';
export * from './stores/EditorStore';
export * from './stores/EditorConfig';
export * from './stores/editor-state/element-editor-state/ElementEditorState';
export * from './stores/editor-state/UnsupportedElementEditorState';
export { NewElementState, NewElementDriver } from './stores/NewElementState';
export type { TransformDropTarget } from './stores/shared/DnDUtil';
export {
  CORE_DND_TYPE,
  ElementDragSource,
  TypeDragSource,
} from './stores/shared/DnDUtil';
export { ExplorerTreeRootPackageLabel } from './stores/ExplorerTreeState';

// components
export * from './components/editor/EditorStoreProvider';
export * from './components/shared/AppHeader';
export { AppHeaderMenu } from './components/editor/header/AppHeaderMenu';
export { TypeTree } from './components/shared/TypeTree';

// test
export {
  TEST__getTestEditorStore,
  TEST__buildGraphBasic,
  TEST__checkBuildingElementsRoundtrip,
} from './stores/EditorStoreTestUtils';
export {
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
  TEST__setUpEditorWithDefaultSDLCData,
} from './components/EditorComponentTestUtils';

// --------------------------------------------- TO BE MODULARIZED --------------------------------------------------

export {
  ConnectionEditor_StringEditor,
  ConnectionEditor_BooleanEditor,
  ConnectionEditor_ArrayEditor,
} from './components/editor/edit-panel/connection-editor/RelationalDatabaseConnectionEditor';
export * from './stores/DSLGenerationSpecification_EditorPlugin_Extension';

export * from './stores/StoreRelational_EditorPlugin_Extension';
export { ServicePureExecutionState } from './stores/editor-state/element-editor-state/service/ServiceExecutionState';
export { MappingExecutionState } from './stores/editor-state/element-editor-state/mapping/MappingExecutionState';
export { MappingTestState } from './stores/editor-state/element-editor-state/mapping/MappingTestState';
