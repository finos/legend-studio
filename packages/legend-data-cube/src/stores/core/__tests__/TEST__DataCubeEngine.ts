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
import {
  DataCubeEngine,
  type CompletionItem,
  type DataCubeExecutionOptions,
  type DataCubeExecutionResult,
  type DataCubeRelationType,
} from '../DataCubeEngine.js';
import type { DataCubeSource } from '../model/DataCubeSource.js';

export class TEST__DataCubeEngine extends DataCubeEngine {
  // TODO: implement the engine endpoints for testing

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

  override getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType> {
    throw new Error('Method not implemented.');
  }
  override executeQuery(
    query: V1_Lambda,
    source: DataCubeSource,
    options?: DataCubeExecutionOptions | undefined,
  ): Promise<DataCubeExecutionResult> {
    throw new Error('Method not implemented.');
  }
  override buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined {
    throw new Error('Method not implemented.');
  }
}
