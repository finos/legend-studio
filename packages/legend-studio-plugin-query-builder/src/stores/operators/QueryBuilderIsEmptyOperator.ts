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

import { QueryBuilderOperator } from '../QueryBuilderFilterState';
import type {
  QueryBuilderFilterState,
  FilterConditionState,
} from '../QueryBuilderFilterState';
import type {
  ValueSpecification,
  SimpleFunctionExpression,
} from '@finos/legend-studio';
import { PRIMITIVE_TYPE } from '@finos/legend-studio';
import {
  buildFilterConditionState,
  buildNotExpression,
  buildFilterConditionExpression,
  unwrapNotExpression,
} from './QueryBuilderOperatorHelpers';

const IS_EMPTY_FUNCTION_NAME = 'isEmpty';

export class QueryBuilderIsEmptyOperator extends QueryBuilderOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is empty';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    return (
      [
        PRIMITIVE_TYPE.STRING,
        PRIMITIVE_TYPE.BOOLEAN,
        PRIMITIVE_TYPE.NUMBER,
        PRIMITIVE_TYPE.INTEGER,
        PRIMITIVE_TYPE.DECIMAL,
        PRIMITIVE_TYPE.FLOAT,
      ] as unknown as string
    ).includes(propertyType.path);
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
      IS_EMPTY_FUNCTION_NAME,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      IS_EMPTY_FUNCTION_NAME,
      this,
      true,
    );
  }
}

export class QueryBuilderIsNotEmptyOperator extends QueryBuilderIsEmptyOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return `is not empty`;
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildNotExpression(
      filterConditionState,
      super.buildFilterConditionExpression(filterConditionState),
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    const innerExpression = unwrapNotExpression(expression);
    return innerExpression
      ? super.buildFilterConditionState(filterState, innerExpression)
      : undefined;
  }
}
