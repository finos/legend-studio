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
  hashArray,
} from '@finos/legend-shared';
import {
  AbstractPropertyExpression,
  INTERNAL__UnknownValueSpecification,
  LambdaFunctionInstanceValue,
  type SimpleFunctionExpression,
  type ValueSpecification,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
} from '../projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderAggregateColumnState } from './QueryBuilderAggregationState.js';
import { action, computed, makeObservable, observable } from 'mobx';
import type { QUERY_BUILDER_CALENDAR_TYPE } from '../../../../graph-manager/QueryBuilderConst.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../../../QueryBuilderConfig.js';
import {
  buildCalendarFunctionExpression,
  updateAggregateColumnState,
} from './QueryBuilderAggregateCalendarFunctionValueSpecificationBuilder.js';

export class QueryBuilderAggregateCalendarFunction implements Hashable {
  dateColumn?: AbstractPropertyExpression | undefined;
  calendarType!: QUERY_BUILDER_CALENDAR_TYPE;
  endDate!: ValueSpecification;
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;

  private func: string;
  private label: string;
  private hash: string;

  constructor(func: string, label: string, hash: string) {
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

    this.func = func;
    this.label = label;
    this.hash = hash;
  }

  getLabel(): string {
    return this.label;
  }

  isCompatibleWithColumn(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): boolean {
    if (
      projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
    ) {
      const propertyType =
        projectionColumnState.propertyExpressionState.propertyExpression.func
          .value.genericType.value.rawType;
      return (
        [
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
        ] as string[]
      ).includes(propertyType.path);
    }
    return true;
  }

  buildCalendarFunctionExpression(
    p: AbstractPropertyExpression | INTERNAL__UnknownValueSpecification,
  ): ValueSpecification {
    return buildCalendarFunctionExpression(
      this.func,
      this.dateColumn,
      this.calendarType,
      this.endDate,
      p,
    );
  }

  updateAggregateColumnState(
    expression: SimpleFunctionExpression,
    aggregationColumnState: QueryBuilderAggregateColumnState,
  ): void {
    updateAggregateColumnState(
      expression,
      this.func,
      this,
      aggregationColumnState,
    );
  }

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

  get hashCode(): string {
    return hashArray([
      this.hash,
      this.dateColumn ?? '',
      this.calendarType,
      this.endDate,
    ]);
  }
}
