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
  Class,
  MILESTONING_STEREOTYPE,
  getMilestoneTemporalStereotype,
  type ValueSpecification,
  Association,
  getGeneratedMilestonedPropertiesForAssociation,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  type PureModel,
  VariableExpression,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { QueryBuilderMilestoningState } from './QueryBuilderMilestoningState.js';
import type { QueryBuilderDerivedPropertyExpressionState } from '../QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';

export const getDerivedPropertyMilestoningSteoreotype = (
  property: DerivedProperty,
  graph: PureModel,
): MILESTONING_STEREOTYPE | undefined => {
  const owner = property._OWNER;
  if (owner instanceof Class) {
    return getMilestoneTemporalStereotype(owner, graph);
  } else if (owner instanceof Association) {
    const generatedMilestonedProperties =
      getGeneratedMilestonedPropertiesForAssociation(owner, property);
    if (generatedMilestonedProperties.length) {
      const ownerClass =
        generatedMilestonedProperties[0]?.genericType.value.rawType;
      return getMilestoneTemporalStereotype(
        guaranteeType(ownerClass, Class),
        graph,
      );
    }
  }
  return undefined;
};

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
export const isDefaultDatePropagationSupported = (
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
  if (
    !prevPropertyExpression &&
    property.genericType.value.rawType instanceof Class &&
    queryBuilderState.milestoningState.isAllVersionsEnabled
  ) {
    return false;
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

export const checkIfEquivalent = (
  param1: ValueSpecification | undefined,
  param2: ValueSpecification | undefined,
): boolean => {
  if (
    param1?.multiplicity.lowerBound !== param2?.multiplicity.lowerBound ||
    param1?.multiplicity.upperBound !== param2?.multiplicity.upperBound
  ) {
    return false;
  }
  if (
    param1 instanceof VariableExpression &&
    param2 instanceof VariableExpression
  ) {
    return param1.name === param2.name;
  } else if (
    param1 instanceof PrimitiveInstanceValue &&
    param2 instanceof PrimitiveInstanceValue
  ) {
    if (
      param1.genericType.value.rawType.name === PRIMITIVE_TYPE.LATESTDATE &&
      param2.genericType.value.rawType.name === PRIMITIVE_TYPE.LATESTDATE
    ) {
      return true;
    }
    return (
      param1.genericType.value.rawType.name ===
        param2.genericType.value.rawType.name &&
      param1.values[0] === param2.values[0]
    );
  }
  return false;
};

/**
 * Check if the parameter value of the milestoned property is
 * the same as those specified in global scope, so that we can
 * potentially replace them with propgated value.
 */
export const matchMilestoningParameterValue = (
  stereotype: MILESTONING_STEREOTYPE,
  idx: number,
  parameterValue: ValueSpecification,
  milestoningDate: QueryBuilderMilestoningState,
): boolean => {
  switch (stereotype) {
    case MILESTONING_STEREOTYPE.BITEMPORAL:
      return (
        (idx === 0 &&
          checkIfEquivalent(parameterValue, milestoningDate.processingDate)) ||
        (idx === 1 &&
          checkIfEquivalent(parameterValue, milestoningDate.businessDate))
      );
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL:
      return checkIfEquivalent(parameterValue, milestoningDate.processingDate);
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL:
      return checkIfEquivalent(parameterValue, milestoningDate.businessDate);
    default:
  }
  return false;
};

/**
 * Generate a parameter value for the derived property given the index if the property is milestoned.
 *
 * This method considers different scenarios for milestoning and take into account date propagation
 * See https://github.com/finos/legend-studio/pull/891
 */
export const generateMilestonedPropertyParameterValue = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  idx: number,
): ValueSpecification | undefined => {
  // Milestoning transformations should not be done on actual derived properties.
  if (
    derivedPropertyExpressionState.derivedProperty._OWNER.derivedProperties.includes(
      derivedPropertyExpressionState.derivedProperty,
    )
  ) {
    return undefined;
  }
  const prevPropertyExpression =
    derivedPropertyExpressionState.propertyExpression
      .parametersValues[0] instanceof AbstractPropertyExpression
      ? derivedPropertyExpressionState.propertyExpression.parametersValues[0]
      : undefined;
  const milestoningState =
    derivedPropertyExpressionState.queryBuilderState.milestoningState;
  const temporalSource = getDerivedPropertyMilestoningSteoreotype(
    derivedPropertyExpressionState.derivedProperty,
    derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph,
  );
  const temporalTarget =
    derivedPropertyExpressionState.propertyExpression.func.value.genericType
      .value.rawType instanceof Class &&
    derivedPropertyExpressionState.propertyExpression.func.value._OWNER
      ._generatedMilestonedProperties.length !== 0
      ? getMilestoneTemporalStereotype(
          derivedPropertyExpressionState.propertyExpression.func.value
            .genericType.value.rawType,
          derivedPropertyExpressionState.queryBuilderState.graphManagerState
            .graph,
        )
      : undefined;
  const hasDefaultMilestoningDate =
    temporalTarget &&
    idx < derivedPropertyExpressionState.parameterValues.length &&
    matchMilestoningParameterValue(
      temporalTarget,
      idx,
      guaranteeNonNullable(derivedPropertyExpressionState.parameterValues[idx]),
      milestoningState,
    );
  const shouldReturnMilestoningParameter =
    temporalTarget &&
    ((idx < derivedPropertyExpressionState.parameterValues.length &&
      (hasDefaultMilestoningDate ||
        /**
         * Checks if the given milestoning needs to be overwritten or not.
         * Specially, we would need to rewrite the query if the user passes a single parameter
         * to the `bitemporal` property expression with `processing temporal` source.
         */
        (getDerivedPropertyMilestoningSteoreotype(
          derivedPropertyExpressionState.derivedProperty,
          derivedPropertyExpressionState.queryBuilderState.graphManagerState
            .graph,
        ) === MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL &&
          temporalTarget === MILESTONING_STEREOTYPE.BITEMPORAL &&
          derivedPropertyExpressionState.parameterValues.length === 1))) ||
      idx >= derivedPropertyExpressionState.parameterValues.length);

  if (!shouldReturnMilestoningParameter) {
    return undefined;
  }
  const isDatePropagationSupported = isDefaultDatePropagationSupported(
    derivedPropertyExpressionState.propertyExpression,
    derivedPropertyExpressionState.queryBuilderState,
    prevPropertyExpression,
  );
  return milestoningState
    .getMilestoningImplementation(temporalTarget)
    .generateMilestoningDate(
      isDatePropagationSupported,
      hasDefaultMilestoningDate ?? false,
      prevPropertyExpression,
      temporalSource,
      idx,
      derivedPropertyExpressionState,
    );
};

export const validateMilestoningPropertyExpressionChain = (
  sourceStereotype: MILESTONING_STEREOTYPE | undefined,
  targetStereotype: MILESTONING_STEREOTYPE,
  propertyExpression: AbstractPropertyExpression,
): void => {
  if (
    sourceStereotype !== MILESTONING_STEREOTYPE.BITEMPORAL &&
    targetStereotype !== sourceStereotype
  ) {
    if (targetStereotype === MILESTONING_STEREOTYPE.BITEMPORAL) {
      if (
        propertyExpression.parametersValues.length !== 3 &&
        !sourceStereotype
      ) {
        throw new UnsupportedOperationError(
          `Property of milestoning sterotype '${MILESTONING_STEREOTYPE.BITEMPORAL}' should have exactly two parameters`,
        );
      } else if (propertyExpression.parametersValues.length < 2) {
        throw new UnsupportedOperationError(
          `Property of milestoning sterotype '${MILESTONING_STEREOTYPE.BITEMPORAL}' should have at least one parameter`,
        );
      } else if (propertyExpression.parametersValues.length > 3) {
        throw new UnsupportedOperationError(
          `Property of milestoning sterotype '${MILESTONING_STEREOTYPE.BITEMPORAL}' should not have more than two parameters`,
        );
      }
    } else if (propertyExpression.parametersValues.length !== 2) {
      throw new UnsupportedOperationError(
        `Property of milestoning sterotype '${targetStereotype}' should have exactly one parameter`,
      );
    }
  }
};
