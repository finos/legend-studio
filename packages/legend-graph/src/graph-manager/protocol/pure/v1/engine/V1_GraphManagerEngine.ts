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
  type Parameters,
  type PlainObject,
  type RequestHeaders,
  type RequestProcessConfig,
  type ResponseProcessConfig,
  type TraceData,
  type TracerService,
} from '@finos/legend-shared';
import type { RawLambda } from '../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import {
  type GenerationMode,
  type GenerationConfigurationDescription,
} from '../../../../action/generation/GenerationConfigurationDescription.js';
import { type V1_GrammarParserBatchInputEntry } from './V1_EngineServerClient.js';
import { type V1_PureModelContextData } from '../model/context/V1_PureModelContextData.js';
import { type V1_LambdaReturnTypeInput } from './compilation/V1_LambdaReturnType.js';
import type { V1_RawLambda } from '../model/rawValueSpecification/V1_RawLambda.js';
import { type V1_GenerationOutput } from './generation/V1_GenerationOutput.js';
import type { V1_RawRelationalOperationElement } from '../model/packageableElements/store/relational/model/V1_RawRelationalOperationElement.js';
import type { RawRelationalOperationElement } from '../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RawRelationalOperationElement.js';
import type { PureProtocolProcessorPlugin } from '../../PureProtocolProcessorPlugin.js';
import { type V1_LightQuery, type V1_Query } from './query/V1_Query.js';
import { type V1_DatabaseBuilderInput } from './generation/V1_DatabaseBuilderInput.js';
import { type V1_ServiceConfigurationInfo } from './service/V1_ServiceConfiguration.js';
import {
  type V1_ExecuteInput,
  type V1_TestDataGenerationExecutionInput,
  type V1_TestDataGenerationExecutionWithSeedInput,
} from './execution/V1_ExecuteInput.js';
import type { V1_ExecutionPlan } from '../model/executionPlan/V1_ExecutionPlan.js';
import { type V1_ExecutionResult } from './execution/V1_ExecutionResult.js';
import { type V1_ServiceStorage } from './service/V1_ServiceStorage.js';
import { type V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult.js';
import type { V1_PureModelContext } from '../model/context/V1_PureModelContext.js';
import { type V1_QuerySearchSpecification } from './query/V1_QuerySearchSpecification.js';
import type {
  ExecutionOptions,
  TEMPORARY__EngineSetupConfig,
} from '../../../../AbstractPureGraphManager.js';
import type { ExternalFormatDescription } from '../../../../action/externalFormat/ExternalFormatDescription.js';
import { type V1_ExternalFormatModelGenerationInput } from './externalFormat/V1_ExternalFormatModelGeneration.js';
import { type V1_RunTestsInput } from './test/V1_RunTestsInput.js';
import { type V1_RunTestsResult } from './test/V1_RunTestsResult.js';
import {
  type V1_MappingModelCoverageAnalysisInput,
  type V1_MappingModelCoverageAnalysisResult,
} from './analytics/V1_MappingModelCoverageAnalysis.js';
import type { ServiceExecutionMode } from '../../../../action/service/ServiceExecutionMode.js';
import type {
  V1_CompilationResult,
  V1_TextCompilationResult,
} from './compilation/V1_CompilationResult.js';
import { type V1_GenerateSchemaInput } from './externalFormat/V1_GenerateSchemaInput.js';
import type { GraphManagerOperationReport } from '../../../../GraphManagerStatistics.js';
import {
  type V1_StoreEntitlementAnalysisInput,
  type V1_DatasetEntitlementReport,
  type V1_DatasetSpecification,
  type V1_EntitlementReportAnalyticsInput,
} from './analytics/V1_StoreEntitlementAnalysis.js';
import type { V1_SourceInformation } from '../model/V1_SourceInformation.js';
import type {
  ClassifierPathMapping,
  SubtypeInfo,
} from '../../../../action/protocol/ProtocolInfo.js';
import { type V1_FunctionActivatorInfo } from './functionActivator/V1_FunctionActivatorInfo.js';
import { type V1_FunctionActivatorInput } from './functionActivator/V1_FunctionActivatorInput.js';
import { type V1_RawSQLExecuteInput } from './execution/V1_RawSQLExecuteInput.js';
import type { V1_ValueSpecification } from '../model/valueSpecification/V1_ValueSpecification.js';
import {
  type V1_ArtifactGenerationExtensionOutput,
  type V1_ArtifactGenerationExtensionInput,
} from './generation/V1_ArtifactGenerationExtensionApi.js';
import { type V1_DatabaseToModelGenerationInput } from './relational/V1_DatabaseToModelGenerationInput.js';
import { type V1_TestDataGenerationInput } from './service/V1_TestDataGenerationInput.js';
import { type V1_TestDataGenerationResult } from './service/V1_TestDataGenerationResult.js';
import { type V1_RelationalConnectionBuilder } from './relational/V1_RelationalConnectionBuilder.js';
import type { PostValidationAssertionResult } from '../../../../../DSL_Service_Exports.js';
import { type V1_DebugTestsResult } from './test/V1_DebugTestsResult.js';
import type { TEMPORARY__AbstractEngineConfig } from '../../../../action/TEMPORARY__AbstractEngineConfig.js';

export interface V1_GraphManagerEngine {
  config: TEMPORARY__AbstractEngineConfig;

  setup: (config: TEMPORARY__EngineSetupConfig) => Promise<void>;

  // ----------------------------------------- Server Client ----------------------------------------
  /**
   * NOTE: ideally, we would not want to leak engine server client like this,
   * since the communication with engine client should only be done in this class
   * alone. However, we need to expose the client for plugins, tests, and dev tool
   * configurations.
   */
  getCurrentUserId: () => string | undefined;
  serverClientGetBaseUrl: () => string | undefined;
  serverClientGetPureBaseUrl: () => string;
  serverClientGetTraceData: (
    name: string,
    tracingTags?: PlainObject,
  ) => TraceData;
  serverClientSetBaseUrl: (val: string | undefined) => void;
  serverClientSetBaseUrlForServiceRegistration: (
    val: string | undefined,
  ) => void;
  serverClientSetCurrentUserId: (val: string | undefined) => void;
  serverClientSetEnableDebuggingPayload: (val: boolean) => void;
  serverClientSetEnv: (val: string | undefined) => void;
  serverClientSetTracerService: (tracerService: TracerService) => void;
  serverClientSetUseClientRequestPayloadCompression: (val: boolean) => void;
  serverClientCreatePrototypeProject: () => Promise<{
    projectId: string;
    webUrl: string | undefined;
    owner: string;
  }>;
  serverClientPostWithTracing: <T>(
    traceData: TraceData,
    url: string,
    data: unknown,
    options: RequestInit,
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ) => Promise<T>;
  serverClientValidUserAccessRole: (userId: string) => Promise<boolean>;

  // ------------------------------------------- Protocol -------------------------------------------

  getClassifierPathMapping: () => Promise<ClassifierPathMapping[]>;

  getSubtypeInfo: () => Promise<SubtypeInfo>;

  // ------------------------------------------- Grammar -------------------------------------------

  pureModelContextDataToPureCode: (
    graph: V1_PureModelContextData,
    pretty: boolean,
  ) => Promise<string>;

  pureCodeToPureModelContextData: (
    code: string,
    options?: {
      sourceInformationIndex?: Map<string, V1_SourceInformation> | undefined;
      onError?: () => void;
    },
  ) => Promise<V1_PureModelContextData>;

  transformLambdasToCode: (
    input: Map<string, RawLambda>,
    pretty: boolean,
    plugins: PureProtocolProcessorPlugin[],
  ) => Promise<Map<string, string>>;

  transformValueSpecsToCode: (
    input: Record<string, PlainObject<V1_ValueSpecification>>,
    pretty: boolean,
  ) => Promise<Map<string, string>>;

  transformValueSpecToCode: (
    input: PlainObject<V1_ValueSpecification>,
    pretty: boolean,
  ) => Promise<string>;

  transformCodeToValueSpeces: (
    input: Record<string, V1_GrammarParserBatchInputEntry>,
  ) => Promise<Map<string, PlainObject>>;

  transformCodeToValueSpec: (
    input: string,
  ) => Promise<PlainObject<V1_ValueSpecification>>;

  transformLambdaToCode: (
    lambda: RawLambda,
    pretty: boolean,
    plugins: PureProtocolProcessorPlugin[],
  ) => Promise<string>;

  prettyLambdaContent: (lambda: string) => Promise<string>;

  transformCodeToLambda: (
    code: string,
    lambdaId?: string,
    options?: {
      pruneSourceInformation?: boolean;
    },
  ) => Promise<V1_RawLambda>;

  transformRelationalOperationElementsToPureCode: (
    input: Map<string, RawRelationalOperationElement>,
  ) => Promise<Map<string, string>>;

  transformPureCodeToRelationalOperationElement: (
    code: string,
    operationId: string,
  ) => Promise<V1_RawRelationalOperationElement>;

  // ------------------------------------------- Compile -------------------------------------------

  compilePureModelContextData: (
    model: V1_PureModelContext,
    options?: { onError?: (() => void) | undefined } | undefined,
  ) => Promise<V1_CompilationResult>;

  compileText: (
    graphText: string,
    TEMPORARY__report: GraphManagerOperationReport,
    compileContext?: V1_PureModelContextData,
    options?: { onError?: () => void; getCompilationWarnings?: boolean },
  ) => Promise<V1_TextCompilationResult>;

  getLambdaReturnType: (
    lambdaReturnInput: V1_LambdaReturnTypeInput,
  ) => Promise<string>;

  getLambdaReturnTypeFromRawInput: (
    rawInput: PlainObject<V1_LambdaReturnTypeInput>,
  ) => Promise<string>;

  // --------------------------------------------- Execution ---------------------------------------------

  runQuery: (
    input: V1_ExecuteInput,
    options?: ExecutionOptions,
  ) => Promise<{
    executionResult: V1_ExecutionResult;
    executionTraceId?: string;
  }>;

  exportData: (
    input: V1_ExecuteInput,
    options?: ExecutionOptions,
  ) => Promise<Response>;

  runQueryAndReturnMap: (
    input: V1_ExecuteInput,
    options?: ExecutionOptions,
  ) => Promise<Map<string, string>>;

  parseExecutionResults: (
    executionResultTxt: string,
    options: ExecutionOptions | undefined,
  ) => PlainObject<V1_ExecutionResult>;

  generateExecutionPlan: (
    input: V1_ExecuteInput,
  ) => Promise<PlainObject<V1_ExecutionPlan>>;

  debugExecutionPlanGeneration: (
    input: V1_ExecuteInput,
  ) => Promise<{ plan: PlainObject<V1_ExecutionPlan>; debug: string[] }>;

  generateExecuteTestData: (
    input: V1_TestDataGenerationExecutionInput,
  ) => Promise<string>;

  generateExecuteTestDataWithSeedData: (
    input: V1_TestDataGenerationExecutionWithSeedInput,
  ) => Promise<string>;

  // --------------------------------------------- Test ---------------------------------------------

  runTests: (input: V1_RunTestsInput) => Promise<V1_RunTestsResult>;

  debugTests: (input: V1_RunTestsInput) => Promise<V1_DebugTestsResult>;

  // -------------------------------------------  Generation -------------------------------------------

  generateArtifacts: (
    input: V1_ArtifactGenerationExtensionInput,
  ) => Promise<V1_ArtifactGenerationExtensionOutput>;

  // --------------------------------------------- Test Data Generation ---------------------------------------------

  generateTestData: (
    input: V1_TestDataGenerationInput,
    plugins: PureProtocolProcessorPlugin[],
  ) => Promise<V1_TestDataGenerationResult>;

  // ------------------------------------------- File Generation -------------------------------------------

  getAvailableGenerationConfigurationDescriptions: () => Promise<
    GenerationConfigurationDescription[]
  >;

  generateFile: (
    configs: PlainObject,
    type: string,
    generationMode: GenerationMode,
    model: V1_PureModelContextData,
  ) => Promise<V1_GenerationOutput[]>;

  // ------------------------------------------- External Format -----------------------------------------

  getAvailableExternalFormatsDescriptions: () => Promise<
    ExternalFormatDescription[]
  >;

  generateModel: (
    input: V1_ExternalFormatModelGenerationInput,
  ) => Promise<string>;

  generateSchema: (
    input: V1_GenerateSchemaInput,
  ) => Promise<V1_PureModelContextData>;

  // ------------------------------------------- Service -------------------------------------------

  getServerServiceInfo: () => Promise<V1_ServiceConfigurationInfo>;

  registerService: (
    input: V1_PureModelContext,
    server: string,
    executionMode: ServiceExecutionMode,
    TEMPORARY__useStoreModel: boolean,
    TEMPORARY__useGenerateLineage: boolean,
    TEMPORARY__useGenerateOpenApi: boolean,
  ) => Promise<V1_ServiceRegistrationResult>;

  getServiceVersionInfo: (
    serviceUrl: string,
    serviceId: string,
  ) => Promise<V1_ServiceStorage>;

  activateServiceGeneration: (
    serviceUrl: string,
    generationId: string,
  ) => Promise<void>;

  runServicePostVal: (
    servicePath: string,
    input: V1_PureModelContext,
    assertionId: string,
  ) => Promise<PostValidationAssertionResult>;

  // ------------------------------------------- Query -------------------------------------------

  searchQueries: (
    searchSpecification: V1_QuerySearchSpecification,
  ) => Promise<V1_LightQuery[]>;

  getQueries: (queryIds: string[]) => Promise<V1_LightQuery[]>;

  getQuery: (queryId: string) => Promise<V1_Query>;

  createQuery: (query: V1_Query) => Promise<V1_Query>;

  updateQuery: (query: V1_Query) => Promise<V1_Query>;

  patchQuery: (query: Partial<V1_Query>) => Promise<V1_Query>;

  deleteQuery: (queryId: string) => Promise<void>;

  cancelUserExecutions: (broadcastToCluster: boolean) => Promise<string>;

  // ------------------------------------------ Analysis ------------------------------------------

  analyzeMappingModelCoverage: (
    input: V1_MappingModelCoverageAnalysisInput,
  ) => Promise<V1_MappingModelCoverageAnalysisResult>;

  surveyDatasets: (
    input: V1_StoreEntitlementAnalysisInput,
    plugins: PureProtocolProcessorPlugin[],
  ) => Promise<V1_DatasetSpecification[]>;

  checkDatasetEntitlements: (
    input: V1_EntitlementReportAnalyticsInput,
    plugins: PureProtocolProcessorPlugin[],
  ) => Promise<V1_DatasetEntitlementReport[]>;

  buildDatabase: (
    input: V1_DatabaseBuilderInput,
    plugins: PureProtocolProcessorPlugin[],
  ) => Promise<V1_PureModelContextData>;

  executeRawSQL: (
    input: V1_RawSQLExecuteInput,
    plugins: PureProtocolProcessorPlugin[],
  ) => Promise<string>;

  // ------------------------------------------- Function -------------------------------------------

  getAvailableFunctionActivators: () => Promise<V1_FunctionActivatorInfo[]>;

  validateFunctionActivator: (
    input: V1_FunctionActivatorInput,
  ) => Promise<void>;

  publishFunctionActivatorToSandbox: (
    input: V1_FunctionActivatorInput,
  ) => Promise<void>;

  // ------------------------------------------- Relational -------------------------------------------

  generateModelsFromDatabaseSpecification: (
    input: V1_DatabaseToModelGenerationInput,
  ) => Promise<V1_PureModelContextData>;

  getAvailableRelationalDatabaseTypeConfigurations: () => Promise<
    V1_RelationalConnectionBuilder[]
  >;
}
