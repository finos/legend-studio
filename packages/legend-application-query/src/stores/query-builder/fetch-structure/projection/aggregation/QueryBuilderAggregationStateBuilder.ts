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
  CollectionInstanceValue,
  LambdaFunctionInstanceValue,
  matchFunctionName,
  SimpleFunctionExpression,
  VariableExpression,
} from '@finos/legend-graph';
import {
  assertTrue,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graphManager/QueryBuilderSupportedFunctions.js';
import type { QueryBuilderState } from '../../../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../../../QueryBuilderStateBuilder.js';
import { extractNullableStringFromInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../../QueryBuilderFetchStructureImplementationState.js';
import { QueryBuilderProjectionState } from '../QueryBuilderProjectionState.js';

export const processTDSAggregateExpression = (
  expression: SimpleFunctionExpression,
  parentExpression: SimpleFunctionExpression | undefined,
  queryBuilderState: QueryBuilderState,
): void => {
  // check parent expression
  assertTrue(
    Boolean(
      parentExpression &&
        matchFunctionName(
          parentExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        ),
    ),
    `Can't process agg() expression: only support agg() used within a groupBy() expression`,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process agg() expression: agg() expects 2 arguments`,
  );

  // process column lambda
  QueryBuilderValueSpecificationProcessor.processChild(
    // TODO?: do we want to do more validation here for the shape of the column lambda?
    guaranteeNonNullable(expression.parametersValues[0]),
    expression,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderProjectionState
  ) {
    const projectionState =
      queryBuilderState.fetchStructureState.implementation;
    const aggregationState = projectionState.aggregationState;
    // NOTE: since we process agg() expressions one by one, we know that the current agg()
    // always correspond to the last column projection state, based on our processing procedure
    const projectionColumnState = guaranteeNonNullable(
      projectionState.columns[projectionState.columns.length - 1],
    );
    const aggregateLambda = expression.parametersValues[1];
    assertType(
      aggregateLambda,
      LambdaFunctionInstanceValue,
      `Can't process agg() expression: agg() expects argument #1 to be a lambda function`,
    );

    const lambdaFunc = guaranteeNonNullable(
      aggregateLambda.values[0],
      `Can't process agg() lambda: agg() lambda function is missing`,
    );
    assertTrue(
      lambdaFunc.expressionSequence.length === 1,
      `Can't process agg() lambda: only support agg() lambda body with 1 expression`,
    );
    const aggregateColumnExpression = guaranteeType(
      lambdaFunc.expressionSequence[0],
      SimpleFunctionExpression,
      `Can't process agg() lambda: only support agg() lambda body with 1 expression`,
    );

    assertTrue(
      lambdaFunc.functionType.parameters.length === 1,
      `Can't process agg() lambda: only support agg() lambda with 1 parameter`,
    );

    const lambdaParam = guaranteeType(
      lambdaFunc.functionType.parameters[0],
      VariableExpression,
      `Can't process agg() lambda: only support agg() lambda with 1 parameter`,
    );

    for (const operator of aggregationState.operators) {
      // NOTE: this allow plugin author to either return `undefined` or throw error
      // if there is a problem with building the lambda. Either case, the plugin is
      // considered as not supporting the lambda.
      const aggregateColumnState = returnUndefOnError(() =>
        operator.buildAggregateColumnState(
          aggregateColumnExpression,
          lambdaParam,
          projectionColumnState,
        ),
      );
      if (aggregateColumnState) {
        aggregationState.addColumn(aggregateColumnState);
        return;
      }
    }
    throw new UnsupportedOperationError(
      `Can't process aggregate expression function: no compatible aggregate operator processer available from plugins`,
    );
  }
};

export const processTDSGroupByExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  // update fetch-structure
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.PROJECTION,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 4,
    `Can't process groupBy() expression: groupBy() expects 3 arguments`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process groupBy() expression: only support groupBy() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_ALL,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
    ]),
    `Can't process groupBy() expression: only support groupBy() immediately following either getAll() or filter()`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    queryBuilderState,
  );

  // process columns
  const columnExpressions = expression.parametersValues[1];
  assertType(
    columnExpressions,
    CollectionInstanceValue,
    `Can't process groupBy() expression: groupBy() expects argument #1 to be a collection`,
  );
  columnExpressions.values.map((value) =>
    QueryBuilderValueSpecificationProcessor.processChild(
      value,
      expression,
      queryBuilderState,
    ),
  );

  // process aggregations
  const aggregateLambdas = expression.parametersValues[2];
  assertType(
    aggregateLambdas,
    CollectionInstanceValue,
    `Can't process groupBy() expression: groupBy() expects argument #2 to be a collection`,
  );
  aggregateLambdas.values.map((value) =>
    QueryBuilderValueSpecificationProcessor.processChild(
      value,
      expression,
      queryBuilderState,
    ),
  );

  // process column aliases
  const columnAliases = expression.parametersValues[3];
  assertType(
    columnAliases,
    CollectionInstanceValue,
    `Can't process groupBy() expression: groupBy() expects argument #3 to be a collection`,
  );
  assertTrue(
    columnAliases.values.length ===
      columnExpressions.values.length + aggregateLambdas.values.length,
    `Can't process groupBy() expression: number of aliases does not match the number of columns`,
  );
  const aliases = columnAliases.values
    .map(extractNullableStringFromInstanceValue)
    .filter(isNonNullable);

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderProjectionState
  ) {
    const projectionState =
      queryBuilderState.fetchStructureState.implementation;
    projectionState.columns.forEach((column, idx) =>
      column.setColumnName(aliases[idx] as string),
    );
  }
};
