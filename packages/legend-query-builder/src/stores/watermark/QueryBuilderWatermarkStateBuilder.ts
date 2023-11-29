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
  type LambdaFunction,
  SimpleFunctionExpression,
  matchFunctionName,
} from '@finos/legend-graph';
import { assertTrue, guaranteeType } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../QueryBuilderStateBuilder.js';

export const processWatermarkExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process forWatermark() expression: only support forWatermark() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
    ]),
    `Can't process forWatermark() expression: only support forWatermark() immediately following getAll()`,
  );

  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  const watermarkValue = expression.parametersValues[1];
  queryBuilderState.watermarkState.setValue(watermarkValue);
};
