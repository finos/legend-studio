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
  PRIMITIVE_TYPE,
  buildPrimitiveInstanceValue,
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
  generateDefaultValueForPrimitiveType,
  getNonCollectionValueSpecificationType,
  unwrapNotExpression,
} from '../../../../QueryBuilderValueSpecificationHelper.js';
import { buildPostFilterConditionExpression } from './QueryBuilderPostFilterOperatorHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graphManager/QueryBuilderSupportedFunctions.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../../../graphManager/QueryBuilderHashUtils.js';

export class QueryBuilderPostFilterOperator_EndWith
  extends QueryBuilderPostFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'ends with';
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
          postFilterConditionState.postFilterState.projectionState
            .queryBuilderState.graphManagerState.graph,
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
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.ENDS_WITH,
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
      QUERY_BUILDER_HASH_STRUCTURE.POST_FILTER_OPERATOR_END_WITH,
    ]);
  }
}

export class QueryBuilderPostFilterOperator_NotEndWith extends QueryBuilderPostFilterOperator_EndWith {
  override getLabel(): string {
    return `doesn't end with`;
  }

  override buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    const expression = super.buildPostFilterConditionExpression(
      postFilterConditionState,
    );
    return expression
      ? buildNotExpression(
          postFilterConditionState.postFilterState.projectionState
            .queryBuilderState.graphManagerState.graph,
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

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.POST_FILTER_OPERATOR_NOT_END_WITH,
    ]);
  }
}
