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
  VariableExpression,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  GenericTypeExplicitReference,
  GenericType,
  MilestoneVersionPropertySufixes,
  DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
} from '@finos/legend-graph';
import {
  fillDerivedPropertyArguments,
  type QueryBuilderPropertyExpressionState,
  type QueryBuilderDerivedPropertyExpressionState,
} from './QueryBuilderPropertyEditorState';
import { functionExpression_setParametersValues } from './QueryBuilderValueSpecificationModifierHelper';

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

//sourceStereotype: Stereotype of source class of the previous property expression/ class which we are querying from if it is the
// first expression getting processed.
//targetStereotype: Stereotype of source class of current property expression.
export const isDefaultDatePropagationSupported = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  graph: PureModel,
  prevPropertyExpression?:
    | QueryBuilderDerivedPropertyExpressionState
    | undefined,
): boolean => {
  const property = derivedPropertyExpressionState.derivedProperty;
  if (prevPropertyExpression?.parameterValues.length) {
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
    currentExpression.queryBuilderState.querySetupState.businessDate;
  const processingDate =
    currentExpression.queryBuilderState.querySetupState.processingDate;
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
        MilestoneVersionPropertySufixes.ALL_VERSIONS,
      ) &&
      !prevExpression.derivedProperty.name.endsWith(
        MilestoneVersionPropertySufixes.ALL_VERSIONS_IN_RANGE,
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
): ValueSpecification | undefined => {
  const querySetupState =
    derivedPropertyExpressionState.queryBuilderState.querySetupState;
  switch (temporalTarget) {
    case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL: {
      if (!querySetupState.businessDate) {
        querySetupState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      const parameter = querySetupState.businessDate;
      derivedPropertyExpressionState.businessDate =
        querySetupState.BusinessDate;
      return parameter;
    }
    case MILESTONING_STEROTYPE.BITEMPORAL: {
      if (!querySetupState.processingDate) {
        querySetupState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      if (!querySetupState.businessDate) {
        querySetupState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      if (idx === 0) {
        derivedPropertyExpressionState.processingDate =
          querySetupState.ProcessingDate;
        return querySetupState.processingDate;
      } else {
        derivedPropertyExpressionState.businessDate =
          querySetupState.BusinessDate;
        return querySetupState.businessDate;
      }
    }
    case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL: {
      if (!querySetupState.processingDate) {
        querySetupState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
      }
      const parameter = querySetupState.processingDate;
      derivedPropertyExpressionState.processingDate =
        derivedPropertyExpressionState.queryBuilderState.querySetupState.ProcessingDate;
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

// Gets the value of milestoning date that needs to be shown in DerivedPropertyEditor when date propagation is supported
export const getPropagatedDate = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  idx: number,
): ValueSpecification | undefined => {
  const queryBuilderState = derivedPropertyExpressionState.queryBuilderState;
  const targetStereotype = getMilestoneTemporalStereotype(
    guaranteeType(
      derivedPropertyExpressionState.derivedProperty.genericType.value.rawType,
      Class,
    ),
    queryBuilderState.graphManagerState.graph,
  );
  switch (targetStereotype) {
    case MILESTONING_STEROTYPE.BITEMPORAL:
      if (idx === 0) {
        return queryBuilderState.querySetupState.ProcessingDate;
      } else {
        return queryBuilderState.querySetupState.businessDate;
      }
    case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL:
      return queryBuilderState.querySetupState.BusinessDate;
    case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL:
      return queryBuilderState.querySetupState.processingDate;
    default:
      return undefined;
  }
};

// To populate default dates to the next level in the property chain if the date values of the current
// level are changed when date propagation is supported to the next level.
export const propagateDefaultDates = (
  derivedPropertyExpressionStates: QueryBuilderDerivedPropertyExpressionState[],
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  idx: number,
): void => {
  const index = derivedPropertyExpressionStates.findIndex(
    (propertyState: QueryBuilderDerivedPropertyExpressionState) =>
      propertyState === derivedPropertyExpressionState,
  );
  if (
    index + 1 !== derivedPropertyExpressionStates.length &&
    !isDefaultDatePropagationSupported(
      guaranteeNonNullable(derivedPropertyExpressionStates[index + 1]),
      derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph,
      derivedPropertyExpressionState,
    ) &&
    guaranteeNonNullable(derivedPropertyExpressionStates[index + 1])
      .propertyExpression.func.genericType.value.rawType instanceof Class &&
    derivedPropertyExpressionState.propertyExpression.func.owner
      ._generatedMilestonedProperties.length !== 0
  ) {
    const temporalTarget = getMilestoneTemporalStereotype(
      guaranteeType(
        guaranteeNonNullable(derivedPropertyExpressionStates[index + 1])
          .propertyExpression.func.genericType.value.rawType,
        Class,
      ),
      derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph,
    );
    if (temporalTarget) {
      if (
        derivedPropertyExpressionStates[index + 1]?.parameterValues &&
        guaranteeNonNullable(
          derivedPropertyExpressionStates[index + 1]?.parameterValues,
        ).length <= idx
      ) {
        fillDerivedPropertyArguments(
          guaranteeNonNullable(derivedPropertyExpressionStates[index + 1]),
          derivedPropertyExpressionState.queryBuilderState.graphManagerState
            .graph,
          true,
        );
      }
    }
  }
};

// Creates a new `valueSpecification` for the given milestoning parameter. These new `valueSpecification` created are
// passed as parameters to the milestoned properties where default dates need to be propagated so that the mobx
// states are not connected to the actual milestoning parameter.
export const getMilestoningDate = (
  milestoningParameter: ValueSpecification,
  graph: PureModel,
): ValueSpecification | undefined => {
  const type = milestoningParameter.genericType?.value.rawType;
  const multiplicity = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  let value;
  if (milestoningParameter instanceof PrimitiveInstanceValue) {
    value = milestoningParameter.values[0];
  }
  if (type === graph.getPrimitiveType(PRIMITIVE_TYPE.LATESTDATE)) {
    const parameter = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.LATESTDATE)),
      ),
      multiplicity,
    );
    return parameter;
  } else if (type === graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE)) {
    const parameter = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE)),
      ),
      multiplicity,
    );
    parameter.values.push(value);
    return parameter;
  } else if (type === graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME)) {
    const parameter = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME)),
      ),
      multiplicity,
    );
    parameter.values.push(value);
    return parameter;
  } else if (milestoningParameter instanceof VariableExpression) {
    const parameter = new VariableExpression(
      milestoningParameter.name,
      multiplicity,
    );
    return parameter;
  }
  return undefined;
};

