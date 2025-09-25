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
  LET_TOKEN,
  V1_AppliedFunction,
  type V1_LambdaReturnTypeResult,
  V1_Variable,
  type QueryInfo,
  EXECUTION_SERIALIZATION_FORMAT,
  V1_LakehouseRuntime,
  V1_IngestDefinition,
  V1_DataProductAccessor,
  PRECISE_PRIMITIVE_TYPE,
  CORE_PURE_PATH,
} from '@finos/legend-graph';
import {
  _elementPtr,
  DataCubeEngine,
  type CompletionItem,
  _function,
  DataCubeFunction,
  FreeformTDSExpressionDataCubeSource,
  FREEFORM_TDS_EXPRESSION_DATA_CUBE_SOURCE_TYPE,
  RawFreeformTDSExpressionDataCubeSource,
  _lambda,
  CachedDataCubeSource,
  type DataCubeExecutionOptions,
  type DataCubeCacheInitializationOptions,
  DataCubeExecutionError,
  RawUserDefinedFunctionDataCubeSource,
  USER_FUNCTION_DATA_CUBE_SOURCE_TYPE,
  type DataCubeSource,
  UserDefinedFunctionDataCubeSource,
  DataCubeQueryFilterOperator,
  _primitiveValue,
  _defaultPrimitiveTypeValue,
  isPrimitiveType,
  _property,
  DataCubeGridClientExportFormat,
} from '@finos/legend-data-cube';
import {
  isNonNullable,
  LogEvent,
  UnsupportedOperationError,
  type PlainObject,
  type StopWatch,
  assertErrorThrown,
  NetworkClientError,
  HttpStatus,
  at,
  assertType,
  guaranteeType,
  guaranteeNonNullable,
  filterByType,
  type TimingsRecord,
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
import { QUERY_BUILDER_PURE_PATH } from '@finos/legend-query-builder';
import {
  LAKEHOUSE_PRODUCER_DATA_CUBE_SOURCE_TYPE,
  LakehouseProducerDataCubeSource,
  RawLakehouseProducerDataCubeSource,
} from './model/LakehouseProducerDataCubeSource.js';
import {
  LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE,
  LakehouseConsumerDataCubeSource,
  RawLakehouseConsumerDataCubeSource,
} from './model/LakehouseConsumerDataCubeSource.js';

export class LegendDataCubeDataCubeEngine extends DataCubeEngine {
  private readonly _application: LegendDataCubeApplicationStore;
  private readonly _depotServerClient: DepotServerClient;
  private readonly _engineServerClient: V1_EngineServerClient;
  private readonly _graphManager: V1_PureGraphManager;
  private readonly _duckDBEngine: LegendDataCubeDuckDBEngine;
  private _ingestDefinition: PlainObject | undefined;

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

  override getDataFromSource(source?: DataCubeSource): PlainObject {
    if (source instanceof LegendQueryDataCubeSource) {
      const queryInfo = source.info;
      return {
        project: {
          groupId: queryInfo.groupId,
          artifactId: queryInfo.artifactId,
          versionId: queryInfo.versionId,
        },
        query: {
          id: queryInfo.id,
          name: queryInfo.name,
        },
        sourceType: LEGEND_QUERY_DATA_CUBE_SOURCE_TYPE,
      };
    } else if (source instanceof UserDefinedFunctionDataCubeSource) {
      const deserializedModel = V1_deserializePureModelContext(source.model);

      const sdlcInfo =
        deserializedModel instanceof V1_PureModelContextPointer &&
        deserializedModel.sdlcInfo instanceof V1_LegendSDLC
          ? deserializedModel.sdlcInfo
          : undefined;
      return {
        project:
          sdlcInfo !== undefined
            ? {
                groupId: sdlcInfo.groupId,
                artifactId: sdlcInfo.artifactId,
                versionId: sdlcInfo.version,
              }
            : undefined,
        function: {
          path: source.functionPath,
          runtime: source.runtime,
        },
        sourceType: USER_FUNCTION_DATA_CUBE_SOURCE_TYPE,
      };
    } else if (source instanceof LocalFileDataCubeSource) {
      const deserializedModel = V1_deserializePureModelContext(source.model);

      const sdlcInfo =
        deserializedModel instanceof V1_PureModelContextPointer &&
        deserializedModel.sdlcInfo instanceof V1_LegendSDLC
          ? deserializedModel.sdlcInfo
          : undefined;
      return {
        project:
          sdlcInfo !== undefined
            ? {
                groupId: sdlcInfo.groupId,
                artifactId: sdlcInfo.artifactId,
                versionId: sdlcInfo.version,
              }
            : undefined,
        file: {
          name: source.fileName,
          format: source.fileFormat,
          runtime: source.runtime,
          db: source.db,
          schema: source.schema,
          table: source.table,
        },
        sourceType: LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE,
      };
    } else if (source instanceof FreeformTDSExpressionDataCubeSource) {
      const deserializedModel = V1_deserializePureModelContext(source.model);

      const sdlcInfo =
        deserializedModel instanceof V1_PureModelContextPointer &&
        deserializedModel.sdlcInfo instanceof V1_LegendSDLC
          ? deserializedModel.sdlcInfo
          : undefined;

      return {
        project:
          sdlcInfo !== undefined
            ? {
                groupId: sdlcInfo.groupId,
                artifactId: sdlcInfo.artifactId,
                versionId: sdlcInfo.version,
              }
            : undefined,
        adhocQuery: {
          mapping: source.mapping,
          runtime: source.runtime,
        },
        sourceType: FREEFORM_TDS_EXPRESSION_DATA_CUBE_SOURCE_TYPE,
      };
    }
    return {};
  }

  getDataFromRawSource(source?: PlainObject): PlainObject {
    if (!source) {
      return {};
    }

    if (source._type === LEGEND_QUERY_DATA_CUBE_SOURCE_TYPE) {
      const rawSource =
        RawLegendQueryDataCubeSource.serialization.fromJson(source);

      return {
        query: {
          id: rawSource.queryId,
        },
        sourceType: source._type,
      };
    } else if (source._type === USER_FUNCTION_DATA_CUBE_SOURCE_TYPE) {
      const rawSource =
        RawUserDefinedFunctionDataCubeSource.serialization.fromJson(source);
      const deserializedModel = V1_deserializePureModelContext(rawSource.model);

      const sdlcInfo =
        deserializedModel instanceof V1_PureModelContextPointer &&
        deserializedModel.sdlcInfo instanceof V1_LegendSDLC
          ? deserializedModel.sdlcInfo
          : undefined;

      return {
        project:
          sdlcInfo !== undefined
            ? {
                groupId: sdlcInfo.groupId,
                artifactId: sdlcInfo.artifactId,
                versionId: sdlcInfo.version,
              }
            : undefined,
        function: {
          path: rawSource.functionPath,
          runtime: rawSource.runtime,
        },
        sourceType: source._type,
      };
    } else if (source._type === LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE) {
      const rawSource =
        RawLocalFileQueryDataCubeSource.serialization.fromJson(source);

      return {
        file: {
          name: rawSource.fileName,
          format: rawSource.fileFormat,
        },
        sourceType: source._type,
      };
    } else if (source._type === FREEFORM_TDS_EXPRESSION_DATA_CUBE_SOURCE_TYPE) {
      const rawSource =
        RawFreeformTDSExpressionDataCubeSource.serialization.fromJson(source);
      const deserializedModel = V1_deserializePureModelContext(rawSource.model);

      const sdlcInfo =
        deserializedModel instanceof V1_PureModelContextPointer &&
        deserializedModel.sdlcInfo instanceof V1_LegendSDLC
          ? deserializedModel.sdlcInfo
          : undefined;

      return {
        project:
          sdlcInfo !== undefined
            ? {
                groupId: sdlcInfo.groupId,
                artifactId: sdlcInfo.artifactId,
                versionId: sdlcInfo.version,
              }
            : undefined,
        adhocQuery: {
          mapping: rawSource.mapping,
          runtime: rawSource.runtime,
        },
        sourceType: source._type,
      };
    } else if (source.type === LAKEHOUSE_PRODUCER_DATA_CUBE_SOURCE_TYPE) {
      const rawSource =
        RawLakehouseProducerDataCubeSource.serialization.fromJson(source);

      return {
        ingestDefinition: {
          urn: rawSource.ingestDefinitionUrn,
          warehouse: rawSource.warehouse,
          ingestServerUrl: rawSource.ingestServerUrl,
        },
        sourceType: source._type,
      };
    } else if (source.type === LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE) {
      const rawSource =
        RawLakehouseConsumerDataCubeSource.serialization.fromJson(source);

      return {
        dataProduct: {
          environment: rawSource.environment,
          warehouse: rawSource.warehouse,
          path: rawSource.paths[0],
          accessPoint: rawSource.paths[1],
          dpCoordinates: rawSource.dpCoordinates,
        },
        sourceType: source._type,
      };
    }
    return {};
  }

  override finalizeTimingRecord(
    stopWatch: StopWatch,
    timings?: TimingsRecord,
  ): TimingsRecord | undefined {
    return this._application.timeService.finalizeTimingsRecord(
      stopWatch,
      timings,
    );
  }

  override async processSource(value: PlainObject): Promise<DataCubeSource> {
    switch (value._type) {
      case FREEFORM_TDS_EXPRESSION_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawFreeformTDSExpressionDataCubeSource.serialization.fromJson(value);
        const source = new FreeformTDSExpressionDataCubeSource();
        if (rawSource.mapping) {
          source.mapping = rawSource.mapping;
        }
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

        const tableCatalog = this._duckDBEngine.retrieveCatalogTable(
          rawSource._ref,
        );

        const { model, database, schema, table, runtime } =
          this._synthesizeMinimalModelContext({
            schemaName: tableCatalog.schemaName,
            tableName: tableCatalog.tableName,
            tableColumns: tableCatalog.columns.map((col) => {
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
      case USER_FUNCTION_DATA_CUBE_SOURCE_TYPE: {
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

        // Check return type of lambda. If it is a TDS type, convert it to
        // the new relation protocol.
        const returnType = await this._getLambdaReturnType(
          this.serializeValueSpecification(source.lambda),
          source.model,
        );
        if (returnType === QUERY_BUILDER_PURE_PATH.TDS_TABULAR_DATASET) {
          try {
            const transformedLambda = guaranteeType(
              this.deserializeValueSpecification(
                await this._engineServerClient.transformTdsToRelation_lambda({
                  model: source.model,
                  lambda: source.lambda,
                }),
              ),
              V1_Lambda,
            );
            source.lambda = transformedLambda;
          } catch (e) {
            assertErrorThrown(e);
            throw new Error(
              `Error transforming TDS protocol to relation protocol:\n${e.message}`,
            );
          }
        }

        // If the lambda has multiple expressions, the source query should only be the final
        // expression of the lambda. All previous expressions should be left untouched and will
        // be prepended to the transformed query when it is executed.
        source.query = at(source.lambda.body, source.lambda.body.length - 1);

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

        source.parameterValues = await this._getQueryParameterValues(
          rawSource,
          source.lambda,
          queryInfo,
        );
        return source;
      }
      case LAKEHOUSE_PRODUCER_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawLakehouseProducerDataCubeSource.serialization.fromJson(value);

        const source = new LakehouseProducerDataCubeSource();

        const query = new V1_ClassInstance();
        query.type = V1_ClassInstanceType.INGEST_ACCESSOR;
        const ingestAccesor = new V1_RelationStoreAccessor();
        ingestAccesor.path = rawSource.paths;
        ingestAccesor.metadata = false;
        query.value = ingestAccesor;
        source.query = query;

        const model = this._synthesizeLakehouseProducerPMCD(rawSource, source);
        source.model = V1_serializePureModelContextData(model);

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
      case LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE: {
        const rawSource =
          RawLakehouseConsumerDataCubeSource.serialization.fromJson(value);

        const source = new LakehouseConsumerDataCubeSource();
        source.model = await this._synthesizeLakehouseConsumerPMCD(
          rawSource,
          source,
        );
        source.environment = rawSource.environment;
        source.paths = rawSource.paths;
        source.warehouse = rawSource.warehouse;
        source.dpCoordinates = rawSource.dpCoordinates;

        //TODO: add support for parameters
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
    context: DataCubeSource | PlainObject,
  ) {
    const baseQueryCode = await this.getValueSpecificationCode(baseQuery);
    let codeBlock = baseQueryCode + code;
    codeBlock = codeBlock.startsWith(LAMBDA_PIPE)
      ? codeBlock.substring(LAMBDA_PIPE.length)
      : codeBlock;
    if (context instanceof FreeformTDSExpressionDataCubeSource) {
      return (
        await this._engineServerClient.completeCode({
          codeBlock,
          model: context.model,
        })
      ).completions as CompletionItem[];
    } else if (context instanceof UserDefinedFunctionDataCubeSource) {
      return (
        await this._engineServerClient.completeCode({
          codeBlock,
          model: context.model,
        })
      ).completions as CompletionItem[];
    } else if (context instanceof LegendQueryDataCubeSource) {
      return (
        await this._engineServerClient.completeCode({
          codeBlock,
          model: context.model,
        })
      ).completions as CompletionItem[];
    } else if (context instanceof LakehouseProducerDataCubeSource) {
      return (
        await this._engineServerClient.completeCode({
          codeBlock,
          model: context.model,
        })
      ).completions as CompletionItem[];
    } else if (context instanceof LakehouseConsumerDataCubeSource) {
      return (
        await this._engineServerClient.completeCode({
          codeBlock,
          model: context.model,
        })
      ).completions as CompletionItem[];
    } else if (Object.getPrototypeOf(context) === Object.prototype) {
      return (
        await this._engineServerClient.completeCode({
          codeBlock,
          model: context,
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
      if (source instanceof FreeformTDSExpressionDataCubeSource) {
        result = await this._runQuery(query, source.model, undefined, options);
      } else if (source instanceof UserDefinedFunctionDataCubeSource) {
        result = await this._runQuery(query, source.model, undefined, options);
      } else if (source instanceof LakehouseProducerDataCubeSource) {
        result = await this._runQuery(query, source.model, undefined, options);
      } else if (source instanceof LakehouseConsumerDataCubeSource) {
        result = await this._runQuery(query, source.model, undefined, options);
      } else if (source instanceof LegendQueryDataCubeSource) {
        const filteredParameterValues = await this._processLegendQueryParams(
          source,
          query,
        );
        result = await this._runQuery(
          query,
          source.model,
          filteredParameterValues,
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
      return {
        result: result,
        executedQuery: await queryCodePromise,
        executedSQL:
          result.activities?.at(-1) instanceof RelationalExecutionActivities
            ? (result.activities.at(-1) as RelationalExecutionActivities).sql
            : undefined,
        executionTime: performance.now() - startTime,
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

  override async exportData(
    query: V1_Lambda,
    source: DataCubeSource,
    format: DataCubeGridClientExportFormat,
    options?: DataCubeExecutionOptions | undefined,
  ): Promise<void | Response> {
    try {
      if (source instanceof FreeformTDSExpressionDataCubeSource) {
        return (await this._runExportQuery(
          query,
          source.model,
          format,
          undefined,
          options,
        )) as Response;
      } else if (source instanceof UserDefinedFunctionDataCubeSource) {
        return (await this._runExportQuery(
          query,
          source.model,
          format,
          undefined,
          options,
        )) as Response;
      } else if (source instanceof LakehouseProducerDataCubeSource) {
        return (await this._runExportQuery(
          query,
          source.model,
          format,
          undefined,
          options,
        )) as Response;
      } else if (source instanceof LakehouseConsumerDataCubeSource) {
        return (await this._runExportQuery(
          query,
          source.model,
          format,
          undefined,
          options,
        )) as Response;
      } else if (source instanceof LegendQueryDataCubeSource) {
        const filteredParameterValues = await this._processLegendQueryParams(
          source,
          query,
        );
        return (await this._runExportQuery(
          query,
          source.model,
          format,
          filteredParameterValues,
          options,
        )) as Response;
        // TODO: implement export for duck-db sources like cache and localCSV
      } else {
        return undefined;
      }
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

  private async _processLegendQueryParams(
    source: LegendQueryDataCubeSource,
    query: V1_Lambda,
  ) {
    // To handle parameter value with function calls we
    // 1. Separate the parameters with function calls from regular parameters
    // 2. Add let statements for function parameter values and store them in the source's letParameterValueSpec
    // 3. Prepend the let statements to the lambda body when we execute the query
    const letFuncs: V1_ValueSpecification[] = [];
    const filteredParameterValues = (
      await Promise.all(
        source.parameterValues.map(async ({ variable, valueSpec }) => {
          if (variable.genericType?.rawType instanceof V1_PackageableType) {
            if (valueSpec instanceof V1_AppliedFunction) {
              const letFunc = guaranteeType(
                this.deserializeValueSpecification(
                  await this._engineServerClient.grammarToJSON_lambda(
                    `${LET_TOKEN} ${variable.name} ${DataCubeQueryFilterOperator.EQUAL} ${await this.getValueSpecificationCode(valueSpec)}`,
                    '',
                    undefined,
                    undefined,
                    false,
                  ),
                ),
                V1_Lambda,
              );
              letFuncs.push(...letFunc.body);
            } else {
              const paramValue = new V1_ParameterValue();
              paramValue.name = variable.name;
              paramValue.value = valueSpec;
              return paramValue;
            }
          }
          return undefined;
        }),
      )
    ).filter(isNonNullable);

    query.parameters = source.lambda.parameters.filter((param) =>
      filteredParameterValues.find((p) => p.name === param.name),
    );
    // If the source lambda has multiple expressions, we should prepend all but the
    // last expression to the transformed query body (which came from the final
    // expression of the source lambda).
    query.body = [
      ...letFuncs,
      ...(source.lambda.body.length > 1 ? source.lambda.body.slice(0, -1) : []),
      ...query.body,
    ];
    return filteredParameterValues;
  }

  override buildExecutionContext(source: DataCubeSource) {
    if (source instanceof FreeformTDSExpressionDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [
          source.mapping ? _elementPtr(source.mapping) : undefined,
          _elementPtr(source.runtime),
        ].filter(isNonNullable),
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
    } else if (source instanceof LakehouseProducerDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [_elementPtr(source.runtime)].filter(isNonNullable),
      );
    } else if (source instanceof LakehouseConsumerDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [_elementPtr(source.runtime)].filter(isNonNullable),
      );
    }
    return undefined;
  }

  override async parseCompatibleModel(
    code: string,
  ): Promise<PlainObject<V1_PureModelContextData>> {
    return this._engineServerClient.grammarToJSON_model(code);
  }

  // ---------------------------------- INGEST ---------------------------------------

  registerIngestDefinition(ingestDefinition: PlainObject | undefined) {
    this._ingestDefinition = ingestDefinition;
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
            case PRIMITIVE_TYPE.BINARY:
            case PRIMITIVE_TYPE.BOOLEAN: {
              column.type = new V1_Bit();
              break;
            }
            case PRECISE_PRIMITIVE_TYPE.INT:
            case PRECISE_PRIMITIVE_TYPE.TINY_INT:
            case PRECISE_PRIMITIVE_TYPE.U_TINY_INT:
            case PRECISE_PRIMITIVE_TYPE.SMALL_INT:
            case PRECISE_PRIMITIVE_TYPE.U_SMALL_INT:
            case PRECISE_PRIMITIVE_TYPE.U_INT:
            case PRECISE_PRIMITIVE_TYPE.BIG_INT:
            case PRECISE_PRIMITIVE_TYPE.U_BIG_INT:
            case PRIMITIVE_TYPE.INTEGER: {
              column.type = new V1_Integer();
              break;
            }
            case PRECISE_PRIMITIVE_TYPE.DOUBLE:
            case PRECISE_PRIMITIVE_TYPE.DECIMAL:
            case PRECISE_PRIMITIVE_TYPE.NUMERIC:
            case PRIMITIVE_TYPE.NUMBER:
            case PRIMITIVE_TYPE.FLOAT:
            case PRIMITIVE_TYPE.DECIMAL: {
              column.type = new V1_Float();
              break;
            }
            case PRIMITIVE_TYPE.DATE:
            case PRIMITIVE_TYPE.STRICTDATE:
            case PRECISE_PRIMITIVE_TYPE.STRICTDATE:
            case PRIMITIVE_TYPE.STRICTDATE:
            case PRECISE_PRIMITIVE_TYPE.TIMESTAMP:
            case PRECISE_PRIMITIVE_TYPE.STRICTTIME:
            case PRECISE_PRIMITIVE_TYPE.DATETIME:
            case PRIMITIVE_TYPE.DATETIME: {
              column.type = new V1_Date();
              break;
            }
            case PRECISE_PRIMITIVE_TYPE.VARCHAR:
            case CORE_PURE_PATH.VARIANT:
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
    if (source instanceof FreeformTDSExpressionDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof UserDefinedFunctionDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof LegendQueryDataCubeSource) {
      const deserializedQuery = guaranteeType(
        this.deserializeValueSpecification(query),
        V1_Lambda,
      );
      await this._processLegendQueryParams(source, deserializedQuery);
      query = this.serializeValueSpecification(deserializedQuery);
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof CachedDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof LocalFileDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof LakehouseProducerDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    } else if (source instanceof LakehouseConsumerDataCubeSource) {
      return this._getLambdaRelationType(query, source.model);
    }
    throw new UnsupportedOperationError(
      `Can't get relation type for lambda with unsupported source`,
    );
  }

  private async _getLambdaReturnType(
    lambda: PlainObject<V1_Lambda>,
    model: PlainObject<V1_PureModelContext>,
  ): Promise<string> {
    return (
      (await this._engineServerClient.lambdaReturnType({
        lambda,
        model,
      })) as unknown as V1_LambdaReturnTypeResult
    ).returnType;
  }

  async _getLambdaRelationType(
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

  async _getQueryParameterValues(
    rawSource: RawLegendQueryDataCubeSource,
    lambda: V1_Lambda,
    queryInfo: QueryInfo,
  ): Promise<{ variable: V1_Variable; valueSpec: V1_ValueSpecification }[]> {
    const rawSourceParameters: {
      variable: V1_Variable;
      valueSpec: V1_ValueSpecification;
    }[] =
      rawSource.parameterValues?.map(([variable, _value]) => ({
        variable: guaranteeType(
          V1_deserializeValueSpecification(JSON.parse(variable), []),
          V1_Variable,
        ),
        valueSpec: V1_deserializeValueSpecification(JSON.parse(_value), []),
      })) ?? [];

    const lambdaParameterValues: {
      variable: V1_Variable;
      valueSpec: V1_ValueSpecification;
    }[] = (
      await Promise.all(
        lambda.parameters.map(async (parameter) => {
          if (parameter.genericType?.rawType instanceof V1_PackageableType) {
            const type = parameter.genericType.rawType.fullPath;
            const defaultValueString = queryInfo.defaultParameterValues?.find(
              (val) => val.name === parameter.name,
            )?.content;
            // If not a primitive value, assume enum type.
            const defaultValueSpec =
              defaultValueString !== undefined
                ? await this.parseValueSpecification(defaultValueString)
                : isPrimitiveType(type)
                  ? _primitiveValue(type, _defaultPrimitiveTypeValue(type))
                  : _property('', [_elementPtr(type)]);
            return { variable: parameter, valueSpec: defaultValueSpec };
          }
          return undefined;
        }),
      )
    ).filter(isNonNullable);

    // Here, we need to handle 3 cases:
    // 1. The query has a parameter with the same name and type as the raw source (which comes from the PersistentDataCube).
    //    In this case, we use the parameter value from the raw source.
    // 2. The query has a parameter that does not exist in the raw source (i.e., the parameter was renamed, the type was changed,
    //    or was newly added after the DataCube was last saved). In this case, we use the default value from the query.
    // 3. The raw source has a parameter that does not exist in the query. In this case, we discard the parameter as it
    //    is no longer used in the query.
    return lambdaParameterValues.map(({ variable, valueSpec }) => {
      const rawSourceParameter = rawSourceParameters.find(
        ({ variable: _rawVariable, valueSpec: _rawValueSpec }) =>
          _rawVariable.name === variable.name,
      );
      const rawSourceVariable = rawSourceParameter?.variable;
      const rawSourceValueSpec = rawSourceParameter?.valueSpec;
      if (
        rawSourceVariable &&
        rawSourceValueSpec &&
        rawSourceVariable.genericType?.rawType instanceof V1_PackageableType &&
        variable.genericType?.rawType instanceof V1_PackageableType &&
        rawSourceVariable.genericType.rawType.fullPath ===
          variable.genericType.rawType.fullPath
      ) {
        return { variable: rawSourceVariable, valueSpec: rawSourceValueSpec };
      }
      return { variable, valueSpec };
    });
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

  private async _runExportQuery(
    query: V1_Lambda,
    model: PlainObject<V1_PureModelContext>,
    format: DataCubeGridClientExportFormat,
    parameterValues?: V1_ParameterValue[] | undefined,
    options?: DataCubeExecutionOptions | undefined,
  ): Promise<void | Response> {
    if (format === DataCubeGridClientExportFormat.CSV) {
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
        return (await this._engineServerClient.runQuery(input, {
          returnAsResponse: true,
          serializationFormat: EXECUTION_SERIALIZATION_FORMAT.CSV,
        })) as Response;
      } catch (err) {
        assertErrorThrown(err);
        const error = new DataCubeExecutionError(err.message);
        error.executeInput = input;
        throw error;
      }
    } else {
      return undefined;
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

  async ingestLocalFileData(data: string, format: string, refId?: string) {
    const { dbReference, columnNames } =
      await this._duckDBEngine.ingestLocalFileData(data, format, refId);
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

  private _synthesizeLakehouseProducerPMCD(
    rawSource: RawLakehouseProducerDataCubeSource,
    source: LakehouseProducerDataCubeSource,
  ) {
    const runtime = new V1_LakehouseRuntime();
    runtime.warehouse = rawSource.warehouse;
    const baseUrl = new URL(rawSource.ingestServerUrl).hostname;
    const subdomain = baseUrl.split('.')[0];
    const parts = subdomain?.split('-');
    runtime.environment = parts?.slice(0, -1).join('-');

    const packageableRuntime = new V1_PackageableRuntime();
    packageableRuntime.runtimeValue = runtime;
    packageableRuntime.name = 'lakehouseProducer';
    packageableRuntime.package = 'runtime';

    source.runtime = packageableRuntime.path;

    const model = new V1_PureModelContextData();
    const ingestDefinition = new V1_IngestDefinition();
    ingestDefinition.content = this._ingestDefinition as PlainObject;
    const splits = rawSource.paths[0]?.split('::');
    ingestDefinition.name = guaranteeNonNullable(splits?.pop());
    ingestDefinition.package = guaranteeNonNullable(
      splits?.slice(0, -1).join('::'),
    );

    model.elements = [ingestDefinition, packageableRuntime];
    return model;
  }

  private async _synthesizeLakehouseConsumerPMCD(
    rawSource: RawLakehouseConsumerDataCubeSource,
    source: LakehouseConsumerDataCubeSource,
  ) {
    const pmcd = await this._depotServerClient.getPureModelContextData(
      rawSource.dpCoordinates.groupId,
      rawSource.dpCoordinates.artifactId,
      rawSource.dpCoordinates.versionId,
      true,
    );
    const deserializedPMCD = guaranteeType(
      V1_deserializePureModelContext(pmcd),
      V1_PureModelContextData,
    );
    const runtime = new V1_LakehouseRuntime();
    runtime.warehouse = rawSource.warehouse;
    runtime.environment = rawSource.environment;

    const packageableRuntime = new V1_PackageableRuntime();
    packageableRuntime.runtimeValue = runtime;
    packageableRuntime.name = 'lakehouseConsumer';
    packageableRuntime.package = 'runtime';
    source.runtime = packageableRuntime.path;

    deserializedPMCD.elements.push(packageableRuntime);
    const dataProduct = guaranteeNonNullable(
      rawSource.paths[0],
      'Data Product expected as first path in lakehouse consumer source',
    );
    const accessPoint = guaranteeNonNullable(
      rawSource.paths[1],
      'Data Product access point expected as second path in lakehouse consumer source',
    );
    const query = new V1_ClassInstance();
    query.type = V1_ClassInstanceType.DATA_PRODUCT_ACCESSOR;
    const dataProductAccessor = new V1_DataProductAccessor();
    dataProductAccessor.path = [dataProduct, accessPoint];
    dataProductAccessor.parameters = [];
    query.value = dataProductAccessor;
    source.query = query;

    return V1_serializePureModelContext(deserializedPMCD);
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
