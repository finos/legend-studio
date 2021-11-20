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

export * from './DSLDataSpace_Extension';
export { DSLDataSpace_LegendStudioPlugin } from './components/studio/DSLDataSpace_LegendStudioPlugin';
export { DSLDataSpace_LegendQueryPlugin } from './components/query/DSLDataSpace_LegendQueryPlugin';

export { DataSpaceViewer } from './components/DataSpaceViewer';

export {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceTaxonomyNodePaths,
  getResolvedDataSpace,
} from './models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';

export { DataSpaceViewerState } from './stores/DataSpaceViewerState';
