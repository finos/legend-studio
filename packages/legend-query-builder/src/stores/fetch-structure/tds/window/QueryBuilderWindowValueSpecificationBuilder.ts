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
  CollectionInstanceValue,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  SimpleFunctionExpression,
  VariableExpression,
  Multiplicity,
  PrimitiveType,
  ColSpec,
  ColSpecArray,
  ColSpecArrayInstance,
  ColSpecInstanceValue,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import {
  getFunctionNameFromTDSSortColumn,
  getFunctionNameFromRelationSortColumn,
} from '../QueryBuilderTDSHelper.js';
import {
  type QueryBuilderWindowColumnState,
  type QueryBuilderWindowState,
  QueryBuilderTDS_WindowAggreationOperatorState,
} from './QueryBuilderWindowState.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '@finos/legend-data-cube';
import {
  DEFAULT_WINDOW_FUNCTION_PARTITION_VAR_NAME,
  DEFAULT_WINDOW_FUNCTION_ROW_VAR_NAME,
  DEFAULT_WINDOW_FUNCTION_WINDOW_VAR_NAME,
} from '../../../QueryBuilderConfig.js';

const appendOLAPGroupByColumnState = (
  olapGroupByColumnState: QueryBuilderWindowColumnState,
  lambda: LambdaFunction,
): LambdaFunction => {
  const graph =
    olapGroupByColumnState.windowState.tdsState.queryBuilderState
      .graphManagerState.graph;

  // create window cols expression
  const windowColumns = olapGroupByColumnState.windowColumns.map((column) => {
    const stringInstance = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );
    stringInstance.values = [column.columnName];
    return stringInstance;
  });

  const windowCollectionExpression = new CollectionInstanceValue(
    graph.getMultiplicity(windowColumns.length, windowColumns.length),
  );
  windowCollectionExpression.values = windowColumns;

  // create sortBy expression
  let sortByFunction: SimpleFunctionExpression | undefined;
  if (olapGroupByColumnState.sortByState) {
    const sortByState = olapGroupByColumnState.sortByState;
    sortByFunction = new SimpleFunctionExpression(
      getFunctionNameFromTDSSortColumn(sortByState.sortType),
    );
    const sortColInstance = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );
    sortColInstance.values = [sortByState.columnState.columnName];
    sortByFunction.parametersValues[0] = sortColInstance;
  }

  // create olap operation expression
  const operationState = olapGroupByColumnState.operatorState;
  const lambdaParameterName =
    operationState.lambdaParameterNames[0] ?? DEFAULT_LAMBDA_VARIABLE_NAME;
  const olapFunc = extractElementNameFromPath(operationState.operator.pureFunc);
  const olapFuncExpression = new SimpleFunctionExpression(olapFunc);
  olapFuncExpression.parametersValues = [
    new VariableExpression(lambdaParameterName, Multiplicity.ONE),
  ];
  const olapLambdaFuncInstance = buildGenericLambdaFunctionInstanceValue(
    lambdaParameterName,
    [olapFuncExpression],
    graph,
  );
  let olapAggregationExpression: SimpleFunctionExpression | undefined;
  if (operationState instanceof QueryBuilderTDS_WindowAggreationOperatorState) {
    // column param
    const olapAggregateColumn = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );
    olapAggregateColumn.values = [operationState.columnState.columnName];
    // build `meta::pure::tds::func`
    olapAggregationExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FUNC),
    );
    olapAggregationExpression.parametersValues = [
      olapAggregateColumn,
      olapLambdaFuncInstance,
    ];
  }
  const olapOperationExpression =
    olapAggregationExpression ?? olapLambdaFuncInstance;

  // OLAP column name expression
  const olapColumn = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  olapColumn.values = [olapGroupByColumnState.columnName];

  // create main expression
  const olapExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY),
  );
  const currentExpression = guaranteeNonNullable(lambda.expressionSequence[0]);
  olapExpression.parametersValues = [
    ...[currentExpression, windowCollectionExpression],
    ...(sortByFunction ? [sortByFunction] : []),
    ...[olapOperationExpression, olapColumn],
  ];
  lambda.expressionSequence[0] = olapExpression;
  return lambda;
};