//updates the property expression for milestoned properties when the milestoning parameters are changed.
export const updatePropertyExpressionStateWithDefaultMilestoningDates = (
  propertyExpressionState: QueryBuilderPropertyExpressionState,
): QueryBuilderPropertyExpressionState => {
  const derivedPropertyExpressionStates =
    propertyExpressionState.derivedPropertyExpressionStates;
  for (let i = 0; i < derivedPropertyExpressionStates.length; i++) {
    const derivedPropertyExpressionState = guaranteeNonNullable(
      derivedPropertyExpressionStates[i],
    );
    if (
      derivedPropertyExpressionState.propertyExpression.func.genericType.value
        .rawType instanceof Class
    ) {
      const temporalTarget = getMilestoneTemporalStereotype(
        guaranteeType(
          derivedPropertyExpressionState.propertyExpression.func.genericType
            .value.rawType,
          Class,
        ),
        derivedPropertyExpressionState.queryBuilderState.graphManagerState
          .graph,
      );
      const paramLength =
        derivedPropertyExpressionState.propertyExpression.parametersValues
          .length;
      switch (temporalTarget) {
        case MILESTONING_STEROTYPE.BITEMPORAL:
          if (paramLength === 3) {
            let businessDate,
              processingDate,
              isParameterChanged = false;
            if (
              valueSpecifiation_isEqual(
                derivedPropertyExpressionState.businessDate,
                derivedPropertyExpressionState.propertyExpression
                  .parametersValues[2],
              ) &&
              !valueSpecifiation_isEqual(
                derivedPropertyExpressionState.businessDate,
                derivedPropertyExpressionState.queryBuilderState.querySetupState
                  .businessDate,
              )
            ) {
              businessDate = guaranteeNonNullable(
                derivedPropertyExpressionState.queryBuilderState.querySetupState
                  .BusinessDate,
              );
              derivedPropertyExpressionState.businessDate = businessDate;
              isParameterChanged = true;
            } else {
              businessDate =
                derivedPropertyExpressionState.propertyExpression
                  .parametersValues[2];
            }
            if (
              valueSpecifiation_isEqual(
                derivedPropertyExpressionState.processingDate,
                derivedPropertyExpressionState.propertyExpression
                  .parametersValues[1],
              ) &&
              !valueSpecifiation_isEqual(
                derivedPropertyExpressionState.processingDate,
                derivedPropertyExpressionState.queryBuilderState.querySetupState
                  .processingDate,
              )
            ) {
              processingDate = guaranteeNonNullable(
                derivedPropertyExpressionState.queryBuilderState.querySetupState
                  .ProcessingDate,
              );
              derivedPropertyExpressionState.processingDate = processingDate;
              isParameterChanged = true;
            } else {
              processingDate =
                derivedPropertyExpressionState.propertyExpression
                  .parametersValues[1];
            }
            if (isParameterChanged) {
              functionExpression_setParametersValues(
                derivedPropertyExpressionState.propertyExpression,
                [
                  guaranteeNonNullable(
                    derivedPropertyExpressionState.propertyExpression
                      .parametersValues[0],
                  ),
                  guaranteeNonNullable(processingDate),
                  guaranteeNonNullable(businessDate),
                ],
                derivedPropertyExpressionState.queryBuilderState
                  .observableContext,
              );
            }
          }
          break;
        case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL:
          if (
            paramLength === 2 &&
            valueSpecifiation_isEqual(
              derivedPropertyExpressionState.businessDate,
              derivedPropertyExpressionState.propertyExpression
                .parametersValues[1],
            ) &&
            !valueSpecifiation_isEqual(
              derivedPropertyExpressionState.businessDate,
              derivedPropertyExpressionState.queryBuilderState.querySetupState
                .businessDate,
            )
          ) {
            const businessDate = guaranteeNonNullable(
              derivedPropertyExpressionState.queryBuilderState.querySetupState
                .BusinessDate,
            );
            functionExpression_setParametersValues(
              derivedPropertyExpressionState.propertyExpression,
              [
                guaranteeNonNullable(
                  derivedPropertyExpressionState.propertyExpression
                    .parametersValues[0],
                ),
                businessDate,
              ],
              derivedPropertyExpressionState.queryBuilderState
                .observableContext,
            );
            derivedPropertyExpressionState.businessDate = businessDate;
          }
          break;
        case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL:
          if (
            paramLength === 2 &&
            valueSpecifiation_isEqual(
              derivedPropertyExpressionState.processingDate,
              derivedPropertyExpressionState.propertyExpression
                .parametersValues[1],
            ) &&
            !valueSpecifiation_isEqual(
              derivedPropertyExpressionState.processingDate,
              derivedPropertyExpressionState.queryBuilderState.querySetupState
                .processingDate,
            )
          ) {
            const processingDate = guaranteeNonNullable(
              derivedPropertyExpressionState.queryBuilderState.querySetupState
                .ProcessingDate,
            );
            functionExpression_setParametersValues(
              derivedPropertyExpressionState.propertyExpression,
              [
                guaranteeNonNullable(
                  derivedPropertyExpressionState.propertyExpression
                    .parametersValues[0],
                ),
                processingDate,
              ],
              derivedPropertyExpressionState.queryBuilderState
                .observableContext,
            );
            derivedPropertyExpressionState.processingDate = processingDate;
          }
          break;
        default:
      }
    }
  }
  return propertyExpressionState;
};
