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
  type Hashable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  AbstractPropertyExpression,
  INTERNAL__UnknownValueSpecification,
  LambdaFunctionInstanceValue,
  type SimpleFunctionExpression,
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
} from '../projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderAggregateColumnState } from './QueryBuilderAggregationState.js';
import { computed, makeObservable, observable, action } from 'mobx';
import type { QUERY_BUILDER_CALENDAR_TYPE } from '../../../../graph-manager/QueryBuilderConst.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../../../QueryBuilderConfig.js';

export abstract class QueryBuilderAggregateCalendarFunction
  implements Hashable
{
  dateColumn?: AbstractPropertyExpression | undefined;
  calendarType!: QUERY_BUILDER_CALENDAR_TYPE;
  endDate!: ValueSpecification;
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;

  constructor() {
    makeObservable(this, {
      dateColumn: observable,
      lambdaParameterName: observable,
      calendarType: observable,
      endDate: observable,
      setDateColumn: action,
      setCalendarType: action,
      setLambdaParameterName: action,
      setEndDate: action,
      hashCode: computed,
    });
  }

  abstract getLabel(): string;

  abstract isCompatibleWithColumn(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): boolean;

  abstract buildCalendarFunctionExpression(
    propertyExpression:
      | AbstractPropertyExpression
      | INTERNAL__UnknownValueSpecification,
  ): ValueSpecification;

  buildCalendarFunctionExpressionFromState(
    aggregateColumnState: QueryBuilderAggregateColumnState,
    columnLambda: ValueSpecification,
  ): ValueSpecification {
    let targetColumn:
      | AbstractPropertyExpression
      | INTERNAL__UnknownValueSpecification
      | undefined;
    if (
      aggregateColumnState.projectionColumnState instanceof
        QueryBuilderSimpleProjectionColumnState &&
      columnLambda instanceof LambdaFunctionInstanceValue
    ) {
      targetColumn = guaranteeType(
        columnLambda.values[0]?.expressionSequence[0],
        AbstractPropertyExpression,
      );
    } else if (
      aggregateColumnState.projectionColumnState instanceof
      QueryBuilderDerivationProjectionColumnState
    ) {
      targetColumn = guaranteeType(
        columnLambda,
        INTERNAL__UnknownValueSpecification,
      );
    }
    if (!targetColumn) {
      throw new UnsupportedOperationError(
        "Can't build calendar aggregation column: target column should be defined",
      );
    }
    return this.buildCalendarFunctionExpression(targetColumn);
  }

  abstract updateAggregateColumnState(
    expression: SimpleFunctionExpression,
    aggregationColumnState: QueryBuilderAggregateColumnState,
  ): void;

  setDateColumn(val: AbstractPropertyExpression): void {
    this.dateColumn = val;
  }

  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }

  setCalendarType(val: QUERY_BUILDER_CALENDAR_TYPE): void {
    this.calendarType = val;
  }

  setEndDate(val: ValueSpecification): void {
    this.endDate = val;
  }

  abstract get hashCode(): string;
}
