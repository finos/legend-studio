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
import { type EXECUTION_SERIALIZATION_FORMAT } from '../../../../../graph-manager/action/execution/ExecutionResult.js';
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
import { type ServiceExecutionMode } from '../../../../action/service/ServiceExecutionMode.js';
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
import type { V1_DeploymentResult } from './functionActivator/V1_DeploymentResult.js';
import type { V1_DebugTestsResult } from './test/V1_DebugTestsResult.js';

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

export interface V1_EngineServerClient {
  baseUrl?: string | undefined;
  currentUserId?: string | undefined;
  enableCompression: boolean;

  // ------------------------------------------- Helper -------------------------------------------
  setEnv: (value: string | undefined) => void;
  setCurrentUserId: (value: string | undefined) => void;
  setBaseUrl: (val: string | undefined) => void;
  setBaseUrlForServiceRegistration: (val: string | undefined) => void;
  setCompression: (val: boolean) => void;
  setDebugPayload: (val: boolean) => void;
  setTracerService: (val: TracerService) => void;

  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  postWithTracing: <T>(
    traceData: TraceData,
    url: string,
    data: unknown,
    options: RequestInit,
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ) => Promise<T>;

  // ------------------------------------------- Server -------------------------------------------

  getCurrentUserId: () => Promise<string>;

  // ------------------------------------------- Lambda -------------------------------------------

  getLambdaPrefixes: () => Promise<PlainObject<V1_LambdaPrefix>[]>;

  // ------------------------------------------- Protocol -------------------------------------------

  getClassifierPathMap: () => Promise<ClassifierPathMapping[]>;
  getSubtypeInfo: () => Promise<SubtypeInfo>;

  // ------------------------------------------- SDLC -------------------------------------------

  createPrototypeProject: () => Promise<{
    projectId: string;
    webUrl: string | undefined;
    owner: string;
  }>;
  validUserAccessRole: (userId: string) => Promise<boolean>;

  // ------------------------------------------- Grammar -------------------------------------------

  grammarToJSON_model: (
    input: string,
    sourceId?: string,
    lineOffset?: number,
    returnSourceInformation?: boolean,
  ) => Promise<PlainObject<V1_PureModelContextData>>;
  grammarToJSON_lambda: (
    input: string,
    sourceId?: string,
    lineOffset?: number,
    columnOffset?: number,
    returnSourceInformation?: boolean,
  ) => Promise<PlainObject<V1_RawLambda>>;
  grammarToJSON_lambda_batch: (
    input: Record<string, V1_GrammarParserBatchInputEntry>,
  ) => Promise<{
    errors?: Record<string, PlainObject<V1_ParserError>> | undefined;
    result?: Record<string, PlainObject<V1_RawLambda>> | undefined;
  }>;
  grammarToJSON_valueSpecification_batch: (
    input: Record<string, V1_GrammarParserBatchInputEntry>,
  ) => Promise<{
    errors?: Record<string, PlainObject<V1_ParserError>> | undefined;
    result?: Record<string, PlainObject<V1_ValueSpecification>> | undefined;
  }>;
  grammarToJSON_valueSpecification: (
    input: string,
  ) => Promise<PlainObject<V1_ValueSpecification>>;
  grammarToJSON_relationalOperationElement: (
    input: string,
    sourceId?: string,
    lineOffset?: number,
    columnOffset?: number,
    returnSourceInformation?: boolean,
  ) => Promise<PlainObject<V1_RawRelationalOperationElement>>;
  grammarToJSON_relationalOperationElement_batch: (
    input: Record<string, V1_GrammarParserBatchInputEntry>,
  ) => Promise<{
    errors?: Record<string, PlainObject<V1_ParserError>> | undefined;
    result?:
      | Record<string, PlainObject<V1_RawRelationalOperationElement>>
      | undefined;
  }>;
  JSONToGrammar_model: (
    input: PlainObject<V1_PureModelContextData>,
    renderStyle?: V1_RenderStyle,
  ) => Promise<string>;
  JSONToGrammar_lambda: (
    input: PlainObject<V1_RawLambda>,
    renderStyle?: V1_RenderStyle,
  ) => Promise<string>;
  JSONToGrammar_lambda_batch: (
    input: Record<string, PlainObject<V1_RawLambda>>,
    renderStyle?: V1_RenderStyle,
  ) => Promise<Record<string, string>>;
  JSONToGrammar_valueSpecification_batch: (
    input: Record<string, PlainObject<V1_ValueSpecification>>,
    renderStyle?: V1_RenderStyle,
  ) => Promise<Record<string, string>>;
  JSONToGrammar_valueSpecification: (
    input: PlainObject<V1_ValueSpecification>,
    renderStyle?: V1_RenderStyle,
  ) => Promise<string>;
  JSONToGrammar_relationalOperationElement: (
    input: PlainObject<V1_RawRelationalOperationElement>,
    renderStyle?: V1_RenderStyle,
  ) => Promise<string>;
  JSONToGrammar_relationalOperationElement_batch: (
    input: Record<string, PlainObject<V1_RawRelationalOperationElement>>,
    renderStyle?: V1_RenderStyle,
  ) => Promise<Record<string, string>>;

