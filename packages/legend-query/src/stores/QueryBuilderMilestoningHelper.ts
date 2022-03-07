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
} from '@finos/legend-graph';
import type { QueryBuilderDerivedPropertyExpressionState } from './QueryBuilderPropertyEditorState';

export const milestoningParameters = {
  BUSINESS_TEMPORAL: false,
  PROCESSING_TEMPORAL: false,
};

export const isDatePropagationSupported = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  graph: PureModel,
  prevPropertyExpression?:
    | QueryBuilderDerivedPropertyExpressionState
    | undefined,
): boolean => {
  const property = derivedPropertyExpressionState.derivedProperty;
  const owner = property.owner;
  if (prevPropertyExpression && prevPropertyExpression.parameterValues.length) {
    return false;
  }
  if (
    owner instanceof Class &&
    property.genericType.value.rawType instanceof Class
  ) {
    const sourceStereotype = getMilestoneTemporalStereotype(owner, graph);
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
  if (
    isDatePropagationSupported(currentExpression, graph) &&
    currentExpression.derivedProperty.owner instanceof Class
  ) {
    const stereotype = getMilestoneTemporalStereotype(
      currentExpression.derivedProperty.owner,
      graph,
    );
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
    prevExpression = currentExpression;
    for (let i = 1; i < derivedPropertyExpressionStates.length; i++) {
      currentExpression = guaranteeNonNullable(
        derivedPropertyExpressionStates[i],
      );
      if (
        isDatePropagationSupported(currentExpression, graph) &&
        !prevExpression.derivedProperty.name.endsWith('AllVersions') &&
        !prevExpression.derivedProperty.name.endsWith('AllVersionsInRange') &&
        prevExpression.propertyExpression.parametersValues ===
          currentExpression.propertyExpression.parametersValues
      ) {
        currentExpression.propertyExpression.parametersValues = [
          guaranteeNonNullable(
            currentExpression.propertyExpression.parametersValues[0],
          ),
        ];
      }
      prevExpression = currentExpression;
    }
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
  const sourceStereotype = getMilestoneTemporalStereotype(
    guaranteeType(generatedMilestoningProperty.owner, Class),
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
  derivedPropertyExpressionStates: QueryBuilderDerivedPropertyExpressionState[],
  idx: number,
): ValueSpecification | undefined => {
  const index = derivedPropertyExpressionStates.findIndex(
    (propertyState: QueryBuilderDerivedPropertyExpressionState) =>
      propertyState === derivedPropertyExpressionState,
  );
  const queryBuilderState = derivedPropertyExpressionState.queryBuilderState;
  const sourceStereotype = getMilestoneTemporalStereotype(
    guaranteeType(derivedPropertyExpressionState.derivedProperty.owner, Class),
    queryBuilderState.graphManagerState.graph,
  );
  const targetStereotype = getMilestoneTemporalStereotype(
    guaranteeType(
      derivedPropertyExpressionState.derivedProperty.genericType.value.rawType,
      Class,
    ),
    queryBuilderState.graphManagerState.graph,
  );
  if (
    index === 0 ||
    !derivedPropertyExpressionStates[index - 1]?.parameterValues.length
  ) {
    switch (targetStereotype) {
      case MILESTONING_STEROTYPES.BITEMPORAL:
        return guaranteeNonNullable(
          queryBuilderState.querySetupState.classMilestoningTemporalValues[idx],
        );
      case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL:
        if (
          queryBuilderState.querySetupState.classMilestoningTemporalValues
            .length === 2
        ) {
          return guaranteeNonNullable(
            queryBuilderState.querySetupState.classMilestoningTemporalValues[1],
          );
        } else {
          return guaranteeNonNullable(
            queryBuilderState.querySetupState.classMilestoningTemporalValues[0],
          );
        }
      case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL:
        return guaranteeNonNullable(
          queryBuilderState.querySetupState.classMilestoningTemporalValues[0],
        );
      default:
        return undefined;
    }
  } else {
    const prevPropertyExpression = guaranteeNonNullable(
      derivedPropertyExpressionStates[index - 1],
    );
    if (sourceStereotype === targetStereotype) {
      return guaranteeNonNullable(prevPropertyExpression.parameterValues[idx]);
    } else if (
      targetStereotype === MILESTONING_STEROTYPES.PROCESSING_TEMPORAL
    ) {
      return guaranteeNonNullable(prevPropertyExpression.parameterValues[0]);
    } else if (targetStereotype === MILESTONING_STEROTYPES.BUSINESS_TEMPORAL) {
      return guaranteeNonNullable(prevPropertyExpression.parameterValues[1]);
    }
  }
  return undefined;
};
