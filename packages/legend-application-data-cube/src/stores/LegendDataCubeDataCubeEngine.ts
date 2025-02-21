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
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_Column,
  V1_Database,
  V1_Date,
  V1_DuckDBDatasourceSpecification,
  V1_EngineRuntime,
  V1_IdentifiedConnection,
  V1_Integer,
  V1_PackageableElementPointer,
  V1_PackageableRuntime,
  V1_PureModelContextData,
  V1_RelationStoreAccessor,
  V1_RelationalDatabaseConnection,
  V1_Schema,
  V1_StoreConnections,
  V1_Table,
  V1_TestAuthenticationStrategy,
  V1_VarChar,
  V1_Bit,
  V1_Float,
  PackageableElementPointerType,
  DatabaseType,
  PRIMITIVE_TYPE,
  V1_BigInt,
  V1_Decimal,
  V1_Double,
  V1_Timestamp,
  V1_TinyInt,
  V1_SmallInt,
  V1_serializePureModelContextData,
  V1_deserializePureModelContext,
  type V1_ConcreteFunctionDefinition,
  V1_deserializeValueSpecification,
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
  CachedDataCubeSource,
  type DataCubeExecutionOptions,
  type DataCubeCacheInitializationOptions,
  DataCubeExecutionError,
  RawUserDefinedFunctionDataCubeSource,
  ADHOC_FUNCTION_DATA_CUBE_SOURCE_TYPE,
  UserDefinedFunctionDataCubeSource,
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
import { LegendDataCubeDuckDBEngine } from './LegendDataCubeDuckDBEngine.js';
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
import {
  LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE,
  LocalFileDataCubeSource,
  RawLocalFileQueryDataCubeSource,
} from './model/LocalFileDataCubeSource.js';