  // ------------------------------------------- Test ---------------------------------------

  runTests: (
    input: PlainObject<V1_RunTestsInput>,
  ) => Promise<PlainObject<V1_RunTestsResult>>;
  debugTests: (
    input: PlainObject<V1_RunTestsInput>,
  ) => Promise<PlainObject<V1_DebugTestsResult>>;

  // ------------------------------------------- External Format ---------------------------------------

  getAvailableExternalFormatsDescriptions: () => Promise<
    PlainObject<V1_ExternalFormatDescription>[]
  >;
  generateModel: (
    input: PlainObject<V1_ExternalFormatModelGenerationInput>,
  ) => Promise<PlainObject<V1_PureModelContextData>[]>;
  generateSchema: (
    input: PlainObject<V1_GenerateSchemaInput>,
  ) => Promise<PlainObject<V1_PureModelContextData>[]>;

  // ------------------------------------------- Code Import -------------------------------------------

  getAvailableCodeImportDescriptions: () => Promise<
    PlainObject<V1_ImportConfigurationDescription>[]
  >;

  // ------------------------------------------- Schema Import -------------------------------------------

  getAvailableSchemaImportDescriptions: () => Promise<
    PlainObject<V1_ImportConfigurationDescription>[]
  >;

  // ------------------------------------------- Code Generation -------------------------------------------

  getAvailableCodeGenerationDescriptions: () => Promise<
    PlainObject<V1_GenerationConfigurationDescription>[]
  >;
  generateFile: (
    mode: GenerationMode,
    type: string,
    input: PlainObject<V1_GenerateFileInput>,
  ) => Promise<PlainObject<V1_GenerationOutput>[]>;
  generateAritfacts: (
    input: PlainObject<V1_ArtifactGenerationExtensionInput>,
  ) => Promise<PlainObject<V1_ArtifactGenerationExtensionOutput>>;

  // ------------------------------------------- Schema Generation -------------------------------------------

  getAvailableSchemaGenerationDescriptions: () => Promise<
    PlainObject<V1_GenerationConfigurationDescription>[]
  >;

  // --------------------------------------------- Test Data Generation ---------------------------------------------

  generateTestData: (
    input: PlainObject<V1_TestDataGenerationInput>,
  ) => Promise<PlainObject<V1_TestDataGenerationResult>>;

  // ------------------------------------------- Compile -------------------------------------------

  compile: (
    input: PlainObject<V1_PureModelContext>,
  ) => Promise<PlainObject<V1_CompileResult>>;
  lambdaReturnType: (
    input: PlainObject<V1_LambdaReturnTypeInput>,
  ) => Promise<PlainObject<V1_LambdaReturnTypeResult>>;

  // ------------------------------------------- Execute -------------------------------------------

  runQuery: (
    input: PlainObject<V1_ExecuteInput>,
    options?: {
      returnAsResponse?: boolean;
      serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
      abortController?: AbortController | undefined;
    },
  ) => Promise<PlainObject<V1_ExecutionResult> | Response>;
  generatePlan: (
    input: PlainObject<V1_ExecuteInput>,
  ) => Promise<PlainObject<V1_ExecutionPlan>>;
  debugPlanGeneration: (
    input: PlainObject<V1_ExecuteInput>,
  ) => Promise<{ plan: PlainObject<V1_ExecutionPlan>; debug: string[] }>;
  generateTestDataWithDefaultSeed: (
    input: PlainObject<V1_ExecuteInput>,
  ) => Promise<string>;
  generateTestDataWithSeed: (
    input: PlainObject<V1_ExecuteInput>,
  ) => Promise<string>;

  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  INTERNAL__cancelUserExecutions: (
    userID: string,
    broadcastToCluster: boolean,
  ) => Promise<string>;
  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  getTraceData: (name: string, tracingTags?: PlainObject) => TraceData;
  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  _pure: () => string;

