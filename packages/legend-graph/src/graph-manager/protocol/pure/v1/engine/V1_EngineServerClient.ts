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
  NetworkClient,
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
import type { V1_Terminal } from '../model/packageableElements/dataProduct/V1_Terminal.js';
import type { V1_ServiceStorage } from './service/V1_ServiceStorage.js';
import type { GenerationMode } from '../../../../../graph-manager/action/generation/GenerationConfigurationDescription.js';
import type { V1_QuerySearchSpecification } from './query/V1_QuerySearchSpecification.js';
import { EXECUTION_SERIALIZATION_FORMAT } from '../../../../../graph-manager/action/execution/ExecutionResult.js';
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
import type {
  ClassifierPathMapping,
  SubtypeInfo,
} from '../../../../action/protocol/ProtocolInfo.js';
import type { V1_FunctionActivatorInfo } from './functionActivator/V1_FunctionActivatorInfo.js';
import type { V1_FunctionActivatorError } from './functionActivator/V1_FunctionActivatorError.js';
import type { V1_FunctionActivatorInput } from './functionActivator/V1_FunctionActivatorInput.js';
import type { V1_DatabaseBuilderInput } from './generation/V1_DatabaseBuilderInput.js';
import type { V1_RawSQLExecuteInput } from './execution/V1_RawSQLExecuteInput.js';
import type { V1_ValueSpecification } from '../model/valueSpecification/V1_ValueSpecification.js';
import type {
  V1_ArtifactGenerationExtensionInput,
  V1_ArtifactGenerationExtensionOutput,
} from './generation/V1_ArtifactGenerationExtensionApi.js';
import type { V1_DatabaseToModelGenerationInput } from './relational/V1_DatabaseToModelGenerationInput.js';
import type { V1_TestDataGenerationInput } from './service/V1_TestDataGenerationInput.js';
import type { V1_TestDataGenerationResult } from './service/V1_TestDataGenerationResult.js';
import type { V1_RelationalConnectionBuilder } from './relational/V1_RelationalConnectionBuilder.js';
import type { V1_LambdaPrefix } from './lambda/V1_LambdaPrefix.js';
import type { V1_DebugTestsResult } from './test/V1_DebugTestsResult.js';
import type { V1_RelationType } from '../model/packageableElements/type/V1_RelationType.js';
import type { CodeCompletionResult } from '../../../../action/compilation/Completion.js';
import type { V1_CompleteCodeInput } from './compilation/V1_CompleteCodeInput.js';
import type { DeploymentResult } from '../../../../action/DeploymentResult.js';
import type { PersistentDataCube } from '../../../../action/query/PersistentDataCube.js';
import { type V1_LambdaTdsToRelationInput } from './pureProtocol/V1_LambdaTdsToRelationInput.js';
import type { V1_RawLineageModel } from '../model/lineage/V1_Lineage.js';

enum CORE_ENGINE_ACTIVITY_TRACE {
  GRAMMAR_TO_JSON = 'transform Pure code to protocol',
  JSON_TO_GRAMMAR = 'transform protocol to Pure code',

  AUTOFIX_TDS_TO_RELATION = 'transform TDS protocol to relation protocol',

  DATABASE_TO_MODELS = 'generate models from database',
  TEST_DATA_GENERATION = 'generate test data',

  EXTERNAL_FORMAT_TO_PROTOCOL = 'transform external format code to protocol',
  GENERATE_FILE = 'generate file',

  COMPILE = 'compile',
  COMPILE_GRAMMAR = 'compile grammar',
  GET_LAMBDA_RETURN_TYPE = 'get lambda return type',

  EXECUTE = 'execute',
  GENERATE_EXECUTION_PLAN = 'generate execution plan',
  GENERATE_LINEAGE = 'generate lineage',
  GENERATE_ARTIFACTS = 'generate artifacts',

