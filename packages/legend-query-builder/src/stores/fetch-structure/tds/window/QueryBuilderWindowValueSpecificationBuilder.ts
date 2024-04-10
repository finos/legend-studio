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
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import { getFunctionNameFromTDSSortColumn } from '../QueryBuilderTDSHelper.js';
import {
  type QueryBuilderWindowColumnState,
  type QueryBuilderWindowState,
  QueryBuilderTDS_WindowAggreationOperatorState,
} from './QueryBuilderWindowState.js';

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
  const olapFunc = extractElementNameFromPath(operationState.operator.pureFunc);
  const olapFuncExpression = new SimpleFunctionExpression(olapFunc);
  olapFuncExpression.parametersValues = [
    new VariableExpression(
      operationState.lambdaParameterName,
      Multiplicity.ONE,
    ),
  ];
  const olapLambdaFuncInstance = buildGenericLambdaFunctionInstanceValue(
    operationState.lambdaParameterName,
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

export const appendOLAPGroupByState = (
  olapGroupByState: QueryBuilderWindowState,
  lambda: LambdaFunction,
): LambdaFunction => {
  olapGroupByState.windowColumns.forEach((c) =>
    appendOLAPGroupByColumnState(c, lambda),
  );
  return lambda;
};
