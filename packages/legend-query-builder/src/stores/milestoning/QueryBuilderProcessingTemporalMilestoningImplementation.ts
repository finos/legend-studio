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
  type SimpleFunctionExpression,
  type AbstractPropertyExpression,
  INTERNAL__PropagatedValue,
} from '@finos/legend-graph';
import { assertTrue, guaranteeNonNullable } from '@finos/legend-shared';
import { getParameterValue } from '../../components/QueryBuilderSideBar.js';
import { QueryBuilderMilestoningImplementation } from './QueryBuilderMilestoningImplementation.js';

export class QueryBuilderProcessingTemporalMilestoningImplementation extends QueryBuilderMilestoningImplementation {
  getMilestoningDate(): ValueSpecification | undefined {
    return this.milestoningState.processingDate;
  }

  getMilestoningToolTipText(): string {
    return `Processing Date: ${getParameterValue(this.getMilestoningDate())}`;
  }

  initializeMilestoningParameters(force?: boolean): void {
    if (!this.milestoningState.processingDate || force) {
      this.milestoningState.setProcessingDate(
        this.milestoningState.buildMilestoningParameter(
          PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
        ),
      );
    }
    // Show the parameter panel because we populate paramaters state with milestoning parameters
    this.milestoningState.queryBuilderState.setShowParametersPanel(true);
  }

  processGetAllParamaters(parameterValues: ValueSpecification[]): void {
    assertTrue(
      parameterValues.length === 2,
      `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter`,
    );
    this.milestoningState.setProcessingDate(parameterValues[1]);
  }

  buildGetAllParameters(getAllFunction: SimpleFunctionExpression): void {
    getAllFunction.parametersValues.push(
      guaranteeNonNullable(
        this.getMilestoningDate(),
        `Milestoning class should have a parameter of type 'Date'`,
      ),
    );
  }

  generateMilestoningDate(
    isDatePropagationSupported: boolean,
    hasDefaultMilestoningDate: boolean,
    prevPropertyExpression: AbstractPropertyExpression | undefined,
  ): ValueSpecification {
    this.initializeMilestoningParameters();
    if (
      isDatePropagationSupported &&
      prevPropertyExpression &&
      !hasDefaultMilestoningDate
    ) {
      return new INTERNAL__PropagatedValue(() =>
        guaranteeNonNullable(prevPropertyExpression.parametersValues[1]),
      );
    } else {
      const milestoningDate = new INTERNAL__PropagatedValue(() =>
        guaranteeNonNullable(this.getMilestoningDate()),
      );
      milestoningDate.isPropagatedValue = hasDefaultMilestoningDate
        ? false
        : isDatePropagationSupported;
      return milestoningDate;
    }
  }
}
