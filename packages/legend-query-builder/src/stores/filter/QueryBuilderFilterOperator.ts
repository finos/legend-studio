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
  SimpleFunctionExpression,
  ValueSpecification,
} from '@finos/legend-graph';
import { type Hashable, uuid } from '@finos/legend-shared';
import type {
  FilterConditionState,
  QueryBuilderFilterState,
} from './QueryBuilderFilterState.js';

export abstract class QueryBuilderFilterOperator implements Hashable {
  readonly uuid = uuid();

  abstract getLabel(filterConditionState: FilterConditionState): string;

  abstract isCompatibleWithFilterConditionProperty(
    filterConditionState: FilterConditionState,
  ): boolean;

  abstract isCompatibleWithFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): boolean;

  abstract getDefaultFilterConditionValue(
    filterConditionState: FilterConditionState,
  ): ValueSpecification | undefined;

  abstract buildFilterConditionExpression(
    filterConditionState: FilterConditionState,
    lambdaParameterName?: string | undefined,
  ): ValueSpecification;

  abstract buildFilterConditionState(
    filterState: QueryBuilderFilterState,
    expression: SimpleFunctionExpression,
  ): FilterConditionState | undefined;

  abstract get hashCode(): string;
}
