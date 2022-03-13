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
} from '@finos/legend-graph';
import type { QueryBuilderDerivedPropertyExpressionState } from './QueryBuilderPropertyEditorState';

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
  const milestonedParameters =
    currentExpression.queryBuilderState.querySetupState
      .classMilestoningTemporalValues;
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
              milestonedParameters[0] &&
            currentExpression.propertyExpression.parametersValues[2] ===
              milestonedParameters[1]
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
            milestonedParameters[0]
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
          const businessDate =
            milestonedParameters.length === 2
              ? milestonedParameters[1]
              : milestonedParameters[0];
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
      let parameter;
      if (querySetupState.classMilestoningTemporalValues.length === 0) {
        derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
          DEFAULT_MILESTONING_PARAMETERS.BUSINESS_DATE,
        );
        parameter = querySetupState.classMilestoningTemporalValues[0];
      } else if (querySetupState.classMilestoningTemporalValues.length === 1) {
        if (milestoningParameters.BUSINESS_TEMPORAL) {
          parameter = querySetupState.classMilestoningTemporalValues[0];
        } else {
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.BUSINESS_DATE,
          );
          parameter = querySetupState.classMilestoningTemporalValues[1];
        }
      } else {
        parameter = querySetupState.classMilestoningTemporalValues[1];
      }
      milestoningParameters.BUSINESS_TEMPORAL = true;
      return parameter;
    }
    case MILESTONING_STEROTYPES.BITEMPORAL: {
      if (querySetupState.classMilestoningTemporalValues.length === 0) {
        derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
          DEFAULT_MILESTONING_PARAMETERS.PROCESSING_DATE,
        );
        derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
          DEFAULT_MILESTONING_PARAMETERS.BUSINESS_DATE,
        );
      } else if (querySetupState.classMilestoningTemporalValues.length === 1) {
        if (milestoningParameters.PROCESSING_TEMPORAL) {
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.BUSINESS_DATE,
          );
        } else {
          const businessTemporalMilestoningParameter = guaranteeNonNullable(
            querySetupState.classMilestoningTemporalValues[0],
          );
          querySetupState.setClassMilestoningTemporalValues([]);
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.PROCESSING_DATE,
          );
          querySetupState.addClassMilestoningTemporalValues(
            businessTemporalMilestoningParameter,
          );
        }
      }
      milestoningParameters.BUSINESS_TEMPORAL = true;
      milestoningParameters.PROCESSING_TEMPORAL = true;
      return querySetupState.classMilestoningTemporalValues[idx];
    }
    case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL: {
      let parameter;
      if (querySetupState.classMilestoningTemporalValues.length === 0) {
        derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
          DEFAULT_MILESTONING_PARAMETERS.PROCESSING_DATE,
        );
        parameter = querySetupState.classMilestoningTemporalValues[0];
      } else if (querySetupState.classMilestoningTemporalValues.length === 1) {
        if (milestoningParameters.PROCESSING_TEMPORAL) {
          parameter = querySetupState.classMilestoningTemporalValues[0];
        } else {
          const businessTemporalMilestoningParameter = guaranteeNonNullable(
            querySetupState.classMilestoningTemporalValues[0],
          );
          querySetupState.setClassMilestoningTemporalValues([]);
          derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
            DEFAULT_MILESTONING_PARAMETERS.PROCESSING_DATE,
          );
          parameter = querySetupState.classMilestoningTemporalValues[0];
          querySetupState.addClassMilestoningTemporalValues(
            businessTemporalMilestoningParameter,
          );
        }
      } else {
        parameter = querySetupState.classMilestoningTemporalValues[0];
      }
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
        return queryBuilderState.querySetupState.processingDate;
      } else {
        return queryBuilderState.querySetupState.businessDate;
      }
    case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL:
      return queryBuilderState.querySetupState.businessDate;
    case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL:
      return queryBuilderState.querySetupState.processingDate;
    default:
      return undefined;
  }
};
