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
  AbstractPropertyExpression,
  DerivedProperty,
  INTERNAL__PropagatedValue,
  matchFunctionName,
  SimpleFunctionExpression,
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  getNullableFirstElement,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graphManager/QueryBuilderSupportedFunctions.js';
import type { QueryBuilderState } from './QueryBuilderState.js';

/**
 * Gets the value of ValueSpecification given INTERNAL__PropagatedValue is pointing to.
 */
const getValueOfInternalPropagatedValue = (
  valueSpec: INTERNAL__PropagatedValue,
): ValueSpecification => {
  if (valueSpec.getValue() instanceof INTERNAL__PropagatedValue) {
    return getValueOfInternalPropagatedValue(
      guaranteeType(valueSpec.getValue(), INTERNAL__PropagatedValue),
    );
  }
  return valueSpec.getValue();
};

export const buildPropertyExpressionChain = (
  propertyExpression: AbstractPropertyExpression,
  queryBuilderState: QueryBuilderState,
  /**
   * As of now, we don't support date propagation for aggregation-class functions
   * so we have this temporary flag to disable date propagation, there could be other
   * functions that we need to handle, then we will revise this approach
   * See https://github.com/finos/legend-studio/issues/1471
   */
  TEMPORARY__disableDatePropagation?: boolean,
): ValueSpecification => {
  const newPropertyExpression = new AbstractPropertyExpression('');
  newPropertyExpression.func = propertyExpression.func;
  newPropertyExpression.parametersValues = [
    ...propertyExpression.parametersValues,
  ];

  let nextExpression: ValueSpecification | undefined;
  let currentExpression: ValueSpecification | undefined = newPropertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    nextExpression = getNullableFirstElement(
      currentExpression.parametersValues,
    );
    if (nextExpression instanceof AbstractPropertyExpression) {
      const parameterValue = new AbstractPropertyExpression('');
      parameterValue.func = nextExpression.func;
      parameterValue.parametersValues = [...nextExpression.parametersValues];
      nextExpression = parameterValue;
      currentExpression.parametersValues[0] = parameterValue;
    }
    if (
      currentExpression instanceof AbstractPropertyExpression &&
      currentExpression.func.value instanceof DerivedProperty
    ) {
      const currentPropertyExpression = currentExpression;
      const parameterValues = currentExpression.parametersValues.slice(1);
      parameterValues.forEach((parameterValue, index) => {
        if (parameterValue instanceof INTERNAL__PropagatedValue) {
          // Replace with argumentless derived property expression only when default date propagation is supported
          if (
            !TEMPORARY__disableDatePropagation &&
            parameterValue.isPropagatedValue
          ) {
            // NOTE: For `bitemporal` property check if the property expression has parameters which are not instance of
            // `INTERNAL_PropagatedValue` then pass the parameters as user explicitly changed values of either of the parameters.
            if (
              (index === 1 &&
                currentPropertyExpression.parametersValues.length === 3) ||
              (index === 0 &&
                currentPropertyExpression.parametersValues.length === 3 &&
                !(
                  currentPropertyExpression.parametersValues[2] instanceof
                    INTERNAL__PropagatedValue &&
                  currentPropertyExpression.parametersValues[2]
                    .isPropagatedValue === true
                ))
            ) {
              currentPropertyExpression.parametersValues[index + 1] =
                getValueOfInternalPropagatedValue(parameterValue);
            } else {
              currentPropertyExpression.parametersValues = [
                guaranteeNonNullable(
                  guaranteeType(currentExpression, AbstractPropertyExpression)
                    .parametersValues[0],
                ),
              ];
            }
          } else {
            currentPropertyExpression.parametersValues[index + 1] =
              getValueOfInternalPropagatedValue(parameterValue);
          }
        }
      });
    }
    currentExpression = nextExpression;
    // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
    // $x.employees->subType(@Person)->subType(@Staff)
    while (
      currentExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      currentExpression = getNullableFirstElement(
        currentExpression.parametersValues,
      );
    }
  }
  return newPropertyExpression;
};

export type LambdaFunctionBuilderOption = {
  /**
   * Set queryBuilderState to `true` when we construct query for execution within the app.
   * queryBuilderState will make the lambda function building process overrides several query values, such as the row limit.
   */
  isBuildingExecutionQuery?: boolean | undefined;
  keepSourceInformation?: boolean | undefined;
};
