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
  type Type,
  type ValueSpecification,
  observe_ValueSpecification,
} from '@finos/legend-graph';
import { uuid } from '@finos/legend-shared';
import type { SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const';
import { buildPostFilterConditionExpression } from './postFilterOperators/QueryBuilderPostFilterOperatorHelper';
import { buildPostFilterConditionState } from './QueryBuilderPostFilterProcessor';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
  TDS_COLUMN_GETTERS,
} from './QueryBuilderPostFilterState';

export abstract class QueryBuilderPostFilterOperator {
  uuid = uuid();

  abstract getLabel(): string;

  abstract getPureFunction(): SUPPORTED_FUNCTIONS | undefined;

  getTdsColumnGetter(): TDS_COLUMN_GETTERS | undefined {
    return undefined;
  }

  abstract isCompatibleWithType(type: Type): boolean;

  abstract isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean;

  protected abstract getUnobservedDefaultFilterConditionValue(
    filterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined;

  getDefaultFilterConditionValue(
    filterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    const value =
      this.getUnobservedDefaultFilterConditionValue(filterConditionState);
    if (value) {
      return observe_ValueSpecification(
        value,
        filterConditionState.postFilterState.queryBuilderState
          .observableContext,
      );
    }
    return undefined;
  }

  isCompatibleWithPostFilterColumn(
    postFilterState: PostFilterConditionState,
  ): boolean {
    const columnType = postFilterState.columnState.getReturnType();
    if (columnType) {
      return this.isCompatibleWithType(columnType);
    }
    return false;
  }

  buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      this.getPureFunction(),
      this,
    );
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpression(postFilterConditionState, this);
  }
}
