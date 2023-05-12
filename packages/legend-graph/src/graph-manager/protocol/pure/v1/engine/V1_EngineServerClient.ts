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
  ContentType,
  AbstractServerClient,
  type PlainObject,
  type ServerClientConfig,
  type TraceData,
  HttpHeader,
} from '@finos/legend-shared';
import type { V1_PureModelContextData } from '../model/context/V1_PureModelContextData.js';
import type {
  V1_LambdaReturnTypeInput,
  V1_LambdaReturnTypeResult,
} from './compilation/V1_LambdaReturnType.js';
import type { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult.js';
import type { V1_ServiceConfigurationInfo } from './service/V1_ServiceConfiguration.js';
import type { V1_CompileResult } from './compilation/V1_CompileResult.js';
import type { V1_RawLambda } from '../model/rawValueSpecification/V1_RawLambda.js';
import type { V1_GenerateFileInput } from './generation/V1_FileGenerationInput.js';
import type { V1_ExecutionResult } from './execution/V1_ExecutionResult.js';
import type { V1_ImportConfigurationDescription } from './import/V1_ImportConfigurationDescription.js';
import type { V1_GenerationConfigurationDescription } from './generation/V1_GenerationConfigurationDescription.js';
import type { V1_GenerationOutput } from './generation/V1_GenerationOutput.js';
import type { V1_ExecuteInput } from './execution/V1_ExecuteInput.js';
import type { V1_PureModelContext } from '../model/context/V1_PureModelContext.js';
import type { V1_ExecutionPlan } from '../model/executionPlan/V1_ExecutionPlan.js';
import type { V1_LightQuery, V1_Query } from './query/V1_Query.js';
import type { V1_ServiceStorage } from './service/V1_ServiceStorage.js';
import type { GenerationMode } from '../../../../../graph-manager/action/generation/GenerationConfigurationDescription.js';
import type { V1_QuerySearchSpecification } from './query/V1_QuerySearchSpecification.js';
import type { EXECUTION_SERIALIZATION_FORMAT } from '../../../../../graph-manager/action/execution/ExecutionResult.js';
import type { V1_ExternalFormatDescription } from './externalFormat/V1_ExternalFormatDescription.js';
import type { V1_ExternalFormatModelGenerationInput } from './externalFormat/V1_ExternalFormatModelGeneration.js';
import type { V1_GenerateSchemaInput } from './externalFormat/V1_GenerateSchemaInput.js';
import type { V1_RunTestsInput } from './test/V1_RunTestsInput.js';
import type { V1_RawRelationalOperationElement } from '../model/packageableElements/store/relational/model/V1_RawRelationalOperationElement.js';
import type { V1_RenderStyle } from './grammar/V1_RenderStyle.js';
import type { V1_ParserError } from './grammar/V1_ParserError.js';
import type {
  V1_MappingModelCoverageAnalysisInput,
  V1_MappingModelCoverageAnalysisResult,
} from './analytics/V1_MappingModelCoverageAnalysis.js';
import { ServiceExecutionMode } from '../../../../action/service/ServiceExecutionMode.js';
import type {
  V1_CheckEntitlementsResult,
  V1_EntitlementReportAnalyticsInput,
  V1_StoreEntitlementAnalysisInput,
  V1_SurveyDatasetsResult,
} from './analytics/V1_StoreEntitlementAnalysis.js';
import type { V1_RunTestsResult } from './test/V1_RunTestsResult.js';
import type { V1_TEMPORARY__SnowflakeServiceDeploymentInput } from './service/V1_TEMPORARY__SnowflakeServiceDeploymentInput.js';
import type { ClassifierPathMapping } from './protocol/ClassifierPathMapping.js';

enum CORE_ENGINE_ACTIVITY_TRACE {
  GRAMMAR_TO_JSON = 'transform Pure code to protocol',
  JSON_TO_GRAMMAR = 'transform protocol to Pure code',

  EXTERNAL_FORMAT_TO_PROTOCOL = 'transform external format code to protocol',
  GENERATE_FILE = 'generate file',

  COMPILE = 'compile',
  COMPILE_GRAMMAR = 'compile grammar',
  GET_LAMBDA_RETURN_TYPE = 'get lambda return type',

  EXECUTE = 'execute',
  GENERATE_EXECUTION_PLAN = 'generate execution plan',

  REGISTER_SERVICE = 'register service',
  GET_SERVICE_VERSION = 'get service version',
  ACTIVATE_SERVICE_GENERATION_ID = 'activate service generation id',
  RUN_SERVICE_TESTS = 'run service tests',
  GENERATE_TEST_DATA_WITH_DEFAULT_SEED = 'generate test data with default seed',

  RUN_TESTS = 'run testable tests',

  CREATE_QUERY = 'create query',
  UPDATE_QUERY = 'update query',
  DELETE_QUERY = 'delete query',

  MAPPING_MODEL_COVERAGE_ANALYTICS = 'mapping model coverage analytics',
  SURVEY_DATASET_ANALYTICS = 'survey dataset analytics',
  STORE_ENTITLEMENT_ANALYTICS = 'store entitlement analytics',
}

type GrammarParserBatchInputEntry = {
  value: string;
  returnSourceInformation?: boolean | undefined;
  sourceInformationOffset?:
    | {
        sourceId?: string | undefined;
        lineOffset?: number | undefined;
        columnOffset?: number | undefined;
      }
    | undefined;
};

export class V1_EngineServerClient extends AbstractServerClient {
  currentUserId?: string | undefined;
  private env?: string | undefined;

  // NOTE: this is an attempt to follow engine's effort to be split into multiple pieces
  // for better operational performance overall.
  // e.g. we dedicate some servers for query, some for services, etc.
  //
  // if we do it like this, there might be some complications about the getting the current
  // user, right now we assume to make some call on the query servers, for example, but
  // getting the user from the main engine server, which seems problematic.
  private queryBaseUrl?: string | undefined;

  // NOTE: this is temporary solution to allow us test out the Snowflake service deployment flow
  private TEMPORARY__snowflakeServiceDeploymentUrl?: string | undefined;

  constructor(
    config: ServerClientConfig & {
      queryBaseUrl?: string | undefined;
      TEMPORARY__snowflakeServiceDeploymentUrl?: string | undefined;
    },
  ) {
    super(config);
    this.queryBaseUrl = config.queryBaseUrl;
    this.TEMPORARY__snowflakeServiceDeploymentUrl =
      config.TEMPORARY__snowflakeServiceDeploymentUrl;
  }

  setEnv = (value: string | undefined): void => {
    this.env = value;
  };

  setCurrentUserId = (value: string | undefined): void => {
    this.currentUserId = value;
  };

  getTraceData = (name: string, tracingTags?: PlainObject): TraceData => ({
    name,
    tags: {
      env: this.env ?? '(unknown)',
      userId: this.currentUserId ?? '(unknown)',
      ...tracingTags,
    },
  });

  _pure = (): string => `${this.baseUrl}/pure/v1`;

  // ------------------------------------------- Server -------------------------------------------

  _server = (): string => `${this.baseUrl}/server/v1`;
  getCurrentUserId = (): Promise<string> =>
    this.get(`${this._server()}/currentUser`);

  // ------------------------------------------- Protocol -------------------------------------------

  getClassifierPathMap = (): Promise<ClassifierPathMapping[]> =>
    this.get(`${this._pure()}/protocol/pure/getClassifierPathMap`);

  // ------------------------------------------- Grammar -------------------------------------------

  _grammarToJSON = (): string => `${this._pure()}/grammar/grammarToJson`;

  grammarToJSON_model = (
    input: string,
    sourceId?: string | undefined,
    lineOffset?: number | undefined,
    returnSourceInformation?: boolean | undefined,
  ): Promise<PlainObject<V1_PureModelContextData>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GRAMMAR_TO_JSON),
      `${this._grammarToJSON()}/model`,
      input,
      {},
      {
        [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
      },
      {
        sourceId,
        lineOffset,
        returnSourceInformation,
      },
      { enableCompression: true },
    );

  grammarToJSON_lambda = (
    input: string,
    sourceId?: string | undefined,
    lineOffset?: number | undefined,
    columnOffset?: number | undefined,
    returnSourceInformation?: boolean | undefined,
  ): Promise<PlainObject<V1_RawLambda>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GRAMMAR_TO_JSON),
      `${this._grammarToJSON()}/lambda`,
      input,
      {},
      {
        [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
      },
      {
        sourceId,
        lineOffset,
        columnOffset,
        returnSourceInformation,
      },
      { enableCompression: true },
    );

  grammarToJSON_lambda_batch = (
    input: Record<string, GrammarParserBatchInputEntry>,
  ): Promise<{
    errors?: Record<string, PlainObject<V1_ParserError>> | undefined;
    result?: Record<string, PlainObject<V1_RawLambda>> | undefined;
  }> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GRAMMAR_TO_JSON),
      `${this._grammarToJSON()}/lambda/batch`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  grammarToJSON_relationalOperationElement = (
    input: string,
    sourceId?: string | undefined,
    lineOffset?: number | undefined,
    columnOffset?: number | undefined,
    returnSourceInformation?: boolean | undefined,
  ): Promise<PlainObject<V1_RawRelationalOperationElement>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GRAMMAR_TO_JSON),
      `${this._grammarToJSON()}/relationalOperationElement`,
      input,
      {},
      {
        [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
      },
      {
        sourceId,
        lineOffset,
        columnOffset,
        returnSourceInformation,
      },
      { enableCompression: true },
    );

  grammarToJSON_relationalOperationElement_batch = (
    input: Record<string, GrammarParserBatchInputEntry>,
  ): Promise<{
    errors?: Record<string, PlainObject<V1_ParserError>> | undefined;
    result?:
      | Record<string, PlainObject<V1_RawRelationalOperationElement>>
      | undefined;
  }> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GRAMMAR_TO_JSON),
      `${this._grammarToJSON()}/relationalOperationElement/batch`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  _JSONToGrammar = (): string => `${this._pure()}/grammar/jsonToGrammar`;

  JSONToGrammar_model = (
    input: PlainObject<V1_PureModelContextData>,
    renderStyle?: V1_RenderStyle | undefined,
  ): Promise<string> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.JSON_TO_GRAMMAR),
      `${this._JSONToGrammar()}/model`,
      input,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
      { renderStyle },
      { enableCompression: true },
    );

  JSONToGrammar_lambda = (
    input: PlainObject<V1_RawLambda>,
    renderStyle?: V1_RenderStyle | undefined,
  ): Promise<string> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.JSON_TO_GRAMMAR),
      `${this._JSONToGrammar()}/lambda`,
      input,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
      { renderStyle },
      { enableCompression: true },
    );

  JSONToGrammar_lambda_batch = (
    input: Record<string, PlainObject<V1_RawLambda>>,
    renderStyle?: V1_RenderStyle | undefined,
  ): Promise<Record<string, string>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.JSON_TO_GRAMMAR),
      `${this._JSONToGrammar()}/lambda/batch`,
      input,
      {},
      undefined,
      { renderStyle },
      { enableCompression: true },
    );

  JSONToGrammar_relationalOperationElement = (
    input: PlainObject<V1_RawRelationalOperationElement>,
    renderStyle?: V1_RenderStyle | undefined,
  ): Promise<string> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.JSON_TO_GRAMMAR),
      `${this._JSONToGrammar()}/relationalOperationElement`,
      input,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
      { renderStyle },
      { enableCompression: true },
    );

  JSONToGrammar_relationalOperationElement_batch = (
    input: Record<string, PlainObject<V1_RawRelationalOperationElement>>,
    renderStyle?: V1_RenderStyle | undefined,
  ): Promise<Record<string, string>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.JSON_TO_GRAMMAR),
      `${this._JSONToGrammar()}/relationalOperationElement/batch`,
      input,
      {},
      undefined,
      { renderStyle },
      { enableCompression: true },
    );

  // ------------------------------------------- Test ---------------------------------------

  runTests = (
    input: PlainObject<V1_RunTestsInput>,
  ): Promise<PlainObject<V1_RunTestsResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.RUN_TESTS),
      `${this._pure()}/testable/runTests`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  // ------------------------------------------- External Format ---------------------------------------

  _externalFormats = (): string => `${this._pure()}/external/format`;

  getAvailableExternalFormatsDescriptions = (): Promise<
    PlainObject<V1_ExternalFormatDescription>[]
  > => this.get(`${this._externalFormats()}/availableFormats`);

  generateModel = (
    input: PlainObject<V1_ExternalFormatModelGenerationInput>,
  ): Promise<PlainObject<V1_PureModelContextData>[]> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_FILE),
      `${this._externalFormats()}/generateModel`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  generateSchema = (
    input: PlainObject<V1_GenerateSchemaInput>,
  ): Promise<PlainObject<V1_PureModelContextData>[]> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_FILE),
      `${this._externalFormats()}/generateSchema`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );
  // ------------------------------------------- Code Import -------------------------------------------

  getAvailableCodeImportDescriptions = (): Promise<
    PlainObject<V1_ImportConfigurationDescription>[]
  > => this.get(`${this._pure()}/codeImport/availableImports`);

  // ------------------------------------------- Schema Import -------------------------------------------

  getAvailableSchemaImportDescriptions = (): Promise<
    PlainObject<V1_ImportConfigurationDescription>[]
  > => this.get(`${this._pure()}/schemaImport/availableImports`);
  // ------------------------------------------- Code Generation -------------------------------------------

  getAvailableCodeGenerationDescriptions = (): Promise<
    PlainObject<V1_GenerationConfigurationDescription>[]
  > => this.get(`${this._pure()}/codeGeneration/availableGenerations`);
  generateFile = (
    mode: GenerationMode,
    type: string,
    input: PlainObject<V1_GenerateFileInput>,
  ): Promise<PlainObject<V1_GenerationOutput>[]> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_FILE),
      `${this._pure()}/${mode}/${type}`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  // ------------------------------------------- Schema Generation -------------------------------------------

  getAvailableSchemaGenerationDescriptions = (): Promise<
    PlainObject<V1_GenerationConfigurationDescription>[]
  > => this.get(`${this._pure()}/schemaGeneration/availableGenerations`);

  // ------------------------------------------- Compile -------------------------------------------

  compile = (
    model: PlainObject<V1_PureModelContext>,
  ): Promise<PlainObject<V1_CompileResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.COMPILE),
      `${this._pure()}/compilation/compile`,
      model,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  lambdaReturnType = (
    input: PlainObject<V1_LambdaReturnTypeInput>,
  ): Promise<PlainObject<V1_LambdaReturnTypeResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GET_LAMBDA_RETURN_TYPE),
      `${this._pure()}/compilation/lambdaReturnType`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  // ------------------------------------------- Execute -------------------------------------------

  _execution = (): string => `${this._pure()}/execution`;

  execute = (
    input: PlainObject<V1_ExecuteInput>,
    options?: {
      returnResultAsText?: boolean;
      serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
    },
  ): Promise<PlainObject<V1_ExecutionResult> | Response> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.EXECUTE),
      `${this._execution()}/execute`,
      input,
      {},
      undefined,
      {
        serializationFormat: options?.serializationFormat,
      },
      { enableCompression: true },
      { skipProcessing: Boolean(options?.returnResultAsText) },
    );

  generatePlan = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<PlainObject<V1_ExecutionPlan>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_EXECUTION_PLAN),
      `${this._execution()}/generatePlan`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  debugPlanGeneration = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<{ plan: PlainObject<V1_ExecutionPlan>; debug: string[] }> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_EXECUTION_PLAN),
      `${this._execution()}/generatePlan/debug`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  generateTestDataWithDefaultSeed = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<string> =>
    this.postWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.GENERATE_TEST_DATA_WITH_DEFAULT_SEED,
      ),
      `${this._execution()}/testDataGeneration/generateTestData_WithDefaultSeed`,
      input,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
      undefined,
      { enableCompression: true },
    );

  // --------------------------------------- Analysis ---------------------------------------

  analyzeMappingModelCoverage = (
    input: PlainObject<V1_MappingModelCoverageAnalysisInput>,
  ): Promise<PlainObject<V1_MappingModelCoverageAnalysisResult>> =>
    this.postWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.MAPPING_MODEL_COVERAGE_ANALYTICS,
      ),
      `${this._pure()}/analytics/mapping/modelCoverage`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  surveyDatasets = (
    input: PlainObject<V1_StoreEntitlementAnalysisInput>,
  ): Promise<PlainObject<V1_SurveyDatasetsResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.SURVEY_DATASET_ANALYTICS),
      `${this._pure()}/analytics/store-entitlement/surveyDatasets`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  checkDatasetEntitlements = (
    input: PlainObject<V1_EntitlementReportAnalyticsInput>,
  ): Promise<PlainObject<V1_CheckEntitlementsResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.STORE_ENTITLEMENT_ANALYTICS),
      `${this._pure()}/analytics/store-entitlement/checkDatasetEntitlements`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  // ------------------------------------------- Utilities -------------------------------------------

  _utilities = (): string => `${this._pure()}/utilities`;
  _databaseUtilities = (): string => `${this._utilities()}/database`;

  buildDatabase = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<PlainObject<V1_PureModelContextData>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_EXECUTION_PLAN),
      `${this._databaseUtilities()}/schemaExploration`,
      input,
    );

  // ------------------------------------------- Service -------------------------------------------

  _service = (serviceServerUrl?: string): string =>
    `${serviceServerUrl ?? this.baseUrl}/service/v1`;
  getServerServiceInfo = (): Promise<
    PlainObject<V1_ServiceConfigurationInfo>
  > => this.get(`${this._server()}/info/services`);
  getRegisterServiceUrlFromExecMode = (
    serviceExecutionMode: ServiceExecutionMode,
  ): string => {
    const REGISTER_ENDPOINT_PREFIX = 'register';
    switch (serviceExecutionMode) {
      case ServiceExecutionMode.FULL_INTERACTIVE:
        return `${REGISTER_ENDPOINT_PREFIX}_fullInteractive`;
      case ServiceExecutionMode.SEMI_INTERACTIVE:
        return `${REGISTER_ENDPOINT_PREFIX}_semiInteractive`;
      default:
        return REGISTER_ENDPOINT_PREFIX;
    }
  };
  registerService = (
    graphModelData: PlainObject<V1_PureModelContext>,
    serviceServerUrl: string,
    serviceExecutionMode: ServiceExecutionMode,
    TEMPORARY__useStoreModel: boolean,
    TEMPORARY__useGenerateLineage: boolean,
  ): Promise<PlainObject<V1_ServiceRegistrationResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.REGISTER_SERVICE),
      `${this._service(
        serviceServerUrl,
      )}/${this.getRegisterServiceUrlFromExecMode(serviceExecutionMode)}`,
      graphModelData,
      {},
      undefined,
      serviceExecutionMode === ServiceExecutionMode.FULL_INTERACTIVE
        ? {
            storeModel: TEMPORARY__useStoreModel,
            generateLineage: TEMPORARY__useGenerateLineage,
          }
        : { generateLineage: TEMPORARY__useGenerateLineage },
      { enableCompression: true },
    );
  getServiceVersionInfo = (
    serviceServerUrl: string,
    serviceId: string,
  ): Promise<PlainObject<V1_ServiceStorage>> =>
    this.getWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GET_SERVICE_VERSION),
      `${this._service(serviceServerUrl)}/id/${serviceId}`,
    );
  activateGenerationId = (
    serviceServerUrl: string,
    generationId: string,
  ): Promise<Response> =>
    this.putWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.ACTIVATE_SERVICE_GENERATION_ID,
      ),
      `${this._service(
        serviceServerUrl,
      )}/generation/setActive/id/${generationId}`,
      {},
      {},
      {},
      {},
      {},
      { skipProcessing: true },
    );

  // ------------------------------------------- Query -------------------------------------------

  _query = (queryId?: string): string =>
    `${this.queryBaseUrl ?? this.baseUrl}/pure/v1/query${
      queryId ? `/${encodeURIComponent(queryId)}` : ''
    }`;
  searchQueries = (
    searchSpecification: PlainObject<V1_QuerySearchSpecification>,
  ): Promise<PlainObject<V1_LightQuery>[]> =>
    this.post(`${this._query()}/search`, searchSpecification, undefined);
  getQueries = (queryIds: string[]): Promise<PlainObject<V1_LightQuery>[]> =>
    this.get(`${this._query()}/batch`, {}, undefined, { queryIds: queryIds });
  getQuery = (queryId: string): Promise<PlainObject<V1_Query>> =>
    this.get(this._query(queryId));
  createQuery = (
    query: PlainObject<V1_Query>,
  ): Promise<PlainObject<V1_Query>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.CREATE_QUERY),
      this._query(),
      query,
    );
  updateQuery = (
    queryId: string,
    query: PlainObject<V1_Query>,
  ): Promise<PlainObject<V1_Query>> =>
    this.putWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.UPDATE_QUERY),
      this._query(queryId),
      query,
    );
  deleteQuery = (queryId: string): Promise<PlainObject<V1_Query>> =>
    this.deleteWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.DELETE_QUERY),
      this._query(queryId),
    );

  // ------------------------------------------- Snowflake Service -------------------------------------------

  TEMPORARY__deploySnowflakeService = (
    input: PlainObject<V1_TEMPORARY__SnowflakeServiceDeploymentInput>,
  ): Promise<PlainObject> =>
    this.post(
      `${this.TEMPORARY__snowflakeServiceDeploymentUrl ?? this.baseUrl}`,
      input,
      undefined,
    );
}