  // ------------------------------------------- Query -------------------------------------------

  searchQueries: (
    searchSpecification: PlainObject<V1_QuerySearchSpecification>,
  ) => Promise<PlainObject<V1_LightQuery>[]>;
  getQueries: (queryIds: string[]) => Promise<PlainObject<V1_LightQuery>[]>;
  getQuery: (queryId: string) => Promise<PlainObject<V1_Query>>;
  createQuery: (query: PlainObject<V1_Query>) => Promise<PlainObject<V1_Query>>;
  updateQuery: (
    queryId: string,
    query: PlainObject<V1_Query>,
  ) => Promise<PlainObject<V1_Query>>;
  patchQuery: (
    queryId: string,
    query: PlainObject<Partial<V1_Query>>,
  ) => Promise<PlainObject<V1_Query>>;
  deleteQuery: (queryId: string) => Promise<PlainObject<V1_Query>>;

  // --------------------------------------- Analysis ---------------------------------------

  analyzeMappingModelCoverage: (
    input: PlainObject<V1_MappingModelCoverageAnalysisInput>,
  ) => Promise<PlainObject<V1_MappingModelCoverageAnalysisResult>>;
  surveyDatasets: (
    input: PlainObject<V1_StoreEntitlementAnalysisInput>,
  ) => Promise<PlainObject<V1_SurveyDatasetsResult>>;
  checkDatasetEntitlements: (
    input: PlainObject<V1_EntitlementReportAnalyticsInput>,
  ) => Promise<PlainObject<V1_CheckEntitlementsResult>>;
  buildDatabase: (
    input: PlainObject<V1_DatabaseBuilderInput>,
  ) => Promise<PlainObject<V1_PureModelContextData>>;

  // ------------------------------------------- Function ---------------------------------------

  executeRawSQL: (input: PlainObject<V1_RawSQLExecuteInput>) => Promise<string>;
  getAvailableFunctionActivators: () => Promise<
    PlainObject<V1_FunctionActivatorInfo>[]
  >;
  validateFunctionActivator: (
    input: PlainObject<V1_FunctionActivatorInput>,
  ) => Promise<PlainObject<V1_FunctionActivatorError>[]>;
  publishFunctionActivatorToSandbox: (
    input: PlainObject<V1_FunctionActivatorInput>,
  ) => Promise<PlainObject<V1_DeploymentResult>>;

  // ------------------------------------------- Relational ---------------------------------------

  generateModelsFromDatabaseSpecification: (
    input: PlainObject<V1_DatabaseToModelGenerationInput>,
  ) => Promise<PlainObject<V1_PureModelContextData>>;
  getAvailableRelationalDatabaseTypeConfigurations: () => Promise<
    PlainObject<V1_RelationalConnectionBuilder>[]
  >;

  // ------------------------------------------- Service -------------------------------------------

  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  TEMPORARY__getServerServiceInfo: () => Promise<
    PlainObject<V1_ServiceConfigurationInfo>
  >;
  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  TEMPORARY__getServiceVersionInfo: (
    serviceServerUrl: string,
    serviceId: string,
  ) => Promise<PlainObject<V1_ServiceStorage>>;
  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  TEMPORARY__activateGenerationId: (
    serviceServerUrl: string,
    generationId: string,
  ) => Promise<Response>;
  runServicePostVal: (
    servicePath: string,
    input: PlainObject,
    assertionId: string,
  ) => Promise<PlainObject>;
  /**
   * TODO: this is an internal API that should be refactored out using extension mechanism
   */
  INTERNAL__registerService: (
    input: PlainObject<V1_PureModelContext>,
    serviceServerUrl: string,
    serviceExecutionMode: ServiceExecutionMode,
    TEMPORARY__useStoreModel: boolean,
    TEMPORARY__useGenerateLineage: boolean,
    TEMPORARY__useGenerateOpenApi: boolean,
  ) => Promise<PlainObject<V1_ServiceRegistrationResult>>;
}
