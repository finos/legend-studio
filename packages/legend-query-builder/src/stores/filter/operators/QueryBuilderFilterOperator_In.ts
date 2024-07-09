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
  type QueryBuilderFilterState,
  type FilterConditionState,
  FilterValueSpecConditionValueState,
} from '../QueryBuilderFilterState.js';
import { QueryBuilderFilterOperator } from '../QueryBuilderFilterOperator.js';
import {
  type ValueSpecification,
  type SimpleFunctionExpression,
  VariableExpression,
  CollectionInstanceValue,
  GenericTypeExplicitReference,
  GenericType,
  Enumeration,
  PRIMITIVE_TYPE,
  Multiplicity,
} from '@finos/legend-graph';
import {
  buildFilterConditionState,
  buildFilterConditionExpression,
} from './QueryBuilderFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graph/QueryBuilderMetaModelConst.js';
import {
  buildNotExpression,
  getCollectionValueSpecificationType,
  unwrapNotExpression,
} from '../../QueryBuilderValueSpecificationHelper.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';

export class QueryBuilderFilterOperator_In
  extends QueryBuilderFilterOperator
  implements Hashable
{
  getLabel(filterConditionState: FilterConditionState): string {
    return 'is in list of';
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
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
          PRIMITIVE_TYPE.DATE,
          PRIMITIVE_TYPE.STRICTDATE,
          PRIMITIVE_TYPE.DATETIME,
        ] as string[]
      ).includes(propertyType.path) ||
      // TODO: do we care if the enumeration type has no value (like in the case of `==` operator)?
      propertyType instanceof Enumeration
    );
  }

  isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType;
    const valueSpec: ValueSpecification | undefined =
      filterConditionState.rightConditionValue instanceof
      FilterValueSpecConditionValueState
        ? filterConditionState.rightConditionValue.value
        : undefined;
    if (valueSpec instanceof CollectionInstanceValue) {
      if (valueSpec.values.length === 0) {
        return true;
      }
      const collectionType = getCollectionValueSpecificationType(
        filterConditionState.filterState.queryBuilderState.graphManagerState
          .graph,
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
            PRIMITIVE_TYPE.DATE,
            PRIMITIVE_TYPE.STRICTDATE,
            PRIMITIVE_TYPE.DATETIME,
          ] as string[]
        ).includes(propertyType.path)
      ) {
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
        ).includes(collectionType.path);
      }
      return collectionType === propertyType;
    } else if (valueSpec instanceof VariableExpression) {
      // check if not a single value
      if (valueSpec.multiplicity.upperBound === 1) {
        return false;
      }
      return propertyType === valueSpec.genericType?.value.rawType;
    }
    return false;
  }

  getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined {
    const propertyType =
      filterConditionState.propertyExpressionState.propertyExpression.func.value
        .genericType.value.rawType;
    return new CollectionInstanceValue(
      Multiplicity.ONE,
      GenericTypeExplicitReference.create(new GenericType(propertyType)),
    );
  }

  buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
    lambdaParameterName?: string | undefined,
  ): ValueSpecification {
    return buildFilterConditionExpression(
      filterConditionState,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IN,
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
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IN,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_IN]);
  }
}

export class QueryBuilderFilterOperator_NotIn extends QueryBuilderFilterOperator_In {
  override getLabel(filterConditionState: FilterConditionState): string {
    return `is not in list of`;
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_OPERATOR_NOT_IN,
    ]);
  }
}
