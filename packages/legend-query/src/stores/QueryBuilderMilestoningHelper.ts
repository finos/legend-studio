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
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  Class,
  type PureModel,
  type ValueSpecification,
  DerivedProperty,
  getMilestoneTemporalStereotype,
  MILESTONING_STEREOTYPE,
  DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
  type AbstractPropertyExpression,
  Association,
  TYPICAL_MULTIPLICITY_TYPE,
  MILESTONING_VERSION_PROPERTY_SUFFIX,
  DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
  INTERNAL__PropagatedValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  VariableExpression,
} from '@finos/legend-graph';
import type { QueryBuilderDerivedPropertyExpressionState } from './QueryBuilderPropertyEditorState';
import type { QueryBuilderSetupState } from './QueryBuilderSetupState';
import {
  functionExpression_setParametersValues,
  propertyExpression_setParametersValue,
} from './QueryBuilderValueSpecificationModifierHelper';

export const valueSpecifiation_isEqual = (
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
    } else if (
      param1.genericType.value.rawType.name ===
      param2.genericType.value.rawType.name
    ) {
      return param1.values[0] === param2.values[0];
    }
    return false;
  }
  return false;
};

export const getSourceTemporalStereotype = (
  property: DerivedProperty,
  graph: PureModel,
): MILESTONING_STEREOTYPE | undefined => {
  const owner = property.owner;
  if (owner instanceof Class) {
    return getMilestoneTemporalStereotype(owner, graph);
  } else if (owner instanceof Association) {
    if (owner._generatedMilestonedProperties.length) {
      const ownerClass =
        owner._generatedMilestonedProperties[0]?.genericType.value.rawType;
      return getMilestoneTemporalStereotype(
        guaranteeType(ownerClass, Class),
        graph,
      );
    }
  }
  return undefined;
};

// checks if the parameter of the current milestoned property is same as `businessDate` or `processingDate`
export const checkForMilestoningParameterEquality = (
  stereotype: MILESTONING_STEREOTYPE,
  idx: number,
  milestoningParameter: ValueSpecification,
  querySetupState: QueryBuilderSetupState,
): boolean => {
  switch (stereotype) {
    case MILESTONING_STEREOTYPE.BITEMPORAL:
      if (
        idx === 0 &&
        valueSpecifiation_isEqual(
          milestoningParameter,
          querySetupState._processingDate,
        )
      ) {
        return true;
      } else if (
        idx === 1 &&
        valueSpecifiation_isEqual(
          milestoningParameter,
          querySetupState._businessDate,
        )
      ) {
        return true;
      } else {
        return false;
      }
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL:
      if (
        valueSpecifiation_isEqual(
          milestoningParameter,
          querySetupState._processingDate,
        )
      ) {
        return true;
      } else {
        return false;
      }
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL:
      if (
        valueSpecifiation_isEqual(
          milestoningParameter,
          querySetupState._businessDate,
        )
      ) {
        return true;
      } else {
        return false;
      }
    default:
  }
  return false;
};

// sourceStereotype: Stereotype of source class of current property expression.
// targetStereotype: Stereotype (if exists) of genericType of current property expression.
// Checks whether date propagation is supported for the current property expression or not.
export const isDefaultDatePropagationSupported = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  graph: PureModel,
  prevPropertyExpression?:
    | QueryBuilderDerivedPropertyExpressionState
    | undefined,
): boolean => {
  const property = derivedPropertyExpressionState.derivedProperty;
  if (
    prevPropertyExpression &&
    prevPropertyExpression.derivedProperty.genericType.value.rawType instanceof
      Class
  ) {
    const milestoningStereotype = getMilestoneTemporalStereotype(
      prevPropertyExpression.derivedProperty.genericType.value.rawType,
      graph,
    );
    if (
      milestoningStereotype &&
      !prevPropertyExpression.parameterValues.every((parameterValue, index) =>
        checkForMilestoningParameterEquality(
          milestoningStereotype,
          index,
          parameterValue,
          derivedPropertyExpressionState.queryBuilderState.querySetupState,
        ),
      )
    ) {
      return false;
    }
  }
  if (property.genericType.value.rawType instanceof Class) {
    const sourceStereotype = getSourceTemporalStereotype(property, graph);
    if (sourceStereotype === MILESTONING_STEREOTYPE.BITEMPORAL) {
      return true;
    }
    const targetStereotype = getMilestoneTemporalStereotype(
      property.genericType.value.rawType,
      graph,
    );
    return sourceStereotype === targetStereotype;
  }
  return false;
};

