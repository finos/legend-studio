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
  type FunctionExpression,
  Enumeration,
  PrimitiveType,
} from '@finos/legend-graph';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterStateBuilder.js';
import {
  type PostFilterConditionState,
  type QueryBuilderPostFilterState,
  TDS_COLUMN_GETTER,
} from '../QueryBuilderPostFilterState.js';
import { QueryBuilderSimpleProjectionColumnState } from '../../projection/QueryBuilderProjectionColumnState.js';
import { buildPostFilterConditionExpression } from './QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import { isPropertyExpressionChainOptional } from '../../../../QueryBuilderValueSpecificationHelper.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';

export class QueryBuilderPostFilterOperator_IsEmpty
  extends QueryBuilderPostFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'is empty';
  }

  override getTDSColumnGetter(): TDS_COLUMN_GETTER | undefined {
    return TDS_COLUMN_GETTER.IS_NULL;
  }

  isCompatibleWithType(type: Type): boolean {
    return type instanceof PrimitiveType || type instanceof Enumeration;
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    return postFilterConditionState.value === undefined;
  }

  override isCompatibleWithPostFilterColumn(
    postFilterState: PostFilterConditionState,
  ): boolean {
    const columnType = postFilterState.columnState.getColumnType();
    if (columnType && this.isCompatibleWithType(columnType)) {
      if (
        postFilterState.columnState instanceof
        QueryBuilderSimpleProjectionColumnState
      ) {
        return isPropertyExpressionChainOptional(
          postFilterState.columnState.propertyExpressionState
            .propertyExpression,
        );
      }
      return true;
    }
    return false;
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return undefined;
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpression(
      postFilterConditionState,
      this,
      undefined,
    );
  }

  buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      undefined,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_IS_EMPTY,
    ]);
  }
}

export class QueryBuilderPostFilterOperator_IsNotEmpty extends QueryBuilderPostFilterOperator_IsEmpty {
  override getLabel(): string {
    return `is not empty`;
  }

  override getTDSColumnGetter(): TDS_COLUMN_GETTER | undefined {
    return TDS_COLUMN_GETTER.IS_NOT_NULL;
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_IS_NOT_EMPTY,
    ]);
  }
}
