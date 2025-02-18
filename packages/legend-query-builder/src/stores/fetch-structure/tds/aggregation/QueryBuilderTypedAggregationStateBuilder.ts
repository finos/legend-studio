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
  RelationType,
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
    `Can't process typed aggregation ColSpec: only supported when used within a groupBy() expression`,
  );

  // Check that there are 2 lambdas, one for map and one for reduce
  const mapLambdaFunctionInstance = guaranteeType(
    colSpec.function1,
    LambdaFunctionInstanceValue,
    `Can't process colSpec: function1 is not a lambda function instance value`,
  );
  assertTrue(
    mapLambdaFunctionInstance.values.length === 1,
    `Can't process typed aggregation ColSpec. function1 should only have 1 lambda value.`,
  );
  assertTrue(
    guaranteeNonNullable(mapLambdaFunctionInstance.values[0]).expressionSequence
      .length === 1,
    `Can't process typed aggregation ColSpec. function1 lambda should only have 1 expression.`,
  );

  const reduceLambdaFunctionInstance = guaranteeType(
    colSpec.function2,
    LambdaFunctionInstanceValue,
    `Can't process colSpec: function2 is not a lambda function instance value`,
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
    const reduceLambdaFunction = guaranteeNonNullable(
      reduceLambdaFunctionInstance.values[0],
      `Can't process colSpec: function2 lambda function is missing`,
    );
    assertTrue(
      reduceLambdaFunction.expressionSequence.length === 1,
      `Can't process colSpec: only support colSpec function2 lambda body with 1 expression`,
    );
    assertTrue(
      reduceLambdaFunction.functionType.parameters.length === 1,
      `Can't process colSpec function2 lambda: only support lambda with 1 parameter`,
    );
    const reduceFunctionExpression = guaranteeType(
      reduceLambdaFunction.expressionSequence[0],
      SimpleFunctionExpression,
      `Can't process colSpec: only support colSpec function2 lambda body with 1 expression`,
    );

    const lambdaParam = guaranteeType(
      reduceLambdaFunction.functionType.parameters[0],
      VariableExpression,
      `Can't process colSpec function2 lambda: parameter is missing`,
    );

    for (const operator of aggregationState.operators) {
      // NOTE: this allow plugin author to either return `undefined` or throw error
      // if there is a problem with building the lambda. Either case, the plugin is
      // considered as not supporting the lambda.
      const aggregateColumnState = returnUndefOnError(() =>
        operator.buildAggregateColumnState(
          reduceFunctionExpression,
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

        // Update parent groupBy() expression's return type with this column's return type
        // (a temporary return type was set when we processed the groupBy() protocol)
        const parentGroupByRelationType = guaranteeType(
          parentExpression?.genericType?.value.typeArguments?.[0]?.value
            .rawType,
          RelationType,
          `Can't process colSpec: parent groupBy() expression's return type is not a relation`,
        );
        const relationTypeColumn = guaranteeNonNullable(
          parentGroupByRelationType.columns.find(
            (_column) => _column.name === colSpec.name,
          ),
          `Can't process colSpec: Can't find column '${colSpec.name}' in parent groupBy() expression's relation return type`,
        );
        relationTypeColumn.type =
          aggregateColumnState.getColumnType() ?? relationTypeColumn.type;
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

  // check preceding expression is relation project, then process the project
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process groupBy() expression: only support groupBy() immediately following an expression`,
  );
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

  // process normal (non-aggregation) columns (ensure columns exist in project expression)
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

  // process aggregation columns
  const aggregationLambdas = expression.parametersValues[2];
  assertType(
    aggregationLambdas,
    ColSpecArrayInstance,
    `Can't process groupBy() expression: groupBy() expects argument #2 to be a ColSpecArrayInstance`,
  );
  QueryBuilderValueSpecificationProcessor.processChild(
    aggregationLambdas,
    expression,
    parentLambda,
    queryBuilderState,
  );
};

export const isTypedGroupByExpression = (
  expression: SimpleFunctionExpression,
): boolean => {
  return (
    expression.functionName ===
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_GROUP_BY ||
    (matchFunctionName(expression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_GROUP_BY,
    ]) &&
      expression.parametersValues.length === 3 &&
      expression.parametersValues[1] instanceof ColSpecArrayInstance)
  );
};