  REGISTER_SERVICE = 'register service',
  GET_SERVICE_VERSION = 'get service version',
  ACTIVATE_SERVICE_GENERATION_ID = 'activate service generation id',
  VALIDATE_SERVICE_ASSERTION_ID = 'validate service assertion id',
  RUN_SERVICE_TESTS = 'run service tests',
  GENERATE_TEST_DATA_WITH_DEFAULT_SEED = 'generate test data with default seed',
  GENERATE_TEST_DATA_WITH_SEED = 'generate test data with seed',

  RUN_TESTS = 'run tests',

  CREATE_QUERY = 'create query',
  UPDATE_QUERY = 'update query',
  PATCH_QUERY = 'patch query',
  DELETE_QUERY = 'delete query',

  CREATE_DATA_CUBE = 'create DataCube',
  UPDATE_DATA_CUBE = 'update DataCube',
  DELETE_DATA_CUBE = 'delete DataCube',

  CANCEL_USER_EXECUTIONS = 'cancel user executions',

  MAPPING_MODEL_COVERAGE_ANALYTICS = 'mapping model coverage analytics',
  SURVEY_DATASET_ANALYTICS = 'survey dataset analytics',
  STORE_ENTITLEMENT_ANALYTICS = 'store entitlement analytics',

  DATABASE_SCHEMA_EXPLORATION = 'database schema exploration',
  DATABASE_RAW_SQL_EXECUTION = 'database raw SQL execution',

  VALIDATE_FUNCTION_ACTIVATOR = 'validate function activator',
  PUBLISH_FUNCTION_ACTIVATOR_TO_SANDBOX = 'publish function activator to sandbox',
}

export type V1_GrammarParserBatchInputEntry = {
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

enum ENGINE_EXECUTION_SERIALIZATION_FORMAT {
  CSV_TRANSFORMED = 'csv_transformed',
}

export const V1_getEngineSerializationFormat = (
  val: EXECUTION_SERIALIZATION_FORMAT,
): ENGINE_EXECUTION_SERIALIZATION_FORMAT | string => {
  switch (val) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case EXECUTION_SERIALIZATION_FORMAT.CSV:
      return ENGINE_EXECUTION_SERIALIZATION_FORMAT.CSV_TRANSFORMED;
    default:
      return val;
  }
};

