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

// Graph
export * from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
export * from '../graph/metamodel/pure/model/packageableElements/mapping/DSL_DataSpace_MappingIncludeDataSpace.js';
export * from '../graph/DSL_DataSpace_MetaModelConst.js';
export * from './DSL_DataSpaceAnalyticsHelper.js';
export * from './DSL_DataSpace_GraphManagerPreset.js';
export {
  PURE_DATA_SPACE_INFO_PROFILE_PATH,
  PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
  PURE_DATA_SPACE_INFO_PROFILE_IN_DEVELOPMENT_STEREOTYPE,
  PURE_DATA_SPACE_INFO_PROFILE_EXTERNAL_STEREOTYPE,
  PURE_DATA_SPACE_INFO_PROFILE_RELATED_DATA_SPACES_TAG,
  PURE_DATA_SPACE_INFO_PROFILE_DEPRECATION_NOTICE_TAG,
} from './DSL_DataSpace_PureGraphManagerPlugin.js';

export { V1_DataSpaceAnalysisResult } from './protocol/pure/v1/engine/analytics/V1_DataSpaceAnalysis.js';

export {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  DATA_SPACE_ELEMENT_POINTER,
  extractDataSpaceTaxonomyNodes,
} from './protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';

export * from './DSL_DataSpace_GraphManagerHelper.js';
export { DSL_DataSpace_getGraphManagerExtension } from './protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';

export * from './action/analytics/DataSpaceAnalysis.js';
export * from './action/analytics/DataSpaceAnalysisHelper.js';
export * from './protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
export * from '../stores/shared/DataSpaceInfo.js';
export * from '../stores/query-builder/DataSpaceQueryBuilderState.js';

export {
  observe_DataSpace,
  observe_DataSpaceDiagram,
  observe_DataSpaceElementPointer,
  observe_DataSpaceExecutable,
  observe_DataSpaceExecutionContext,
  observe_DataSpaceMappingProvider,
  observe_DataSpaceOperationalMetadata,
  observe_DataSpaceSupportInfo,
} from '../graph-manager/action/changeDetection/DSL_DataSpace_ObserverHelper.js';
export {
  V1_DataSpaceExecutionContext,
  V1_DataSpace,
  V1_DataSpaceMappingProvider,
} from '../graph-manager/protocol/pure/v1/model/packageableElements/dataSpace/V1_DSL_DataSpace_DataSpace.js';
export {
  V1_deserializeDataSpace,
  V1_serializeDataSpace,
} from '../graph-manager/protocol/pure/v1/transformation/pureProtocol/V1_DSL_DataSpace_ProtocolHelper.js';
