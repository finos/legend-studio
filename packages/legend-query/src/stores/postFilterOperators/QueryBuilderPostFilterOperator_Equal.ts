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
  type Enum,
  type SimpleFunctionExpression,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import {
  buildNotExpression,
  buildPrimitiveInstanceValue,
  getNonCollectionValueSpecificationType,
  unwrapNotExpression,
} from '../QueryBuilderLogicalHelper';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationBuilderHelper';

export class QueryBuilderPostFilterOperator_Equal extends QueryBuilderPostFilterOperator {
  getLabel(): string {
    return 'is';
  }

  getPureFunction(): SUPPORTED_FUNCTIONS {
    return SUPPORTED_FUNCTIONS.EQUAL;
  }

  isCompatibleWithType(type: Type): boolean {
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
      ).includes(type.path) ||
      // if the type is enumeration, make sure the enumeration has some value
      (type instanceof Enumeration && type.values.length > 0)
    );
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    const lhsType = postFilterConditionState.columnState.getReturnType();
    const valueSpecification = postFilterConditionState.value;
    if (valueSpecification) {
      const type = getNonCollectionValueSpecificationType(valueSpecification);
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
            PRIMITIVE_TYPE.DATE,
            PRIMITIVE_TYPE.STRICTDATE,
            PRIMITIVE_TYPE.DATETIME,
          ] as string[]
        ).includes(type.path) ||
          type === lhsType)
      );
    }
    return false;
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const propertyType = guaranteeNonNullable(
      postFilterConditionState.columnState.getReturnType(),
    );
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
          postFilterConditionState.postFilterState.queryBuilderState,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
        );
      }
      default:
        if (propertyType instanceof Enumeration) {
          if (propertyType.values.length > 0) {
            const multiplicityOne =
              postFilterConditionState.postFilterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
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
            `Can't get default value for post filter operator '${this.getLabel()}' since enumeration '${
              propertyType.path
            }' has no value`,
          );
        }
        throw new UnsupportedOperationError(
          `Can't get default value for post filter operator '${this.getLabel()}' when the LHS property is of type '${
            propertyType.path
          }'`,
        );
    }
  }
}
export class QueryBuilderPostFilterOperator_NotEqual extends QueryBuilderPostFilterOperator_Equal {
  override getLabel(): string {
    return `is not`;
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
