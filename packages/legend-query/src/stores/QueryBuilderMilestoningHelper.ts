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

import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  Class,
  type PureModel,
  type ValueSpecification,
  type DerivedProperty,
  getMilestoneTemporalStereotype,
  MILESTONING_STEROTYPES,
  DEFAULT_MILESTONING_PARAMETERS,
} from '@finos/legend-graph';
import type { QueryBuilderDerivedPropertyExpressionState } from './QueryBuilderPropertyEditorState';

export const milestoningParameters = {
  BUSINESS_TEMPORAL: false,
  PROCESSING_TEMPORAL: false,
};

export const isDatePropagationSupported = (
  property: DerivedProperty,
  graph: PureModel,
): boolean => {
  const owner = property.owner;
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
    isDatePropagationSupported(currentExpression.derivedProperty, graph) &&
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
        isDatePropagationSupported(currentExpression.derivedProperty, graph) &&
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
