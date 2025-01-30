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
  V1_Lambda,
  V1_ValueSpecification,
  type V1_EngineServerClient,
  V1_PureGraphManager,
  type V1_PureModelContext,
  type ExecutionResult,
  V1_ExecutionResult,
  RelationalExecutionActivities,
  TDSExecutionResult,
  V1_ParameterValue,
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
  V1_buildExecutionResult,
  V1_RawBaseExecutionContext,
  PureClientVersion,
  V1_buildEngineError,
  V1_EngineError,
  V1_PackageableType,
  V1_deserializeRawValueSpecificationType,
  V1_Protocol,
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
  _defaultPrimitiveTypeValue,
  type DataCubeExecutionOptions,
} from '@finos/legend-data-cube';
import {
  isNonNullable,
  LogEvent,
  UnsupportedOperationError,
  type PlainObject,
  assertErrorThrown,
  NetworkClientError,
  HttpStatus,
  at,
  assertType,
  guaranteeType,
} from '@finos/legend-shared';
import type { LegendDataCubeApplicationStore } from './LegendDataCubeBaseStore.js';
import { LegendDataCubeDataCubeCacheEngine } from './LegendDataCubeDataCubeCacheEngine.js';
import { APPLICATION_EVENT } from '@finos/legend-application';
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
  private readonly _application: LegendDataCubeApplicationStore;
  private readonly _depotServerClient: DepotServerClient;
  private readonly _engineServerClient: V1_EngineServerClient;
  private readonly _graphManager: V1_PureGraphManager;
  private readonly _cacheManager: LegendDataCubeDataCubeCacheEngine;

  constructor(
    application: LegendDataCubeApplicationStore,
    depotServerClient: DepotServerClient,
    engineServerClient: V1_EngineServerClient,
    graphManager: V1_PureGraphManager,
  ) {
    super();

    this._application = application;
    this._depotServerClient = depotServerClient;
    this._engineServerClient = engineServerClient;
    this._graphManager = graphManager;
    this._cacheManager = new LegendDataCubeDataCubeCacheEngine();
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
        try {
          source.columns = (
            await this._getLambdaRelationType(
              _serializeValueSpecification(_lambda([], [source.query])),
              source.model,
            )
          ).columns;
        } catch (error) {
          assertErrorThrown(error);
          throw new Error(
            `Can't get query result columns. Make sure the source query return a relation (i.e. typed TDS). Error: ${error.message}`,
          );
        }
        return source;
      }
      case LEGEND_QUERY_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawLegendQueryDataCubeSource.serialization.fromJson(value);
        const queryInfo = await this._graphManager.getQueryInfo(
          rawSource.queryId,
        );
        const executionContext =
          await this._graphManager.resolveQueryInfoExecutionContext(
            queryInfo,
            () =>
              this._depotServerClient.getVersionEntities(
                queryInfo.groupId,
                queryInfo.artifactId,
                queryInfo.versionId,
              ),
          );
        const source = new LegendQueryDataCubeSource();
        source.info = queryInfo;
        source.lambda = _deserializeLambda(
          await this._engineServerClient.grammarToJSON_lambda(
            queryInfo.content,
            '',
            undefined,
            undefined,
            false,
          ),
        );
        source.mapping = executionContext.mapping;
        source.runtime = executionContext.runtime;
        source.model = V1_serializePureModelContext(
          new V1_PureModelContextPointer(
            // TODO: remove as backend should handle undefined protocol input
            new V1_Protocol(
              V1_PureGraphManager.PURE_PROTOCOL_NAME,
              PureClientVersion.VX_X_X,
            ),
            new V1_LegendSDLC(
              queryInfo.groupId,
              queryInfo.artifactId,
              resolveVersion(queryInfo.versionId),
            ),
          ),
        );
        source.query = at(source.lambda.body, 0);
        const parameterValues = await Promise.all(
          source.lambda.parameters.map(async (parameter) => {
            if (parameter.genericType?.rawType instanceof V1_PackageableType) {
              const paramValue = new V1_ParameterValue();
              paramValue.name = parameter.name;
              const type = parameter.genericType.rawType.fullPath;
              const defauleValue = queryInfo.defaultParameterValues?.find(
                (val) => val.name === parameter.name,
              )?.content;
              paramValue.value =
                defauleValue !== undefined
                  ? await this.parseValueSpecification(defauleValue)
                  : {
                      _type: V1_deserializeRawValueSpecificationType(type),
                      value: _defaultPrimitiveTypeValue(type),
                    };
              return paramValue;
            }
            return undefined;
          }),
        );
        source.parameterValues = parameterValues.filter(isNonNullable);
        try {
          source.columns = (
            await this._getLambdaRelationType(
              _serializeValueSpecification(source.lambda),
              source.model,
            )
          ).columns;
        } catch (error) {
          assertErrorThrown(error);
          throw new Error(
            `Can't get query result columns. Make sure the saved query return a relation (i.e. typed TDS). Error: ${error.message}`,
          );
        }
        return source;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't process query source of type '${value._type}'`,
        );
    }
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ) {
    try {
      return _deserializeValueSpecification(
        await this._engineServerClient.grammarToJSON_valueSpecification(
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
    return this._graphManager.valueSpecificationToPureCode(
      _serializeValueSpecification(value),
      pretty,
    );
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
        await this._engineServerClient.completeCode({
          codeBlock,
          model: source.model,
        })
      ).completions as CompletionItem[];
    } else if (source instanceof LegendQueryDataCubeSource) {
      return (
        await this._engineServerClient.completeCode({
          codeBlock,
          model: source.model,
        })
      ).completions as CompletionItem[];
    }
    throw new UnsupportedOperationError(
      `Can't get code completion for lambda with unsupported source`,
    );
  }

  override async getQueryRelationReturnType(
    query: V1_Lambda,
    source: DataCubeSource,
  ) {
    try {
      return await this._getQueryRelationType(
        _serializeValueSpecification(query),
        source,
      );
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
        throw engineError;
      }
      throw error;
    }
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
      const lambda = await this._engineServerClient.grammarToJSON_lambda(
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

  override async executeQuery(
    query: V1_Lambda,
    source: DataCubeSource,
    options?: DataCubeExecutionOptions | undefined,
  ) {
    const queryCodePromise = this.getValueSpecificationCode(query);
    let result: ExecutionResult;
    if (source instanceof AdhocQueryDataCubeSource) {
      result = await this._runQuery(query, source.model, undefined, options);
    } else if (source instanceof LegendQueryDataCubeSource) {
      query.parameters = source.lambda.parameters;
      result = await this._runQuery(
        query,
        source.model,
        source.parameterValues,
        options,
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
      await this._engineServerClient.lambdaRelationType({
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
    options?: DataCubeExecutionOptions | undefined,
  ): Promise<ExecutionResult> {
    return V1_buildExecutionResult(
      V1_deserializeExecutionResult(
        (await this._engineServerClient.runQuery({
          clientVersion:
            options?.clientVersion ??
            // eslint-disable-next-line no-process-env
            (process.env.NODE_ENV === 'development'
              ? PureClientVersion.VX_X_X
              : undefined),
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

  // ---------------------------------- CACHING --------------------------------------

  override async initializeCache(source: DataCubeSource): Promise<void> {
    if (source instanceof LegendQueryDataCubeSource) {
      const fromQuery = this.buildExecutionContext(source);
      fromQuery?.parameters.unshift(source.query);
      const valSpec = guaranteeType(
        fromQuery,
        V1_ValueSpecification,
        'Query is not a valueSpecification',
      );
      const queryLambda = new V1_Lambda();
      queryLambda.body = [valSpec];
      const resultQuery = await this.executeQuery(
        queryLambda,
        source,
        undefined,
      );
      const result = resultQuery.result;
      await this._cacheManager.initializeDuckDb(result);
      //TODO: synthesize cached datacube source and call it
    }
    return Promise.resolve();
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
