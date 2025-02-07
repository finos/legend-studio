/**
 * Copyright (c) 2025-present, Goldman Sachs
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
  ColSpecArrayInstance,
} from '@finos/legend-graph';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../../QueryBuilderFetchStructureImplementationState.js';
import { assertTrue, assertType, guaranteeType } from '@finos/legend-shared';
import {
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type QueryBuilderState,
} from '../../../QueryBuilderState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { QueryBuilderValueSpecificationProcessor } from '../../../QueryBuilderStateBuilder.js';

export const processTypedGroupByExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // update fetch-structureTABULAR_DATA_STRUCTURE
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.TABULAR_DATA_STRUCTURE,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 3,
    `Can't process groupBy() expression: groupBy() expects 2 arguments`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process groupBy() expression: only support groupBy() immediately following an expression`,
  );

  // TODO: Confirm that the below assumption is true
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
    ]),
    `Can't process groupBy() expression: only support groupBy() immediately following relation project()`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // process columns
  const columnExpressions = expression.parametersValues[1];
  assertType(
    columnExpressions,
    ColSpecArrayInstance,
    `Can't process groupBy() expression: groupBy() expects argument #1 to be a ColSpecArrayInstance`,
  );
  queryBuilderState.setLambdaWriteMode(
    QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
  );
  QueryBuilderValueSpecificationProcessor.processChild(
    columnExpressions,
    expression,
    parentLambda,
    queryBuilderState,
  );

  // process aggregations
  const aggregateLambdas = expression.parametersValues[2];
  assertType(
    aggregateLambdas,
    ColSpecArrayInstance,
    `Can't process groupBy() expression: groupBy() expects argument #2 to be a ColSpecArrayInstance`,
  );
  QueryBuilderValueSpecificationProcessor.processChild(
    aggregateLambdas,
    expression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  // if (
  //   queryBuilderState.fetchStructureState.implementation instanceof
  //   QueryBuilderTDSState
  // ) {
  //   const tdsState = queryBuilderState.fetchStructureState.implementation;
  //   tdsState.projectionColumns.forEach((column, idx) =>
  //     column.setColumnName(aliases[idx] as string),
  //   );
  // }
};

export const isTypedGroupByExpression = (
  expression: SimpleFunctionExpression,
): boolean => {
  if (
    matchFunctionName(expression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_GROUP_BY,
    ])
  ) {
    if (expression.parametersValues.length === 3) {
      return expression.parametersValues[1] instanceof ColSpecArrayInstance;
    }
  }
  return false;
};
