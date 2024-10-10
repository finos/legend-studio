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
  unwrapNotExpression,
} from '../../QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';
import { buildDefaultInstanceValue } from '../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderFilterOperator_EndWith
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'ends with';
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
    const type =
      filterConditionState.rightConditionValue &&
      !filterConditionState.rightConditionValue.isCollection
        ? filterConditionState.rightConditionValue.type
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
        return buildDefaultInstanceValue(
          filterConditionState.filterState.queryBuilderState.graphManagerState
            .graph,
          propertyType,
          filterConditionState.filterState.queryBuilderState.observerContext,
          filterConditionState.filterState.queryBuilderState
            .INTERNAL__enableInitializingDefaultSimpleExpressionValue,
        );
      }
      default:
        throw new UnsupportedOperationError(
          `Can't get default value for filter operator '${this.getLabel()}' when the LHS property is of type '${propertyType.path}'`,
        );
    }
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
    lambdaParameterName?: string | undefined,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.ENDS_WITH,
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
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.ENDS_WITH,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_END_WITH,
    ]);
  }
}

export class QueryBuilderFilterOperator_NotEndWith extends QueryBuilderFilterOperator_EndWith {
  override getLabel(): string {
    return `doesn't end with`;
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_NOT_END_WITH,
    ]);
  }
}
