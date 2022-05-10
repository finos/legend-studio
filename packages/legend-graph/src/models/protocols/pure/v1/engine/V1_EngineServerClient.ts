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
} from '@finos/legend-shared';
import type { ImportMode } from '../../../../../graphManager/action/generation/ImportConfigurationDescription';
import type { V1_PureModelContextData } from '../model/context/V1_PureModelContextData';
import type { V1_LambdaReturnTypeResult } from './compilation/V1_LambdaReturnTypeResult';
import type { V1_DEPRECATED__ServiceTestResult } from './service/V1_DEPRECATED__ServiceTestResult';
import type { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult';
import type { V1_ServiceConfigurationInfo } from './service/V1_ServiceConfiguration';
import type { V1_CompileResult } from './compilation/V1_CompileResult';
import type { V1_GrammarToJsonInput } from './grammar/V1_GrammarToJson';
import type { V1_JsonToGrammarInput } from './grammar/V1_JsonToGrammarInput';
import type { V1_RawLambda } from '../model/rawValueSpecification/V1_RawLambda';
import type { V1_PureModelContextGenerationInput } from './import/V1_PureModelContextGenerationInput';
import type { V1_GenerateFileInput } from './generation/V1_FileGenerationInput';
import type { V1_ExecutionResult } from './execution/V1_ExecutionResult';
import type { V1_ImportConfigurationDescription } from './import/V1_ImportConfigurationDescription';
import type { V1_GenerationConfigurationDescription } from './generation/V1_GenerationConfigurationDescription';
import type { V1_GenerationOutput } from './generation/V1_GenerationOutput';
import type { V1_ExecuteInput } from './execution/V1_ExecuteInput';
import type { V1_PureModelContext } from '../model/context/V1_PureModelContext';
import type { V1_RelationalOperationElementGrammarToJsonInput } from './grammar/V1_RelationalOperationElementGrammarToJson';
import type { V1_RelationalOperationElementJsonToGrammarInput } from './grammar/V1_RelationalOperationElementJsonToGrammarInput';
import type { V1_ExecutionPlan } from '../model/executionPlan/V1_ExecutionPlan';
import type { V1_LightQuery, V1_Query } from './query/V1_Query';
import type { V1_ServiceStorage } from './service/V1_ServiceStorage';
import type { GenerationMode } from '../../../../../graphManager/action/generation/GenerationConfigurationDescription';
import type { V1_QuerySearchSpecification } from './query/V1_QuerySearchSpecification';
import type { EXECUTION_SERIALIZATION_FORMAT } from '../../../../../graphManager/action/execution/ExecutionResult';
import type { V1_ExternalFormatDescription } from './externalFormat/V1_ExternalFormatDescription';
import type { V1_ExternalFormatModelGenerationInput } from './externalFormat/V1_ExternalFormatModelGeneration';
import type { V1_RunTestsInput } from './test/V1_RunTestsInput';
import type { V1_TestResult } from '../model/test/result/V1_TestResult';

enum CORE_ENGINE_TRACER_SPAN {
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

  constructor(
    config: ServerClientConfig & {
      queryBaseUrl?: string | undefined;
    },
  ) {
    super(config);
    this.queryBaseUrl = config.queryBaseUrl;
  }

  setEnv = (value: string | undefined): void => {
    this.env = value;
  };

  setCurrentUserId = (value: string | undefined): void => {
    this.currentUserId = value;
  };

  getTraceData = (
    spanName: string,
    tracingTags?: Record<PropertyKey, unknown>,
  ): TraceData => ({
    spanName,
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

  // ------------------------------------------- Grammar -------------------------------------------

  transformGrammarToJSON = (
    input: PlainObject<V1_GrammarToJsonInput>,
  ): Promise<PlainObject<V1_JsonToGrammarInput>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GRAMMAR_TO_JSON),
      `${this._pure()}/grammar/transformGrammarToJson`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );
  transformJSONToGrammar = (
    input: PlainObject<V1_JsonToGrammarInput>,
  ): Promise<PlainObject<V1_JsonToGrammarInput>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.JSON_TO_GRAMMAR),
      `${this._pure()}/grammar/transformJsonToGrammar`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  transformRelationalOperationElementGrammarToJSON = (
    input: PlainObject<V1_RelationalOperationElementGrammarToJsonInput>,
  ): Promise<PlainObject<V1_RelationalOperationElementJsonToGrammarInput>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GRAMMAR_TO_JSON),
      `${this._pure()}/grammar/transformRelationalOperationElementGrammarToJson`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  transformRelationalOperationElementJSONToGrammar = (
    input: PlainObject<V1_RelationalOperationElementJsonToGrammarInput>,
  ): Promise<PlainObject<V1_RelationalOperationElementGrammarToJsonInput>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.JSON_TO_GRAMMAR),
      `${this._pure()}/grammar/transformRelationalOperationElementJsonToGrammar`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  // ------------------------------------------- Test ---------------------------------------
  runTests = (
    input: PlainObject<V1_RunTestsInput>,
  ): Promise<PlainObject<V1_TestResult[]>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.RUN_TESTS),
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
  ): Promise<PlainObject<V1_GenerationOutput>[]> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GENERATE_FILE),
      `${this._externalFormats()}/generateModel`,
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
  transformExternalFormatToProtocol = (
    input: PlainObject<V1_PureModelContextGenerationInput>,
    type: string,
    mode: ImportMode,
  ): Promise<PlainObject<V1_PureModelContextData>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.EXTERNAL_FORMAT_TO_PROTOCOL),
      `${this._pure()}/${mode}/${type}`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

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
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GENERATE_FILE),
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
    model: PlainObject<V1_PureModelContextData>,
  ): Promise<PlainObject<V1_CompileResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.COMPILE),
      `${this._pure()}/compilation/compile`,
      model,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );
  lambdaReturnType = (
    lambda: PlainObject<V1_RawLambda>,
    model: PlainObject<V1_PureModelContextData>,
  ): Promise<PlainObject<V1_LambdaReturnTypeResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GET_LAMBDA_RETURN_TYPE),
      `${this._pure()}/compilation/lambdaReturnType`,
      { lambda, model },
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
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.EXECUTE),
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
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GENERATE_EXECUTION_PLAN),
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
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GENERATE_EXECUTION_PLAN),
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
        CORE_ENGINE_TRACER_SPAN.GENERATE_TEST_DATA_WITH_DEFAULT_SEED,
      ),
      `${this._execution()}/testDataGeneration/generateTestData_WithDefaultSeed`,
      input,
      {},
      { Accept: ContentType.TEXT_PLAIN },
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
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GENERATE_EXECUTION_PLAN),
      `${this._databaseUtilities()}/schemaExploration`,
      input,
    );

  // ------------------------------------------- Service -------------------------------------------

  _service = (serviceServerUrl?: string): string =>
    `${serviceServerUrl ?? this.baseUrl}/service/v1`;
  getServerServiceInfo = (): Promise<
    PlainObject<V1_ServiceConfigurationInfo>
  > => this.get(`${this._server()}/info/services`);
  registerService = (
    graphModelData: PlainObject<V1_PureModelContext>,
    serviceServerUrl: string,
    serviceExecutionMode: string | undefined,
  ): Promise<PlainObject<V1_ServiceRegistrationResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.REGISTER_SERVICE),
      `${this._service(serviceServerUrl)}/register${
        serviceExecutionMode ? `_${serviceExecutionMode}` : ''
      }`,
      graphModelData,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );
  getServiceVersionInfo = (
    serviceServerUrl: string,
    serviceId: string,
  ): Promise<PlainObject<V1_ServiceStorage>> =>
    this.getWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GET_SERVICE_VERSION),
      `${this._service(serviceServerUrl)}/id/${serviceId}`,
    );
  activateGenerationId = (
    serviceServerUrl: string,
    generationId: string,
  ): Promise<Response> =>
    this.putWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.ACTIVATE_SERVICE_GENERATION_ID),
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
  runServiceTests = (
    model: PlainObject<V1_PureModelContextData>,
  ): Promise<PlainObject<V1_DEPRECATED__ServiceTestResult>[]> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.RUN_SERVICE_TESTS),
      `${this._service()}/doTest`,
      model,
      {},
      undefined,
      undefined,
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
  getQuery = (queryId: string): Promise<PlainObject<V1_Query>> =>
    this.get(this._query(queryId));
  createQuery = (
    query: PlainObject<V1_Query>,
  ): Promise<PlainObject<V1_Query>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.CREATE_QUERY),
      this._query(),
      query,
    );
  updateQuery = (
    queryId: string,
    query: PlainObject<V1_Query>,
  ): Promise<PlainObject<V1_Query>> =>
    this.putWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.UPDATE_QUERY),
      this._query(queryId),
      query,
    );
  deleteQuery = (queryId: string): Promise<PlainObject<V1_Query>> =>
    this.deleteWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.DELETE_QUERY),
      this._query(queryId),
    );
}
