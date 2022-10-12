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
  QueryBuilderFilterState,
  FilterConditionState,
} from '../QueryBuilderFilterState.js';
import { QueryBuilderFilterOperator } from '../QueryBuilderFilterOperator.js';
import {
  type ValueSpecification,
  type SimpleFunctionExpression,
  PRIMITIVE_TYPE,
  Enumeration,
} from '@finos/legend-graph';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import {
  buildNotExpression,
  isPropertyExpressionChainOptional,
  unwrapNotExpression,
} from '../../QueryBuilderValueSpecificationHelper.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../graphManager/QueryBuilderHashUtils.js';

export class QueryBuilderFilterOperator_IsEmpty
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is empty';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func.value
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

  get hashCode(): string {
    return hashArray([QUERY_BUILDER_HASH_STRUCTURE.FILTER_OPERATOR_IS_EMPTY]);
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
      super.buildFilterConditionExpression(filterConditionState),
      filterConditionState.filterState.queryBuilderState.graphManagerState
        .graph,
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

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.FILTER_OPERATOR_IS_NOT_EMPTY,
    ]);
  }
}
