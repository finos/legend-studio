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
  AbstractPropertyExpression,
  Enumeration,
  PRIMITIVE_TYPE,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  type Hashable,
  hashArray,
} from '@finos/legend-shared';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterStateBuilder.js';
import {
  type PostFilterConditionState,
  type QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState.js';
import {
  buildNotExpression,
  isTypeCompatibleForAssignment,
  unwrapNotExpression,
} from '../../../../QueryBuilderValueSpecificationHelper.js';
import { buildPostFilterConditionExpressionHelper } from './QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';
import { buildDefaultInstanceValue } from '../../../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderPostFilterOperator_Equal
  extends QueryBuilderPostFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'is';
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
    if (!postFilterConditionState.rightConditionValue.isCollection) {
      return isTypeCompatibleForAssignment(
        postFilterConditionState.rightConditionValue.type,
        guaranteeNonNullable(
          postFilterConditionState.leftConditionValue.getColumnType(),
        ),
      );
    }
    return false;
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const propertyType = guaranteeNonNullable(
      postFilterConditionState.leftConditionValue.getColumnType(),
    );
    return buildDefaultInstanceValue(
      postFilterConditionState.postFilterState.tdsState.queryBuilderState
        .graphManagerState.graph,
      propertyType,
      postFilterConditionState.postFilterState.tdsState.queryBuilderState
        .observerContext,
      postFilterConditionState.postFilterState.tdsState.queryBuilderState
        .INTERNAL__enableInitializingDefaultSimpleExpressionValue,
    );
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
    parentExpression: LambdaFunction | undefined,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpressionHelper(
      postFilterConditionState,
      this,
      postFilterConditionState.leftConditionValue.getColumnType() ===
        PrimitiveType.DATETIME &&
        postFilterConditionState.rightConditionValue.type !==
          PrimitiveType.DATETIME
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_ON_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.EQUAL,
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
      expression.parametersValues[0] instanceof AbstractPropertyExpression &&
        expression.parametersValues[0].func.value.genericType.value.rawType
          .path === PRIMITIVE_TYPE.DATETIME &&
        expression.parametersValues[1]?.genericType?.value.rawType.path !==
          PRIMITIVE_TYPE.DATETIME
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_ON_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.EQUAL,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_EQUAL,
    ]);
  }
}
export class QueryBuilderPostFilterOperator_NotEqual extends QueryBuilderPostFilterOperator_Equal {
  override getLabel(): string {
    return `is not`;
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_NOT_EQUAL,
    ]);
  }
}
