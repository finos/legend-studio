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

import { action, makeObservable, observable } from 'mobx';
import { ContentType } from '@finos/legend-studio-shared';
import type { PlainObject } from '@finos/legend-studio-shared';
import type { GenerationMode } from '../../../../metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { ImportMode } from '../../../../metamodels/pure/action/generation/ImportConfigurationDescription';
import type { V1_PureModelContextData } from '../model/context/V1_PureModelContextData';
import type { V1_LambdaReturnTypeResult } from './compilation/V1_LambdaReturnTypeResult';
import type { V1_ServiceTestResult } from './service/V1_ServiceTestResult';
import type { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult';
import type { V1_ServiceConfigurationInfo } from './service/V1_ServiceConfiguration';
import type { V1_CompileResult } from './compilation/V1_CompileResult';
import type { V1_GrammarToJsonInput } from './grammar/V1_GrammarToJson';
import type { V1_JsonToGrammarInput } from './grammar/V1_JsonToGrammarInput';
import type { V1_RawLambda } from '../model/rawValueSpecification/V1_RawLambda';
import type { V1_PureModelContextGenerationInput } from './import/V1_PureModelContextGenerationInput';
import type { V1_GenerateFileInput } from './generation/V1_FileGenerationInput';
import type {
  V1_ExecutionPlan,
  V1_ExecutionResult,
} from './execution/V1_ExecutionResult';
import type { V1_ImportConfigurationDescription } from './import/V1_ImportConfigurationDescription';
import type { V1_GenerationConfigurationDescription } from './generation/V1_GenerationConfigurationDescription';
import type { V1_GenerationOutput } from './generation/V1_GenerationOutput';
import type { V1_ExecuteInput } from './execution/V1_ExecuteInput';
import type { V1_PureModelContext } from '../model/context/V1_PureModelContext';
import type { V1_Store } from '../model/packageableElements/store/V1_Store';
import type {
  ServerClientConfig,
  TraceData,
} from '@finos/legend-studio-network';
import { AbstractServerClient } from '@finos/legend-studio-network';
import type { V1_RelationalOperationElementGrammarToJsonInput } from './grammar/V1_RelationalOperationElementGrammarToJson';
import type { V1_RelationalOperationElementJsonToGrammarInput } from './grammar/V1_RelationalOperationElementJsonToGrammarInput';

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
}

export class V1_EngineServerClient extends AbstractServerClient {
  private version = 'v1';
  public currentUserId?: string;
  private env?: string;

  constructor(config: ServerClientConfig) {
    super(config);

    makeObservable(this, {
      baseUrl: observable,
      enableCompression: observable,
      setBaseUrl: action,
      setCompression: action,
    });
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

  _pure = (): string => `${this.networkClient.baseUrl}/pure/${this.version}`;

  _store = (): string => `${this.networkClient.baseUrl}/store/${this.version}`;

  // ------------------------------------------- Server -------------------------------------------

  _server = (): string =>
    `${this.networkClient.baseUrl}/server/${this.version}`;
  getCurrentUserId = (): Promise<string> =>
    this.networkClient.get(`${this._server()}/currentUser`);

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

  // ------------------------------------------- Code Import -------------------------------------------

  getAvailableCodeImportDescriptions = (): Promise<
    PlainObject<V1_ImportConfigurationDescription>[]
  > => this.networkClient.get(`${this._pure()}/codeImport/availableImports`);

  // ------------------------------------------- Schema Import -------------------------------------------

  getAvailableSchemaImportDescriptions = (): Promise<
    PlainObject<V1_ImportConfigurationDescription>[]
  > => this.networkClient.get(`${this._pure()}/schemaImport/availableImports`);
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
  > =>
    this.networkClient.get(
      `${this._pure()}/codeGeneration/availableGenerations`,
    );
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
  > =>
    this.networkClient.get(
      `${this._pure()}/schemaGeneration/availableGenerations`,
    );

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

  execute = (
    input: PlainObject<V1_ExecuteInput>,
    returnResultAsText?: boolean,
  ): Promise<PlainObject<V1_ExecutionResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.EXECUTE),
      `${this._pure()}/execution/execute`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
      { skipProcessing: Boolean(returnResultAsText) },
    );
  generatePlan = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<PlainObject<V1_ExecutionPlan>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GENERATE_EXECUTION_PLAN),
      `${this._pure()}/execution/generatePlan`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );

  // ------------------------------------------- Store -------------------------------------------

  generateStore = (
    input: PlainObject<V1_ExecuteInput>,
  ): Promise<PlainObject<V1_Store>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GENERATE_EXECUTION_PLAN),
      `${this._store()}/store`,
      input,
    );

  // ------------------------------------------- Service -------------------------------------------

  _service = (server?: string): string =>
    `${server ?? this.networkClient.baseUrl}/service/${this.version}`;
  serverServiceInfo = (): Promise<PlainObject<V1_ServiceConfigurationInfo>> =>
    this.networkClient.get(`${this._server()}/info/services`);
  registerService = (
    graphModelData: PlainObject<V1_PureModelContext>,
    serverUrl: string,
    endingUrl: string,
  ): Promise<PlainObject<V1_ServiceRegistrationResult>> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.REGISTER_SERVICE),
      `${this._service(
        `${window.location.protocol}//${serverUrl}`,
      )}/register${endingUrl}`,
      graphModelData,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );
  getServiceVersionInfo = (
    serverUrl: string,
    serviceId: string,
  ): Promise<PlainObject<V1_ServiceRegistrationResult>> =>
    this.getWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.GET_SERVICE_VERSION),
      `${this._service(
        `${window.location.protocol}//${serverUrl}`,
      )}/id/${serviceId}`,
    );
  activateGenerationId = (
    serverUrl: string,
    generationId: string,
  ): Promise<Response> =>
    this.putWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.ACTIVATE_SERVICE_GENERATION_ID),
      `${this._service(
        `${window.location.protocol}//${serverUrl}`,
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
  ): Promise<PlainObject<V1_ServiceTestResult>[]> =>
    this.postWithTracing(
      this.getTraceData(CORE_ENGINE_TRACER_SPAN.RUN_SERVICE_TESTS),
      `${this._service()}/doTest`,
      model,
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
      `${this._pure()}/execution/testDataGeneration/generateTestData_WithDefaultSeed`,
      input,
      {},
      { Accept: ContentType.TEXT_PLAIN },
      undefined,
      { enableCompression: true },
    );
}
