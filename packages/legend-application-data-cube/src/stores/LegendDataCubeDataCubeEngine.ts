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
  RelationalExecutionActivities,
  TDSExecutionResult,
  type V1_Lambda,
  type V1_ValueSpecification,
  type V1_EngineServerClient,
  type V1_PureGraphManager,
  type V1_PureModelContext,
  V1_PureModelContextPointer,
  V1_LegendSDLC,
  V1_serializePureModelContext,
  V1_buildParserError,
  V1_ParserError,
  V1_relationTypeModelSchema,
  V1_getGenericTypeFullPath,
  LAMBDA_PIPE,
  V1_rawBaseExecutionContextModelSchema,
  V1_deserializeExecutionResult,
  V1_parameterValueModelSchema,
  type ExecutionResult,
  type V1_ExecutionResult,
  type V1_ParameterValue,
  V1_buildExecutionResult,
  V1_RawBaseExecutionContext,
  PureClientVersion,
  V1_buildEngineError,
  V1_EngineError,
} from '@finos/legend-graph';
import {
  _elementPtr,
  DataCubeEngine,
  type DataCubeSource,
  type CompletionItem,
  _function,
  DataCubeFunction,
  _deserializeLambda,
  AdhocQueryDataCubeSource,
  ADHOC_QUERY_DATA_CUBE_SOURCE_TYPE,
  RawAdhocQueryDataCubeSource,
  _lambda,
  _serializeValueSpecification,
  _deserializeValueSpecification,
} from '@finos/legend-data-cube';
import {
  isNonNullable,
  LogEvent,
  UnsupportedOperationError,
  type PlainObject,
  type DocumentationEntry,
  assertErrorThrown,
  NetworkClientError,
  HttpStatus,
  getNonNullableEntry,
  assertType,
} from '@finos/legend-shared';
import type {
  LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from './LegendDataCubeBaseStore.js';
import {
  APPLICATION_EVENT,
  shouldDisplayVirtualAssistantDocumentationEntry,
} from '@finos/legend-application';
import {
  LEGEND_QUERY_DATA_CUBE_SOURCE_TYPE,
  LegendQueryDataCubeSource,
  RawLegendQueryDataCubeSource,
} from './model/LegendQueryDataCubeSource.js';
import { deserialize, serialize } from 'serializr';
import {
  resolveVersion,
  type DepotServerClient,
} from '@finos/legend-server-depot';

export class LegendDataCubeDataCubeEngine extends DataCubeEngine {
  readonly application: LegendDataCubeApplicationStore;
  readonly graphManager: V1_PureGraphManager;
  readonly depotServerClient: DepotServerClient;
  readonly engineServerClient: V1_EngineServerClient;

  constructor(baseStore: LegendDataCubeBaseStore) {
    super();

    this.application = baseStore.application;
    this.graphManager = baseStore.graphManager;
    this.depotServerClient = baseStore.depotServerClient;
    this.engineServerClient = baseStore.engineServerClient;
  }

  // ---------------------------------- IMPLEMENTATION ----------------------------------

  override async processQuerySource(
    value: PlainObject,
  ): Promise<DataCubeSource> {
    switch (value._type) {
      case ADHOC_QUERY_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawAdhocQueryDataCubeSource.serialization.fromJson(value);
        const source = new AdhocQueryDataCubeSource();
        source.runtime = rawSource.runtime;
        source.model = rawSource.model;
        source.query = await this.parseValueSpecification(
          rawSource.query,
          false,
        );
        source.columns = (
          await this.getQueryRelationType(_lambda([], [source.query]), source)
        ).columns;
        return source;
      }
      case LEGEND_QUERY_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawLegendQueryDataCubeSource.serialization.fromJson(value);
        const queryInfo = await this.graphManager.getQueryInfo(
          rawSource.queryId,
        );
        const executionContext =
          await this.graphManager.resolveQueryInfoExecutionContext(
            queryInfo,
            () =>
              this.depotServerClient.getVersionEntities(
                queryInfo.groupId,
                queryInfo.artifactId,
                queryInfo.versionId,
              ),
          );
        const query = new LegendQueryDataCubeSource();
        query.info = queryInfo;
        query.lambda = _deserializeLambda(
          await this.engineServerClient.grammarToJSON_lambda(
            queryInfo.content,
            '',
            undefined,
            undefined,
            false,
          ),
        );
        query.mapping = executionContext.mapping;
        query.runtime = executionContext.runtime;
        query.model = V1_serializePureModelContext(
          new V1_PureModelContextPointer(
            undefined,
            new V1_LegendSDLC(
              queryInfo.groupId,
              queryInfo.artifactId,
              resolveVersion(queryInfo.versionId),
            ),
          ),
        );
        query.columns = (
          await this._getLambdaRelationType(
            _serializeValueSpecification(query.lambda),
            query.model,
          )
        ).columns;
        query.query = getNonNullableEntry(query.lambda.body, 0);
        // TODO: handle parameter values
        return query;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't process query source of type '${value._type}'`,
        );
    }
  }

  // TODO: we could optimize this by synthesizing the base query from the source columns
  // instead of having to send the entire graph model
  override async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ) {
    const baseQueryCode = await this.getValueSpecificationCode(baseQuery);
    let codeBlock = baseQueryCode + code;
    codeBlock = codeBlock.startsWith(LAMBDA_PIPE)
      ? codeBlock.substring(LAMBDA_PIPE.length)
      : codeBlock;
    if (source instanceof AdhocQueryDataCubeSource) {
      return (
        await this.engineServerClient.completeCode({
          codeBlock,
          model: source.model,
        })
      ).completions as CompletionItem[];
    } else if (source instanceof LegendQueryDataCubeSource) {
      return (
        await this.engineServerClient.completeCode({
          codeBlock,
          model: source.model,
        })
      ).completions as CompletionItem[];
    }
    throw new UnsupportedOperationError(
      `Can't get code completion for lambda with unsupported source`,
    );
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ) {
    try {
      return _deserializeValueSpecification(
        await this.engineServerClient.grammarToJSON_valueSpecification(
          code,
          '',
          undefined,
          undefined,
          returnSourceInformation,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_buildParserError(
          V1_ParserError.serialization.fromJson(
            error.payload as PlainObject<V1_ParserError>,
          ),
        );
      }
      throw error;
    }
  }

  override async getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ) {
    return this.graphManager.valueSpecificationToPureCode(
      _serializeValueSpecification(value),
      pretty,
    );
  }

  // TODO: we could optimize this by synthesizing the base query from the source columns
  // instead of having to send the entire graph model
  override async getQueryRelationType(
    query: V1_Lambda,
    source: DataCubeSource,
  ) {
    return this._getQueryRelationType(
      _serializeValueSpecification(query),
      source,
    );
  }

  // TODO: we could optimize this by synthesizing the base query from the source columns
  // instead of having to send the entire graph model
  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ) {
    const baseQueryCode = await this.getValueSpecificationCode(baseQuery);
    const columnOffset = baseQueryCode.length;
    try {
      const lambda = await this.engineServerClient.grammarToJSON_lambda(
        baseQueryCode + code,
        '',
        undefined,
        undefined,
        true,
      );
      return await this._getQueryRelationType(lambda, source);
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        const engineError = V1_buildEngineError(
          V1_EngineError.serialization.fromJson(
            error.payload as PlainObject<V1_EngineError>,
          ),
        );
        if (engineError.sourceInformation) {
          engineError.sourceInformation.endColumn -= columnOffset;
          engineError.sourceInformation.startColumn -= columnOffset;
        }
        throw engineError;
      }
      throw error;
    }
  }

  override async executeQuery(query: V1_Lambda, source: DataCubeSource) {
    const queryCodePromise = this.getValueSpecificationCode(query);
    let result: ExecutionResult;
    if (source instanceof AdhocQueryDataCubeSource) {
      result = await this._runQuery(query, source.model);
    } else if (source instanceof LegendQueryDataCubeSource) {
      result = await this._runQuery(
        query,
        source.model,
        source.parameterValues,
      );
    } else {
      throw new UnsupportedOperationError(
        `Can't execute query with unsupported source`,
      );
    }
    assertType(
      result,
      TDSExecutionResult,
      `Can't extract execution result: expected tabular data set format`,
    );
    const queryCode = await queryCodePromise;
    const sql =
      result.activities?.[0] instanceof RelationalExecutionActivities
        ? result.activities[0].sql
        : undefined;
    if (!sql) {
      throw new Error(`Can't generate SQL for query`);
    }
    return {
      result: result,
      executedQuery: queryCode,
      executedSQL: sql,
    };
  }

  override buildExecutionContext(source: DataCubeSource) {
    if (source instanceof AdhocQueryDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [_elementPtr(source.runtime)].filter(isNonNullable),
      );
    } else if (source instanceof LegendQueryDataCubeSource) {
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

  private async _getQueryRelationType(
    query: PlainObject<V1_Lambda>,
    source: DataCubeSource,
  ) {
    if (source instanceof AdhocQueryDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof LegendQueryDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    }
    throw new UnsupportedOperationError(
      `Can't get relation type for lambda with unsupported source`,
    );
  }

  private async _getLambdaRelationType(
    lambda: PlainObject<V1_Lambda>,
    model: PlainObject<V1_PureModelContext>,
  ) {
    const relationType = deserialize(
      V1_relationTypeModelSchema,
      await this.engineServerClient.lambdaRelationType({
        lambda,
        model,
      }),
    );
    return {
      columns: relationType.columns.map((column) => ({
        name: column.name,
        type: V1_getGenericTypeFullPath(column.genericType),
      })),
    };
  }

  private async _runQuery(
    query: V1_Lambda,
    model: PlainObject<V1_PureModelContext>,
    parameterValues?: V1_ParameterValue[] | undefined,
  ): Promise<ExecutionResult> {
    return V1_buildExecutionResult(
      V1_deserializeExecutionResult(
        (await this.engineServerClient.runQuery({
          clientVersion:
            // eslint-disable-next-line no-process-env
            process.env.NODE_ENV === 'development'
              ? PureClientVersion.VX_X_X
              : undefined,
          function: _serializeValueSpecification(query),
          model,
          context: serialize(
            V1_rawBaseExecutionContextModelSchema,
            new V1_RawBaseExecutionContext(),
          ),
          parameterValues: (parameterValues ?? []).map((parameterValue) =>
            serialize(V1_parameterValueModelSchema, parameterValue),
          ),
        })) as PlainObject<V1_ExecutionResult>,
      ),
    );
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