// eslint-disable-next-line @finos/legend/enforce-protocol-export-prefix
export async function getCurrentUserIDFromEngineServer(
  engineServerUrl: string,
): Promise<string> {
  return new NetworkClient().get(`${engineServerUrl}/server/v1/currentUser`);
}

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
  private baseUrlForServiceRegistration?: string | undefined;

  constructor(config: ServerClientConfig) {
    super(config);
    this.queryBaseUrl = config.queryBaseUrl;
  }

  setBaseUrlForServiceRegistration(val: string | undefined): void {
    this.baseUrlForServiceRegistration = val;
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

  _sdlc = (): string => `${this.baseUrl}/sdlc/v1`;

  // ------------------------------------------- Server -------------------------------------------

  _server = (): string => `${this.baseUrl}/server/v1`;
  getCurrentUserId = (): Promise<string> =>
    this.get(`${this._server()}/currentUser`);

  // ------------------------------------------- Terminal -------------------------------------------

  _marketplace = (): string => `${this.baseUrl}/marketplace/terminals`;

  getTerminals = (): Promise<PlainObject<V1_Terminal>[]> => {
    return this.get(`${this._marketplace()}`);
  };

  getTerminalById = (id: string): Promise<PlainObject<V1_Terminal>[]> => {
    console.log(`${this._marketplace()}/${id}`);
    return this.get(`${this._marketplace()}/${id}`);
  };

  // ------------------------------------------- Server -------------------------------------------

  _lambda = (): string => `${this.baseUrl}/lambda/v1`;
  getLambdaPrefixes = (): Promise<PlainObject<V1_LambdaPrefix>[]> =>
    this.get(`${this._lambda()}/lambdaPrefixes`);

  // ------------------------------------------- Protocol -------------------------------------------

  getClassifierPathMap = (): Promise<ClassifierPathMapping[]> =>
    this.get(`${this._pure()}/protocol/pure/getClassifierPathMap`);

  getSubtypeInfo = (): Promise<SubtypeInfo> =>
    this.get(`${this._pure()}/protocol/pure/getSubtypeInfo`);

  transformTdsToRelation_lambda = (
    input: PlainObject<V1_LambdaTdsToRelationInput>,
  ): Promise<PlainObject<V1_RawLambda>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.AUTOFIX_TDS_TO_RELATION),
      `${this._pure()}/compilation/autofix/transformTdsToRelation/lambda`,
      input,
      {},
      {
        [HttpHeader.ACCEPT]: ContentType.APPLICATION_JSON,
        [HttpHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON,
      },
      { enableCompression: true },
    );

  // ------------------------------------------- SDLC -------------------------------------------

  createPrototypeProject = (): Promise<{
    projectId: string;
    webUrl: string | undefined;
    owner: string;
  }> =>
    this.post(
      `${this._sdlc()}/createPrototypeProject`,
      undefined,
      {},
      {
        [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
      },
    );

  validUserAccessRole = (userId: string): Promise<boolean> =>
    this.get(
      `${this._sdlc()}/userHasPrototypeProjectAccess/${userId}`,
      undefined,
      {
        [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
      },
    );

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
    input: Record<string, V1_GrammarParserBatchInputEntry>,
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

  grammarToJSON_valueSpecification_batch = (
    input: Record<string, V1_GrammarParserBatchInputEntry>,
  ): Promise<{
    errors?: Record<string, PlainObject<V1_ParserError>> | undefined;
    result?: Record<string, PlainObject<V1_ValueSpecification>> | undefined;
  }> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GRAMMAR_TO_JSON),
      `${this._grammarToJSON()}/valueSpecification/batch`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  grammarToJSON_valueSpecification = (
    input: string,
    sourceId?: string | undefined,
    lineOffset?: number | undefined,
    columnOffset?: number | undefined,
    returnSourceInformation?: boolean | undefined,
  ): Promise<PlainObject<V1_ValueSpecification>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GRAMMAR_TO_JSON),
      `${this._grammarToJSON()}/valueSpecification`,
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
    input: Record<string, V1_GrammarParserBatchInputEntry>,
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

  JSONToGrammar_valueSpecification_batch = (
    input: Record<string, PlainObject<V1_ValueSpecification>>,
    renderStyle?: V1_RenderStyle | undefined,
  ): Promise<Record<string, string>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.JSON_TO_GRAMMAR),
      `${this._JSONToGrammar()}/valueSpecification/batch`,
      input,
      {},
      undefined,
      { renderStyle },
      { enableCompression: true },
    );

  JSONToGrammar_valueSpecification = (
    input: PlainObject<V1_ValueSpecification>,
    renderStyle?: V1_RenderStyle | undefined,
  ): Promise<string> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.JSON_TO_GRAMMAR),
      `${this._JSONToGrammar()}/valueSpecification`,
      input,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
      { renderStyle },
      { enableCompression: false },
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
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.RUN_TESTS),
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  debugTests = (
    input: PlainObject<V1_RunTestsInput>,
  ): Promise<PlainObject<V1_DebugTestsResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.RUN_TESTS),
      `${this._pure()}/testable/debugTests`,
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.RUN_TESTS),
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
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.GENERATE_FILE),
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
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.GENERATE_FILE),
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
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.GENERATE_FILE),
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  generateAritfacts = (
    input: PlainObject<V1_ArtifactGenerationExtensionInput>,
  ): Promise<PlainObject<V1_ArtifactGenerationExtensionOutput>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_ARTIFACTS),
      `${this._pure()}/generation/generateArtifacts`,
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

  // --------------------------------------------- Test Data Generation ---------------------------------------------

  _testDataGeneration = (): string => `${this._pure()}/testData/generation`;

  generateTestData(
    input: PlainObject<V1_TestDataGenerationInput>,
  ): Promise<PlainObject<V1_TestDataGenerationResult>> {
    return this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.TEST_DATA_GENERATION),
      `${this._testDataGeneration()}/DONOTUSE_generateTestData`,
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.TEST_DATA_GENERATION),
    );
  }

  // ------------------------------------------- Compile -------------------------------------------

  compile = (
    input: PlainObject<V1_PureModelContext>,
  ): Promise<PlainObject<V1_CompileResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.COMPILE),
      `${this._pure()}/compilation/compile`,
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.COMPILE),
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

  lambdaRelationType = (
    input: PlainObject<V1_LambdaReturnTypeInput>,
  ): Promise<PlainObject<V1_RelationType>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GET_LAMBDA_RETURN_TYPE),
      `${this._pure()}/compilation/lambdaRelationType`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  completeCode = (
    input: PlainObject<V1_CompleteCodeInput>,
  ): Promise<PlainObject<CodeCompletionResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GET_LAMBDA_RETURN_TYPE),
      `${this._pure()}/codeCompletion/completeCode`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  // ------------------------------------------- Execute -------------------------------------------

  _execution = (): string => `${this._pure()}/execution`;
  _executionManager = (): string => `${this._server()}/executionManager`;

  runQuery = (
    input: PlainObject<V1_ExecuteInput>,
    options?: {
      returnAsResponse?: boolean;
      serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
      abortController?: AbortController | undefined;
      tracingTags?: PlainObject | undefined;
    },
  ): Promise<PlainObject<V1_ExecutionResult> | Response> =>
    this.postWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.EXECUTE,
        options?.tracingTags,
      ),
      `${this._execution()}/execute`,
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.EXECUTE),
      {
        signal: options?.abortController?.signal ?? null,
      },
      undefined,
      {
        serializationFormat: options?.serializationFormat
          ? V1_getEngineSerializationFormat(options.serializationFormat)
          : undefined,
      },
      { enableCompression: true },
      { skipProcessing: Boolean(options?.returnAsResponse) },
    );

  generateLineage = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<PlainObject<V1_RawLineageModel>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_LINEAGE),
      `${this.baseUrl}/lineage/v1/function/fullAnalytics`,
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.GENERATE_LINEAGE),
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  generatePlan = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<PlainObject<V1_ExecutionPlan>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GENERATE_EXECUTION_PLAN),
      `${this._execution()}/generatePlan`,
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.GENERATE_EXECUTION_PLAN,
      ),
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
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.GENERATE_EXECUTION_PLAN,
      ),
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
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.GENERATE_TEST_DATA_WITH_DEFAULT_SEED,
      ),
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
      undefined,
      { enableCompression: true },
    );

  generateTestDataWithSeed = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<string> =>
    this.postWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.GENERATE_TEST_DATA_WITH_SEED,
      ),
      `${this._execution()}/testDataGeneration/generateTestData_WithSeed`,
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.GENERATE_TEST_DATA_WITH_SEED,
      ),
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
      undefined,
      { enableCompression: true },
    );

  /**
   * TODO: this is an internal API that should me refactored out using extension mechanism
   */
  INTERNAL__cancelUserExecutions = (
    userID: string,
    broadcastToCluster: boolean,
  ): Promise<string> =>
    this.deleteWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.CANCEL_USER_EXECUTIONS),
      `${this._executionManager()}/cancelUserExecution`,
      {},
      {},
      {},
      { userID, broadcastToCluster },
      { enableCompression: true },
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
    this.get(`${this._query()}/batch`, {}, undefined, { queryIds });
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
  patchQuery = (
    queryId: string,
    query: PlainObject<Partial<V1_Query>>,
  ): Promise<PlainObject<V1_Query>> =>
    this.putWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.PATCH_QUERY),
      `${this._query(queryId)}/patchQuery`,
      query,
    );
  deleteQuery = (queryId: string): Promise<PlainObject<V1_Query>> =>
    this.deleteWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.DELETE_QUERY),
      this._query(queryId),
    );

  // ------------------------------------------- DataCube -------------------------------------------

  _dataCube = (id?: string): string =>
    `${this.queryBaseUrl ?? this.baseUrl}/pure/v1/query/dataCube${
      id ? `/${encodeURIComponent(id)}` : ''
    }`;
  searchDataCubes = (
    searchSpecification: PlainObject<V1_QuerySearchSpecification>,
  ): Promise<PlainObject<PersistentDataCube>[]> =>
    this.post(`${this._dataCube()}/search`, searchSpecification, undefined);
  getDataCubes = (ids: string[]): Promise<PlainObject<PersistentDataCube>[]> =>
    this.get(`${this._dataCube()}/batch`, {}, undefined, {
      queryIds: ids,
    });
  getDataCube = (id: string): Promise<PlainObject<PersistentDataCube>> =>
    this.get(this._dataCube(id));
  createDataCube = (
    dataCube: PlainObject<PersistentDataCube>,
  ): Promise<PlainObject<PersistentDataCube>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.CREATE_DATA_CUBE),
      this._dataCube(),
      dataCube,
    );
  updateDataCube = (
    id: string,
    dataCube: PlainObject<PersistentDataCube>,
  ): Promise<PlainObject<PersistentDataCube>> =>
    this.putWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.UPDATE_DATA_CUBE),
      this._dataCube(id),
      dataCube,
    );
  deleteDataCube = (id: string): Promise<PlainObject<PersistentDataCube>> =>
    this.deleteWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.DELETE_DATA_CUBE),
      this._dataCube(id),
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
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.MAPPING_MODEL_COVERAGE_ANALYTICS,
      ),
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
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.SURVEY_DATASET_ANALYTICS,
      ),
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
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.STORE_ENTITLEMENT_ANALYTICS,
      ),
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  _databaseUtilities = (): string => `${this._pure()}/utilities/database`;

  buildDatabase = (
    input: PlainObject<V1_DatabaseBuilderInput>,
  ): Promise<PlainObject<V1_PureModelContextData>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.DATABASE_SCHEMA_EXPLORATION),
      `${this._databaseUtilities()}/schemaExploration`,
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.DATABASE_SCHEMA_EXPLORATION,
      ),
    );

  executeRawSQL = (
    input: PlainObject<V1_RawSQLExecuteInput>,
  ): Promise<string> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.DATABASE_RAW_SQL_EXECUTION),
      `${this._databaseUtilities()}/executeRawSQL`,
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.DATABASE_RAW_SQL_EXECUTION,
      ),
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
    );

  // ------------------------------------------- Function ---------------------------------------

  _functionActivator = (): string => `${this.baseUrl}/functionActivator`;

  getAvailableFunctionActivators(): Promise<
    PlainObject<V1_FunctionActivatorInfo>[]
  > {
    return this.get(`${this._functionActivator()}/list`);
  }

  validateFunctionActivator(
    input: PlainObject<V1_FunctionActivatorInput>,
  ): Promise<PlainObject<V1_FunctionActivatorError>> {
    return this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.VALIDATE_FUNCTION_ACTIVATOR),
      `${this._functionActivator()}/validate`,
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.VALIDATE_FUNCTION_ACTIVATOR,
      ),
    );
  }

  publishFunctionActivatorToSandbox(
    input: PlainObject<V1_FunctionActivatorInput>,
  ): Promise<PlainObject<DeploymentResult>> {
    return this.postWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.PUBLISH_FUNCTION_ACTIVATOR_TO_SANDBOX,
      ),
      `${this._functionActivator()}/publishToSandbox`,
      this.debugPayload(
        input,
        CORE_ENGINE_ACTIVITY_TRACE.PUBLISH_FUNCTION_ACTIVATOR_TO_SANDBOX,
      ),
    );
  }

  // ------------------------------------------- Relational ---------------------------------------

  _relationalElement = (): string => `${this._pure()}/relational`;

  generateModelsFromDatabaseSpecification(
    input: PlainObject<V1_DatabaseToModelGenerationInput>,
  ): Promise<PlainObject<V1_PureModelContextData>> {
    return this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.DATABASE_TO_MODELS),
      `${this._relationalElement()}/generateModelsFromDatabaseSpecification`,
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.DATABASE_TO_MODELS),
    );
  }

  getAvailableRelationalDatabaseTypeConfigurations = (): Promise<
    PlainObject<V1_RelationalConnectionBuilder>[]
  > =>
    this.get(
      `${this._relationalElement()}/connection/supportedDbAuthenticationFlows`,
    );

  // ------------------------------------------- Service -------------------------------------------

  _service = (serviceServerUrl?: string): string =>
    `${serviceServerUrl ?? this.baseUrl}/service/v1`;

  /**
   * TODO: this is an internal API that should me refactored out using extension mechanism
   */
  TEMPORARY__getServerServiceInfo = (): Promise<
    PlainObject<V1_ServiceConfigurationInfo>
  > => this.get(`${this._server()}/info/services`);

  /**
   * TODO: this is an internal API that should me refactored out using extension mechanism
   */
  TEMPORARY__getServiceVersionInfo = (
    serviceServerUrl: string,
    serviceId: string,
  ): Promise<PlainObject<V1_ServiceStorage>> =>
    this.getWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.GET_SERVICE_VERSION),
      `${this._service(
        this.baseUrlForServiceRegistration ?? serviceServerUrl,
      )}/id/${serviceId}`,
    );

  /**
   * TODO: this is an internal API that should me refactored out using extension mechanism
   */
  TEMPORARY__activateGenerationId = (
    serviceServerUrl: string,
    generationId: string,
  ): Promise<Response> =>
    this.putWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.ACTIVATE_SERVICE_GENERATION_ID,
      ),
      `${this._service(
        this.baseUrlForServiceRegistration ?? serviceServerUrl,
      )}/generation/setActive/id/${generationId}`,
      {},
      {},
      {},
      {},
      {},
      { skipProcessing: true },
    );

  runServicePostVal = (
    servicePath: string,
    input: PlainObject,
    assertionId: string,
  ): Promise<PlainObject> =>
    this.postWithTracing(
      this.getTraceData(
        CORE_ENGINE_ACTIVITY_TRACE.VALIDATE_SERVICE_ASSERTION_ID,
      ),
      `${this._service()}/doValidation`,
      input,
      {},
      undefined,
      {
        assertionId: assertionId,

        servicePath: servicePath,
      },
      { enableCompression: true },
    );

  private getRegisterServiceUrlFromExecMode = (
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

  /**
   * TODO: this is an internal API that should me refactored out using extension mechanism
   */
  INTERNAL__registerService = (
    input: PlainObject<V1_PureModelContext>,
    serviceServerUrl: string,
    serviceExecutionMode: ServiceExecutionMode,
    TEMPORARY__useStoreModel: boolean,
    TEMPORARY__useGenerateLineage: boolean,
    TEMPORARY__useGenerateOpenApi: boolean,
  ): Promise<PlainObject<V1_ServiceRegistrationResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_ACTIVITY_TRACE.REGISTER_SERVICE),
      `${this._service(
        this.baseUrlForServiceRegistration ?? serviceServerUrl,
      )}/${this.getRegisterServiceUrlFromExecMode(serviceExecutionMode)}`,
      this.debugPayload(input, CORE_ENGINE_ACTIVITY_TRACE.REGISTER_SERVICE),
      {},
      undefined,
      serviceExecutionMode === ServiceExecutionMode.FULL_INTERACTIVE
        ? {
            storeModel: TEMPORARY__useStoreModel,
            generateLineage: TEMPORARY__useGenerateLineage,
          }
        : serviceExecutionMode === ServiceExecutionMode.SEMI_INTERACTIVE
          ? {
              generateLineage: TEMPORARY__useGenerateLineage,
            }
          : {
              generateLineage: TEMPORARY__useGenerateLineage,
              generateOpenApi: TEMPORARY__useGenerateOpenApi,
            },
      { enableCompression: true },
    );
}
