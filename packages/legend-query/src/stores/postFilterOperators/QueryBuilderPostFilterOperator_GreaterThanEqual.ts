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
  AbstractPropertyExpression,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterProcessor';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState';
import { buildPostFilterConditionExpression } from './QueryBuilderPostFilterOperatorHelper';
import { QueryBuilderPostFilterOperator_GreaterThan } from './QueryBuilderPostFilterOperator_GreaterThan';

export class QueryBuilderPostFilterOperator_GreaterThanEqual extends QueryBuilderPostFilterOperator_GreaterThan {
  override getLabel(): string {
    return '>=';
  }

  override buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpression(
      postFilterConditionState,
      this,
      postFilterConditionState.columnState.getReturnType()?.path ===
        PRIMITIVE_TYPE.DATETIME &&
        postFilterConditionState.value?.genericType?.value.rawType.path !==
          PRIMITIVE_TYPE.DATETIME
        ? SUPPORTED_FUNCTIONS.IS_AFTER_DAY
        : SUPPORTED_FUNCTIONS.GREATER_THAN,
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
        expression.parametersValues[0].func.genericType.value.rawType.path ===
          PRIMITIVE_TYPE.DATETIME &&
        expression.parametersValues[1]?.genericType?.value.rawType.path !==
          PRIMITIVE_TYPE.DATETIME
        ? SUPPORTED_FUNCTIONS.IS_AFTER_DAY
        : SUPPORTED_FUNCTIONS.GREATER_THAN,
      this,
    );
  }
}
