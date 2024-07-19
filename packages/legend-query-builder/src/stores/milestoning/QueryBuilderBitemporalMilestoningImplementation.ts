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
  type ValueSpecification,
  PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
  BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
  type SimpleFunctionExpression,
  AbstractPropertyExpression,
  MILESTONING_STEREOTYPE,
  INTERNAL__PropagatedValue,
  PrimitiveType,
  VariableExpression,
} from '@finos/legend-graph';
import {
  UnsupportedOperationError,
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import { getParameterValue } from '../../components/QueryBuilderSideBar.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderDerivedPropertyExpressionState } from '../QueryBuilderPropertyEditorState.js';
import { createSupportedFunctionExpression } from '../shared/ValueSpecificationEditorHelper.js';
import { QueryBuilderMilestoningImplementation } from './QueryBuilderMilestoningImplementation.js';
import type { LambdaParameterState } from '../shared/LambdaParameterState.js';

export class QueryBuilderBitemporalMilestoningImplementation extends QueryBuilderMilestoningImplementation {
  getMilestoningDate(index?: number): ValueSpecification | undefined {
    if (index === 0) {
      return this.milestoningState.processingDate;
    } else {
      return this.milestoningState.businessDate;
    }
  }

  getMilestoningToolTipText(): string {
    return `Processing Date: ${getParameterValue(
      this.getMilestoningDate(0),
    )}, Business Date: ${getParameterValue(this.getMilestoningDate(1))}`;
  }

  initializeMilestoningParameters(force?: boolean): void {
    if (!this.milestoningState.processingDate || force) {
      this.milestoningState.setProcessingDate(
        this.milestoningState.buildMilestoningParameter(
          PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
        ),
      );
    }
    if (!this.milestoningState.businessDate || force) {
      this.milestoningState.setBusinessDate(
        this.milestoningState.buildMilestoningParameter(
          BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
        ),
      );
    }
  }

  buildParameterStatesFromMilestoningParameters(): LambdaParameterState[] {
    const businessState =
      this.milestoningState.buildParameterStateFromMilestoningParameter(
        this.milestoningState.businessDate &&
          this.milestoningState.businessDate instanceof VariableExpression
          ? this.milestoningState.businessDate.name
          : BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
      );

    const processingState =
      this.milestoningState.buildParameterStateFromMilestoningParameter(
        this.milestoningState.processingDate &&
          this.milestoningState.processingDate instanceof VariableExpression
          ? this.milestoningState.processingDate.name
          : PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
      );

    return [businessState, processingState].filter(isNonNullable);
  }

  processGetAllParamaters(parameterValues: ValueSpecification[]): void {
    assertTrue(
      parameterValues.length === 3,
      `Can't process getAll() expression: when used with a bitemporal milestoned class getAll() expects two parameters`,
    );
    this.milestoningState.setProcessingDate(parameterValues[1]);
    this.milestoningState.setBusinessDate(parameterValues[2]);
  }

  buildGetAllParameters(getAllFunction: SimpleFunctionExpression): void {
    getAllFunction.parametersValues.push(
      guaranteeNonNullable(
        this.getMilestoningDate(0),
        `Milestoning class should have a parameter of type 'Date'`,
      ),
    );
    getAllFunction.parametersValues.push(
      guaranteeNonNullable(
        this.getMilestoningDate(1),
        `Milestoning class should have a parameter of type 'Date'`,
      ),
    );
  }

  buildGetAllWithDefaultParameters(
    getAllFunction: SimpleFunctionExpression,
  ): void {
    const parameterValue = createSupportedFunctionExpression(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW,
      PrimitiveType.DATETIME,
    );
    getAllFunction.parametersValues.push(parameterValue);
    getAllFunction.parametersValues.push(parameterValue);
  }

  buildGetAllVersionsInRangeParameters(
    getAllVersionsInRangeFunction: SimpleFunctionExpression,
  ): void {
    throw new UnsupportedOperationError(
      `Can't build getAllVersionsInRange() function: expects root class to be business temporal or processing temporal milestoned`,
    );
  }

  generateMilestoningDate(
    isDatePropagationSupported: boolean,
    hasDefaultMilestoningDate: boolean,
    prevPropertyExpression: AbstractPropertyExpression | undefined,
    temporalSource: MILESTONING_STEREOTYPE | undefined,
    idx?: number,
    derivedPropertyExpressionState?: QueryBuilderDerivedPropertyExpressionState,
  ): ValueSpecification {
    this.initializeMilestoningParameters();
    if (idx === 0) {
      if (
        temporalSource === MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL &&
        derivedPropertyExpressionState?.parameterValues.length === 1
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
          guaranteeNonNullable(this.getMilestoningDate(idx)),
        );
        parameter.isPropagatedValue = hasDefaultMilestoningDate
          ? false
          : isDatePropagationSupported;
      }
      return parameter;
    } else {
      if (
        temporalSource === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL &&
        derivedPropertyExpressionState?.parameterValues.length === 1
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
          guaranteeNonNullable(this.getMilestoningDate(idx)),
        );
        parameter.isPropagatedValue = hasDefaultMilestoningDate
          ? false
          : isDatePropagationSupported;
      }
      return parameter;
    }
  }
}
