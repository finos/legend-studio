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

export * from './application/LegendApplication.js';
export * from './application/LegendApplicationConfig.js';
export * from './application/LegendApplicationPluginManager.js';
export * from './application/LegendApplicationEvent.js';
export * from './application/LegendApplicationTelemetry.js';
export * from './application/LegendApplicationSetting.js';
export { LEGEND_APPLICATION_COLOR_THEME } from './application/LegendApplicationTheme.js';

export * from './components/ApplicationStoreProvider.js';
export * from './components/WebApplicationNavigatorProvider.js';
export * from './components/LegendApplicationComponentFrameworkProvider.js';
export * from './components/useApplicationNavigationContext.js';
export * from './components/useCommands.js';
export * from './components/ApplicationStoreProviderTestUtils.js';
export * from './components/WebApplicationNavigatorProviderTestUtils.js';

export * from './stores/ApplicationStore.js';
export { WebApplicationNavigator } from './stores/navigation/WebApplicationNavigator.js';
export {
  NavigationService,
  type NavigationAddress,
  type NavigationLocation,
  type NavigationZone,
} from './stores/navigation/NavigationService.js';
export * from './stores/storage/ApplicationStorage.js';
export * from './stores/storage/StorageService.js';
export * from './stores/SettingService.js';
export * from './stores/DocumentationService.js';
export * from './stores/CommandService.js';
export * from './stores/event/EventService.js';
export * from './stores/event/IframeEventNotifierPlugin.js';
export * from './stores/TelemetryService.js';
export * from './stores/NotificationService.js';
export * from './stores/AlertService.js';
export * from './stores/AssistantService.js';
export * from './stores/ApplicationNavigationContextService.js';
export * from './stores/LegendApplicationPlugin.js';
export * from './stores/Core_LegendApplicationPlugin.js';

export * from './stores/ApplicationStoreTestUtils.js';
export * from './stores/navigation/WebApplicationRouter.js';
export { DISPLAY_ANSI_ESCAPE } from './stores/terminal/Terminal.js';

// ------------------------------------------- TO BE MOVED -------------------------------------------

// TODO: move to `@finos/legend-graph-editor`
export {
  PURE_GRAMMAR_TOKEN,
  setupPureLanguageService,
} from './stores/pure-language/PureLanguageSupport.js';
export * from './stores/pure-language/PureLanguageCodeEditorSupport.js';
export * from './components/shared/PackageableElementOptionLabel.js';
export * from './stores/shared/PackageableElementOption.js';
