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
  type ValueSpecification,
  extractElementNameFromPath,
  matchFunctionName,
  LambdaFunctionInstanceValue,
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  LambdaFunction,
} from '@finos/legend-graph';
import {
  guaranteeType,
  guaranteeNonNullable,
  assertTrue,
} from '@finos/legend-shared';
import {
  FilterConditionState,
  FilterValueSpecConditionValueState,
  type QueryBuilderFilterState,
} from '../QueryBuilderFilterState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graph/QueryBuilderMetaModelConst.js';
import { simplifyValueExpression } from '../../QueryBuilderValueSpecificationHelper.js';
import type { QueryBuilderFilterOperator } from '../QueryBuilderFilterOperator.js';
import { buildPropertyExpressionChain } from '../../QueryBuilderValueSpecificationBuilderHelper.js';

export const buildFilterConditionExpression = (
  filterConditionState: FilterConditionState,
  operatorFunctionFullPath: string,
  lambdaParameterName?: string | undefined,
): ValueSpecification => {
  const expression = new SimpleFunctionExpression(
    extractElementNameFromPath(operatorFunctionFullPath),
  );
  const propertyExpression = buildPropertyExpressionChain(
    filterConditionState.propertyExpressionState.propertyExpression,
    filterConditionState.propertyExpressionState.queryBuilderState,
    lambdaParameterName ?? filterConditionState.filterState.lambdaParameterName,
  );
  expression.parametersValues.push(guaranteeNonNullable(propertyExpression));
  // NOTE: there are simple operators which do not require any params (e.g. isEmpty)
  if (
    filterConditionState.rightConditionValue &&
    filterConditionState.rightConditionValue instanceof
      FilterValueSpecConditionValueState &&
    filterConditionState.rightConditionValue.value !== undefined
  ) {
    expression.parametersValues.push(
      filterConditionState.rightConditionValue.value,
    );
  }
  return expression;
};

export const buildFilterConditionState = (
  filterState: QueryBuilderFilterState,
  expression: SimpleFunctionExpression,
  operatorFunctionFullPath: string,
  operator: QueryBuilderFilterOperator,
  /**
   * Use this flag for operator that does not require any param (e.g. isEmpty)
   * NOTE: this is not the cleanest way to do this, if we find ourselves adding more and more customization
   * to this utility function, we should just create a bunch of different methods
   */
  hasNoValue = false,
): FilterConditionState | undefined => {
  let filterConditionState: FilterConditionState | undefined;
  // This is the simple expression of form `{property} {operator} {value}`
  // This is used for post-build checks (useful when this expression is nested inside a longer
  // chain of expression, e.g. ->exists($x|x == 'something'), etc.)
  let mainExpressionWithOperator: SimpleFunctionExpression | undefined;

  if (matchFunctionName(expression.functionName, operatorFunctionFullPath)) {
    assertTrue(
      expression.parametersValues.length === (hasNoValue ? 1 : 2),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expects ${hasNoValue ? 'no argument' : '1 argument'}`,
    );

    const propertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects property expression in lambda body`,
    );

    filterConditionState = new FilterConditionState(
      filterState,
      propertyExpression,
    );
    mainExpressionWithOperator = expression;
  } else if (
    matchFunctionName(
      expression.functionName,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXISTS,
    )
  ) {
    const lambdaFunctionInstance = guaranteeType(
      expression.parametersValues[1],
      LambdaFunctionInstanceValue,
    );
    const lambdaFunction = guaranteeType(
      lambdaFunctionInstance.values[0],
      LambdaFunction,
    );
    const filterExpression = guaranteeType(
      lambdaFunction.expressionSequence[0],
      SimpleFunctionExpression,
    );
    assertTrue(
      filterExpression.parametersValues.length === (hasNoValue ? 1 : 2),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expects ${hasNoValue ? 'no argument' : '1 argument'}`,
    );

    const propertyExpression = guaranteeType(
      filterExpression.parametersValues[0],
      AbstractPropertyExpression,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects property expression in lambda body`,
    );

    filterConditionState = new FilterConditionState(
      filterState,
      propertyExpression,
    );
    mainExpressionWithOperator = filterExpression;
  }

  // Post-build check: make sure the simple filter condition LHS, RHS, and operator are compatible
  // and set the value of the condition in the state accordingly.
  if (filterConditionState && mainExpressionWithOperator) {
    assertTrue(
      operator.isCompatibleWithFilterConditionProperty(filterConditionState),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: property is not compatible with operator`,
    );
    filterConditionState.setOperator(operator);

    // value
    const value = mainExpressionWithOperator.parametersValues[1];
    if (hasNoValue || !value) {
      filterConditionState.setRightConditionValue(undefined);
    } else {
      filterConditionState.setRightConditionValue(
        new FilterValueSpecConditionValueState(
          filterConditionState,
          simplifyValueExpression(
            value,
            filterConditionState.filterState.queryBuilderState.observerContext,
          ),
        ),
      );
    }
    if (!operator.isCompatibleWithFilterConditionValue(filterConditionState)) {
      filterConditionState.setRightConditionValue(
        new FilterValueSpecConditionValueState(
          filterConditionState,
          operator.getDefaultFilterConditionValue(filterConditionState),
        ),
      );
    }
    return filterConditionState;
  }
  return undefined;
};
