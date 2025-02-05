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
  type V1_ValueSpecification,
  type V1_EngineServerClient,
  V1_PureGraphManager,
  type V1_PureModelContext,
  type ExecutionResult,
  type V1_ExecutionResult,
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
  type V1_ExecutionPlan,
  V1_deserializeExecutionPlan,
  V1_SQLExecutionNode,
  V1_SimpleExecutionPlan,
  V1_Binary,
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_Column,
  V1_Database,
  V1_Date,
  V1_Double,
  V1_DuckDBDatasourceSpecification,
  V1_EngineRuntime,
  V1_IdentifiedConnection,
  V1_Integer,
  V1_PackageableElementPointer,
  V1_PackageableRuntime,
  V1_PureModelContextData,
  V1_RelationStoreAccessor,
  type V1_RelationalDataType,
  V1_RelationalDatabaseConnection,
  V1_Schema,
  V1_StoreConnections,
  V1_Table,
  V1_TestAuthenticationStrategy,
  V1_VarChar,
  PackageableElementPointerType,
  DatabaseType,
} from '@finos/legend-graph';
import {
  _elementPtr,
  DataCubeEngine,
  type DataCubeSource,
  type CompletionItem,
  _function,
  DataCubeFunction,
  AdhocQueryDataCubeSource,
  ADHOC_QUERY_DATA_CUBE_SOURCE_TYPE,
  RawAdhocQueryDataCubeSource,
  _lambda,
  _defaultPrimitiveTypeValue,
  type DataCubeExecutionOptions,
  CachedDataCubeSource,
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
  guaranteeNonNullable,
  filterByType,
} from '@finos/legend-shared';
import type { LegendDataCubeApplicationStore } from './LegendDataCubeBaseStore.js';
import { LegendDataCubeDataCubeCacheManager } from './LegendDataCubeCacheManager.js';
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
  private readonly _cacheManager: LegendDataCubeDataCubeCacheManager;

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
    this._cacheManager = new LegendDataCubeDataCubeCacheManager();
  }

  async initializeCacheManager() {
    await this._cacheManager.initialize();
  }

  async disposeCacheManager() {
    await this._cacheManager.dispose();
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
              this.serializeValueSpecification(_lambda([], [source.query])),
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

        source.lambda = guaranteeType(
          this.deserializeValueSpecification(
            await this._engineServerClient.grammarToJSON_lambda(
              queryInfo.content,
              '',
              undefined,
              undefined,
              false,
            ),
          ),
          V1_Lambda,
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
        // use the default parameter values from the query
        //
        // TODO?: we should probably allow configuring the parameters?
        // this would mean we need to create first-class support for parameters in DataCube component
        const parameterValues = await Promise.all(
          source.lambda.parameters.map(async (parameter) => {
            if (parameter.genericType?.rawType instanceof V1_PackageableType) {
              const paramValue = new V1_ParameterValue();
              paramValue.name = parameter.name;
              const type = parameter.genericType.rawType.fullPath;
              const defaultValue = queryInfo.defaultParameterValues?.find(
                (val) => val.name === parameter.name,
              )?.content;
              paramValue.value =
                defaultValue !== undefined
                  ? await this.parseValueSpecification(defaultValue)
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
              this.serializeValueSpecification(source.lambda),
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
      return this.deserializeValueSpecification(
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
      this.serializeValueSpecification(value),
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
        this.serializeValueSpecification(query),
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
    const startTime = performance.now();
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
    } else if (source instanceof CachedDataCubeSource) {
      // get the execute plan to extract the generated SQL to run against cached DB
      const executionPlan = await this.generateExecutionPlan(
        query,
        source.model,
        [],
        options,
      );
      const sql = guaranteeNonNullable(
        executionPlan instanceof V1_SimpleExecutionPlan
          ? executionPlan.rootExecutionNode.executionNodes
              .filter(filterByType(V1_SQLExecutionNode))
              .at(-1)?.sqlQuery
          : undefined,
        `Can't process execution plan: failed to extract generated SQL`,
      );
      const endTime = performance.now();
      return {
        executedQuery: await queryCodePromise,
        executedSQL: sql,
        result: await this._cacheManager.runSQLQuery(sql),
        executionTime: endTime - startTime,
      };
    } else {
      throw new UnsupportedOperationError(
        `Can't execute query with unsupported source`,
      );
    }
    assertType(
      result,
      TDSExecutionResult,
      `Can't process execution result: expected tabular data set format`,
    );
    const endTime = performance.now();
    const queryCode = await queryCodePromise;
    const sql = guaranteeNonNullable(
      result.activities?.[0] instanceof RelationalExecutionActivities
        ? result.activities[0].sql
        : undefined,
      `Can't process execution result: failed to extract generated SQL`,
    );
    return {
      result: result,
      executedQuery: queryCode,
      executedSQL: sql,
      executionTime: endTime - startTime,
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
    } else if (source instanceof CachedDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [_elementPtr(source.runtime)].filter(isNonNullable),
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
    } else if (source instanceof CachedDataCubeSource) {
      return this._getLambdaRelationType(query, serialize(source.model));
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
          function: this.serializeValueSpecification(query),
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

  private async generateExecutionPlan(
    query: V1_Lambda,
    model: V1_PureModelContext,
    parameterValues?: V1_ParameterValue[] | undefined,
    options?: DataCubeExecutionOptions | undefined,
  ): Promise<V1_ExecutionPlan> {
    return V1_deserializeExecutionPlan(
      await this._engineServerClient.generatePlan({
        clientVersion:
          options?.clientVersion ??
          // eslint-disable-next-line no-process-env
          (process.env.NODE_ENV === 'development'
            ? PureClientVersion.VX_X_X
            : undefined),
        function: this.serializeValueSpecification(query),
        model: serialize(model),
        context: serialize(
          V1_rawBaseExecutionContextModelSchema,
          new V1_RawBaseExecutionContext(),
        ),
        parameterValues: (parameterValues ?? []).map((parameterValue) =>
          serialize(V1_parameterValueModelSchema, parameterValue),
        ),
      }),
    );
  }

  // ---------------------------------- CACHING --------------------------------------

  override async initializeCache(
    source: DataCubeSource,
  ): Promise<CachedDataCubeSource | undefined> {
    const cacheQuery = guaranteeNonNullable(
      this.buildExecutionContext(source),
      `Can't initialize cache: failed to build cache query`,
    );
    cacheQuery.parameters.unshift(source.query);
    const result = await this.executeQuery(
      _lambda([], [cacheQuery]),
      source,
      undefined,
    );
    const {
      schema: schemaName,
      table: tableName,
      rowCount,
    } = await this._cacheManager.cache(result.result);

    // model
    const pacakgePath = 'local';

    const table = new V1_Table();
    table.name = tableName;
    table.columns = result.result.builder.columns.map((col) => {
      const column = new V1_Column();
      column.name = col.name;
      column.type = this._getColumnType(col.type);
      return column;
    });

    const schema = new V1_Schema();
    schema.name = schemaName;
    schema.tables = [table];
    const database = new V1_Database();
    database.name = 'db';
    database.package = pacakgePath;
    database.schemas = [schema];

    const connection = new V1_RelationalDatabaseConnection();
    connection.databaseType = DatabaseType.DuckDB;
    connection.type = DatabaseType.DuckDB;
    const dataSourceSpec = new V1_DuckDBDatasourceSpecification();
    dataSourceSpec.path = '/tmpFile';
    connection.store = database.path;
    connection.datasourceSpecification = dataSourceSpec;
    connection.authenticationStrategy = new V1_TestAuthenticationStrategy();

    const runtime = new V1_EngineRuntime();
    const storeConnections = new V1_StoreConnections();
    storeConnections.store = new V1_PackageableElementPointer(
      PackageableElementPointerType.STORE,
      database.path,
    );
    const identifiedConnection = new V1_IdentifiedConnection();
    identifiedConnection.connection = connection;
    identifiedConnection.id = 'c0';
    storeConnections.storeConnections = [identifiedConnection];
    runtime.connections = [storeConnections];

    const packageableRuntime = new V1_PackageableRuntime();
    packageableRuntime.runtimeValue = runtime;
    packageableRuntime.package = pacakgePath;
    packageableRuntime.name = 'rt';

    const model = new V1_PureModelContextData();
    model.elements = [database, packageableRuntime];

    // query
    const query = new V1_ClassInstance();
    query.type = V1_ClassInstanceType.RELATION_STORE_ACCESSOR;
    const storeAccessor = new V1_RelationStoreAccessor();
    storeAccessor.path = [database.path, schema.name, table.name];
    query.value = storeAccessor;

    const cachedSource = new CachedDataCubeSource();
    cachedSource.columns = source.columns;
    cachedSource.query = query;
    cachedSource.model = model;
    cachedSource.runtime = packageableRuntime.path;
    cachedSource.db = database.path;
    cachedSource.schema = schema.name;
    cachedSource.table = table.name;
    cachedSource.count = rowCount;
    return cachedSource;
  }

  override async disposeCache(source: CachedDataCubeSource) {
    await this._cacheManager.disposeCache(source);
  }

  // TODO: need a better way to infer datatype from tds builder
  private _getColumnType(type: string | undefined): V1_RelationalDataType {
    if (type === undefined) {
      throw Error('Unsupported data type');
    }
    switch (type) {
      case 'string':
        return new V1_VarChar();
      case 'integer':
        return new V1_Integer();
      case 'date':
        return new V1_Date();
      case 'boolean':
        return new V1_Binary();
      case 'number':
        return new V1_Double();
      default:
        return new V1_VarChar();
    }
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
