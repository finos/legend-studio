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
  type LambdaFunction,
  CollectionInstanceValue,
  Enumeration,
  PRIMITIVE_TYPE,
  VariableExpression,
  GenericTypeExplicitReference,
  GenericType,
  Multiplicity,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  type Hashable,
  hashArray,
} from '@finos/legend-shared';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterStateBuilder.js';
import {
  PostFilterValueSpecConditionValueState,
  type PostFilterConditionState,
  type QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState.js';
import { buildPostFilterConditionExpressionHelper } from './QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import {
  buildNotExpression,
  getCollectionValueSpecificationType,
  unwrapNotExpression,
} from '../../../../QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';

export class QueryBuilderPostFilterOperator_In
  extends QueryBuilderPostFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'is in list of';
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
      postFilterConditionState.leftConditionValue.getColumnType(),
    );
    const rightSide = postFilterConditionState.rightConditionValue;
    // `in`/`not in` does not support right hand value being column state as the multipliticy for columns are [0..1]
    if (rightSide instanceof PostFilterValueSpecConditionValueState) {
      const valueSpec = rightSide.value;
      if (valueSpec instanceof CollectionInstanceValue) {
        if (valueSpec.values.length === 0) {
          return true;
        }
        const collectionType = getCollectionValueSpecificationType(
          postFilterConditionState.postFilterState.tdsState.queryBuilderState
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
    }
    return false;
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const propertyType = guaranteeNonNullable(
      postFilterConditionState.leftConditionValue.getColumnType(),
    );
    return new CollectionInstanceValue(
      Multiplicity.ONE,
      GenericTypeExplicitReference.create(new GenericType(propertyType)),
    );
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
    parentExpression: LambdaFunction | undefined,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpressionHelper(
      postFilterConditionState,
      this,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.IN,
      parentExpression,
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

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_IN,
    ]);
  }
}

export class QueryBuilderPostFilterOperator_NotIn extends QueryBuilderPostFilterOperator_In {
  override getLabel(): string {
    return `is not in list of`;
  }

  override buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
    parentExpression: LambdaFunction | undefined,
  ): ValueSpecification | undefined {
    const expression = super.buildPostFilterConditionExpression(
      postFilterConditionState,
      parentExpression,
    );
    return expression ? buildNotExpression(expression) : undefined;
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

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_NOT_IN,
    ]);
  }
}
