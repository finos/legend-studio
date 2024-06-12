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
  type PureModel,
  type ValueSpecification,
  SimpleFunctionExpression,
  extractElementNameFromPath,
  matchFunctionName,
  VariableExpression,
  Multiplicity,
} from '@finos/legend-graph';
import { guaranteeType, assertTrue } from '@finos/legend-shared';
import { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState.js';
import type { QueryBuilderProjectionColumnState } from '../../projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderAggregateOperator } from '../QueryBuilderAggregateOperator.js';

export const buildAggregateExpression = (
  operatorFunctionFullPath: string,
  variableName: string,
  graph: PureModel,
): ValueSpecification => {
  const expression = new SimpleFunctionExpression(
    extractElementNameFromPath(operatorFunctionFullPath),
  );
  expression.parametersValues.push(
    new VariableExpression(variableName, Multiplicity.ONE),
  );
  return expression;
};

export const buildAggregateColumnState = (
  projectionColumnState: QueryBuilderProjectionColumnState,
  lambdaParam: VariableExpression,
  expression: SimpleFunctionExpression,
  operatorFunctionFullPath: string,
  operator: QueryBuilderAggregateOperator,
): QueryBuilderAggregateColumnState | undefined => {
  if (matchFunctionName(expression.functionName, operatorFunctionFullPath)) {
    const aggregateColumnState = new QueryBuilderAggregateColumnState(
      projectionColumnState.tdsState.aggregationState,
      projectionColumnState,
      operator,
    );
    aggregateColumnState.setLambdaParameterName(lambdaParam.name);

    assertTrue(
      expression.parametersValues.length === 1,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expects no argument`,
    );

    // variable
    const variableExpression = guaranteeType(
      expression.parametersValues[0],
      VariableExpression,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() immediately following a variable expression`,
    );
    assertTrue(
      aggregateColumnState.lambdaParameterName === variableExpression.name,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects variable used in lambda body '${
        variableExpression.name
      }' to match lambda parameter '${
        aggregateColumnState.lambdaParameterName
      }'`,
    );

    // operator
    assertTrue(
      operator.isCompatibleWithColumn(
        aggregateColumnState.projectionColumnState,
      ),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: property is not compatible with operator`,
    );
    aggregateColumnState.setOperator(operator);
    return aggregateColumnState;
  }

  return undefined;
};
