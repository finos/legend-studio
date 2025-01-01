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

import { type LegendREPLServerClient } from './LegendREPLServerClient.js';
import {
  _elementPtr,
  _function,
  _lambda,
  DataCubeEngine,
  DataCubeFunction,
  type DataCubeSource,
  type DataCubeExecutionOptions,
  _deserializeValueSpecification,
  _serializeValueSpecification,
} from '@finos/legend-data-cube';
import {
  TDSExecutionResult,
  type V1_AppliedFunction,
  V1_buildExecutionResult,
  V1_deserializeExecutionResult,
  type V1_Lambda,
  type V1_ValueSpecification,
  V1_buildEngineError,
  V1_EngineError,
  V1_getGenericTypeFullPath,
  V1_relationTypeModelSchema,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  type DocumentationEntry,
  guaranteeType,
  HttpStatus,
  isNonNullable,
  LogEvent,
  NetworkClientError,
  type PlainObject,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  LegendREPLDataCubeSource,
  RawLegendREPLDataCubeSource,
  REPL_DATA_CUBE_SOURCE_TYPE,
} from './LegendREPLDataCubeSource.js';
import type { LegendREPLApplicationStore } from '../application/LegendREPLApplicationStore.js';
import {
  APPLICATION_EVENT,
  shouldDisplayVirtualAssistantDocumentationEntry,
} from '@finos/legend-application';
import type { LegendREPLBaseStore } from './LegendREPLBaseStore.js';
import { deserialize } from 'serializr';

export class LegendREPLDataCubeEngine extends DataCubeEngine {
  readonly application: LegendREPLApplicationStore;
  readonly baseStore: LegendREPLBaseStore;
  readonly client: LegendREPLServerClient;

  constructor(baseStore: LegendREPLBaseStore) {
    super();

    this.application = baseStore.application;
    this.baseStore = baseStore;
    this.client = baseStore.client;
  }

  // ---------------------------------- IMPLEMENTATION ----------------------------------

  override async processQuerySource(value: PlainObject) {
    switch (value._type) {
      case REPL_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawLegendREPLDataCubeSource.serialization.fromJson(value);
        this.baseStore.sourceQuery = rawSource.query;
        const source = new LegendREPLDataCubeSource();
        source.query = await this.parseValueSpecification(
          rawSource.query,
          false,
        );
        try {
          source.columns = (
            await this._getQueryRelationType(_lambda([], [source.query]))
          ).columns;
        } catch (error) {
          assertErrorThrown(error);
          throw new Error(
            `Can't get query result columns. Make sure the source query return a relation (i.e. typed TDS). Error: ${error.message}`,
          );
        }
        source.runtime = rawSource.runtime;

        source.mapping = rawSource.mapping;
        source.timestamp = rawSource.timestamp;
        source.model = rawSource.model;
        source.isLocal = rawSource.isLocal;
        source.isPersistenceSupported = rawSource.isPersistenceSupported;

        return source;
      }
      default: {
        throw new UnsupportedOperationError(
          `Can't process query source of type '${value._type}'.`,
        );
      }
    }
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean,
  ) {
    return _deserializeValueSpecification(
      await this.client.parseValueSpecification({
        code,
        returnSourceInformation,
      }),
    );
  }

  override async getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean,
  ) {
    return this.client.getValueSpecificationCode({
      value: _serializeValueSpecification(value),
      pretty,
    });
  }

  override async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ) {
    return this.client.getQueryTypeahead({
      code,
      baseQuery: _serializeValueSpecification(baseQuery),
    });
  }

  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ) {
    try {
      const relationType = deserialize(
        V1_relationTypeModelSchema,
        await this.client.getQueryCodeRelationReturnType({
          code,
          baseQuery: _serializeValueSpecification(baseQuery),
        }),
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
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_buildEngineError(
          V1_EngineError.serialization.fromJson(
            error.payload as PlainObject<V1_EngineError>,
          ),
        );
      }
      throw error;
    }
  }

  override async executeQuery(
    query: V1_Lambda,
    source: DataCubeSource,
    options?: DataCubeExecutionOptions | undefined,
  ) {
    const result = await this.client.executeQuery({
      query: _serializeValueSpecification(query),
      debug: options?.debug,
    });
    return {
      result: guaranteeType(
        V1_buildExecutionResult(
          V1_deserializeExecutionResult(JSON.parse(result.result)),
        ),
        TDSExecutionResult,
      ),
      executedQuery: result.executedQuery,
      executedSQL: result.executedSQL,
    };
  }

  override buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined {
    if (source instanceof LegendREPLDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [
          source.mapping ? _elementPtr(source.mapping) : undefined,
          _elementPtr(source.runtime),
        ].filter(isNonNullable),
      );
    }
    return undefined;
  }

  // ---------------------------------- UTILITIES ----------------------------------

  private async _getQueryRelationType(query: V1_Lambda) {
    const relationType = deserialize(
      V1_relationTypeModelSchema,
      await this.client.getQueryRelationReturnType({
        query: _serializeValueSpecification(query),
      }),
    );
    return {
      columns: relationType.columns.map((column) => ({
        name: column.name,
        type: V1_getGenericTypeFullPath(column.genericType),
      })),
    };
  }

  // ---------------------------------- APPLICATION ----------------------------------

  override getDocumentationURL(): string | undefined {
    return this.application.documentationService.url;
  }

  override getDocumentationEntry(key: string) {
    return this.application.documentationService.getDocEntry(key);
  }

  override shouldDisplayDocumentationEntry(entry: DocumentationEntry) {
    return shouldDisplayVirtualAssistantDocumentationEntry(entry);
  }

  override openLink(url: string) {
    this.application.navigationService.navigator.visitAddress(url);
  }

  override sendTelemetry(event: string, data: PlainObject) {
    this.application.telemetryService.logEvent(event, data);
  }

  override logDebug(message: string, ...data: unknown[]) {
    this.application.logService.debug(
      LogEvent.create(APPLICATION_EVENT.DEBUG),
      message,
      ...data,
    );
  }

  override debugProcess(processName: string, ...data: [string, unknown][]) {
    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV === 'development') {
      this.application.logService.info(
        LogEvent.create(APPLICATION_EVENT.DEBUG),
        `\n------ START DEBUG PROCESS: ${processName} ------`,
        ...data.flatMap(([key, value]) => [`\n[${key.toUpperCase()}]:`, value]),
        `\n------- END DEBUG PROCESS: ${processName} -------\n\n`,
      );
    } else {
      this.application.logService.debug(
        LogEvent.create(APPLICATION_EVENT.DEBUG),
        `\n------ START DEBUG PROCESS: ${processName} ------`,
        ...data.flatMap(([key, value]) => [`\n[${key.toUpperCase()}]:`, value]),
        `\n------- END DEBUG PROCESS: ${processName} -------\n\n`,
      );
    }
  }

  override logInfo(event: LogEvent, ...data: unknown[]) {
    this.application.logService.info(event, ...data);
  }

  override logWarning(event: LogEvent, ...data: unknown[]) {
    this.application.logService.warn(event, ...data);
  }

  override logError(event: LogEvent, ...data: unknown[]) {
    this.application.logService.error(event, ...data);
  }

  override logUnhandledError(error: Error) {
    this.application.logUnhandledError(error);
  }

  override logIllegalStateError(message: string, error?: Error) {
    this.logError(
      LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
      message,
      error,
    );
  }
}
