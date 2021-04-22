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
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import {
  buildFilterConditionState,
  buildNotExpression,
  buildPrimitiveInstanceValue,
  buildFilterConditionExpression,
  getDefaultPrimitiveInstanceValueForType,
  getValueSpecificationTypeInfo,
  unwrapNotExpression,
} from './QueryBuilderOperatorHelpers';

const CONTAIN_FUNCTION_NAME = 'contains';

export class QueryBuilderContainOperator extends QueryBuilderOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return 'contains';
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
    const typeInfo = filterConditionState.value
      ? getValueSpecificationTypeInfo(filterConditionState.value)
      : undefined;
    return (
      PRIMITIVE_TYPE.STRING === typeInfo?.type.path &&
      typeInfo.isCollection === false
    );
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
          `Can't get default value for operator '${
            getClass(this).name
          }' when the LHS property is of type '${propertyType.path}'`,
        );
    }
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      CONTAIN_FUNCTION_NAME,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      CONTAIN_FUNCTION_NAME,
      this,
    );
  }
}

export class QueryBuilderNotContainOperator extends QueryBuilderContainOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return `doesn't contain`;
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
