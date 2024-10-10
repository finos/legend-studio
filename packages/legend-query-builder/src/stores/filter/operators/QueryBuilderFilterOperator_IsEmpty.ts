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
  Enumeration,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graph/QueryBuilderMetaModelConst.js';
import {
  buildNotExpression,
  isPropertyExpressionChainOptional,
  unwrapNotExpression,
} from '../../QueryBuilderValueSpecificationHelper.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';

export class QueryBuilderFilterOperator_IsEmpty
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(): string {
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
    return (
      propertyType instanceof Enumeration ||
      propertyType instanceof PrimitiveType
    );
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    return filterConditionState.rightConditionValue === undefined;
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    return undefined;
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
    lambdaParameterName?: string | undefined,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_EMPTY,
      lambdaParameterName,
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
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_IS_EMPTY,
    ]);
  }
}

export class QueryBuilderFilterOperator_IsNotEmpty extends QueryBuilderFilterOperator_IsEmpty {
  override getLabel(): string {
    return `is not empty`;
  }

  override buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
    lambdaParameterName?: string | undefined,
  ): ValueSpecification {
    return buildNotExpression(
      super.buildFilterConditionExpression(
        filterConditionState,
        lambdaParameterName,
      ),
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_IS_NOT_EMPTY,
    ]);
  }
}
