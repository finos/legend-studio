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
  type ValueSpecification,
  type SimpleFunctionExpression,
  type Enum,
  EnumValueInstanceValue,
  GenericTypeExplicitReference,
  GenericType,
  TYPICAL_MULTIPLICITY_TYPE,
  EnumValueExplicitReference,
  Enumeration,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorHelper';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationBuilderHelper';
import {
  buildNotExpression,
  unwrapNotExpression,
  buildPrimitiveInstanceValue,
  getNonCollectionValueSpecificationType,
} from '../QueryBuilderOperatorsHelper';

export class QueryBuilderFilterOperator_Equal extends QueryBuilderFilterOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func
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
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func
        .genericType.value.rawType;
    const type = filterConditionState.value
      ? getNonCollectionValueSpecificationType(filterConditionState.value)
      : undefined;

    const NUMERIC_PRIMITIVE_TYPES = [
      PRIMITIVE_TYPE.NUMBER,
      PRIMITIVE_TYPE.INTEGER,
      PRIMITIVE_TYPE.DECIMAL,
      PRIMITIVE_TYPE.FLOAT,
    ] as string[];

    // When changing the return type for LHS, the RHS value should be adjusted accordingly.
    // Numeric value is handled loosely because execution still works if a float (RHS) is assigned to an Integer property(LHS), etc.
    return (
      type !== undefined &&
      ((NUMERIC_PRIMITIVE_TYPES.includes(type.path) &&
        NUMERIC_PRIMITIVE_TYPES.includes(propertyType.path)) ||
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
      case PRIMITIVE_TYPE.STRING:
      case PRIMITIVE_TYPE.BOOLEAN:
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME:
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER: {
        return buildPrimitiveInstanceValue(
          filterConditionState.filterState.queryBuilderState,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
        );
      }
      default:
        if (propertyType instanceof Enumeration) {
          if (propertyType.values.length > 0) {
            const multiplicityOne =
              filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
                TYPICAL_MULTIPLICITY_TYPE.ONE,
              );
            const enumValueInstanceValue = new EnumValueInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(propertyType),
              ),
              multiplicityOne,
            );
            enumValueInstanceValue.values = [
              EnumValueExplicitReference.create(propertyType.values[0] as Enum),
            ];
            return enumValueInstanceValue;
          }
          throw new UnsupportedOperationError(
            `Can't get default value for filter operator '${this.getLabel(
              filterConditionState,
            )}' since enumeration '${propertyType.path}' has no value`,
          );
        }
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
      SUPPORTED_FUNCTIONS.EQUAL,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      SUPPORTED_FUNCTIONS.EQUAL,
      this,
    );
  }
}

export class QueryBuilderFilterOperator_NotEqual extends QueryBuilderFilterOperator_Equal {
  override getLabel(filterConditionState: FilterConditionState): string {
    return `is not`;
  }

  override buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildNotExpression(
      filterConditionState.filterState.queryBuilderState.graphManagerState
        .graph,
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
