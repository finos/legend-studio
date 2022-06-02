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
  type Type,
  type ValueSpecification,
  type SimpleFunctionExpression,
  type FunctionExpression,
  CollectionInstanceValue,
  Enumeration,
  PRIMITIVE_TYPE,
  VariableExpression,
  GenericTypeExplicitReference,
  GenericType,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import {
  buildNotExpression,
  getCollectionValueSpecificationType,
  unwrapNotExpression,
} from '../QueryBuilderOperatorsHelper';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterProcessor';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState';
import { buildPostFilterConditionExpression } from './QueryBuilderPostFilterOperatorHelper';

export class QueryBuilderPostFilterOperator_In extends QueryBuilderPostFilterOperator {
  getLabel(): string {
    return 'is in';
  }

  isCompatibleWithType(type: Type): boolean {
    return (
      (
        [
          PRIMITIVE_TYPE.STRING,
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
        ] as string[]
      ).includes(type.path) ||
      // TODO: do we care if the enumeration type has no value (like in the case of `==` operator)?
      type instanceof Enumeration
    );
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    const propertyType = guaranteeNonNullable(
      postFilterConditionState.columnState.getReturnType(),
    );
    const valueSpec = postFilterConditionState.value;
    if (valueSpec instanceof CollectionInstanceValue) {
      if (valueSpec.values.length === 0) {
        return true;
      }
      const collectionType = getCollectionValueSpecificationType(
        postFilterConditionState.postFilterState.queryBuilderState
          .graphManagerState.graph,
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
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const multiplicityOne =
      postFilterConditionState.postFilterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    const propertyType = guaranteeNonNullable(
      postFilterConditionState.columnState.getReturnType(),
    );
    return new CollectionInstanceValue(
      multiplicityOne,
      GenericTypeExplicitReference.create(new GenericType(propertyType)),
    );
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpression(
      postFilterConditionState,
      this,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IN,
    );
  }

  buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IN,
      this,
    );
  }
}

export class QueryBuilderPostFilterOperator_NotIn extends QueryBuilderPostFilterOperator_In {
  override getLabel(): string {
    return `is not in`;
  }

  override buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    const expression = super.buildPostFilterConditionExpression(
      postFilterConditionState,
    );
    return expression
      ? buildNotExpression(
          postFilterConditionState.postFilterState.queryBuilderState
            .graphManagerState.graph,
          expression,
        )
      : undefined;
  }

  override buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: SimpleFunctionExpression,
  ): PostFilterConditionState | undefined {
    const innerExpression = unwrapNotExpression(expression);
    return innerExpression
      ? super.buildPostFilterConditionState(postFilterState, innerExpression)
      : undefined;
  }
}
