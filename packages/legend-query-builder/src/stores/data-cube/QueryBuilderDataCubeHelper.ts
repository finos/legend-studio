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

import {
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type QueryBuilderState,
} from '../QueryBuilderState.js';
import { RuntimePointer } from '@finos/legend-graph';
import { QueryBuilderDataCubeEngine } from './QueryBuilderDataCubeEngine.js';
import { buildExecutionParameterValues } from '../shared/LambdaParameterState.js';
import { QueryBuilderDataCubeViewerState } from './QueryBuilderDataCubeViewerState.js';

export const createDataCubeViewerStateFromQueryBuilder = async (
  queryBuilderState: QueryBuilderState,
): Promise<QueryBuilderDataCubeViewerState | undefined> => {
  const runtimePath =
    queryBuilderState.executionContextState.runtimeValue instanceof
    RuntimePointer
      ? queryBuilderState.executionContextState.runtimeValue.packageableRuntime
          .value.path
      : undefined;
  if (!runtimePath) {
    return undefined;
  }
  const mappingPath = queryBuilderState.executionContextState.mapping?.path;
  const currentLambdaWriterMode = queryBuilderState.lambdaWriteMode;
  // ensure we write in new tds mode
  queryBuilderState.setLambdaWriteMode(
    QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
  );
  const parameterValues = buildExecutionParameterValues(
    queryBuilderState.parametersState.parameterStates,
    queryBuilderState.graphManagerState,
  );
  const lambda = queryBuilderState.buildQuery();
  const engine = new QueryBuilderDataCubeEngine(
    lambda,
    parameterValues,
    mappingPath,
    runtimePath,
    queryBuilderState.graphManagerState,
    queryBuilderState,
  );
  queryBuilderState.setLambdaWriteMode(currentLambdaWriterMode);
  const query = await engine.generateInitialSpecification();
  return new QueryBuilderDataCubeViewerState(query, engine);
};
