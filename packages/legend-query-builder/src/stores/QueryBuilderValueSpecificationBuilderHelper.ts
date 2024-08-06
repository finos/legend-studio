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
  INTERNAL__PropagatedValue,
  matchFunctionName,
  MILESTONING_VERSION_PROPERTY_SUFFIX,
  PropertyExplicitReference,
  SimpleFunctionExpression,
  VariableExpression,
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  getNullableFirstEntry,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  functionExpression_setParametersValues,
  functionExpression_setParameterValue,
  propertyExpression_setFunc,
  variableExpression_setName,
} from './shared/ValueSpecificationModifierHelper.js';

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
  lambdaParameterName: string,
  options?: LambdaFunctionBuilderOption,
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
    nextExpression = getNullableFirstEntry(currentExpression.parametersValues);
    if (nextExpression instanceof AbstractPropertyExpression) {
      const parameterValue = new AbstractPropertyExpression('');
      parameterValue.func = nextExpression.func;
      parameterValue.parametersValues = [...nextExpression.parametersValues];
      nextExpression = parameterValue;
      functionExpression_setParameterValue(
        currentExpression,
        parameterValue,
        0,
        queryBuilderState.observerContext,
      );
    }
    if (
      currentExpression instanceof AbstractPropertyExpression &&
      currentExpression.func.value instanceof DerivedProperty
    ) {
      // check if we are building the expression chain to view preview data and if the
      // the property is milestoned. If that is the case we need to replace the
      // `property` with `propertyAllVersions`
      if (
        options?.useAllVersionsForMilestoning &&
        currentExpression.func.value.genericType.value.rawType instanceof
          Class &&
        currentExpression.func.value._OWNER._generatedMilestonedProperties
          .length !== 0
      ) {
        const name = currentExpression.func.value.name;
        const property =
          currentExpression.func.value._OWNER._generatedMilestonedProperties.find(
            (e) =>
              e.name ===
              `${name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}`,
          );
        if (property) {
          propertyExpression_setFunc(
            currentExpression,
            PropertyExplicitReference.create(property),
          );
          functionExpression_setParametersValues(
            currentExpression,
            [guaranteeNonNullable(currentExpression.parametersValues[0])],
            queryBuilderState.observerContext,
          );
        }
      } else {
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
      currentExpression = getNullableFirstEntry(
        currentExpression.parametersValues,
      );
    }
  }

  // Update the root lambda name based on the parent's lambda parameter name.
  if (currentExpression instanceof VariableExpression) {
    variableExpression_setName(currentExpression, lambdaParameterName);
  }
  return newPropertyExpression;
};

export type LambdaFunctionBuilderOption = {
  /**
   * Set queryBuilderState to `true` when we construct query for execution within the app.
   * queryBuilderState will make the lambda function building process overrides several query values, such as the row limit.
   */
  isBuildingExecutionQuery?: boolean | undefined;

  /**
   * Set this to `true` when we construct query for execution within the app to view preview data.
   * queryBuilderState will make the lambda function building process overrides `.all()` to `.allVersions()` if the Class
   * is milestoned and `property` to `propertyAllVersions` if a property is milestoned.
   */
  useAllVersionsForMilestoning?: boolean | undefined;
  keepSourceInformation?: boolean | undefined;
  /**
   * Set this to `true` when we export query results since we do want to ignore an overriding
   * limit for the query results if it exists so the exported results contain all the data
   */
  isExportingResult?: boolean | undefined;
  /**
   * Set this flag to `true` when you want to write to typed TDS function using the `Relation`
   * typed in engine. This is still an experimental feature, hence we should only enable this flag when user wants to enable this directly.
   */
  useTypedRelationFunctions?: boolean | undefined;

  /**
   * Set this flag to `true` when you want to execute a query that exceeds the limit to check for additional data in the database.
   */
  isQueryOverflowExecuting?: boolean | undefined;
};
