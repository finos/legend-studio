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
import { APPLICATION_EVENT } from '@finos/legend-application';
import { deserialize } from 'serializr';

export class LegendREPLDataCubeEngine extends DataCubeEngine {
  private readonly _application: LegendREPLApplicationStore;
  private readonly _client: LegendREPLServerClient;

  constructor(
    application: LegendREPLApplicationStore,
    client: LegendREPLServerClient,
  ) {
    super();

    this._application = application;
    this._client = client;
  }

  // ---------------------------------- IMPLEMENTATION ----------------------------------

  override async processQuerySource(sourceData: PlainObject) {
    switch (sourceData._type) {
      case REPL_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawLegendREPLDataCubeSource.serialization.fromJson(sourceData);
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
          `Can't process query source of type '${sourceData._type}'.`,
        );
      }
    }
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean,
  ) {
    return this.deserializeValueSpecification(
      await this._client.parseValueSpecification({
        code,
        returnSourceInformation,
      }),
    );
  }

  override async getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean,
  ) {
    return this._client.getValueSpecificationCode({
      value: this.serializeValueSpecification(value),
      pretty,
    });
  }

  override async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ) {
    return this._client.getQueryTypeahead({
      code,
      baseQuery: this.serializeValueSpecification(baseQuery),
    });
  }

  override async getQueryRelationReturnType(
    query: V1_Lambda,
    source: DataCubeSource,
  ) {
    return this._getQueryRelationType(query);
  }

  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ) {
    try {
      const relationType = deserialize(
        V1_relationTypeModelSchema,
        await this._client.getQueryCodeRelationReturnType({
          code,
          baseQuery: this.serializeValueSpecification(baseQuery),
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
    const startTime = performance.now();
    const result = await this._client.executeQuery({
      query: this.serializeValueSpecification(query),
      debug: options?.debug,
    });
    const endTime = performance.now();
    return {
      result: guaranteeType(
        V1_buildExecutionResult(
          V1_deserializeExecutionResult(JSON.parse(result.result)),
        ),
        TDSExecutionResult,
      ),
      executedQuery: result.executedQuery,
      executedSQL: result.executedSQL,
      executionTime: endTime - startTime,
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
      await this._client.getQueryRelationReturnType({
        query: this.serializeValueSpecification(query),
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

  override logDebug(message: string, ...data: unknown[]) {
    this._application.logService.debug(
      LogEvent.create(APPLICATION_EVENT.DEBUG),
      message,
      ...data,
    );
  }

  override debugProcess(processName: string, ...data: [string, unknown][]) {
    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV === 'development') {
      this._application.logService.info(
        LogEvent.create(APPLICATION_EVENT.DEBUG),
        `\n------ START DEBUG PROCESS: ${processName} ------`,
        ...data.flatMap(([key, value]) => [`\n[${key.toUpperCase()}]:`, value]),
        `\n------- END DEBUG PROCESS: ${processName} -------\n\n`,
      );
    } else {
      this._application.logService.debug(
        LogEvent.create(APPLICATION_EVENT.DEBUG),
        `\n------ START DEBUG PROCESS: ${processName} ------`,
        ...data.flatMap(([key, value]) => [`\n[${key.toUpperCase()}]:`, value]),
        `\n------- END DEBUG PROCESS: ${processName} -------\n\n`,
      );
    }
  }

  override logInfo(event: LogEvent, ...data: unknown[]) {
    this._application.logService.info(event, ...data);
  }

  override logWarning(event: LogEvent, ...data: unknown[]) {
    this._application.logService.warn(event, ...data);
  }

  override logError(event: LogEvent, ...data: unknown[]) {
    this._application.logService.error(event, ...data);
  }

  override logUnhandledError(error: Error) {
    this._application.logUnhandledError(error);
  }

  override logIllegalStateError(message: string, error?: Error) {
    this.logError(
      LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
      message,
      error,
    );
  }

  override getDocumentationEntry(key: string) {
    return this._application.documentationService.getDocEntry(key);
  }

  override openLink(url: string) {
    this._application.navigationService.navigator.visitAddress(url);
  }

  override sendTelemetry(event: string, data: PlainObject) {
    this._application.telemetryService.logEvent(event, data);
  }
}
