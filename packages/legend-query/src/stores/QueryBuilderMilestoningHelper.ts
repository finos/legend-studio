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
  MILESTONING_STEROTYPE,
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
): MILESTONING_STEROTYPE | undefined => {
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
  stereotype: MILESTONING_STEROTYPE,
  idx: number,
  milestoningParameter: ValueSpecification,
  querySetupState: QueryBuilderSetupState,
): boolean => {
  switch (stereotype) {
    case MILESTONING_STEROTYPE.BITEMPORAL:
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
    case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL:
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
    case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL:
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
    if (milestoningStereotype) {
      return prevPropertyExpression.parameterValues.every(
        (parameterValue) => parameterValue instanceof INTERNAL__PropagatedValue,
      );
    }
    return false;
  }
  if (property.genericType.value.rawType instanceof Class) {
    const sourceStereotype = getSourceTemporalStereotype(property, graph);
    if (sourceStereotype === MILESTONING_STEROTYPE.BITEMPORAL) {
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

export const removePropagatedDates = (
  derivedPropertyExpressionStates: QueryBuilderDerivedPropertyExpressionState[],
): void => {
  let currentExpression = guaranteeNonNullable(
    derivedPropertyExpressionStates[0],
  );
  let prevExpression;
  const businessDate =
    currentExpression.queryBuilderState.querySetupState._businessDate;
  const processingDate =
    currentExpression.queryBuilderState.querySetupState._processingDate;
  const graph = currentExpression.queryBuilderState.graphManagerState.graph;
  const stereotype = getSourceTemporalStereotype(
    currentExpression.derivedProperty,
    graph,
  );

  // Remove the propagated milestoning dates in current property expression if the milestoning dates of
  // current expression are changed back to `businessDate` and `processingDate`. In that scenario we
  // don't need propagated dates because engine will handle that.
  if (isDefaultDatePropagationSupported(currentExpression, graph)) {
    switch (stereotype) {
      case MILESTONING_STEROTYPE.BITEMPORAL: {
        if (
          currentExpression.propertyExpression.parametersValues.length === 3
        ) {
          if (
            currentExpression.propertyExpression.parametersValues[1] ===
              processingDate &&
            currentExpression.propertyExpression.parametersValues[2] ===
              businessDate
          ) {
            currentExpression.propertyExpression.parametersValues.pop();
            currentExpression.propertyExpression.parametersValues.pop();
          }
        }
        break;
      }
      case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL: {
        if (
          currentExpression.propertyExpression.parametersValues.length === 2
        ) {
          if (
            currentExpression.propertyExpression.parametersValues[1] ===
            processingDate
          ) {
            currentExpression.propertyExpression.parametersValues.pop();
          }
        }
        break;
      }
      case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL: {
        if (
          currentExpression.propertyExpression.parametersValues.length === 2
        ) {
          if (
            currentExpression.propertyExpression.parametersValues[1] ===
            businessDate
          ) {
            currentExpression.propertyExpression.parametersValues.pop();
          }
        }
        break;
      }
      default:
    }
  }

  // Remove the propagated milestoning dates in current property expression if the milestoning dates of
  // previous expression are changed back to `businessDate` and `processingDate`. In that scenario we
  // don't need propagated dates because engine will handle that.
  prevExpression = currentExpression;
  for (let i = 1; i < derivedPropertyExpressionStates.length; i++) {
    currentExpression = guaranteeNonNullable(
      derivedPropertyExpressionStates[i],
    );
    if (
      isDefaultDatePropagationSupported(currentExpression, graph) &&
      !prevExpression.derivedProperty.name.endsWith(
        MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS,
      ) &&
      !prevExpression.derivedProperty.name.endsWith(
        MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS_IN_RANGE,
      ) &&
      prevExpression.parameterValues.every(
        (p, index) => p === currentExpression.parameterValues[index],
      )
    ) {
      currentExpression.propertyExpression.parametersValues = [
        guaranteeNonNullable(
          currentExpression.propertyExpression.parametersValues[0],
        ),
      ];
    }
    prevExpression = currentExpression;
  }
};

// Propagates default dates for milestoned properties when date propagation is not supported by engine.
export const fillMilestonedDerivedPropertyArguments = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  temporalTarget: MILESTONING_STEROTYPE,
  idx: number,
  isDatePropagationSupported: boolean,
): ValueSpecification | undefined => {
  const querySetupState =
    derivedPropertyExpressionState.queryBuilderState.querySetupState;
  switch (temporalTarget) {
    case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL: {
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
      parameter.isDefaultDatePropagationSupported = isDatePropagationSupported;
      return parameter;
    }
    case MILESTONING_STEROTYPE.BITEMPORAL: {
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
        parameter.isDefaultDatePropagationSupported =
          isDatePropagationSupported;
        return parameter;
      } else {
        const parameter = new INTERNAL__PropagatedValue(
          derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        );
        parameter.getValue = (): ValueSpecification =>
          guaranteeNonNullable(querySetupState._businessDate);
        parameter.isDefaultDatePropagationSupported =
          isDatePropagationSupported;
        return parameter;
      }
    }
    case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL: {
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
      parameter.isDefaultDatePropagationSupported = isDatePropagationSupported;
      return parameter;
    }
    default:
      return undefined;
  }
};

// Checks if the milestoning property expression is valid in terms of number of parameters passed to it and throws
// unsupported mode if the number of parameters passed is not valid for a particular temporal type.
export const processMilestoningPropertyExpression = (
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
          sourceStereotype !== MILESTONING_STEROTYPE.BITEMPORAL &&
          targetStereotype !== sourceStereotype
        ) {
          if (targetStereotype === MILESTONING_STEROTYPE.BITEMPORAL) {
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
          if (parameterValue.isDefaultDatePropagationSupported) {
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
        } else if (idx + 1 !== derivedPropertyExpressionStates.length) {
          derivedPropertyExpressionStates[idx + 1]?.parameterValues.forEach(
            (parameter) => {
              if (parameter instanceof INTERNAL__PropagatedValue) {
                parameter.isDefaultDatePropagationSupported = false;
              }
            },
          );
        }
      });
    },
  );
  if (derivedPropertyExpressionStates.length) {
    removePropagatedDates(derivedPropertyExpressionStates);
  }
};
