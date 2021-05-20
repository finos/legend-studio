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
  CollectionInstanceValue,
  GenericTypeExplicitReference,
  GenericType,
  TYPICAL_MULTIPLICITY_TYPE,
  Enumeration,
  PRIMITIVE_TYPE,
} from '@finos/legend-studio';
import {
  buildFilterConditionState,
  buildNotExpression,
  buildFilterConditionExpression,
  unwrapNotExpression,
  getCollectionValueSpecificationType,
} from './QueryBuilderOperatorHelpers';

const IN_FUNCTION_NAME = 'in';

export class QueryBuilderInOperator extends QueryBuilderOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is in';
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
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
        ] as unknown as string
      ).includes(propertyType.path) ||
      // TODO: do we care if the enumeration type has no value (like in the case of `==` operator)?
      propertyType instanceof Enumeration
    );
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    const valueSpec = filterConditionState.value;
    if (valueSpec instanceof CollectionInstanceValue) {
      if (valueSpec.values.length === 0) {
        return true;
      }
      const collectionType = getCollectionValueSpecificationType(
        filterConditionState,
        valueSpec.values,
      );
      if (!collectionType) {
        return false;
      }
      if (
        (
          [
            PRIMITIVE_TYPE.NUMBER,
            PRIMITIVE_TYPE.INTEGER,
            PRIMITIVE_TYPE.DECIMAL,
            PRIMITIVE_TYPE.FLOAT,
          ] as string[]
        ).includes(propertyType.path)
      ) {
        return (
          [
            PRIMITIVE_TYPE.NUMBER,
            PRIMITIVE_TYPE.INTEGER,
            PRIMITIVE_TYPE.DECIMAL,
            PRIMITIVE_TYPE.FLOAT,
          ] as string[]
        ).includes(collectionType.path);
      }
      return collectionType === propertyType;
    }
    return false;
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    const multiplicityOne =
      filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    const propertyType =
      filterConditionState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    return new CollectionInstanceValue(
      multiplicityOne,
      GenericTypeExplicitReference.create(new GenericType(propertyType)),
    );
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      IN_FUNCTION_NAME,
    );
  }

  buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined {
    return buildFilterConditionState(
      filterState,
      expression,
      IN_FUNCTION_NAME,
      this,
    );
  }
}

export class QueryBuilderNotInOperator extends QueryBuilderInOperator {
  getLabel(filterConditionState: FilterConditionState): string {
    return `is not in`;
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
