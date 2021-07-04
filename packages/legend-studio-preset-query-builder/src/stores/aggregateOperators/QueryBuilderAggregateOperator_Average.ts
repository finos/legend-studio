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

import type {
  ValueSpecification,
  SimpleFunctionExpression,
} from '@finos/legend-studio';
import { PRIMITIVE_TYPE } from '@finos/legend-studio';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import type { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState';
import { QueryBuilderAggregateOperator } from '../QueryBuilderAggregationState';
import {
  buildAggregateColumnState,
  buildAggregateExpression,
} from './QueryBuilderAggregateOperatorHelper';

export class QueryBuilderAggregateOperator_Average extends QueryBuilderAggregateOperator {
  getLabel(aggregateColumnState: QueryBuilderAggregateColumnState): string {
    return 'average';
  }

  isCompatibleWithColumn(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): boolean {
    const propertyType =
      aggregateColumnState.projectionColumnState.propertyEditorState
        .propertyExpression.func.genericType.value.rawType;
    return (
      [
        PRIMITIVE_TYPE.NUMBER,
        PRIMITIVE_TYPE.INTEGER,
        PRIMITIVE_TYPE.DECIMAL,
        PRIMITIVE_TYPE.FLOAT,
      ] as unknown as string
    ).includes(propertyType.path);
  }

  buildAggregateExpression(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): ValueSpecification {
    return buildAggregateExpression(
      aggregateColumnState,
      SUPPORTED_FUNCTIONS.AVERAGE,
    );
  }

  buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): QueryBuilderAggregateColumnState | undefined {
    return buildAggregateColumnState(
      aggregateColumnState,
      expression,
      SUPPORTED_FUNCTIONS.AVERAGE,
      this,
    );
  }
}