export const appendOverExpression = (
  extendColumnState: QueryBuilderWindowColumnState,
): SimpleFunctionExpression => {
  const overExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_OVER),
  );

  //TODO: handle over() where the first parameter is a ColSpec
  const colSpecArrayInstance = new ColSpecArrayInstance(
    Multiplicity.ONE,
    undefined,
  );
  const colSpecArray = new ColSpecArray();
  colSpecArrayInstance.values = [colSpecArray];

  extendColumnState.windowColumns.forEach((column) => {
    const colSpec = new ColSpec();
    colSpec.name = column.columnName;
    colSpecArray.colSpecs.push(colSpec);
  });
  overExpression.parametersValues.push(colSpecArrayInstance);

  if (extendColumnState.sortByState) {
    const sortByState = extendColumnState.sortByState;
    const sortByFunction = new SimpleFunctionExpression(
      getFunctionNameFromRelationSortColumn(sortByState.sortType),
    );
    const sortColSpec = new ColSpecInstanceValue(Multiplicity.ONE, undefined);
    const sortCol = new ColSpec();
    sortCol.name = sortByState.columnState.columnName;
    sortColSpec.values = [sortCol];
    sortByFunction.parametersValues[0] = sortColSpec;

    const sortByCollection = new CollectionInstanceValue(Multiplicity.ONE);
    sortByCollection.values = [sortByFunction];

    overExpression.parametersValues.push(sortByCollection);
  }

  return overExpression;
};

const appendExtendColumnState = (
  extendColumnState: QueryBuilderWindowColumnState,
  lambda: LambdaFunction,
): LambdaFunction => {
  const graph =
    extendColumnState.windowState.tdsState.queryBuilderState.graphManagerState
      .graph;

  const overExpression = appendOverExpression(extendColumnState);

  const operatorColSpecArrayInst = new ColSpecArrayInstance(
    Multiplicity.ONE,
    undefined,
  );
  const operatorColSpecArray = new ColSpecArray();
  operatorColSpecArrayInst.values = [operatorColSpecArray];

  const operatorColSpec = new ColSpec();
  operatorColSpec.name = extendColumnState.columnName;

  const operatorState = extendColumnState.operatorState;
  if (operatorState.lambdaParameterNames.length === 1) {
    //this was previously nontyped, so need to add window function parameters
    operatorState.setLambdaParameterNames([
      DEFAULT_WINDOW_FUNCTION_PARTITION_VAR_NAME,
      DEFAULT_WINDOW_FUNCTION_WINDOW_VAR_NAME,
      DEFAULT_WINDOW_FUNCTION_ROW_VAR_NAME,
    ]);
  }

  //TODO: handle aggregation operators
  const operatorFunc = extractElementNameFromPath(
    operatorState.operator.pureFunc,
  );
  const operatorFuncExpression = new SimpleFunctionExpression(operatorFunc);

  const lambdaParameters: VariableExpression[] = [];
  operatorState.lambdaParameterNames.forEach((paramName) => {
    lambdaParameters.push(new VariableExpression(paramName, Multiplicity.ONE));
  });
  operatorFuncExpression.parametersValues = lambdaParameters;

  const rankLambda = buildGenericLambdaFunctionInstanceValue(
    operatorState.lambdaParameterNames[0] ??
      DEFAULT_WINDOW_FUNCTION_PARTITION_VAR_NAME,
    [operatorFuncExpression],
    graph,
  );

  //skip over the first parameter since it was added in buildGenericLambdaFunctionInstanceValue()
  lambdaParameters.slice(1).forEach((param) => {
    rankLambda.values[0]?.functionType.parameters.push(param);
  });
  operatorColSpec.function1 = rankLambda;
  operatorColSpecArray.colSpecs.push(operatorColSpec);

  const extendExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_EXTEND,
    ),
  );

  const currentExpression = guaranteeNonNullable(lambda.expressionSequence[0]);
  extendExpression.parametersValues = [
    currentExpression,
    overExpression,
    operatorColSpecArrayInst,
  ];

  lambda.expressionSequence[0] = extendExpression;
  return lambda;
};

export const appendWindowFunctionState = (
  olapGroupByState: QueryBuilderWindowState,
  lambda: LambdaFunction,
): LambdaFunction => {
  const typedTds =
    olapGroupByState.tdsState.queryBuilderState.isFetchStructureTyped;
  if (typedTds) {
    olapGroupByState.windowColumns.forEach((c) =>
      appendExtendColumnState(c, lambda),
    );
  } else {
    olapGroupByState.windowColumns.forEach((c) =>
      appendOLAPGroupByColumnState(c, lambda),
    );
  }
  return lambda;
};
