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
  type DataCubeRelationType,
  type DataCubeExecutionOptions,
  type DataCubeExecutionResult,
} from '../DataCubeEngine.js';
import type { DataCubeSource } from '../model/DataCubeSource.js';
import {
  ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification,
  ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification,
} from '@finos/legend-graph/test';
import {
  _deserializeValueSpecification,
  _serializeValueSpecification,
} from '../DataCubeQueryBuilderUtils.js';

export class TEST__DataCubeEngine extends DataCubeEngine {
  override async processQuerySource(
    value: PlainObject,
  ): Promise<DataCubeSource> {
    throw new Error('Method not implemented.');
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ): Promise<V1_ValueSpecification> {
    return _deserializeValueSpecification(
      await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(
        code,
        returnSourceInformation,
      ),
    );
  }

  override async getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ): Promise<string> {
    return ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
      _serializeValueSpecification(value),
      pretty,
    );
  }

  override async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ): Promise<CompletionItem[]> {
    throw new Error('Method not implemented.');
  }

  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType> {
    throw new Error('Method not implemented.');
  }

  override async executeQuery(
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
