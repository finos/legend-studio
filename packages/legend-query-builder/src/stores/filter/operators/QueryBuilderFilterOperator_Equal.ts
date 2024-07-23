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
  type AbstractPropertyExpression,
  Enumeration,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graph/QueryBuilderMetaModelConst.js';
import {
  buildNotExpression,
  isTypeCompatibleForAssignment,
  unwrapNotExpression,
} from '../../QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';
import { buildDefaultInstanceValue } from '../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderFilterOperator_Equal
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType;
    return (
      (
        [
          PRIMITIVE_TYPE.STRING,
          PRIMITIVE_TYPE.BOOLEAN,
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
          PRIMITIVE_TYPE.DATE,
          PRIMITIVE_TYPE.STRICTDATE,
          PRIMITIVE_TYPE.DATETIME,
        ] as string[]
      ).includes(propertyType.path) ||
      // if the type is enumeration, make sure the enumeration has some value
      (propertyType instanceof Enumeration && propertyType.values.length > 0)
    );
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    return isTypeCompatibleForAssignment(
      filterConditionState.rightConditionValue &&
        !filterConditionState.rightConditionValue.isCollection
        ? filterConditionState.rightConditionValue.type
        : undefined,
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType,
    );
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType;
    return buildDefaultInstanceValue(
      filterConditionState.filterState.queryBuilderState.graphManagerState
        .graph,
      propertyType,
      filterConditionState.filterState.queryBuilderState.observerContext,
      filterConditionState.filterState.queryBuilderState
        .INTERNAL__enableInitializingDefaultSimpleExpressionValue,
    );
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
    lambdaParameterName?: string | undefined,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType.path === PRIMITIVE_TYPE.DATETIME &&
        filterConditionState.rightConditionValue?.type?.path !==
          PRIMITIVE_TYPE.DATETIME
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_ON_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.EQUAL,
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
      (expression.parametersValues[0] as AbstractPropertyExpression).func.value
        .genericType.value.rawType.path === PRIMITIVE_TYPE.DATETIME &&
        expression.parametersValues[1]?.genericType?.value.rawType.path !==
          PRIMITIVE_TYPE.DATETIME
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_ON_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.EQUAL,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_EQUAL,
    ]);
  }
}

export class QueryBuilderFilterOperator_NotEqual extends QueryBuilderFilterOperator_Equal {
  override getLabel(filterConditionState: FilterConditionState): string {
    return `is not`;
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_NOT_EQUAL,
    ]);
  }
}
