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
  PRIMITIVE_TYPE,
  type ValueSpecification,
  type SimpleFunctionExpression,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  type Hashable,
  hashArray,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorValueSpecificationBuilder.js';
import {
  buildNotExpression,
  generateDefaultValueForPrimitiveType,
  getNonCollectionValueSpecificationType,
  unwrapNotExpression,
} from '../../QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../graphManager/QueryBuilderHashUtils.js';
import { buildPrimitiveInstanceValue } from '../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderFilterOperator_Contain
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(filterConditionState: FilterConditionState): string {
    return 'contains';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    return (
      PrimitiveType.STRING ===
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType
    );
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    const type = filterConditionState.value
      ? getNonCollectionValueSpecificationType(filterConditionState.value)
      : undefined;
    return PrimitiveType.STRING === type;
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType;
    switch (propertyType.path) {
      case PRIMITIVE_TYPE.STRING: {
        return buildPrimitiveInstanceValue(
          filterConditionState.filterState.queryBuilderState.graphManagerState
            .graph,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
          filterConditionState.filterState.queryBuilderState.observerContext,
        );
      }
      default:
        throw new UnsupportedOperationError(
          `Can't get default value for filter operator '${this.getLabel(
            filterConditionState,
          )}' when the LHS property is of type '${propertyType.path}'`,
        );
    }
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.CONTAINS,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.CONTAINS,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([QUERY_BUILDER_HASH_STRUCTURE.FILTER_OPERATOR_CONTAIN]);
  }
}

export class QueryBuilderFilterOperator_NotContain extends QueryBuilderFilterOperator_Contain {
  override getLabel(filterConditionState: FilterConditionState): string {
    return `doesn't contain`;
  }

  override buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildNotExpression(
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

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.FILTER_OPERATOR_NOT_CONTAIN,
    ]);
  }
}
