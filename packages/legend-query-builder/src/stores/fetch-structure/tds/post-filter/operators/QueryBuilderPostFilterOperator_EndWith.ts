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
  type SimpleFunctionExpression,
  type Type,
  type ValueSpecification,
  type FunctionExpression,
  type LambdaFunction,
  PRIMITIVE_TYPE,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  type Hashable,
  hashArray,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterStateBuilder.js';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState.js';
import {
  buildNotExpression,
  unwrapNotExpression,
} from '../../../../QueryBuilderValueSpecificationHelper.js';
import { buildPostFilterConditionExpressionHelper } from './QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';
import { buildDefaultInstanceValue } from '../../../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderPostFilterOperator_EndWith
  extends QueryBuilderPostFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'ends with';
  }

  isCompatibleWithType(type: Type): boolean {
    return PrimitiveType.STRING === type;
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    return (
      !postFilterConditionState.rightConditionValue.isCollection &&
      PrimitiveType.STRING === postFilterConditionState.rightConditionValue.type
    );
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const propertyType =
      postFilterConditionState.leftConditionValue.getColumnType();
    switch (propertyType?.path) {
      case PRIMITIVE_TYPE.STRING: {
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
      default:
        throw new UnsupportedOperationError(
          `Can't get default value for post-filter operator '${this.getLabel()}' when the LHS property is of type '${propertyType?.path}'`,
        );
    }
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
    parentExpression: LambdaFunction | undefined,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpressionHelper(
      postFilterConditionState,
      this,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.ENDS_WITH,
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
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.ENDS_WITH,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_END_WITH,
    ]);
  }
}

export class QueryBuilderPostFilterOperator_NotEndWith extends QueryBuilderPostFilterOperator_EndWith {
  override getLabel(): string {
    return `doesn't end with`;
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_NOT_END_WITH,
    ]);
  }
}
