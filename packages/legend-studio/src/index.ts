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
export * from './const';
export * from './components/application/ApplicationStoreProvider';
export * from './components/StudioStoreProvider';
export * from './components/application/WebApplicationNavigatorProvider';
export * from './utils/ApplicationLogEvent';
export * from './application/LegendStudio';
export * from './application/StudioPluginManager';
export { ApplicationConfig } from './stores/application/ApplicationConfig';
export { WebApplicationNavigator } from './stores/application/WebApplicationNavigator';

// network
export * from './stores/network/Telemetry';
export * from './stores/network/Tracer';
export { LEGEND_STUDIO_PATH_PARAM_TOKEN } from './stores/LegendStudioRouter';

// stores
export * from './stores/shared/PackageableElementOptionUtil';
export * from './stores/EditorPlugin';
export * from './stores/ApplicationStore';
export * from './stores/EditorStore';
export * from './stores/EditorConfig';
export * from './stores/editor-state/element-editor-state/ElementEditorState';
export * from './stores/editor-state/UnsupportedElementEditorState';
export { NewElementState, NewElementDriver } from './stores/NewElementState';
export { LambdaEditorState } from './stores/editor-state/element-editor-state/LambdaEditorState';
export type { TransformDropTarget } from './stores/shared/DnDUtil';
export {
  CORE_DND_TYPE,
  ElementDragSource,
  TypeDragSource,
} from './stores/shared/DnDUtil';
export { ExplorerTreeRootPackageLabel } from './stores/ExplorerTreeState';

// components
export * from './components/editor/EditorStoreProvider';
export * from './components/shared/TextInputEditor';
export * from './components/shared/AppHeader';
export * from './components/shared/Icon'; // TODO: we might want to move all of these to @finos/legend-application-components
export { AppHeaderMenu } from './components/editor/header/AppHeaderMenu';
export { getElementIcon, getElementTypeIcon } from './components/shared/Icon';
export { TypeTree } from './components/shared/TypeTree';
export type { LambdaEditorOnKeyDownEventHandler } from './components/shared/LambdaEditor';
export { LambdaEditor } from './components/shared/LambdaEditor';
export { BlockingAlert } from './components/application/BlockingAlert';
export { ActionAlert } from './components/application/ActionAlert';
export { NotificationSnackbar } from './components/application/NotificationSnackbar';

// test
export {
  TEST__getTestApplicationConfig,
  TEST__getTestApplicationStore,
  TEST__getTestEditorStore,
  TEST__buildGraphBasic,
  TEST__checkBuildingElementsRoundtrip,
} from './stores/StoreTestUtils';
export {
  TEST__provideMockedApplicationStore,
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
  TEST__setUpEditorWithDefaultSDLCData,
} from './components/ComponentTestUtils';

// --------------------------------------------- TO BE MODULARIZED --------------------------------------------------

export {
  ConnectionEditor_StringEditor,
  ConnectionEditor_BooleanEditor,
  ConnectionEditor_ArrayEditor,
} from './components/editor/edit-panel/connection-editor/RelationalDatabaseConnectionEditor';
export { NewServiceModal } from './components/editor/edit-panel/service-editor/NewServiceModal';
export { EmbeddedRuntimeEditor } from './components/editor/edit-panel/RuntimeEditor';
export * from './stores/DSLGenerationSpecification_EditorPlugin_Extension';

export * from './stores/StoreRelational_EditorPlugin_Extension';
export { ServicePureExecutionState } from './stores/editor-state/element-editor-state/service/ServiceExecutionState';
export {
  RuntimeEditorState,
  decorateRuntimeWithNewMapping,
} from './stores/editor-state/element-editor-state/RuntimeEditorState';
export { MappingExecutionState as MappingExecutionState } from './stores/editor-state/element-editor-state/mapping/MappingExecutionState';
export { MappingTestState } from './stores/editor-state/element-editor-state/mapping/MappingTestState';
