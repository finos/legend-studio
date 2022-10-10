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

export * from './const.js';

export * from './application/LegendApplicationPluginManager.js';
export * from './application/LegendApplication.js';
export * from './components/ApplicationStoreProvider.js';
export * from './components/WebApplicationNavigatorProvider.js';
export * from './components/LegendApplicationComponentFrameworkProvider.js';
export * from './components/ApplicationNavigationContextServiceUtils.js';
export * from './components/ApplicationStoreProviderTestUtils.js';
export * from './components/WebApplicationNavigatorProviderTestUtils.js';
// TODO: consider moving this to `LegendApplicationComponentFrameworkProvider`
// once we think we can add virtual assistant support for all apps
export * from './components/VirtualAssistant.js';

export * from './stores/ApplicationStore.js';
export * from './stores/ApplicationTelemetry.js';
export * from './stores/ApplicationEvent.js';
export * from './application/LegendApplicationConfig.js';
export { WebApplicationNavigator } from './stores/WebApplicationNavigator.js';
export * from './stores/DocumentationService.js';
export * from './stores/EventService.js';
export * from './stores/AssistantService.js';
export * from './stores/ApplicationNavigationContextService.js';
export * from './stores/LegendApplicationPlugin.js';

export * from './components/shared/TextSearchAdvancedConfigMenu.js';
export * from './stores/shared/TextSearchAdvancedConfigState.js';

export * from './stores/ApplicationStoreTestUtils.js';
export * from './stores/WebApplicationRouter.js';

// ------------------------------------------- Shared components -------------------------------------------

export * from './components/shared/DocumentationLink.js';
export * from './components/shared/TextInputEditor.js';
export * from './components/shared/LambdaEditor.js';
export * from './components/shared/BasicValueSpecificationEditor.js';
export * from './components/shared/LambdaParameterValuesEditor.js';
export * from './components/shared/PackageableElementOptionLabel.js';
export * from './components/shared/execution-plan-viewer/ExecutionPlanViewer.js';

export { LambdaEditorState } from './stores/shared/LambdaEditorState.js';
export * from './stores/shared/PackageableElementOption.js';
export * from './stores/shared/LambdaParameterState.js';
export * from './stores/shared/ValueSpecificationModifierHelper.js';
export * from './stores/shared/ExecutionPlanState.js';
