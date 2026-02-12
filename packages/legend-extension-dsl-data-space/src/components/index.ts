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

export * from '../__lib__/DSL_DataSpace_LegendApplicationNavigation.js';
export * from '../__lib__/shared/DSL_DataSpace_LegendNavigation.js';

export * from '../__lib__/DSL_DataSpace_LegendApplicationCommand.js';
export { DSL_DataSpace_LegendApplicationPlugin } from './DSL_DataSpace_LegendApplicationPlugin.js';
export { DataSpaceViewer } from './DataSpaceViewer.js';
export * from '../stores/DSL_DataSpace_LegendApplicationPlugin_Extension.js';
export { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
export { DataSpaceQueryBuilderState } from '../stores/query-builder/DataSpaceQueryBuilderState.js';
export {
  ResolvedDataSpaceEntityWithOrigin,
  extractDataSpaceInfo,
} from '../stores/shared/DataSpaceInfo.js';

export * from '../stores/shared/DataSpaceUtils.js';

export * from './shared/DSL_DataSpace_Icon.js';
