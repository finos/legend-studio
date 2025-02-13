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
  type ColSpec,
  type LambdaFunction,
  ColSpecArrayInstance,
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
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type QueryBuilderState,
} from '../../../QueryBuilderState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { QueryBuilderValueSpecificationProcessor } from '../../../QueryBuilderStateBuilder.js';
import { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { QueryBuilderAggregateOperator_Wavg } from './operators/QueryBuilderAggregateOperator_Wavg.js';

export const processTypedAggregationColSpec = (
  colSpec: ColSpec,
  parentExpression: SimpleFunctionExpression | undefined,
  queryBuilderState: QueryBuilderState,
): void => {
  // check parent expression
  assertTrue(
    Boolean(
      parentExpression &&
        matchFunctionName(
          parentExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_GROUP_BY,
        ),
    ),
    `Can't process typed aggregate ColSpec: only supported when used within a groupBy() expression`,
  );

  // Check that there are 2 lambdas, one for column selection and 1 for aggregation
  const columnLambdaFuncInstance = guaranteeType(
    colSpec.function1,
    LambdaFunctionInstanceValue,
    `Can't process colSpec: function1 not a lambda function instance value`,
  );
  assertTrue(columnLambdaFuncInstance.values.length === 1);
  assertTrue(
    guaranteeNonNullable(columnLambdaFuncInstance.values[0]).expressionSequence
      .length === 1,
  );

  const aggregationLambdaFuncInstance = guaranteeType(
    colSpec.function2,
    LambdaFunctionInstanceValue,
    `Can't process colSpec: function2 not a lambda function instance value`,
  );
  assertTrue(aggregationLambdaFuncInstance.values.length === 1);
  assertTrue(
    guaranteeNonNullable(aggregationLambdaFuncInstance.values[0])
      .expressionSequence.length === 1,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const tdsState = queryBuilderState.fetchStructureState.implementation;
    const aggregationState = tdsState.aggregationState;
    const projectionColumnState = guaranteeNonNullable(
      tdsState.projectionColumns.find(
        (projectionColumn) => projectionColumn.columnName === colSpec.name,
      ),
      `Projection column with name ${colSpec.name} not found`,
    );
    const aggregateLambdaFunc = guaranteeNonNullable(
      aggregationLambdaFuncInstance.values[0],
      `Can't process colSpec: function2 lambda function is missing`,
    );
    assertTrue(
      aggregateLambdaFunc.expressionSequence.length === 1,
      `Can't process colSpec: only support colSpec function2 lambda body with 1 expression`,
    );
    const aggregateColumnExpression = guaranteeType(
      aggregateLambdaFunc.expressionSequence[0],
      SimpleFunctionExpression,
      `Can't process colSpec: only support colSpec function2 lambda body with 1 expression`,
    );

    assertTrue(
      aggregateLambdaFunc.functionType.parameters.length === 1,
      `Can't process colSpec function2 lambda: only support lambda with 1 parameter`,
    );

    const lambdaParam = guaranteeType(
      aggregateLambdaFunc.functionType.parameters[0],
      VariableExpression,
      `Can't process colSpec function2 lambda: only support lambda with 1 parameter`,
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
      if (
        projectionColumnState.wavgWeight &&
        aggregateColumnState &&
        aggregateColumnState.operator instanceof
          QueryBuilderAggregateOperator_Wavg
      ) {
        aggregateColumnState.operator.setWeight(
          projectionColumnState.wavgWeight,
        );
      }
      if (aggregateColumnState) {
        aggregationState.addColumn(aggregateColumnState);
        return;
      }
    }
  }
  throw new UnsupportedOperationError(
    `Can't process aggregate expression function: no compatible aggregate operator processer available from plugins`,
  );
};

export const processTypedGroupByExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
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

  const tdsState = guaranteeType(
    queryBuilderState.fetchStructureState.implementation,
    QueryBuilderTDSState,
  );

  // process columns (ensure columns exist in project expression)
  const columnExpressions = guaranteeType(
    expression.parametersValues[1],
    ColSpecArrayInstance,
    `Can't process groupBy() expression: groupBy() expects argument #1 to be a ColSpecArrayInstance`,
  );
  assertTrue(
    columnExpressions.values.length === 1,
    `Can't process groupBy() expression: groupBy() expects argument #1 to be a ColSpecArrayInstance with 1 element`,
  );
  queryBuilderState.setLambdaWriteMode(
    QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
  );
  columnExpressions.values[0]?.colSpecs.forEach((colSpec) => {
    assertTrue(
      tdsState.projectionColumns.filter(
        (projectedColumn) => projectedColumn.columnName === colSpec.name,
      ).length === 1,
      `Can't process groupBy() expression: column '${colSpec.name}' not found in project() expression`,
    );
  });

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