// Propagates default dates for milestoned properties when date propagation is not supported by engine.
export const fillMilestonedDerivedPropertyArguments = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  temporalTarget: MILESTONING_STEREOTYPE,
  idx: number,
): ValueSpecification | undefined => {
  const querySetupState =
    derivedPropertyExpressionState.queryBuilderState.querySetupState;
  switch (temporalTarget) {
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
      if (!querySetupState._businessDate) {
        querySetupState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      const parameter = new INTERNAL__PropagatedValue(
        derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
          TYPICAL_MULTIPLICITY_TYPE.ONE,
        ),
      );
      parameter.getValue = (): ValueSpecification =>
        guaranteeNonNullable(querySetupState._businessDate);
      return parameter;
    }
    case MILESTONING_STEREOTYPE.BITEMPORAL: {
      if (!querySetupState._processingDate) {
        querySetupState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      if (!querySetupState._businessDate) {
        querySetupState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      if (idx === 0) {
        const parameter = new INTERNAL__PropagatedValue(
          derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        );
        parameter.getValue = (): ValueSpecification =>
          guaranteeNonNullable(querySetupState._processingDate);
        return parameter;
      } else {
        const parameter = new INTERNAL__PropagatedValue(
          derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        );
        parameter.getValue = (): ValueSpecification =>
          guaranteeNonNullable(querySetupState._businessDate);
        return parameter;
      }
    }
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
      if (!querySetupState._processingDate) {
        querySetupState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      const parameter = new INTERNAL__PropagatedValue(
        derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
          TYPICAL_MULTIPLICITY_TYPE.ONE,
        ),
      );
      parameter.getValue = (): ValueSpecification =>
        guaranteeNonNullable(querySetupState._processingDate);
      return parameter;
    }
    default:
      return undefined;
  }
};

// Checks if the milestoning property expression is valid in terms of number of parameters passed to it and throws
// unsupported mode if the number of parameters passed is not valid for a particular temporal type.
export const validateMilestoningPropertyExpression = (
  propertyExpression: AbstractPropertyExpression,
  graph: PureModel,
): void => {
  if (
    propertyExpression.func.genericType.value.rawType instanceof Class &&
    propertyExpression.func.owner._generatedMilestonedProperties.length !== 0
  ) {
    const name = propertyExpression.func.name;
    const func =
      propertyExpression.func.owner._generatedMilestonedProperties.find(
        (e) => e.name === name,
      );
    if (func) {
      const targetStereotype = getMilestoneTemporalStereotype(
        propertyExpression.func.genericType.value.rawType,
        graph,
      );

      if (targetStereotype) {
        const sourceStereotype = getSourceTemporalStereotype(
          guaranteeType(func, DerivedProperty),
          graph,
        );
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
                "Property of milestoning sterotype 'Bitemporal' should have two parameters",
              );
            } else if (propertyExpression.parametersValues.length < 2) {
              throw new UnsupportedOperationError(
                "Property of milestoning sterotype 'Bitemporal' should have atleast one parameter",
              );
            } else if (propertyExpression.parametersValues.length > 3) {
              throw new UnsupportedOperationError(
                "Property of milestoning sterotype 'Bitemporal' should not have more than two parameters",
              );
            }
          } else if (propertyExpression.parametersValues.length !== 2) {
            throw new UnsupportedOperationError(
              `Property of milestoning sterotype '${targetStereotype}' should have one parameters`,
            );
          }
        }
      }
    }
  }
};

export const decoratePropertyExpressionStatesForMilestonedProperties = (
  derivedPropertyExpressionStates: QueryBuilderDerivedPropertyExpressionState[],
): void => {
  derivedPropertyExpressionStates.forEach(
    (derivedPropertyExpressionState, idx) => {
      const parameterValues = derivedPropertyExpressionState.parameterValues;
      parameterValues.forEach((parameterValue, index) => {
        if (parameterValue instanceof INTERNAL__PropagatedValue) {
          if (
            isDefaultDatePropagationSupported(
              derivedPropertyExpressionState,
              derivedPropertyExpressionState.queryBuilderState.graphManagerState
                .graph,
              idx !== 0 ? derivedPropertyExpressionStates[idx - 1] : undefined,
            )
          ) {
            functionExpression_setParametersValues(
              derivedPropertyExpressionState.propertyExpression,
              [
                guaranteeNonNullable(
                  derivedPropertyExpressionState.propertyExpression
                    .parametersValues[0],
                ),
              ],
              derivedPropertyExpressionState.queryBuilderState
                .observableContext,
            );
          } else {
            propertyExpression_setParametersValue(
              derivedPropertyExpressionState.propertyExpression,
              index + 1,
              parameterValue.getValue(),
              derivedPropertyExpressionState.queryBuilderState
                .observableContext,
            );
          }
        }
      });
    },
  );
};
