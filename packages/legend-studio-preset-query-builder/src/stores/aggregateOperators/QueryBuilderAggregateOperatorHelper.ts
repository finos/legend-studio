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

import type { ValueSpecification } from '@finos/legend-studio';
import {
  SimpleFunctionExpression,
  AbstractPropertyExpression,
  extractElementNameFromPath,
  matchFunctionName,
  VariableExpression,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-studio';
import { guaranteeType, assertTrue } from '@finos/legend-studio-shared';
import type {
  QueryBuilderAggregateColumnState,
  QueryBuilderAggregateOperator,
} from '../QueryBuilderAggregationState';

export const buildAggregateExpression = (
  aggregateColumnState: QueryBuilderAggregateColumnState,
  operatorFunctionFullPath: string,
): ValueSpecification => {
  const multiplicityOne =
    aggregateColumnState.editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const expression = new SimpleFunctionExpression(
    extractElementNameFromPath(operatorFunctionFullPath),
    multiplicityOne,
  );
  expression.parametersValues.push(
    new VariableExpression(
      aggregateColumnState.lambdaVariableName,
      multiplicityOne,
    ),
  );
  return expression;
};

export const buildAggregateColumnState = (
  aggregateColumnState: QueryBuilderAggregateColumnState,
  expression: SimpleFunctionExpression,
  operatorFunctionFullPath: string,
  operator: QueryBuilderAggregateOperator,
): QueryBuilderAggregateColumnState | undefined => {
  if (matchFunctionName(expression.functionName, operatorFunctionFullPath)) {
    assertTrue(
      expression.parametersValues.length === 1,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expects no argument`,
    );

    let currentExpression: ValueSpecification = expression.parametersValues[0];
    while (currentExpression instanceof AbstractPropertyExpression) {
      currentExpression = currentExpression.parametersValues[0];
    }
    const variableExpression = guaranteeType(
      currentExpression,
      VariableExpression,
    );

    assertTrue(
      aggregateColumnState.lambdaVariableName === variableExpression.name,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects variable used in lambda body '${
        variableExpression.name
      }' to match lambda parameter '${
        aggregateColumnState.lambdaVariableName
      }'`,
    );

    assertTrue(
      operator.isCompatibleWithColumn(aggregateColumnState),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: property is not compatible with operator`,
    );
    aggregateColumnState.setOperator(operator);

    return aggregateColumnState;
  }

  return undefined;
};
