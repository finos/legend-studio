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
  type V1_ValueSpecification,
  type V1_Lambda,
  type V1_AppliedFunction,
  V1_relationTypeModelSchema,
  V1_getGenericTypeFullPath,
  V1_buildEngineError,
  V1_EngineError,
  V1_buildParserError,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  HttpStatus,
  type PlainObject,
  type TimingsRecord,
  type StopWatch,
} from '@finos/legend-shared';
import {
  DataCubeEngine,
  type CompletionItem,
  type DataCubeRelationType,
  type DataCubeExecutionOptions,
  type DataCubeExecutionResult,
} from '../core/DataCubeEngine.js';
import type { DataCubeSource } from '../core/model/DataCubeSource.js';
import {
  ENGINE_TEST_SUPPORT__getLambdaRelationType,
  ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification,
  ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification,
  ENGINE_TEST_SUPPORT__NetworkClientError,
} from '@finos/legend-graph/test';
import { deserialize } from 'serializr';

export class TEST__DataCubeEngine extends DataCubeEngine {
  override getDataFromSource(source?: DataCubeSource): PlainObject {
    throw new Error('Method not implemented.');
  }

  override finalizeTimingRecord(
    stopWatch: StopWatch,
    timings?: TimingsRecord,
  ): TimingsRecord {
    throw new Error('Method not implemented.');
  }

  override async processSource(
    sourceData: PlainObject,
  ): Promise<DataCubeSource> {
    throw new Error('Method not implemented.');
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ): Promise<V1_ValueSpecification> {
    try {
      return this.deserializeValueSpecification(
        await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(
          code,
          returnSourceInformation,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof ENGINE_TEST_SUPPORT__NetworkClientError &&
        error.status === HttpStatus.BAD_REQUEST
      ) {
        const engineError = V1_buildParserError(
          V1_EngineError.serialization.fromJson(
            error.response?.data as PlainObject<V1_EngineError>,
          ),
        );
        throw engineError;
      }
      throw error;
    }
  }

  override async getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ): Promise<string> {
    return ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
      this.serializeValueSpecification(value),
      pretty,
    );
  }

  override async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    context: DataCubeSource | PlainObject,
  ): Promise<CompletionItem[]> {
    throw new Error('Method not implemented.');
  }

  override async getQueryRelationReturnType(
    query: V1_Lambda,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType> {
    try {
      const relationType = deserialize(
        V1_relationTypeModelSchema,
        await ENGINE_TEST_SUPPORT__getLambdaRelationType(
          this.serializeValueSpecification(query),
          {},
        ),
      );
      return {
        columns: relationType.columns.map((column) => ({
          name: column.name,
          type: V1_getGenericTypeFullPath(column.genericType),
        })),
      };
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof ENGINE_TEST_SUPPORT__NetworkClientError &&
        error.status === HttpStatus.BAD_REQUEST
      ) {
        const engineError = V1_buildEngineError(
          V1_EngineError.serialization.fromJson(
            error.response?.data as PlainObject<V1_EngineError>,
          ),
        );
        throw engineError;
      }
      throw error;
    }
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
