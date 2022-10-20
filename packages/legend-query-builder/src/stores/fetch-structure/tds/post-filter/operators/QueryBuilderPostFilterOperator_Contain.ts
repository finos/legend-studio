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
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
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
import { buildPostFilterConditionExpression } from './QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graphManager/QueryBuilderSupportedFunctions.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../../../graphManager/QueryBuilderHashUtils.js';
import { buildPrimitiveInstanceValue } from '../../../../shared/ValueSpecificationEditorHelper.js';

export class QueryBuilderPostFilterOperator_Contain
  extends QueryBuilderPostFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'contains';
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
    const propertyType = guaranteeNonNullable(
      postFilterConditionState.columnState.getColumnType(),
    );
    switch (propertyType.path) {
      case PRIMITIVE_TYPE.STRING: {
        return buildPrimitiveInstanceValue(
          postFilterConditionState.postFilterState.tdsState.queryBuilderState
            .graphManagerState.graph,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
        );
      }
      default:
        throw new UnsupportedOperationError(
          `Can't get default value for post-filter operator '${this.getLabel()}' when the LHS property is of type '${
            propertyType.path
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
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.CONTAINS,
    );
  }

  buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.CONTAINS,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.POST_FILTER_OPERATOR_CONTAIN,
    ]);
  }
}

export class QueryBuilderPostFilterOperator_NotContain extends QueryBuilderPostFilterOperator_Contain {
  override getLabel(): string {
    return `doesn't contain`;
  }
  override buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    const expression = super.buildPostFilterConditionExpression(
      postFilterConditionState,
    );
    return expression
      ? buildNotExpression(
          expression,
          postFilterConditionState.postFilterState.tdsState.queryBuilderState
            .graphManagerState.graph,
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
      QUERY_BUILDER_HASH_STRUCTURE.POST_FILTER_OPERATOR_NOT_CONTAIN,
    ]);
  }
}
