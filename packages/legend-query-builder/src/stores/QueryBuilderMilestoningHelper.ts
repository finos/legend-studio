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
  INTERNAL__PropagatedValue,
  type ValueSpecification,
  Association,
  BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
  PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
  getGeneratedMilestonedPropertiesForAssociation,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  type PureModel,
  VariableExpression,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import type { QueryBuilderMilestoningState } from './QueryBuilderMilestoningState.js';
import type { QueryBuilderDerivedPropertyExpressionState } from './QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';

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

/**
 * Gets the value of ValueSpecification given INTERNAL__PropagatedValue is pointing to.
 */
export const getValueOfInternalPropagatedValue = (
  valueSpec: INTERNAL__PropagatedValue,
): ValueSpecification => {
  if (valueSpec.getValue() instanceof INTERNAL__PropagatedValue) {
    return getValueOfInternalPropagatedValue(
      guaranteeType(valueSpec.getValue(), INTERNAL__PropagatedValue),
    );
  }
  return valueSpec.getValue();
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
  const checkIfEquivalent = (
    param1: ValueSpecification | undefined,
    param2: ValueSpecification | undefined,
  ): boolean => {
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
 * Checks if INTERNAL_PropagatedValue we passed for milestoned properties can be removed or not.
 * We try to make analysis on whether date propagations is supported for this particular property or not:
 * 1. If it is supported we check if the value it has is same as global milestoning dates
 *    (i) Yes -> We replace it with actual ValueSpecification (We assune that here it is not pointing to the preceeding property so date
 *        propagation cannot be done).
 *    (ii) No -> We just remove it.
 * 2. If not supported we replace it with the actual ValueSpecification.
 */
export const checkIfInternalPropagatedValueCanBeRemoved = (
  currentExpression: AbstractPropertyExpression,
  queryBuilderState: QueryBuilderState,
  index: number,
  parameter: ValueSpecification,
  prevExpression: ValueSpecification | undefined,
): boolean => {
  const isDefaultDatePropSupported = isDefaultDatePropagationSupported(
    currentExpression,
    queryBuilderState,
    prevExpression instanceof AbstractPropertyExpression
      ? prevExpression
      : undefined,
  );
  if (
    isDefaultDatePropSupported &&
    !(prevExpression && prevExpression instanceof AbstractPropertyExpression)
  ) {
    return true;
  } else if (
    prevExpression instanceof AbstractPropertyExpression &&
    isDefaultDatePropSupported
  ) {
    const property = currentExpression.func.value;
    if (property.genericType.value.rawType instanceof Class) {
      const targetStereotype = getMilestoneTemporalStereotype(
        property.genericType.value.rawType,
        queryBuilderState.graphManagerState.graph,
      );
      if (targetStereotype) {
        return !matchMilestoningParameterValue(
          targetStereotype,
          index,
          parameter,
          queryBuilderState.milestoningState,
        );
      }
    }
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

  switch (temporalTarget) {
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
      if (!milestoningState.businessDate) {
        milestoningState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.milestoningState.buildMilestoningParameter(
            BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
          ),
        );
      }
      let parameter;
      if (
        isDatePropagationSupported &&
        prevPropertyExpression &&
        !hasDefaultMilestoningDate
      ) {
        if (temporalSource === temporalTarget) {
          parameter = new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(prevPropertyExpression.parametersValues[1]),
          );
        } else {
          parameter = new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(prevPropertyExpression.parametersValues[2]),
          );
        }
      } else {
        parameter = new INTERNAL__PropagatedValue(() =>
          guaranteeNonNullable(milestoningState.businessDate),
        );
      }
      return parameter;
    }
    case MILESTONING_STEREOTYPE.BITEMPORAL: {
      if (!milestoningState.processingDate) {
        milestoningState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.milestoningState.buildMilestoningParameter(
            PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
          ),
        );
      }
      if (!milestoningState.businessDate) {
        milestoningState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.milestoningState.buildMilestoningParameter(
            BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
          ),
        );
      }
      if (idx === 0) {
        if (
          temporalSource === MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL &&
          derivedPropertyExpressionState.parameterValues.length === 1
        ) {
          return new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(
              guaranteeType(prevPropertyExpression, AbstractPropertyExpression)
                .parametersValues[1],
            ),
          );
        }
        let parameter;
        if (
          isDatePropagationSupported &&
          prevPropertyExpression &&
          !hasDefaultMilestoningDate
        ) {
          parameter = new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(prevPropertyExpression.parametersValues[1]),
          );
        } else {
          parameter = new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(milestoningState.processingDate),
          );
        }
        return parameter;
      } else {
        if (
          temporalSource === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL &&
          derivedPropertyExpressionState.parameterValues.length === 1
        ) {
          return new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(
              guaranteeType(
                derivedPropertyExpressionState.propertyExpression
                  .parametersValues[0],
                AbstractPropertyExpression,
              ).parametersValues[1],
            ),
          );
        }
        let parameter;
        if (
          isDatePropagationSupported &&
          prevPropertyExpression &&
          !hasDefaultMilestoningDate
        ) {
          parameter = new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(prevPropertyExpression.parametersValues[2]),
          );
        } else {
          parameter = new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(milestoningState.businessDate),
          );
        }
        return parameter;
      }
    }
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
      if (!milestoningState.processingDate) {
        milestoningState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.milestoningState.buildMilestoningParameter(
            PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
          ),
        );
      }
      let parameter;
      if (isDatePropagationSupported && prevPropertyExpression) {
        parameter = new INTERNAL__PropagatedValue(() =>
          guaranteeNonNullable(prevPropertyExpression.parametersValues[1]),
        );
      } else {
        parameter = new INTERNAL__PropagatedValue(() =>
          guaranteeNonNullable(milestoningState.processingDate),
        );
      }
      return parameter;
    }
    default:
      return undefined;
  }
};
