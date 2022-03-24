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
  type DerivedProperty,
  getMilestoneTemporalStereotype,
  MILESTONING_STEROTYPES,
  DEFAULT_MILESTONING_PARAMETERS,
  type AbstractPropertyExpression,
  Association,
  VariableExpression,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import type { QueryBuilderDerivedPropertyExpressionState } from './QueryBuilderPropertyEditorState';

export const checkEquality = (
  //handle latest
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
    return param1.values[0] === param2.values[0];
  }
  return param1 === param2;
};

export const milestoningParameters = {
  BUSINESS_TEMPORAL: false,
  PROCESSING_TEMPORAL: false,
};

export const getSourceTemporalStereotype = (
  property: DerivedProperty,
  graph: PureModel,
): MILESTONING_STEROTYPES | undefined => {
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

export const isDatePropagationSupported = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  graph: PureModel,
  prevPropertyExpression?:
    | QueryBuilderDerivedPropertyExpressionState
    | undefined,
): boolean => {
  const property = derivedPropertyExpressionState.derivedProperty;
  if (prevPropertyExpression && prevPropertyExpression.parameterValues.length) {
    return false;
  }
  if (property.genericType.value.rawType instanceof Class) {
    const sourceStereotype = getSourceTemporalStereotype(property, graph);
    if (sourceStereotype === MILESTONING_STEROTYPES.BITEMPORAL) {
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
  if (isDatePropagationSupported(currentExpression, graph)) {
    switch (stereotype) {
      case MILESTONING_STEROTYPES.BITEMPORAL: {
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
      case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL: {
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
      case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL: {
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
  prevExpression = currentExpression;
  for (let i = 1; i < derivedPropertyExpressionStates.length; i++) {
    currentExpression = guaranteeNonNullable(
      derivedPropertyExpressionStates[i],
    );
    if (
      isDatePropagationSupported(currentExpression, graph) &&
      !prevExpression.derivedProperty.name.endsWith('AllVersions') &&
      !prevExpression.derivedProperty.name.endsWith('AllVersionsInRange') &&
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

export const fillMilestonedDerivedPropertyArguments = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  temporalTarget: MILESTONING_STEROTYPES,
  idx: number,
): ValueSpecification | undefined => {
  const querySetupState =
    derivedPropertyExpressionState.queryBuilderState.querySetupState;
  switch (temporalTarget) {
    case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL: {
      if (!querySetupState.businessDate) {
        querySetupState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.BUSINESS_DATE,
          ),
        );
      }
      const parameter = querySetupState.businessDate;
      milestoningParameters.BUSINESS_TEMPORAL = true;
      derivedPropertyExpressionState.businessDate =
        querySetupState.BusinessDate;
      return parameter;
    }
    case MILESTONING_STEROTYPES.BITEMPORAL: {
      if (!querySetupState.processingDate) {
        querySetupState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.PROCESSING_DATE,
          ),
        );
      }
      if (!querySetupState.businessDate) {
        querySetupState.setBusinessDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.BUSINESS_DATE,
          ),
        );
      }
      milestoningParameters.BUSINESS_TEMPORAL = true;
      milestoningParameters.PROCESSING_TEMPORAL = true;
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
    case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL: {
      if (!querySetupState.processingDate) {
        querySetupState.setProcessingDate(
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.PROCESSING_DATE,
          ),
        );
      }
      const parameter = querySetupState.processingDate;
      derivedPropertyExpressionState.processingDate =
        derivedPropertyExpressionState.queryBuilderState.querySetupState.ProcessingDate;
      milestoningParameters.PROCESSING_TEMPORAL = true;
      return parameter;
    }
    default:
      return undefined;
  }
};

export const isValidMilestoningLambda = (
  propertyExpression: AbstractPropertyExpression,
  targetStereotype: MILESTONING_STEROTYPES,
  generatedMilestoningProperty: DerivedProperty,
  graph: PureModel,
): void => {
  const sourceStereotype = getSourceTemporalStereotype(
    generatedMilestoningProperty,
    graph,
  );
  if (
    sourceStereotype !== MILESTONING_STEROTYPES.BITEMPORAL &&
    targetStereotype !== sourceStereotype
  ) {
    if (targetStereotype === MILESTONING_STEROTYPES.BITEMPORAL) {
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
      }
    } else if (propertyExpression.parametersValues.length !== 2) {
      throw new UnsupportedOperationError(
        `Property of milestoning sterotype '${targetStereotype}' should have one parameters`,
      );
    }
  }
};

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
    case MILESTONING_STEROTYPES.BITEMPORAL:
      if (idx === 0) {
        return queryBuilderState.querySetupState.ProcessingDate;
      } else {
        return queryBuilderState.querySetupState.businessDate;
      }
    case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL:
      return queryBuilderState.querySetupState.BusinessDate;
    case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL:
      return queryBuilderState.querySetupState.processingDate;
    default:
      return undefined;
  }
};
