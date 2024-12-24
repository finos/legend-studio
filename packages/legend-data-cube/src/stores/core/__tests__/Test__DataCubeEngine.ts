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
  V1_ValueSpecification,
  V1_Lambda,
  V1_AppliedFunction,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { DataCubeAPI } from '../../DataCubeAPI.js';
import {
  DataCubeEngine,
  type CompletionItem,
  type DataCubeExecutionResult,
  type RelationType,
} from '../DataCubeEngine.js';
import type { DataCubeQuery } from '../models/DataCubeQuery.js';
import type { DataCubeSource } from '../models/DataCubeSource.js';
import { DataCubeQueryFilterOperation__LessThan } from '../filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__Contain } from '../filter/DataCubeQueryFilterOperation__Contain.js';
import { DataCubeQueryFilterOperation__ContainCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__ContainCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EndWith } from '../filter/DataCubeQueryFilterOperation__EndWith.js';
import { DataCubeQueryFilterOperation__EndWithCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__EndWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__Equal } from '../filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__EqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn } from '../filter/DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__EqualColumn } from '../filter/DataCubeQueryFilterOperation__EqualColumn.js';
import { DataCubeQueryFilterOperation__GreaterThan } from '../filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__GreaterThanColumn } from '../filter/DataCubeQueryFilterOperation__GreaterThanColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from '../filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqualColumn } from '../filter/DataCubeQueryFilterOperation__GreaterThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__IsNotNull } from '../filter/DataCubeQueryFilterOperation__IsNotNull.js';
import { DataCubeQueryFilterOperation__IsNull } from '../filter/DataCubeQueryFilterOperation__IsNull.js';
import { DataCubeQueryFilterOperation__LessThanColumn } from '../filter/DataCubeQueryFilterOperation__LessThanColumn.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from '../filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';
import { DataCubeQueryFilterOperation__LessThanOrEqualColumn } from '../filter/DataCubeQueryFilterOperation__LessThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__NotContain } from '../filter/DataCubeQueryFilterOperation__NotContain.js';
import { DataCubeQueryFilterOperation__NotEndWith } from '../filter/DataCubeQueryFilterOperation__NotEndWith.js';
import { DataCubeQueryFilterOperation__NotEqual } from '../filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn } from '../filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualColumn } from '../filter/DataCubeQueryFilterOperation__NotEqualColumn.js';
import { DataCubeQueryFilterOperation__NotStartWith } from '../filter/DataCubeQueryFilterOperation__NotStartWith.js';
import { DataCubeQueryFilterOperation__StartWith } from '../filter/DataCubeQueryFilterOperation__StartWith.js';
import { DataCubeQueryFilterOperation__StartWithCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__StartWithCaseInsensitive.js';

export class Test__DataCubeEngine extends DataCubeEngine {
  // TODO: implement the engine endpoints for testing
  override getBaseQuery(): Promise<DataCubeQuery | undefined> {
    throw new Error('Method not implemented.');
  }

  override processQuerySource(value: PlainObject): Promise<DataCubeSource> {
    throw new Error('Method not implemented.');
  }

  override parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ): Promise<V1_ValueSpecification> {
    throw new Error('Method not implemented.');
  }

  override getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  override getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ): Promise<CompletionItem[]> {
    throw new Error('Method not implemented.');
  }

  override getQueryRelationType(
    query: V1_Lambda,
    source: DataCubeSource,
  ): Promise<RelationType> {
    throw new Error('Method not implemented.');
  }

  override getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ): Promise<RelationType> {
    throw new Error('Method not implemented.');
  }

  override executeQuery(
    query: V1_Lambda,
    source: DataCubeSource,
    api: DataCubeAPI,
  ): Promise<DataCubeExecutionResult> {
    throw new Error('Method not implemented.');
  }

  override buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined {
    throw new Error('Method not implemented.');
  }

  static filterOperations = [
    new DataCubeQueryFilterOperation__LessThan(),
    new DataCubeQueryFilterOperation__LessThanOrEqual(),
    new DataCubeQueryFilterOperation__Equal(),
    new DataCubeQueryFilterOperation__NotEqual(),
    new DataCubeQueryFilterOperation__GreaterThanOrEqual(),
    new DataCubeQueryFilterOperation__GreaterThan(),

    new DataCubeQueryFilterOperation__IsNull(),
    new DataCubeQueryFilterOperation__IsNotNull(),

    new DataCubeQueryFilterOperation__EqualCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotEqualCaseInsensitive(),
    new DataCubeQueryFilterOperation__Contain(),
    new DataCubeQueryFilterOperation__ContainCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotContain(),
    new DataCubeQueryFilterOperation__StartWith(),
    new DataCubeQueryFilterOperation__StartWithCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotStartWith(),
    new DataCubeQueryFilterOperation__EndWith(),
    new DataCubeQueryFilterOperation__EndWithCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotEndWith(),

    new DataCubeQueryFilterOperation__LessThanColumn(),
    new DataCubeQueryFilterOperation__LessThanOrEqualColumn(),
    new DataCubeQueryFilterOperation__EqualColumn(),
    new DataCubeQueryFilterOperation__NotEqualColumn(),
    new DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn(),
    new DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn(),
    new DataCubeQueryFilterOperation__GreaterThanColumn(),
    new DataCubeQueryFilterOperation__GreaterThanOrEqualColumn(),
  ];
}
