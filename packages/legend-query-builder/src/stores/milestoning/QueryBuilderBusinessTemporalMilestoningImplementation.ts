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
  BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
  type SimpleFunctionExpression,
  type AbstractPropertyExpression,
  MILESTONING_STEREOTYPE,
  INTERNAL__PropagatedValue,
} from '@finos/legend-graph';
import { assertTrue, guaranteeNonNullable } from '@finos/legend-shared';
import { getParameterValue } from '../../components/QueryBuilderSideBar.js';
import { QueryBuilderMilestoningImplementation } from './QueryBuilderMilestoningImplementation.js';

export class QueryBuilderBusinessTemporalMilestoningImplementation extends QueryBuilderMilestoningImplementation {
  getMilestoningDate(): ValueSpecification | undefined {
    return this.milestoningState.businessDate;
  }

  getMilestoningToolTipText(): string {
    return `Business Date: ${getParameterValue(this.getMilestoningDate())}`;
  }

  initializeMilestoningParameters(force?: boolean): void {
    if (!this.milestoningState.businessDate || force) {
      this.milestoningState.setBusinessDate(
        this.milestoningState.buildMilestoningParameter(
          BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
        ),
      );
    }
  }

  processGetAllParamaters(parameterValues: ValueSpecification[]): void {
    assertTrue(
      parameterValues.length === 2,
      `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter`,
    );
    this.milestoningState.setBusinessDate(parameterValues[1]);
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
    temporalSource: MILESTONING_STEREOTYPE | undefined,
  ): ValueSpecification {
    this.initializeMilestoningParameters();
    if (
      isDatePropagationSupported &&
      prevPropertyExpression &&
      !hasDefaultMilestoningDate
    ) {
      if (temporalSource === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
        return new INTERNAL__PropagatedValue(() =>
          guaranteeNonNullable(prevPropertyExpression.parametersValues[1]),
        );
      } else {
        return new INTERNAL__PropagatedValue(() =>
          guaranteeNonNullable(prevPropertyExpression.parametersValues[2]),
        );
      }
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