export class LegendDataCubeDataCubeEngine extends DataCubeEngine {
  private readonly _application: LegendDataCubeApplicationStore;
  private readonly _depotServerClient: DepotServerClient;
  private readonly _engineServerClient: V1_EngineServerClient;
  private readonly _graphManager: V1_PureGraphManager;
  private readonly _duckDBEngine: LegendDataCubeDuckDBEngine;

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
    this._duckDBEngine = new LegendDataCubeDuckDBEngine();
  }

  async initialize() {
    await this._duckDBEngine.initialize();
  }

  async dispose() {
    await this._duckDBEngine.dispose();
  }

  // ---------------------------------- IMPLEMENTATION ----------------------------------

  override async processSource(value: PlainObject): Promise<DataCubeSource> {
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
      case LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawLocalFileQueryDataCubeSource.serialization.fromJson(value);
        const source = new LocalFileDataCubeSource();
        source.fileName = rawSource.fileName;
        source.fileFormat = rawSource.fileFormat;
        source.count = rawSource.count;

        const { schemaName, tableName, tableSpec } =
          LegendDataCubeDuckDBEngine.getTableDetailsByReference(
            rawSource.dbReference,
          );

        const { model, database, schema, table, runtime } =
          this._synthesizeMinimalModelContext({
            schemaName,
            tableName,
            tableColumns: tableSpec.map((col) => {
              const column = new V1_Column();
              column.name = col[0] as string;
              // TODO: confirm this is in accordance to engine
              // check if we have a duckdb enum mapping
              // See https://duckdb.org/docs/sql/data_types/overview.html
              switch (col[1] as string) {
                case 'BIT': {
                  column.type = new V1_Bit();
                  break;
                }
                case 'BOOLEAN': {
                  // TODO: understand why boolean is not present in relationalDataType
                  column.type = new V1_VarChar();
                  break;
                }
                case 'DATE': {
                  column.type = new V1_Date();
                  break;
                }
                case 'DECIMAL': {
                  column.type = new V1_Decimal();
                  break;
                }
                case 'DOUBLE': {
                  column.type = new V1_Double();
                  break;
                }
                case 'FLOAT': {
                  column.type = new V1_Float();
                  break;
                }
                case 'INTEGER': {
                  column.type = new V1_Integer();
                  break;
                }
                case 'TININT': {
                  column.type = new V1_TinyInt();
                  break;
                }
                case 'SMALLINT': {
                  column.type = new V1_SmallInt();
                  break;
                }
                case 'BIGINT': {
                  column.type = new V1_BigInt();
                  break;
                }
                case 'TIMESTAMP': {
                  column.type = new V1_Timestamp();
                  break;
                }
                case 'VARCHAR': {
                  column.type = new V1_VarChar();
                  break;
                }
                default: {
                  throw new UnsupportedOperationError(
                    `Can't ingest local file data: failed to find matching relational data type for DuckDB type '${col[1]}' when synthesizing table definition`,
                  );
                }
              }
              return column;
            }),
          });

        source.db = database.path;
        source.model = model;
        source.table = table.name;
        source.schema = schema.name;
        source.runtime = runtime.path;

        const query = new V1_ClassInstance();
        query.type = V1_ClassInstanceType.RELATION_STORE_ACCESSOR;
        const storeAccessor = new V1_RelationStoreAccessor();
        storeAccessor.path = [source.db, source.schema, source.table];
        query.value = storeAccessor;
        source.query = query;

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
      case ADHOC_FUNCTION_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawUserDefinedFunctionDataCubeSource.serialization.fromJson(value);
        const deserializedModel = V1_deserializePureModelContext(
          rawSource.model,
        );

        if (
          rawSource.runtime === undefined ||
          !(deserializedModel instanceof V1_PureModelContextPointer)
        ) {
          throw new Error(
            `Unsupported user defined function source. Runtime is needed and model must be a pointer.`,
          );
        }

        const source = new UserDefinedFunctionDataCubeSource();
        source.functionPath = rawSource.functionPath;
        source.runtime = rawSource.runtime;
        source.model = rawSource.model;
        if (deserializedModel.sdlcInfo instanceof V1_LegendSDLC) {
          const sdlcInfo = deserializedModel.sdlcInfo;
          const fetchedFunction =
            await this._depotServerClient.getVersionEntity(
              sdlcInfo.groupId,
              sdlcInfo.artifactId,
              sdlcInfo.version,
              rawSource.functionPath,
            );
          const functionContent =
            fetchedFunction.content as V1_ConcreteFunctionDefinition;

          //TODO add support for parameters
          if (functionContent.body.length > 1) {
            throw new Error(
              `Unsupported user defined function source. Functions with parameters are not yet supported.`,
            );
          }

          source.query = V1_deserializeValueSpecification(
            functionContent.body[0] as PlainObject,
            this._application.pluginManager.getPureProtocolProcessorPlugins(),
          );
          source.columns = (
            await this._getLambdaRelationType(
              this.serializeValueSpecification(_lambda([], [source.query])),
              source.model,
            )
          ).columns;
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
    } else if (source instanceof UserDefinedFunctionDataCubeSource) {
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

    try {
      if (source instanceof AdhocQueryDataCubeSource) {
        result = await this._runQuery(query, source.model, undefined, options);
      } else if (source instanceof UserDefinedFunctionDataCubeSource) {
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
        const executionPlan = await this._generateExecutionPlan(
          query,
          source.model,
          [],
          // NOTE: for caching, we're using DuckDB, but its protocol models
          // are not available in the latest production protocol version V1_33_0, so
          // we have to force using VX_X_X
          // once we either cut another protocol version or backport the DuckDB models
          // to V1_33_0, we will can remove this
          { ...options, clientVersion: PureClientVersion.VX_X_X },
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
          result: await this._duckDBEngine.runSQLQuery(sql),
          executionTime: endTime - startTime,
        };
      } else if (source instanceof LocalFileDataCubeSource) {
        // get the execute plan to extract the generated SQL to run against cached DB
        const executionPlan = await this._generateExecutionPlan(
          query,
          source.model,
          [],
          // NOTE: for local file, we're using DuckDB, but its protocol models
          // are not available in the latest production protocol version V1_33_0, so
          // we have to force using VX_X_X
          // once we either cut another protocol version or backport the DuckDB models
          // to V1_33_0, we will can remove this
          { ...options, clientVersion: PureClientVersion.VX_X_X },
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
          result: await this._duckDBEngine.runSQLQuery(sql),
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
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof DataCubeExecutionError) {
        try {
          error.queryCode = await this.getValueSpecificationCode(query, true);
        } catch {
          // ignore
        }
      }
      throw error;
    }
  }

  override buildExecutionContext(source: DataCubeSource) {
    if (source instanceof AdhocQueryDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [_elementPtr(source.runtime)].filter(isNonNullable),
      );
    } else if (source instanceof UserDefinedFunctionDataCubeSource) {
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
    } else if (source instanceof LocalFileDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [_elementPtr(source.runtime)].filter(isNonNullable),
      );
    }
    return undefined;
  }

  // ---------------------------------- CACHING --------------------------------------

  override async initializeCache(
    source: DataCubeSource,
    options?: DataCubeCacheInitializationOptions | undefined,
  ): Promise<CachedDataCubeSource | undefined> {
    const cacheQuery = guaranteeNonNullable(
      this.buildExecutionContext(source),
      `Can't initialize cache: failed to build cache query`,
    );
    cacheQuery.parameters.unshift(source.query);
    const result = await this.executeQuery(
      _lambda([], [cacheQuery]),
      source,
      options,
    );
    const {
      schema: schemaName,
      table: tableName,
      rowCount,
    } = await this._duckDBEngine.cache(result.result);

    const { model, database, schema, table, runtime } =
      this._synthesizeMinimalModelContext({
        schemaName,
        tableName,
        tableColumns: result.result.builder.columns.map((col) => {
          const column = new V1_Column();
          column.name = col.name;
          switch (col.type as string) {
            case PRIMITIVE_TYPE.BOOLEAN: {
              column.type = new V1_Bit();
              break;
            }
            case PRIMITIVE_TYPE.INTEGER: {
              column.type = new V1_Integer();
              break;
            }
            case PRIMITIVE_TYPE.NUMBER:
            case PRIMITIVE_TYPE.FLOAT:
            case PRIMITIVE_TYPE.DECIMAL: {
              column.type = new V1_Float();
              break;
            }
            case PRIMITIVE_TYPE.DATE:
            case PRIMITIVE_TYPE.STRICTDATE:
            case PRIMITIVE_TYPE.DATETIME: {
              column.type = new V1_Date();
              break;
            }
            case PRIMITIVE_TYPE.STRING: {
              column.type = new V1_VarChar();
              break;
            }
            default: {
              throw new UnsupportedOperationError(
                `Can't initialize cache: failed to find matching relational data type for Pure type '${col.type}' when synthesizing table definition`,
              );
            }
          }
          return column;
        }),
      });

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
    cachedSource.runtime = runtime.path;
    cachedSource.db = database.path;
    cachedSource.schema = schema.name;
    cachedSource.table = table.name;
    cachedSource.count = rowCount;
    return cachedSource;
  }

  override async disposeCache(source: CachedDataCubeSource) {
    await this._duckDBEngine.disposeCache(source);
  }

  // ---------------------------------- UTILITIES ----------------------------------

  private async _getQueryRelationType(
    query: PlainObject<V1_Lambda>,
    source: DataCubeSource,
  ) {
    if (source instanceof AdhocQueryDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof UserDefinedFunctionDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof LegendQueryDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof CachedDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof LocalFileDataCubeSource) {
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
    const input = {
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
      ) as PlainObject<V1_RawBaseExecutionContext>,
      parameterValues: (parameterValues ?? []).map((parameterValue) =>
        serialize(V1_parameterValueModelSchema, parameterValue),
      ),
    };
    try {
      return V1_buildExecutionResult(
        V1_deserializeExecutionResult(
          (await this._engineServerClient.runQuery(
            input,
          )) as PlainObject<V1_ExecutionResult>,
        ),
      );
    } catch (err) {
      assertErrorThrown(err);
      const error = new DataCubeExecutionError(err.message);
      error.executeInput = input;
      throw error;
    }
  }

  private async _generateExecutionPlan(
    query: V1_Lambda,
    model: PlainObject<V1_PureModelContext>,
    parameterValues?: V1_ParameterValue[] | undefined,
    options?: DataCubeExecutionOptions | undefined,
  ): Promise<V1_ExecutionPlan> {
    const input = {
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
      ) as PlainObject<V1_RawBaseExecutionContext>,
      parameterValues: (parameterValues ?? []).map((parameterValue) =>
        serialize(V1_parameterValueModelSchema, parameterValue),
      ),
    };
    try {
      return V1_deserializeExecutionPlan(
        await this._engineServerClient.generatePlan(input),
      );
    } catch (err) {
      assertErrorThrown(err);
      const error = new DataCubeExecutionError(err.message);
      error.executeInput = input;
      throw error;
    }
  }

  async ingestLocalFileData(data: string, format: string) {
    const { dbReference, columnNames } =
      await this._duckDBEngine.ingestLocalFileData(data, format);
    return { dbReference, columnNames };
  }

  private _synthesizeMinimalModelContext(data: {
    schemaName: string;
    tableName: string;
    tableColumns: V1_Column[];
  }) {
    const { schemaName, tableName, tableColumns } = data;

    // model
    const packagePath = 'local';

    const table = new V1_Table();
    table.name = tableName;
    table.columns = [...tableColumns];

    const schema = new V1_Schema();
    schema.name = schemaName;
    schema.tables = [table];
    const database = new V1_Database();
    database.name = 'db';
    database.package = packagePath;
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
    packageableRuntime.package = packagePath;
    packageableRuntime.name = 'rt';

    const model = new V1_PureModelContextData();
    model.elements = [database, packageableRuntime];

    return {
      model: V1_serializePureModelContextData(model),
      database,
      schema,
      table,
      runtime: packageableRuntime,
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
