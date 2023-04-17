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
export * from './application/LegendQuery.js';
export * from './application/LegendQueryApplicationConfig.js';
export * from './application/LegendQueryPluginManager.js';
export * from './application/LegendQueryEvent.js';
export * from './application/LegendQueryEventHelper.js';
export {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './components/LegendQueryFrameworkProvider.js';
export type { LegendQueryApplicationStore } from './stores/LegendQueryBaseStore.js';
export { generateExistingQueryEditorRoute } from './application/LegendQueryNavigation.js';

// stores
export * from './stores/LegendQueryApplicationPlugin.js';
export { BaseQuerySetupStore } from './stores/QuerySetupStore.js';
export {
  createViewProjectHandler,
  createViewSDLCProjectHandler,
  QueryEditorStore,
  ExistingQueryEditorStore,
  type QueryExportConfiguration,
} from './stores/QueryEditorStore.js';

// components
export {
  QueryEditorStoreContext,
  useQueryEditorStore,
} from './components/QueryEditorStoreProvider.js';
export { QueryEditor } from './components/QueryEditor.js';
