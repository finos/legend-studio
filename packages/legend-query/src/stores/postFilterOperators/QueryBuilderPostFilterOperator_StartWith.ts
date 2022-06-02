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
  PRIMITIVE_TYPE,
  buildPrimitiveInstanceValue,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import {
  buildNotExpression,
  getNonCollectionValueSpecificationType,
  unwrapNotExpression,
} from '../QueryBuilderOperatorsHelper';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterProcessor';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationBuilderHelper';
import { buildPostFilterConditionExpression } from './QueryBuilderPostFilterOperatorHelper';

export class QueryBuilderPostFilterOperator_StartWith extends QueryBuilderPostFilterOperator {
  getLabel(): string {
    return 'starts with';
  }

  isCompatibleWithType(type: Type): boolean {
    if (type.path === PRIMITIVE_TYPE.STRING) {
      return true;
    }
    return false;
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    const type = postFilterConditionState.value
      ? getNonCollectionValueSpecificationType(postFilterConditionState.value)
      : undefined;
    return PRIMITIVE_TYPE.STRING === type?.path;
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const propertyType = postFilterConditionState.columnState.getReturnType();
    switch (propertyType?.path) {
      case PRIMITIVE_TYPE.STRING: {
        return buildPrimitiveInstanceValue(
          postFilterConditionState.postFilterState.queryBuilderState
            .graphManagerState.graph,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
        );
      }
      default:
        throw new UnsupportedOperationError(
          `Can't get default value for post-filter operator '${this.getLabel()}' when the LHS property is of type '${
            propertyType?.path
          }'`,
        );
    }
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpression(
      postFilterConditionState,
      this,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.STARTS_WITH,
    );
  }

  buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.STARTS_WITH,
      this,
    );
  }
}
export class QueryBuilderPostFilterOperator_NotStartWith extends QueryBuilderPostFilterOperator_StartWith {
  override getLabel(): string {
    return `doesn't start with`;
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
