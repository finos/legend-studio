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
  type ColSpec,
  ColSpecArrayInstance,
  ColSpecInstanceValue,
  FunctionExpression,
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
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderState } from '../../../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../../../QueryBuilderStateBuilder.js';
import {
  getTDSColumnState,
  getTDSColSortTypeFromFunctionName,
  getRelationSortColumnFromFunctionName,
} from '../QueryBuilderTDSHelper.js';
import { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import {
  type QueryBuilderTDS_WindowOperatorState,
  WindowGroupByColumnSortByState,
  QueryBuilderWindowColumnState,
  QueryBuilderTDS_WindowAggreationOperatorState,
  QueryBuilderTDS_WindowRankOperatorState,
} from './QueryBuilderWindowState.js';
import type { QueryBuilderTDSColumnState } from '../QueryBuilderTDSColumnState.js';

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
    operatorState.setLambdaParameterNames([
      guaranteeType(
        operationLambda.functionType.parameters[0],
        VariableExpression,
        `Can't process olapGroupBy() operation lambda: only support olapGroupBy() operation lambda with 1 parameter of type 'VariableExpression'`,
      ).name,
    ]);
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
    operatorState.setLambdaParameterNames([
      guaranteeType(
        operationLambda.functionType.parameters[0],
        VariableExpression,
        `Can't process olapGroupBy() operation lambda: only support olapGroupBy() operation lambda with 1 parameter of type 'VariableExpression'`,
      ).name,
    ]);
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

const process_WindowOperatorState = (
  colSpec: ColSpec,
  tdsState: QueryBuilderTDSState,
): QueryBuilderTDS_WindowOperatorState => {
  if (colSpec.function2) {
    //process function 1
    const function1Lambda = guaranteeType(
      guaranteeType(colSpec.function1, LambdaFunctionInstanceValue).values[0],
      LambdaFunction,
    );
    const function1Column = guaranteeType(
      function1Lambda.expressionSequence[0],
      FunctionExpression,
      `Can't process typed window aggregation: expects function1 to be a Function Expression`,
    );
    const aggColumnState = getTDSColumnState(
      tdsState,
      function1Column.functionName,
    );

    //process function2
    const aggLambda = guaranteeType(
      guaranteeType(colSpec.function2, LambdaFunctionInstanceValue).values[0],
      LambdaFunction,
    );
    const aggFunctionExp = guaranteeType(
      aggLambda.expressionSequence[0],
      SimpleFunctionExpression,
    );

    const operation = guaranteeNonNullable(
      tdsState.windowState.findOperator(aggFunctionExp.functionName, true),
      `Operator '${aggFunctionExp.functionName}' not supported yet for typed TDS`,
    );

    const operatorState = new QueryBuilderTDS_WindowAggreationOperatorState(
      tdsState.windowState,
      operation,
      aggColumnState,
    );

    //add parameter vlaues
    const lambdaParameters: string[] = [];
    function1Lambda.functionType.parameters.forEach((param) => {
      guaranteeType(param, VariableExpression);
      lambdaParameters.push(param.name);
    });
    const aggLambdaParamName = guaranteeType(
      aggLambda.functionType.parameters[0],
      VariableExpression,
    ).name;
    lambdaParameters.push(aggLambdaParamName);
    operatorState.setLambdaParameterNames(lambdaParameters);
    return operatorState;
  } else if (colSpec.function1) {
    //TODO: implement rowNumber as part of rank functions
    const rankLambda = guaranteeType(
      guaranteeType(colSpec.function1, LambdaFunctionInstanceValue).values[0],
      LambdaFunction,
    );
    assertTrue(rankLambda.expressionSequence.length === 1);
    const operationFunctionExp = guaranteeType(
      rankLambda.expressionSequence[0],
      SimpleFunctionExpression,
    );

    const operation = guaranteeNonNullable(
      tdsState.windowState.findOperator(
        operationFunctionExp.functionName,
        true,
      ),
      `Operator '${operationFunctionExp.functionName}' not supported yet for typed TDS`,
    );

    const operatorState = new QueryBuilderTDS_WindowRankOperatorState(
      tdsState.windowState,
      operation,
    );

    const operatorParameters: string[] = [];
    rankLambda.functionType.parameters.forEach((param) => {
      guaranteeType(param, VariableExpression);
      operatorParameters.push(param.name);
    });
    operatorState.setLambdaParameterNames(operatorParameters);

    return operatorState;
  } else {
    throw new UnsupportedOperationError(
      `Only support aggregation and rank operators in extend() expression`,
    );
  }
};

export const processTDS_ExtendExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  if (expression.parametersValues.length === 3) {
    const relationExpression = guaranteeType(
      expression.parametersValues[0],
      SimpleFunctionExpression,
      `Can't process extend() expression: only support extend() immediately following an expression`,
    );
    QueryBuilderValueSpecificationProcessor.process(
      relationExpression,
      parentLambda,
      queryBuilderState,
    );

    const windowExpression = guaranteeType(
      expression.parametersValues[1],
      SimpleFunctionExpression,
      `Can't process extend() expression: expects a window expression as the second parameter`,
    );

    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    //TODO: handle over() with ColSpec as the first parameter
    const windowColumnsSpec = guaranteeType(
      windowExpression.parametersValues[0],
      ColSpecArrayInstance,
      `Can't process over(): expects ColSpecArray for window columns`,
    );

    const windowColSpecArray = guaranteeNonNullable(
      windowColumnsSpec.values[0],
    );
    const windowColumns: QueryBuilderTDSColumnState[] =
      windowColSpecArray.colSpecs.map((colSpec) =>
        getTDSColumnState(tdsState, colSpec.name),
      );

    let sortByState: WindowGroupByColumnSortByState | undefined;
    if (
      windowExpression.parametersValues[1] instanceof CollectionInstanceValue
    ) {
      const sortByExpression = guaranteeType(
        windowExpression.parametersValues[1].values[0],
        SimpleFunctionExpression,
        `Can't process extend sortBy expression: only support function expression of 'ascending' or 'descending'`,
      );

      const sortByFunctionName = sortByExpression.functionName;
      const colSortType =
        getRelationSortColumnFromFunctionName(sortByFunctionName);
      const colSortVal = guaranteeIsString(
        guaranteeType(
          sortByExpression.parametersValues[0],
          ColSpecInstanceValue,
          'Can`t process extend sort column : extend sort column should be a colspec instance value',
        ).values[0]?.name,
        'Can`t process extend sort column: extend sort column should be a string colspec instance value',
      );
      const sortColState = getTDSColumnState(tdsState, colSortVal);
      sortByState = new WindowGroupByColumnSortByState(
        sortColState,
        colSortType,
      );
    }

    //process third extend() parameter
    const operatorColSpecInstance = guaranteeType(
      expression.parametersValues[2],
      ColSpecArrayInstance,
      `Can't process extend(): expects ColSpecArrayInstance for aggregation columns`,
    );
    const operatorColSpecArray = guaranteeNonNullable(
      operatorColSpecInstance.values[0],
    );

    operatorColSpecArray.colSpecs.forEach((colSpec) => {
      const operatorState = process_WindowOperatorState(colSpec, tdsState);

      const windowColumnState = new QueryBuilderWindowColumnState(
        tdsState.windowState,
        windowColumns,
        sortByState,
        operatorState,
        colSpec.name,
      );

      tdsState.windowState.addWindowColumn(windowColumnState);
      tdsState.setShowWindowFuncPanel(true);
    });
  } else {
    throw new UnsupportedOperationError(
      `Can't build relation extend() expression: extend() is not fully supported yet`,
    );
  }
};
