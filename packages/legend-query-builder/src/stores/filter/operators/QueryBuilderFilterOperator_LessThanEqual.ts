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
  type AbstractPropertyExpression,
  SUPPORTED_FUNCTIONS,
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
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import {
  generateDefaultValueForPrimitiveType,
  getNonCollectionValueSpecificationType,
  isTypeCompatibleForAssignment,
} from '../../QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../graphManager/QueryBuilderHashUtils.js';
import { buildPrimitiveInstanceValue } from '../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderFilterOperator_LessThanEqual
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(filterConditionState: FilterConditionState): string {
    return '<=';
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
      filterConditionState.value
        ? getNonCollectionValueSpecificationType(filterConditionState.value)
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
      case PRIMITIVE_TYPE.DATETIME: {
        return buildPrimitiveInstanceValue(
          filterConditionState.filterState.queryBuilderState.graphManagerState
            .graph,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
          filterConditionState.filterState.queryBuilderState.observerContext,
        );
      }
      case PRIMITIVE_TYPE.DATE: {
        return buildPrimitiveInstanceValue(
          filterConditionState.filterState.queryBuilderState.graphManagerState
            .graph,
          PRIMITIVE_TYPE.STRICTDATE,
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
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType.path === PRIMITIVE_TYPE.DATETIME &&
        filterConditionState.value?.genericType?.value.rawType.path !==
          PRIMITIVE_TYPE.DATETIME
        ? SUPPORTED_FUNCTIONS.IS_ON_OR_BEFORE_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.LESS_THAN_EQUAL,
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
        ? SUPPORTED_FUNCTIONS.IS_ON_OR_BEFORE_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.LESS_THAN_EQUAL,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.FILTER_OPERATOR_LESS_THAN_EQUAL,
    ]);
  }
}
