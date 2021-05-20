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
import {
  EnumValueInstanceValue,
  GenericTypeExplicitReference,
  GenericType,
  TYPICAL_MULTIPLICITY_TYPE,
  EnumValueExplicitReference,
  Enumeration,
  PRIMITIVE_TYPE,
} from '@finos/legend-studio';
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
  getNonCollectionValueSpecificationType,
  unwrapNotExpression,
} from './QueryBuilderOperatorHelpers';

const EQUAL_FUNCTION_NAME = 'equal';

export class QueryBuilderEqualOperator extends QueryBuilderOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is';
  }

  isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
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
          PRIMITIVE_TYPE.STRICTDATE,
        ] as unknown as string
      ).includes(propertyType.path) ||
      // if the type is enumeration, make sure the enumeration has some value
      (propertyType instanceof Enumeration && propertyType.values.length > 0)
    );
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    const type = filterConditionState.value
      ? getNonCollectionValueSpecificationType(filterConditionState.value)
      : undefined;
    return (
      type !== undefined &&
      ((
        [
          PRIMITIVE_TYPE.STRING,
          PRIMITIVE_TYPE.BOOLEAN,
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
          PRIMITIVE_TYPE.STRICTDATE,
        ] as unknown as string
      ).includes(type.path) ||
        type === propertyType)
    );
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    switch (propertyType.path) {
      case PRIMITIVE_TYPE.STRING:
      case PRIMITIVE_TYPE.BOOLEAN:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER: {
        return buildPrimitiveInstanceValue(
          filterConditionState,
          propertyType.path,
          getDefaultPrimitiveInstanceValueForType(propertyType.path),
        );
      }
      default:
        if (propertyType instanceof Enumeration) {
          if (propertyType.values.length > 0) {
            const multiplicityOne =
              filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
                TYPICAL_MULTIPLICITY_TYPE.ONE,
              );
            const enumValueInstanceValue = new EnumValueInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(propertyType),
              ),
              multiplicityOne,
            );
            enumValueInstanceValue.values = [
              EnumValueExplicitReference.create(propertyType.values[0]),
            ];
            return enumValueInstanceValue;
          }
          throw new UnsupportedOperationError(
            `Can't get default value for operator '${
              getClass(this).name
            }' since enumeration '${propertyType.path}' has no value`,
          );
        }
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
      EQUAL_FUNCTION_NAME,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      EQUAL_FUNCTION_NAME,
      this,
    );
  }
}

export class QueryBuilderNotEqualOperator extends QueryBuilderEqualOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return `is not`;
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
