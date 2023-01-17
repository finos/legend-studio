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

export * from './stores/QueryBuilderBootstraper.js';
export { QueryBuilder_GraphManagerPreset } from './graphManager/QueryBuilder_GraphManagerPreset.js';

export { QUERY_BUILDER_TEST_ID } from './components/QueryBuilder_TestID.js';
export { QueryBuilder_LegendApplicationPlugin } from './components/QueryBuilder_LegendApplicationPlugin.js';
export { QueryBuilderNavigationBlocker } from './components/QueryBuilderNavigationBlocker.js';
export {
  QueryBuilder,
  QUERY_BUILDER_BACKDROP_CONTAINER_ID,
} from './components/QueryBuilder.js';
export { QueryBuilderState } from './stores/QueryBuilderState.js';

export { QueryBuilderPropertySearchState } from './stores/explorer/QueryBuilderPropertySearchState.js';
export {
  QueryBuilderClassSelector,
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
} from './components/QueryBuilderSideBar.js';
export { ClassQueryBuilderState } from './stores/workflows/ClassQueryBuilderState.js';
export { MappingQueryBuilderState } from './stores/workflows/MappingQueryBuilderState.js';
export {
  type ServiceExecutionContext,
  ServiceQueryBuilderState,
} from './stores/workflows/ServiceQueryBuilderState.js';

export { getQueryBuilderGraphManagerExtension } from './graphManager/protocol/pure/QueryBuilder_PureGraphManagerExtension.js';
export type { ServiceExecutionAnalysisResult } from './graphManager/action/analytics/ServiceExecutionAnalysis.js';
export type { MappingRuntimeCompatibilityAnalysisResult } from './graphManager/action/analytics/MappingRuntimeCompatibilityAnalysis.js';
export * from './stores/ServiceInfo.js';
export * from './components/ServiceQuerySetupUtils.js';
export * from './components/QuerySetupUtils.js';
export * from './components/QueryBuilderTextEditor.js';

export { TEST__setUpQueryBuilder } from './components/QueryBuilderComponentTestUtils.js';

// ------------------------------------------- Shared components -------------------------------------------

export * from './components/shared/LambdaEditor.js';
export * from './components/shared/BasicValueSpecificationEditor.js';
export * from './components/shared/LambdaParameterValuesEditor.js';

export { LambdaEditorState } from './stores/shared/LambdaEditorState.js';
export * from './stores/shared/LambdaParameterState.js';
export * from './stores/shared/ValueSpecificationModifierHelper.js';
export * from './stores/shared/ValueSpecificationEditorHelper.js';
export { QueryBuilderTextEditorMode } from './stores/QueryBuilderTextEditorState.js';
