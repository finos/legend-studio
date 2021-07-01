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

import { QueryBuilderFilterOperator } from '../QueryBuilderFilterState';
import type {
  QueryBuilderFilterState,
  FilterConditionState,
} from '../QueryBuilderFilterState';
import type {
  ValueSpecification,
  SimpleFunctionExpression,
} from '@finos/legend-studio';
import { PRIMITIVE_TYPE } from '@finos/legend-studio';
import { UnsupportedOperationError } from '@finos/legend-studio-shared';
import {
  buildFilterConditionState,
  buildNotExpression,
  buildPrimitiveInstanceValue,
  buildFilterConditionExpression,
  getDefaultPrimitiveInstanceValueForType,
  getNonCollectionValueSpecificationType,
  unwrapNotExpression,
} from './QueryBuilderFilterOperatorHelper';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';

export class QueryBuilderFilterOperator_StartWith extends QueryBuilderFilterOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return 'starts with';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    return PRIMITIVE_TYPE.STRING === propertyType.path;
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    const type = filterConditionState.value
      ? getNonCollectionValueSpecificationType(filterConditionState.value)
      : undefined;
    return PRIMITIVE_TYPE.STRING === type?.path;
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    switch (propertyType.path) {
      case PRIMITIVE_TYPE.STRING: {
        return buildPrimitiveInstanceValue(
          filterConditionState,
          propertyType.path,
          getDefaultPrimitiveInstanceValueForType(propertyType.path),
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
      SUPPORTED_FUNCTIONS.STARTS_WITH,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      SUPPORTED_FUNCTIONS.STARTS_WITH,
      this,
    );
  }
}

export class QueryBuilderFilterOperator_NotStartWith extends QueryBuilderFilterOperator_StartWith {
  override getLabel(filterConditionState: FilterConditionState): string {
    return `doesn't start with`;
  }

  override buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildNotExpression(
      filterConditionState,
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
