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
  QueryBuilderFilterOperator,
  type QueryBuilderFilterState,
  type FilterConditionState,
} from '../QueryBuilderFilterState.js';
import {
  PRIMITIVE_TYPE,
  type ValueSpecification,
  SimpleFunctionExpression,
  Enumeration,
  AbstractPropertyExpression,
} from '@finos/legend-graph';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const.js';
import {
  buildNotExpression,
  isPropertyExpressionChainOptional,
  unwrapNotExpression,
} from '../QueryBuilderOperatorsHelper.js';

export class QueryBuilderFilterOperator_IsEmpty extends QueryBuilderFilterOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is empty';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func
        .genericType.value.rawType;
    // First check if property is optional
    if (
      !isPropertyExpressionChainOptional(
        filterConditionState.propertyExpressionState.propertyExpression,
      )
    ) {
      return false;
    }
    if (propertyType instanceof Enumeration) {
      return true;
    }
    return (Object.values(PRIMITIVE_TYPE) as string[]).includes(
      propertyType.path,
    );
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    return filterConditionState.value === undefined;
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    return undefined;
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_EMPTY,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_EMPTY,
      this,
      true,
    );
  }
}

export class QueryBuilderFilterOperator_IsNotEmpty extends QueryBuilderFilterOperator_IsEmpty {
  override getLabel(filterConditionState: FilterConditionState): string {
    return `is not empty`;
  }

  override buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildNotExpression(
      filterConditionState.filterState.queryBuilderState.graphManagerState
        .graph,
      super.buildFilterConditionExpression(filterConditionState),
    );
  }

  override buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    const innerExpression = unwrapNotExpression(expression);
    return innerExpression
      ? super.buildFilterConditionState(filterState, innerExpression)
      : undefined;
  }
}
