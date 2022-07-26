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

import type {
  FunctionExpression,
  Type,
  ValueSpecification,
} from '@finos/legend-graph';
import { uuid } from '@finos/legend-shared';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
  TDS_COLUMN_GETTER,
} from './QueryBuilderPostFilterState.js';

export abstract class QueryBuilderPostFilterOperator {
  readonly uuid = uuid();

  abstract getLabel(): string;

  getTdsColumnGetter(): TDS_COLUMN_GETTER | undefined {
    return undefined;
  }

  abstract isCompatibleWithType(type: Type): boolean;

  abstract isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean;

  abstract getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined;

  isCompatibleWithPostFilterColumn(
    postFilterState: PostFilterConditionState,
  ): boolean {
    const columnType = postFilterState.columnState.getReturnType();
    if (columnType) {
      return this.isCompatibleWithType(columnType);
    }
    return false;
  }

  abstract buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined;

  abstract buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined;
}
