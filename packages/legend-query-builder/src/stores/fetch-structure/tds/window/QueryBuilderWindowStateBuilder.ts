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
  LambdaFunction,
  LambdaFunctionInstanceValue,
  matchFunctionName,
  PrimitiveInstanceValue,
  SimpleFunctionExpression,
  VariableExpression,
} from '@finos/legend-graph';
import {
  assertTrue,
  assertType,
  guaranteeIsString,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderState } from '../../../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../../../QueryBuilderStateBuilder.js';
import {
  getTDSColumnState,
  getTDSColSortTypeFromFunctionName,
} from '../QueryBuilderTDSHelper.js';
import { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import {
  type QueryBuilderTDS_WindowOperatorState,
  WindowGroupByColumnSortByState,
  QueryBuilderWindowColumnState,
  QueryBuilderTDS_WindowAggreationOperatorState,
  QueryBuilderTDS_WindowRankOperatorState,
} from './QueryBuilderWindowState.js';

export const processTDS_OLAPGroupByExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check parameters
  const parametersLength = expression.parametersValues.length;
  assertTrue(
    parametersLength === 4 || parametersLength === 5,
    `Can't process sort() expression: olapGroupBy() expects 3 or 4 argument`,
  );

  // expected expressions
  const containsSortByExpression = parametersLength === 5;
  const windowColumnsExpression = expression.parametersValues[1];
  const sortByValueSpec = containsSortByExpression
    ? expression.parametersValues[2]
    : undefined;
  const olapOperationExpression = containsSortByExpression
    ? expression.parametersValues[3]
    : expression.parametersValues[2];
  const olapColumnExpression = containsSortByExpression
    ? expression.parametersValues[4]
    : expression.parametersValues[3];

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process olapGroupBy() expression: only support olapGroupBy() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
    ]),
    `Can't process olapGroupBy() expression: only support olapGroupBy() in TDS expression`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // process window columns
  const tdsState = guaranteeType(
    queryBuilderState.fetchStructureState.implementation,
    QueryBuilderTDSState,
  );
  assertType(
    windowColumnsExpression,
    CollectionInstanceValue,
    `Can't process olapGroupBy() expression: olapGroupBy() expects argument #1 to be a collection`,
  );
  const windowColumns = windowColumnsExpression.values.map((value) => {
    const columnName = guaranteeIsString(
      guaranteeType(
        value,
        PrimitiveInstanceValue,
        'Can`t process OLAP window column expression: Column should be a primitive instance value',
      ).values[0],
      'Can`t process OLAP window column expression: Column should be a string primitive instance value',
    );
    return getTDSColumnState(tdsState, columnName);
  });

  // process sortBy
  let sortByState: WindowGroupByColumnSortByState | undefined;
  if (containsSortByExpression) {
    const sortByExpression = guaranteeType(
      sortByValueSpec,
      SimpleFunctionExpression,
      `Can't process olapGroupBy sortBy expression: only support function expression of 'asc' or 'desc'`,
    );
    const sortByFunctionName = sortByExpression.functionName;
    const colSortType = getTDSColSortTypeFromFunctionName(sortByFunctionName);
    const colSortVal = guaranteeIsString(
      guaranteeType(
        sortByExpression.parametersValues[0],
        PrimitiveInstanceValue,
        'Can`t process OLAP sort column : OLAP sort column should be a primitive instance value',
      ).values[0],
      'Can`t process OLAP sort column: OLAP sort column should be a string primitive instance value',
    );
    const sortColState = getTDSColumnState(tdsState, colSortVal);
    sortByState = new WindowGroupByColumnSortByState(sortColState, colSortType);
  }
  // process olap operation
  let operatorState: QueryBuilderTDS_WindowOperatorState;
  if (olapOperationExpression instanceof SimpleFunctionExpression) {
    assertTrue(
      matchFunctionName(olapOperationExpression.functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FUNC,
      ]),
      `Can't process olapGroupBy() operation expression: olapGroupBy() aggregation should contain function 'func'`,
    );
    const olapOperationExpressionParams =
      olapOperationExpression.parametersValues;
    const columnName = guaranteeIsString(
      guaranteeType(
        olapOperationExpressionParams[0],
        PrimitiveInstanceValue,
        'Can`t process OLAP opperation expression: Function `func` first parameter should be a primitive instance value',
      ).values[0],
      'Can`t process OLAP opperation expression: Function `func` first parameter should be a string primitive instance value',
    );
    const oppColumnState = getTDSColumnState(tdsState, columnName);
    const operationLambda = guaranteeType(
      guaranteeType(
        olapOperationExpressionParams[1],
        LambdaFunctionInstanceValue,
      ).values[0],
      LambdaFunction,
    );
    assertTrue(operationLambda.expressionSequence.length === 1);
    const operationFunctionExp = guaranteeType(
      operationLambda.expressionSequence[0],
      SimpleFunctionExpression,
    );
    const operation = guaranteeNonNullable(
      tdsState.windowState.findOperator(operationFunctionExp.functionName),
      `olapGroupBy() operator '${operationFunctionExp.functionName}' not supported`,
    );
    operatorState = new QueryBuilderTDS_WindowAggreationOperatorState(
      tdsState.windowState,
      operation,
      oppColumnState,
    );
    operatorState.setLambdaParameterName(
      guaranteeType(
        operationLambda.functionType.parameters[0],
        VariableExpression,
        `Can't process olapGroupBy() operation lambda: only support olapGroupBy() operation lambda with 1 parameter of type 'VariableExpression'`,
      ).name,
    );
  } else {
    const operationLambda = guaranteeType(
      guaranteeType(olapOperationExpression, LambdaFunctionInstanceValue)
        .values[0],
      LambdaFunction,
    );
    assertTrue(operationLambda.expressionSequence.length === 1);
    const operationFunctionExp = guaranteeType(
      operationLambda.expressionSequence[0],
      SimpleFunctionExpression,
    );
    const operation = guaranteeNonNullable(
      tdsState.windowState.findOperator(operationFunctionExp.functionName),
      `olapGroupBy() operator '${operationFunctionExp.functionName}' not supported`,
    );
    assertTrue(
      !operation.isColumnAggregator(),
      `Operator '${operation.getLabel()}' expects a TDS column to aggregate against`,
    );
    operatorState = new QueryBuilderTDS_WindowRankOperatorState(
      tdsState.windowState,
      operation,
    );
    operatorState.setLambdaParameterName(
      guaranteeType(
        operationLambda.functionType.parameters[0],
        VariableExpression,
        `Can't process olapGroupBy() operation lambda: only support olapGroupBy() operation lambda with 1 parameter of type 'VariableExpression'`,
      ).name,
    );
  }

  // main col
  const olapColumnValue = guaranteeIsString(
    guaranteeType(
      olapColumnExpression,
      PrimitiveInstanceValue,
      'Can`t process OLAP column: OLAP column should be a primitive instance value',
    ).values[0],
    'Can`t process OLAP column: OLAP column should be a string primitive instance value',
  );
  const olapGroupByColumnState = new QueryBuilderWindowColumnState(
    tdsState.windowState,
    windowColumns,
    sortByState,
    operatorState,
    olapColumnValue,
  );
  tdsState.windowState.addWindowColumn(olapGroupByColumnState);
  tdsState.setShowWindowFuncPanel(true);
};
