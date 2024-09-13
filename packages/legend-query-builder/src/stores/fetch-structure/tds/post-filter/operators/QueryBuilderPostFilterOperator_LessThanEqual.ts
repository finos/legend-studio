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
  type FunctionExpression,
  type ValueSpecification,
  type LambdaFunction,
  AbstractPropertyExpression,
  PRIMITIVE_TYPE,
  PrimitiveType,
} from '@finos/legend-graph';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterStateBuilder.js';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState.js';
import { buildPostFilterConditionExpressionHelper } from './QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import { QueryBuilderPostFilterOperator_LessThan } from './QueryBuilderPostFilterOperator_LessThan.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';

export class QueryBuilderPostFilterOperator_LessThanEqual
  extends QueryBuilderPostFilterOperator_LessThan
  implements Hashable
{
  override getLabel(): string {
    return '<=';
  }

  override buildPostFilterConditionExpression(
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
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_ON_OR_BEFORE_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.LESS_THAN_EQUAL,
      parentExpression,
    );
  }

  override buildPostFilterConditionState(
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
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_ON_OR_BEFORE_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.LESS_THAN_EQUAL,
      this,
    );
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_LESS_THAN_EQUAL,
    ]);
  }
}
