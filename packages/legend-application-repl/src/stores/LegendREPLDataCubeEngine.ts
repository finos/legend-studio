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
  deserializeREPLQuerySource,
  REPL_DATA_CUBE_SOURCE_TYPE,
  type LegendREPLServerClient,
} from './LegendREPLServerClient.js';
import {
  _elementPtr,
  _function,
  _lambda,
  DataCubeEngine,
  DataCubeFunction,
  type DataCubeSource,
  type DataCubeAPI,
  DataCubeQuery,
} from '@finos/legend-data-cube';
import {
  TDSExecutionResult,
  type V1_AppliedFunction,
  V1_buildExecutionResult,
  V1_deserializeValueSpecification,
  V1_serializeExecutionResult,
  V1_serializeValueSpecification,
  type V1_Lambda,
  type V1_ValueSpecification,
  V1_buildEngineError,
  V1_EngineError,
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
} from '@finos/legend-shared';
import { LegendREPLDataCubeSource } from './LegendREPLDataCubeSource.js';
import type { LegendREPLApplicationStore } from '../application/LegendREPLApplicationStore.js';
import {
  APPLICATION_EVENT,
  shouldDisplayVirtualAssistantDocumentationEntry,
} from '@finos/legend-application';
import type { LegendREPLBaseStore } from './LegendREPLBaseStore.js';

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

  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
    onNativePlatformNavigationBlock?: (() => void) | undefined,
  ) {
    this.application.navigationService.navigator.blockNavigation(
      blockCheckers,
      onBlock,
      onNativePlatformNavigationBlock,
    );
  }

  unblockNavigation() {
    this.application.navigationService.navigator.unblockNavigation();
  }

  persistSettingValue(
    key: string,
    value: string | number | boolean | object | undefined,
  ): void {
    this.application.settingService.persistValue(key, value);
  }

  // ---------------------------------- IMPLEMENTATION ----------------------------------

  override async fetchConfiguration() {
    const info = await this.client.getInfrastructureInfo();
    this.baseStore.currentUser = info.currentUser;
    this.baseStore.queryServerBaseUrl = info.queryServerBaseUrl;
    this.baseStore.hostedApplicationBaseUrl = info.hostedApplicationBaseUrl;
    return {
      gridClientLicense: info.gridClientLicense,
    };
  }

  async getBaseQuery() {
    return DataCubeQuery.serialization.fromJson(
      await this.client.getBaseQuery(),
    );
  }

  async processQuerySource(value: PlainObject) {
    const _source = deserializeREPLQuerySource(value);
    this.baseStore.sourceQuery = _source.query;
    if (value._type !== REPL_DATA_CUBE_SOURCE_TYPE) {
      throw new Error(
        `Can't process query source of type '${value._type}'. Only type '${REPL_DATA_CUBE_SOURCE_TYPE}' is supported.`,
      );
    }

    const source = new LegendREPLDataCubeSource();
    source.query = await this.parseValueSpecification(_source.query, false);
    source.sourceColumns = (
      await this.getQueryRelationType(_lambda([], [source.query]), source)
    ).columns;
    source.runtime = _source.runtime;

    source.mapping = _source.mapping;
    source.timestamp = _source.timestamp;
    source.model = _source.model;
    source.isLocal = _source.isLocal;
    source.isPersistenceSupported = _source.isPersistenceSupported;

    return source;
  }

  async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean,
  ) {
    return V1_deserializeValueSpecification(
      await this.client.parseValueSpecification({
        code,
        returnSourceInformation,
      }),
      [],
    );
  }

  override getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean,
  ) {
    return this.client.getValueSpecificationCode({
      value: V1_serializeValueSpecification(value, []),
      pretty,
    });
  }

  async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ) {
    return this.client.getQueryTypeahead({
      code,
      baseQuery: V1_serializeValueSpecification(baseQuery, []),
    });
  }

  async getQueryRelationType(query: V1_Lambda, source: DataCubeSource) {
    return this.client.getQueryRelationReturnType({
      query: V1_serializeValueSpecification(query, []),
    });
  }

  async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ) {
    try {
      return await this.client.getQueryCodeRelationReturnType({
        code,
        baseQuery: V1_serializeValueSpecification(baseQuery, []),
      });
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

  async executeQuery(
    query: V1_Lambda,
    source: DataCubeSource,
    api: DataCubeAPI,
  ) {
    const result = await this.client.executeQuery({
      query: V1_serializeValueSpecification(query, []),
      debug: api.getSettings().enableDebugMode,
    });
    return {
      result: guaranteeType(
        V1_buildExecutionResult(
          V1_serializeExecutionResult(JSON.parse(result.result)),
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
    this.application.logService.debug(
      LogEvent.create(APPLICATION_EVENT.DEBUG),
      `\n------ START DEBUG PROCESS: ${processName} ------`,
      ...data.flatMap(([key, value]) => [`\n[${key.toUpperCase()}]:`, value]),
      `\n------- END DEBUG PROCESS: ${processName} -------\n\n`,
    );
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
