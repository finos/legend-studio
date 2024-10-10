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
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import {
  type Hashable,
  UnsupportedOperationError,
  hashArray,
} from '@finos/legend-shared';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graph/QueryBuilderMetaModelConst.js';
import { isTypeCompatibleForAssignment } from '../../QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';
import { buildDefaultInstanceValue } from '../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderFilterOperator_GreaterThan
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(): string {
    return '>';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType;
    return (
      [
        PRIMITIVE_TYPE.NUMBER,
        PRIMITIVE_TYPE.INTEGER,
        PRIMITIVE_TYPE.DECIMAL,
        PRIMITIVE_TYPE.FLOAT,
        PRIMITIVE_TYPE.DATE,
        PRIMITIVE_TYPE.STRICTDATE,
        PRIMITIVE_TYPE.DATETIME,
      ] as string[]
    ).includes(propertyType.path);
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
    switch (propertyType.path) {
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME:
      case PRIMITIVE_TYPE.DATE: {
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
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType.path === PRIMITIVE_TYPE.DATETIME &&
        filterConditionState.rightConditionValue?.type?.path !==
          PRIMITIVE_TYPE.DATETIME
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_AFTER_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.GREATER_THAN,
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
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_AFTER_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.GREATER_THAN,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_GREATER_THAN,
    ]);
  }
}
