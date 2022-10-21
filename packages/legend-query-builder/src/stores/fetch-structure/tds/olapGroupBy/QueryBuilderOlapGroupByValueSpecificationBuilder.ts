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
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graphManager/QueryBuilderSupportedFunctions.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import { getFunctionNameFromTDSSortColumn } from '../QueryBuilderTDSHelper.js';
import {
  type QueryBuilderOlapGroupByColumnState,
  type QueryBuilderOlapGroupByState,
  QueryBuilderTDSOlapAggreationOperatorState,
} from './QueryBuilderOlapGroupByState.js';

const appendOlapGroupByColumnState = (
  olapGroupByColumnState: QueryBuilderOlapGroupByColumnState,
  lambda: LambdaFunction,
): LambdaFunction => {
  const graph =
    olapGroupByColumnState.olapState.tdsState.queryBuilderState
      .graphManagerState.graph;
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const typeString = graph.getPrimitiveType(PRIMITIVE_TYPE.STRING);

  // create window cols expression
  const windowColumns = olapGroupByColumnState.windowColumns.map((column) => {
    const stringInstance = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(typeString)),
      multiplicityOne,
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
      multiplicityOne,
    );
    const sortColInstance = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(typeString)),
      multiplicityOne,
    );
    sortColInstance.values = [sortByState.columnState.columnName];
    sortByFunction.parametersValues[0] = sortColInstance;
  }

  // create olap operation expression
  const operationState = olapGroupByColumnState.operationState;
  const olapFunc = extractElementNameFromPath(operationState.operator.pureFunc);
  const olapFuncExpression = new SimpleFunctionExpression(
    olapFunc,
    multiplicityOne,
  );
  olapFuncExpression.parametersValues = [
    new VariableExpression(operationState.lambdaParameterName, multiplicityOne),
  ];
  const olapLambdaFuncInstance = buildGenericLambdaFunctionInstanceValue(
    operationState.lambdaParameterName,
    [olapFuncExpression],
    graph,
  );
  let olapAggregationExpression: SimpleFunctionExpression | undefined;
  if (operationState instanceof QueryBuilderTDSOlapAggreationOperatorState) {
    // column param
    const olapAggregateColumn = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(typeString)),
      multiplicityOne,
    );
    olapAggregateColumn.values = [operationState.columnState.columnName];
    // build `meta::pure::tds::func`
    olapAggregationExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FUNC),
      multiplicityOne,
    );
    olapAggregationExpression.parametersValues = [
      olapAggregateColumn,
      olapLambdaFuncInstance,
    ];
  }
  const olapOperationExpression =
    olapAggregationExpression ?? olapLambdaFuncInstance;

  // OLAP column nam expression
  const olapColumn = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(typeString)),
    multiplicityOne,
  );
  olapColumn.values = [olapGroupByColumnState.columnName];

  // create main expression
  const olapExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY),
    multiplicityOne,
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

export const appendOlapGroupByState = (
  olapGroupByState: QueryBuilderOlapGroupByState,
  lambda: LambdaFunction,
): LambdaFunction => {
  olapGroupByState.olapColumns.forEach((c) =>
    appendOlapGroupByColumnState(c, lambda),
  );
  return lambda;
};
