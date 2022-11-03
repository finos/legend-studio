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
  Class,
  DerivedProperty,
  getMilestoneTemporalStereotype,
  INTERNAL__PropagatedValue,
  matchFunctionName,
  MILESTONING_STEREOTYPE,
  SimpleFunctionExpression,
  type VariableExpression,
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  getNullableFirstElement,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graphManager/QueryBuilderSupportedFunctions.js';
import { getDerivedPropertyMilestoningSteoreotype } from './QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';

/**
 * Checks if the provided property expression match the criteria for default
 * date propagation so we know whether we need to fill in values for the parameter
 * or just propgate values from the parent's expression
 *
 * NOTE: this takes date propgation into account. See the table below for all
 * the combination:
 *
 *             | [source] |          |          |          |          |
 * ----------------------------------------------------------------------
 *   [target]  |          |   NONE   |  PR_TMP  |  BI_TMP  |  BU_TMP  |
 * ----------------------------------------------------------------------
 *             |   NONE   |   N.A.   |   PRD    | PRD,BUD  |    BUD   |
 * ----------------------------------------------------------------------
 *             |  PR_TMP  |   N.A.   |    X     | PRD,BUD  |    BUD   |
 * ----------------------------------------------------------------------
 *             |  BI_TMP  |   N.A.   |    X     |    X     |    X     |
 * ----------------------------------------------------------------------
 *             |  BU_TMP  |   N.A.   |   PRD    | PRD,BUD  |    X     |
 * ----------------------------------------------------------------------
 *
 * Annotations:
 *
 * [source]: source temporal type
 * [target]: target temporal type
 *
 * PR_TMP  : processing temporal
 * BI_TMP  : bitemporal
 * BU_TMP  : business temporal
 *
 * X       : no default date propagated
 * PRD     : default processing date is propagated
 * BUD     : default business date is propgated
 */
const isDefaultDatePropagationSupported = (
  currentPropertyExpression: AbstractPropertyExpression,
  queryBuilderState: QueryBuilderState,
  prevPropertyExpression?: AbstractPropertyExpression | undefined,
): boolean => {
  const property = currentPropertyExpression.func.value;
  const graph = queryBuilderState.graphManagerState.graph;
  // Default date propagation is not supported for current expression when the previous property expression is a derived property.
  if (
    prevPropertyExpression &&
    prevPropertyExpression.func.value instanceof DerivedProperty &&
    prevPropertyExpression.func.value._OWNER.derivedProperties.includes(
      prevPropertyExpression.func.value,
    )
  ) {
    return false;
  }
  // Default date propagation is not supported for current expression when the milestonedParameterValues of
  // the previous property expression doesn't match with the global milestonedParameterValues
  if (
    prevPropertyExpression &&
    prevPropertyExpression.func.value.genericType.value.rawType instanceof Class
  ) {
    const milestoningStereotype = getMilestoneTemporalStereotype(
      prevPropertyExpression.func.value.genericType.value.rawType,
      graph,
    );
    if (
      milestoningStereotype &&
      !prevPropertyExpression.parametersValues
        .slice(1)
        .every(
          (parameterValue) =>
            parameterValue instanceof INTERNAL__PropagatedValue,
        )
    ) {
      return false;
    }
  }
  if (property.genericType.value.rawType instanceof Class) {
    // the stereotype of source class of current property expression.
    const sourceStereotype =
      property instanceof DerivedProperty
        ? getDerivedPropertyMilestoningSteoreotype(property, graph)
        : undefined;
    // Default date propagation is always supported if the source is `bitemporal`
    if (sourceStereotype === MILESTONING_STEREOTYPE.BITEMPORAL) {
      return true;
    }
    // the stereotype (if exists) of the generic type of current property expression.
    const targetStereotype = getMilestoneTemporalStereotype(
      property.genericType.value.rawType,
      graph,
    );
    // Default date propagation is supported when stereotype of both source and target matches
    if (sourceStereotype && targetStereotype) {
      return sourceStereotype === targetStereotype;
    }
  }
  return false;
};

export const buildPropertyExpressionChain = (
  propertyExpression: AbstractPropertyExpression,
  queryBuilderState: QueryBuilderState,
  lambdaParameterName: string,
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
            isDefaultDatePropagationSupported(
              currentPropertyExpression,
              queryBuilderState,
              nextExpression instanceof AbstractPropertyExpression
                ? nextExpression
                : undefined,
            )
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
                  INTERNAL__PropagatedValue
                ))
            ) {
              currentPropertyExpression.parametersValues[index + 1] =
                parameterValue.getValue();
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
              parameterValue.getValue();
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
  (currentExpression as VariableExpression).name = lambdaParameterName;
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
