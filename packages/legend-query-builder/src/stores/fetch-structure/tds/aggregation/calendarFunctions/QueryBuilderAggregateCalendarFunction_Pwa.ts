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
  PRIMITIVE_TYPE,
  type ValueSpecification,
  type SimpleFunctionExpression,
  type AbstractPropertyExpression,
} from '@finos/legend-graph';
import type { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState.js';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../../projection/QueryBuilderProjectionColumnState.js';
import { QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';
import { QueryBuilderAggregateCalendarFunction } from '../QueryBuilderAggregateCalendarFunction.js';
import {
  updateAggregateColumnState,
  buildCalendarFunctionExpression,
} from './QueryBuilderAggregateCalendarFunctionValueSpecificationBuilder.js';

export class QueryBuilderAggregateCalendarFunction_Pwa
  extends QueryBuilderAggregateCalendarFunction
  implements Hashable
{
  getLabel(): string {
    return `Past Weeks' Average`;
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
    p: AbstractPropertyExpression,
  ): ValueSpecification {
    return buildCalendarFunctionExpression(
      QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS.CALENDAR_PWA,
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
      QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS.CALENDAR_PWA,
      this,
      aggregationColumnState,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.AGGREGATE_CALENDAR_FUNCTION_PWA,
      this.dateColumn ?? '',
      this.calendarType,
      this.endDate,
    ]);
  }
}
