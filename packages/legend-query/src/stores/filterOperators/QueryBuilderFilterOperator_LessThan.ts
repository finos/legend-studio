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

import {
  QueryBuilderFilterOperator,
  type QueryBuilderFilterState,
  type FilterConditionState,
} from '../QueryBuilderFilterState';
import {
  PRIMITIVE_TYPE,
  type ValueSpecification,
  type SimpleFunctionExpression,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorHelper';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationBuilderHelper';
import {
  buildPrimitiveInstanceValue,
  getNonCollectionValueSpecificationType,
} from '../QueryBuilderOperatorsHelper';

export class QueryBuilderFilterOperator_LessThan extends QueryBuilderFilterOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return '<';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func
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
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func
        .genericType.value.rawType;
    const type = filterConditionState.value
      ? getNonCollectionValueSpecificationType(filterConditionState.value)
      : undefined;
    const numericPrimitiveTypes = [
      PRIMITIVE_TYPE.NUMBER,
      PRIMITIVE_TYPE.INTEGER,
      PRIMITIVE_TYPE.DECIMAL,
      PRIMITIVE_TYPE.FLOAT,
    ] as string[];

    // When changing the return type for LHS, the RHS value should be adjusted accordingly.
    // Numeric value is handled loosely because execution still works if a float (RHS) is assigned to an Integer property(LHS), etc.
    return (
      type !== undefined &&
      ((numericPrimitiveTypes.includes(type.path) &&
        numericPrimitiveTypes.includes(propertyType.path)) ||
        type === propertyType ||
        propertyType.isSuperType(type))
    );
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func
        .genericType.value.rawType;
    switch (propertyType.path) {
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER:
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME: {
        return buildPrimitiveInstanceValue(
          filterConditionState.filterState.queryBuilderState,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
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
      SUPPORTED_FUNCTIONS.LESS_THAN,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      SUPPORTED_FUNCTIONS.LESS_THAN,
      this,
    );
  }
}
