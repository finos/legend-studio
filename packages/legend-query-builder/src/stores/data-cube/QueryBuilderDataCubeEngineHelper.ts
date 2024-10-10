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

import { type DataCubeEngine } from '@finos/legend-data-cube';
import {
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type QueryBuilderState,
} from '../QueryBuilderState.js';
import { RuntimePointer } from '@finos/legend-graph';
import { QueryBuilderDataCubeEngine } from './QueryBuilderDataCubeEngine.js';
import { buildExecutionParameterValues } from '../shared/LambdaParameterState.js';

export const createDataCubeEngineFromQueryBuilder = (
  queryBuilderState: QueryBuilderState,
): DataCubeEngine | undefined => {
  const runtime =
    queryBuilderState.executionContextState.runtimeValue instanceof
    RuntimePointer
      ? queryBuilderState.executionContextState.runtimeValue.packageableRuntime
          .value.path
      : undefined;
  if (!runtime) {
    return undefined;
  }
  const currentLambdaWriterMode = queryBuilderState.lambdaWriteMode;
  // ensure we write in new tds mode
  queryBuilderState.setLambdaWriteMode(
    QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
  );
  const parameterValues = buildExecutionParameterValues(
    queryBuilderState.parametersState.parameterStates,
    queryBuilderState.graphManagerState,
  );
  const queryBuilderEngine = new QueryBuilderDataCubeEngine(
    queryBuilderState.buildQuery(),
    parameterValues,
    queryBuilderState.executionContextState.mapping?.path,
    runtime,
    queryBuilderState.graphManagerState,
  );
  queryBuilderState.setLambdaWriteMode(currentLambdaWriterMode);
  return queryBuilderEngine;
};
