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
  type LogService,
  type PlainObject,
  type ServerClientConfig,
  LogEvent,
  parseLosslessJSON,
  assertErrorThrown,
  mergeObjects,
  HttpStatus,
  NetworkClientError,
  returnUndefOnError,
  deserializeMap,
  StopWatch,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { RawLambda } from '../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import {
  GenerationMode,
  type GenerationConfigurationDescription,
} from '../../../../../graph-manager/action/generation/GenerationConfigurationDescription.js';
import { TEMPORARY__AbstractEngineConfig } from '../../../../../graph-manager/action/TEMPORARY__AbstractEngineConfig.js';
import { V1_EngineServerClient } from './V1_EngineServerClient.js';
import { V1_PureModelContextData } from '../model/context/V1_PureModelContextData.js';
import {
  type V1_LambdaReturnTypeResult,
  V1_LambdaReturnTypeInput,
} from './compilation/V1_LambdaReturnType.js';
import type { V1_RawLambda } from '../model/rawValueSpecification/V1_RawLambda.js';
import {
  V1_deserializePureModelContextData,
  V1_serializePureModelContext,
} from '../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import { V1_serializeRawValueSpecification } from '../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import { V1_transformRawLambda } from '../transformation/pureGraph/from/V1_RawValueSpecificationTransformer.js';
import { V1_GenerateFileInput } from '../engine/generation/V1_FileGenerationInput.js';
import { V1_GenerationConfigurationDescription } from '../engine/generation/V1_GenerationConfigurationDescription.js';
import { V1_GenerationOutput } from '../engine/generation/V1_GenerationOutput.js';
import { V1_ParserError } from '../engine/grammar/V1_ParserError.js';
import { V1_CompilationError } from '../engine/compilation/V1_CompilationError.js';
import type { V1_RawRelationalOperationElement } from '../model/packageableElements/store/relational/model/V1_RawRelationalOperationElement.js';
import type { RawRelationalOperationElement } from '../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RawRelationalOperationElement.js';
import { V1_GraphTransformerContextBuilder } from '../transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { PureProtocolProcessorPlugin } from '../../PureProtocolProcessorPlugin.js';
import {
  V1_buildCompilationError,
  V1_buildExecutionError,
  V1_buildExternalFormatDescription,
  V1_buildGenerationConfigurationDescription,
  V1_buildParserError,
} from './V1_EngineHelper.js';
import { V1_LightQuery, V1_Query } from './query/V1_Query.js';
import { V1_DatabaseBuilderInput } from './generation/V1_DatabaseBuilderInput.js';
import type { V1_ServiceConfigurationInfo } from './service/V1_ServiceConfiguration.js';
import {
  V1_ExecuteInput,
  V1_TestDataGenerationExecutionInput,
} from './execution/V1_ExecuteInput.js';
import type { V1_ExecutionPlan } from '../model/executionPlan/V1_ExecutionPlan.js';
import { type V1_ExecutionResult } from './execution/V1_ExecutionResult.js';
import { V1_ServiceStorage } from './service/V1_ServiceStorage.js';
import { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult.js';
import type { V1_PureModelContext } from '../model/context/V1_PureModelContext.js';
import { deserialize, serialize } from 'serializr';
import { V1_ExecutionError } from './execution/V1_ExecutionError.js';
import { V1_PureModelContextText } from '../model/context/V1_PureModelContextText.js';
import { V1_QuerySearchSpecification } from './query/V1_QuerySearchSpecification.js';
import type { ExecutionOptions } from '../../../../../graph-manager/AbstractPureGraphManager.js';
import type { ExternalFormatDescription } from '../../../../../graph-manager/action/externalFormat/ExternalFormatDescription.js';
import { V1_ExternalFormatDescription } from './externalFormat/V1_ExternalFormatDescription.js';
import { V1_ExternalFormatModelGenerationInput } from './externalFormat/V1_ExternalFormatModelGeneration.js';
import { GRAPH_MANAGER_EVENT } from '../../../../../__lib__/GraphManagerEvent.js';
import { V1_RunTestsInput } from './test/V1_RunTestsInput.js';
import { V1_RunTestsResult } from './test/V1_RunTestsResult.js';
import { V1_RenderStyle } from './grammar/V1_RenderStyle.js';
import {
  V1_MappingModelCoverageAnalysisInput,
  V1_MappingModelCoverageAnalysisResult,
} from './analytics/V1_MappingModelCoverageAnalysis.js';
import type { ServiceExecutionMode } from '../../../../action/service/ServiceExecutionMode.js';
import type {
  V1_CompilationResult,
  V1_TextCompilationResult,
} from './compilation/V1_CompilationResult.js';
import { V1_CompilationWarning } from './compilation/V1_CompilationWarning.js';
import { V1_GenerateSchemaInput } from './externalFormat/V1_GenerateSchemaInput.js';
import type { GraphManagerOperationReport } from '../../../../GraphManagerStatistics.js';
import {
  V1_StoreEntitlementAnalysisInput,
  type V1_DatasetEntitlementReport,
  type V1_DatasetSpecification,
  V1_surveyDatasetsResultModelSchema,
  V1_checkEntitlementsResultModelSchema,
  type V1_EntitlementReportAnalyticsInput,
  V1_entitlementReportAnalyticsInputModelSchema,
} from './analytics/V1_StoreEntitlementAnalysis.js';
import type { V1_SourceInformation } from '../model/V1_SourceInformation.js';
import { V1_INTERNAL__PackageableElementWithSourceInformation } from '../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import { ELEMENT_PATH_DELIMITER } from '../../../../../graph/MetaModelConst.js';
import { V1_serializeExecutionResult } from './execution/V1_ExecutionHelper.js';
import type { ClassifierPathMapping } from '../../../../action/protocol/ClassifierPathMapping.js';
import { V1_FunctionActivatorInfo } from './functionActivator/V1_FunctionActivatorInfo.js';
import { V1_FunctionActivatorError } from './functionActivator/V1_FunctionActivatorError.js';
import { V1_FunctionActivatorInput } from './functionActivator/V1_FunctionActivatorInput.js';

class V1_EngineConfig extends TEMPORARY__AbstractEngineConfig {
  private engine: V1_Engine;

  override setEnv(val: string | undefined): void {
    super.setEnv(val);
    this.engine.getEngineServerClient().setEnv(val);
  }

  override setCurrentUserId(val: string | undefined): void {
    super.setCurrentUserId(val);
    this.engine.getEngineServerClient().setCurrentUserId(val);
  }

  override setBaseUrl(val: string | undefined): void {
    super.setBaseUrl(val);
    this.engine.getEngineServerClient().setBaseUrl(val);
  }

  override setUseClientRequestPayloadCompression(val: boolean): void {
    super.setUseClientRequestPayloadCompression(val);
    this.engine.getEngineServerClient().setCompression(val);
  }

  constructor(engine: V1_Engine) {
    super();
    this.engine = engine;
    this.baseUrl = this.engine.getEngineServerClient().baseUrl;
  }
}

interface V1_EngineSetupConfig {
  env: string;
  tabSize: number;
  clientConfig: ServerClientConfig;
}

/**
 * This class defines what the engine is capable of.
 * Right now for most engine operations, we make network calls to the engine backend.
 * However, this might change in the future if we ever bring some engine functionalities
 * to Studio. As such, we want to encapsulate engine client within this class.
 */
export class V1_Engine {
  private readonly engineServerClient: V1_EngineServerClient;
  readonly logService: LogService;
  readonly config: V1_EngineConfig;

  constructor(clientConfig: ServerClientConfig, logService: LogService) {
    this.engineServerClient = new V1_EngineServerClient(clientConfig);
    this.config = new V1_EngineConfig(this);
    this.config.setBaseUrl(this.engineServerClient.baseUrl);
    this.config.setUseClientRequestPayloadCompression(
      this.engineServerClient.enableCompression,
    );
    this.logService = logService;
  }

  private serializePureModelContext = (
    graph: V1_PureModelContext,
  ): PlainObject<V1_PureModelContext> => {
    const startTime = Date.now();
    const serializedGraph = V1_serializePureModelContext(graph);
    const logEvent =
      graph instanceof V1_PureModelContextData
        ? GRAPH_MANAGER_EVENT.SERIALIZE_GRAPH_PROTOCOL__SUCCESS
        : GRAPH_MANAGER_EVENT.SERIALIZE_GRAPH_CONTEXT_PROTOCOL__SUCCESS;
    this.logService.info(
      LogEvent.create(logEvent),
      Date.now() - startTime,
      'ms',
    );
    return serializedGraph;
  };

  /**
   * NOTE: ideally, we would not want to leak engine server client like this,
   * since the communication with engine client should only be done in this class
   * alone. However, we need to expose the client for plugins, tests, and dev tool
   * configurations.
   */
  getEngineServerClient(): V1_EngineServerClient {
    return this.engineServerClient;
  }

  getCurrentUserId(): string | undefined {
    return this.engineServerClient.currentUserId;
  }

  async setup(config: V1_EngineSetupConfig): Promise<void> {
    this.config.setEnv(config.env);
    this.config.setTabSize(config.tabSize);
    try {
      this.config.setCurrentUserId(
        await this.engineServerClient.getCurrentUserId(),
      );
    } catch {
      // do nothing
    }
  }

  // ------------------------------------------- Protocol -------------------------------------------

  async getClassifierPathMapping(): Promise<ClassifierPathMapping[]> {
    try {
      return await this.engineServerClient.getClassifierPathMap();
    } catch {
      return [];
    }
  }

  // ------------------------------------------- Grammar -------------------------------------------

  private extractElementSourceInformationIndexFromPureModelContextDataJSON(
    json: PlainObject<V1_PureModelContextData>,
  ): Map<string, V1_SourceInformation> {
    const sourceInformationIndex = new Map<string, V1_SourceInformation>();
    const elements = json.elements;
    if (Array.isArray(elements)) {
      elements.forEach((elementJson) => {
        const element =
          returnUndefOnError(() =>
            V1_INTERNAL__PackageableElementWithSourceInformation.serialization.fromJson(
              elementJson,
            ),
          ) ?? undefined;
        if (element?.sourceInformation) {
          sourceInformationIndex.set(
            `${element.package}${ELEMENT_PATH_DELIMITER}${element.name}`,
            element.sourceInformation,
          );
        }
      });
    }
    return sourceInformationIndex;
  }

  pureModelContextDataToPureCode(
    graph: V1_PureModelContextData,
    pretty: boolean,
  ): Promise<string> {
    return this.engineServerClient.JSONToGrammar_model(
      this.serializePureModelContext(graph),
      pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
    );
  }

  async pureCodeToPureModelContextData(
    code: string,
    options?: {
      sourceInformationIndex?: Map<string, V1_SourceInformation> | undefined;
      onError?: () => void;
    },
  ): Promise<V1_PureModelContextData> {
    const json = await this.pureCodeToPureModelContextDataJSON(code, {
      ...options,
      returnSourceInformation: Boolean(options?.sourceInformationIndex),
    });
    const sourceInformationIndex = options?.sourceInformationIndex;
    if (sourceInformationIndex) {
      sourceInformationIndex.clear();
      this.extractElementSourceInformationIndexFromPureModelContextDataJSON(
        json,
      ).forEach((value, key) => {
        sourceInformationIndex.set(key, value);
      });
    }
    return V1_deserializePureModelContextData(json);
  }

  private async pureCodeToPureModelContextDataJSON(
    code: string,
    options?: { onError?: () => void; returnSourceInformation?: boolean },
  ): Promise<PlainObject<V1_PureModelContextData>> {
    try {
      return await this.engineServerClient.grammarToJSON_model(
        code,
        undefined,
        undefined,
        options?.returnSourceInformation,
      );
    } catch (error) {
      assertErrorThrown(error);
      options?.onError?.();
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

  async transformLambdasToCode(
    input: Map<string, RawLambda>,
    pretty: boolean,
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<Map<string, string>> {
    const lambdas: Record<string, PlainObject<V1_RawLambda>> = {};
    input.forEach((inputLambda, key) => {
      lambdas[key] = V1_serializeRawValueSpecification(
        V1_transformRawLambda(
          inputLambda,
          new V1_GraphTransformerContextBuilder(plugins).build(),
        ),
      );
    });
    return deserializeMap(
      await this.engineServerClient.JSONToGrammar_lambda_batch(
        lambdas,
        pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
      ),
      (v) => v,
    );
  }

  async transformLambdaToCode(
    lambda: RawLambda,
    pretty: boolean,
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<string> {
    return this.engineServerClient.JSONToGrammar_lambda(
      V1_serializeRawValueSpecification(
        V1_transformRawLambda(
          lambda,
          new V1_GraphTransformerContextBuilder(plugins).build(),
        ),
      ),
      pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
    );
  }

  async prettyLambdaContent(lambda: string): Promise<string> {
    return this.engineServerClient.JSONToGrammar_lambda(
      await this.engineServerClient.grammarToJSON_lambda(lambda),
      V1_RenderStyle.PRETTY,
    );
  }

  async transformCodeToLambda(
    code: string,
    lambdaId?: string,
    options?: {
      pruneSourceInformation?: boolean;
    },
  ): Promise<V1_RawLambda> {
    try {
      return (await this.engineServerClient.grammarToJSON_lambda(
        code,
        lambdaId ?? '',
        undefined,
        undefined,
        options?.pruneSourceInformation !== undefined
          ? !options.pruneSourceInformation
          : true,
      )) as unknown as V1_RawLambda;
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

  async transformRelationalOperationElementsToPureCode(
    input: Map<string, RawRelationalOperationElement>,
  ): Promise<Map<string, string>> {
    const operations: Record<
      string,
      PlainObject<V1_RawRelationalOperationElement>
    > = {};
    input.forEach((inputOperation, key) => {
      operations[key] =
        inputOperation as PlainObject<V1_RawRelationalOperationElement>;
    });
    return deserializeMap(
      await this.engineServerClient.JSONToGrammar_relationalOperationElement_batch(
        operations,
        V1_RenderStyle.STANDARD,
      ),
      (v) => v,
    );
  }

  async transformPureCodeToRelationalOperationElement(
    code: string,
    operationId: string,
  ): Promise<V1_RawRelationalOperationElement> {
    try {
      return (await this.engineServerClient.grammarToJSON_relationalOperationElement(
        code,
        operationId,
        undefined,
        undefined,
        true,
      )) as unknown as V1_RawRelationalOperationElement;
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

  // ------------------------------------------- Compile -------------------------------------------

  async compilePureModelContextData(
    model: V1_PureModelContext,
    options?: { onError?: (() => void) | undefined } | undefined,
  ): Promise<V1_CompilationResult> {
    try {
      const compilationResult = await this.engineServerClient.compile(
        this.serializePureModelContext(model),
      );
      return {
        warnings: (
          compilationResult.warnings as
            | PlainObject<V1_CompilationWarning>[]
            | undefined
        )?.map((warning) =>
          V1_CompilationWarning.serialization.fromJson(warning),
        ),
      };
    } catch (error) {
      assertErrorThrown(error);
      options?.onError?.();
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_buildCompilationError(
          V1_CompilationError.serialization.fromJson(
            error.payload as PlainObject<V1_CompilationError>,
          ),
        );
      }
      throw error;
    }
  }

  async compileText(
    graphText: string,
    TEMPORARY__report: GraphManagerOperationReport,
    compileContext?: V1_PureModelContextData,
    options?: { onError?: () => void; getCompilationWarnings?: boolean },
  ): Promise<V1_TextCompilationResult> {
    const mainGraph = await this.pureCodeToPureModelContextDataJSON(graphText, {
      ...options,
      // NOTE: we need to return source information here so we can locate the compilation errors/warnings
      returnSourceInformation: true,
    });
    const pureModelContextDataJson = compileContext
      ? mergeObjects(
          this.serializePureModelContext(compileContext),
          mainGraph,
          false,
        )
      : mainGraph;
    try {
      const stopWatch = new StopWatch();
      const compilationResult = await this.engineServerClient.compile(
        pureModelContextDataJson,
      );
      TEMPORARY__report.timings[
        GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS
      ] = stopWatch.elapsed;

      const model = V1_deserializePureModelContextData(mainGraph);
      return {
        model,
        warnings: (
          compilationResult.warnings as
            | PlainObject<V1_CompilationWarning>[]
            | undefined
        )?.map((warning) =>
          V1_CompilationWarning.serialization.fromJson(warning),
        ),
        sourceInformationIndex:
          this.extractElementSourceInformationIndexFromPureModelContextDataJSON(
            mainGraph,
          ),
      };
    } catch (error) {
      assertErrorThrown(error);
      options?.onError?.();
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_buildCompilationError(
          V1_CompilationError.serialization.fromJson(
            error.payload as PlainObject<V1_CompilationError>,
          ),
        );
      }
      throw error;
    }
  }

  async getLambdaReturnType(
    lambdaReturnInput: V1_LambdaReturnTypeInput,
  ): Promise<string> {
    try {
      return (
        (await this.engineServerClient.lambdaReturnType(
          V1_LambdaReturnTypeInput.serialization.toJson(lambdaReturnInput),
        )) as unknown as V1_LambdaReturnTypeResult
      ).returnType;
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_buildCompilationError(
          V1_CompilationError.serialization.fromJson(
            error.payload as PlainObject<V1_CompilationError>,
          ),
        );
      }
      throw error;
    }
  }

  // --------------------------------------------- Execution ---------------------------------------------

  async executeMapping(
    input: V1_ExecuteInput,
    options?: ExecutionOptions,
  ): Promise<V1_ExecutionResult> {
    try {
      const executionResultInText = await (
        (await this.engineServerClient.execute(
          V1_ExecuteInput.serialization.toJson(input),
          {
            returnResultAsText: true,
            serializationFormat: options?.serializationFormat,
          },
        )) as Response
      ).text();
      const rawExecutionResult = (returnUndefOnError(() =>
        options?.useLosslessParse
          ? parseLosslessJSON(executionResultInText)
          : JSON.parse(executionResultInText),
      ) ?? executionResultInText) as PlainObject<V1_ExecutionResult> | string;
      return V1_serializeExecutionResult(rawExecutionResult);
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof NetworkClientError) {
        throw V1_buildExecutionError(
          V1_ExecutionError.serialization.fromJson(
            error.payload as PlainObject<V1_ExecutionError>,
          ),
        );
      }
      throw error;
    }
  }

  generateExecutionPlan(
    input: V1_ExecuteInput,
  ): Promise<PlainObject<V1_ExecutionPlan>> {
    return this.engineServerClient.generatePlan(
      V1_ExecuteInput.serialization.toJson(input),
    );
  }

  debugExecutionPlanGeneration(
    input: V1_ExecuteInput,
  ): Promise<{ plan: PlainObject<V1_ExecutionPlan>; debug: string[] }> {
    return this.engineServerClient.debugPlanGeneration(
      V1_ExecuteInput.serialization.toJson(input),
    );
  }

  generateExecuteTestData(
    input: V1_TestDataGenerationExecutionInput,
  ): Promise<string> {
    return this.engineServerClient.generateTestDataWithDefaultSeed(
      V1_TestDataGenerationExecutionInput.serialization.toJson(input),
    );
  }

  // --------------------------------------------- Test ---------------------------------------------

  async runTests(input: V1_RunTestsInput): Promise<V1_RunTestsResult> {
    const result = (await this.engineServerClient.runTests(
      V1_RunTestsInput.serialization.toJson(input),
    )) as unknown as PlainObject<V1_RunTestsResult>;
    return V1_RunTestsResult.serialization.fromJson(result);
  }

  // ------------------------------------------- File Generation -------------------------------------------

  async getAvailableGenerationConfigurationDescriptions(): Promise<
    GenerationConfigurationDescription[]
  > {
    const schemaGenerationDescriptions = (
      await this.engineServerClient.getAvailableSchemaGenerationDescriptions()
    ).map((gen) => ({
      ...gen,
      generationMode: GenerationMode.SCHEMA_GENERATION,
    }));
    const codeGenerationDescriptions = (
      await this.engineServerClient.getAvailableCodeGenerationDescriptions()
    ).map((gen) => ({
      ...gen,
      generationMode: GenerationMode.CODE_GENERATION,
    }));
    return [...schemaGenerationDescriptions, ...codeGenerationDescriptions].map(
      (description) =>
        V1_buildGenerationConfigurationDescription(
          V1_GenerationConfigurationDescription.serialization.fromJson(
            description,
          ),
        ),
    );
  }

  async generateFile(
    configs: PlainObject,
    type: string,
    generationMode: GenerationMode,
    model: V1_PureModelContextData,
  ): Promise<V1_GenerationOutput[]> {
    // NOTE: here instead of sending PureModelContextData, we send PureModelContextText so
    // engine can convert that back to PureModelContextData to obtain source information
    // as some generator uses that info. Sending PureModelContextData with source information
    // from the front end to engine would take up a lot of bandwidth.
    const textModel = new V1_PureModelContextText();
    textModel.serializer = model.serializer;
    textModel.code = await this.pureModelContextDataToPureCode(model, false);
    return (
      await this.engineServerClient.generateFile(
        generationMode,
        type,
        V1_GenerateFileInput.serialization.toJson(
          new V1_GenerateFileInput(textModel, configs),
        ),
      )
    ).map((v) => V1_GenerationOutput.serialization.fromJson(v));
  }
  // ------------------------------------------- External Format -----------------------------------------

  async getAvailableExternalFormatsDescriptions(): Promise<
    ExternalFormatDescription[]
  > {
    const externalFormatDescriptions =
      await this.engineServerClient.getAvailableExternalFormatsDescriptions();
    return externalFormatDescriptions.map((des) =>
      V1_buildExternalFormatDescription(
        V1_ExternalFormatDescription.serialization.fromJson(des),
      ),
    );
  }

  async generateModel(
    input: V1_ExternalFormatModelGenerationInput,
  ): Promise<string> {
    const model = (await this.engineServerClient.generateModel(
      V1_ExternalFormatModelGenerationInput.serialization.toJson(input),
    )) as unknown as PlainObject<V1_PureModelContextData>;
    const pureCode = await this.engineServerClient.JSONToGrammar_model(
      model,
      V1_RenderStyle.STANDARD,
    );
    return pureCode;
  }

  async generateSchema(
    input: V1_GenerateSchemaInput,
  ): Promise<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      (await this.engineServerClient.generateSchema(
        V1_GenerateSchemaInput.serialization.toJson(input),
      )) as unknown as PlainObject<V1_PureModelContextData>,
    );
  }

  // ------------------------------------------- Service -------------------------------------------

  async getServerServiceInfo(): Promise<V1_ServiceConfigurationInfo> {
    return (await this.engineServerClient.getServerServiceInfo()) as unknown as V1_ServiceConfigurationInfo;
  }

  async registerService(
    input: V1_PureModelContext,
    server: string,
    executionMode: ServiceExecutionMode,
    TEMPORARY__useStoreModel: boolean,
    TEMPORARY__useGenerateLineage: boolean,
  ): Promise<V1_ServiceRegistrationResult> {
    return V1_ServiceRegistrationResult.serialization.fromJson(
      await this.engineServerClient.registerService(
        V1_serializePureModelContext(input),
        server,
        executionMode,
        TEMPORARY__useStoreModel,
        TEMPORARY__useGenerateLineage,
      ),
    );
  }

  async getServiceVersionInfo(
    serviceUrl: string,
    serviceId: string,
  ): Promise<V1_ServiceStorage> {
    return V1_ServiceStorage.serialization.fromJson(
      await this.engineServerClient.getServiceVersionInfo(
        serviceUrl,
        serviceId,
      ),
    );
  }

  async activateServiceGeneration(
    serviceUrl: string,
    generationId: string,
  ): Promise<void> {
    await this.engineServerClient.activateGenerationId(
      serviceUrl,
      generationId,
    );
  }

  // ------------------------------------------- Query -------------------------------------------

  async searchQueries(
    searchSpecification: V1_QuerySearchSpecification,
  ): Promise<V1_LightQuery[]> {
    return (
      await this.engineServerClient.searchQueries(
        V1_QuerySearchSpecification.serialization.toJson(searchSpecification),
      )
    ).map((v) => V1_LightQuery.serialization.fromJson(v));
  }

  async getQueries(queryIds: string[]): Promise<V1_LightQuery[]> {
    return (await this.engineServerClient.getQueries(queryIds)).map((v) =>
      V1_LightQuery.serialization.fromJson(v),
    );
  }

  async getQuery(queryId: string): Promise<V1_Query> {
    return V1_Query.serialization.fromJson(
      await this.engineServerClient.getQuery(queryId),
    );
  }

  async createQuery(query: V1_Query): Promise<V1_Query> {
    return V1_Query.serialization.fromJson(
      await this.engineServerClient.createQuery(
        V1_Query.serialization.toJson(query),
      ),
    );
  }

  async updateQuery(query: V1_Query): Promise<V1_Query> {
    return V1_Query.serialization.fromJson(
      await this.engineServerClient.updateQuery(
        query.id,
        V1_Query.serialization.toJson(query),
      ),
    );
  }

  async deleteQuery(queryId: string): Promise<V1_Query> {
    return V1_Query.serialization.fromJson(
      await this.engineServerClient.deleteQuery(queryId),
    );
  }

  async cancelUserExecutions(broadcastToCluster: boolean): Promise<string> {
    return this.engineServerClient.INTERNAL__cancelUserExecutions(
      guaranteeNonNullable(this.getCurrentUserId()),
      broadcastToCluster,
    );
  }

  // ------------------------------------------ Analysis ------------------------------------------

  async analyzeMappingModelCoverage(
    input: V1_MappingModelCoverageAnalysisInput,
  ): Promise<V1_MappingModelCoverageAnalysisResult> {
    return deserialize(
      V1_MappingModelCoverageAnalysisResult,
      await this.engineServerClient.analyzeMappingModelCoverage(
        V1_MappingModelCoverageAnalysisInput.serialization.toJson(input),
      ),
    );
  }

  async surveyDatasets(
    input: V1_StoreEntitlementAnalysisInput,
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<V1_DatasetSpecification[]> {
    return deserialize(
      V1_surveyDatasetsResultModelSchema(plugins),
      await this.engineServerClient.surveyDatasets(
        V1_StoreEntitlementAnalysisInput.serialization.toJson(input),
      ),
    ).datasets;
  }

  async checkDatasetEntitlements(
    input: V1_EntitlementReportAnalyticsInput,
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<V1_DatasetEntitlementReport[]> {
    return deserialize(
      V1_checkEntitlementsResultModelSchema(plugins),
      await this.engineServerClient.checkDatasetEntitlements(
        serialize(
          V1_entitlementReportAnalyticsInputModelSchema(plugins),
          input,
        ),
      ),
    ).reports;
  }

  async buildDatabase(
    input: V1_DatabaseBuilderInput,
  ): Promise<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      await this.engineServerClient.buildDatabase(
        serialize(V1_DatabaseBuilderInput, input),
      ),
    );
  }

  // ------------------------------------------- Function -------------------------------------------

  async getAvailableFunctionActivators(): Promise<V1_FunctionActivatorInfo[]> {
    try {
      return (
        await this.engineServerClient.getAvailableFunctionActivators()
      ).map((info) => V1_FunctionActivatorInfo.serialization.fromJson(info));
    } catch {
      return [];
    }
  }

  async validateFunctionActivator(
    input: V1_FunctionActivatorInput,
  ): Promise<void> {
    const errors = await this.engineServerClient.validateFunctionActivator(
      V1_FunctionActivatorInput.serialization.toJson(input),
    );
    if (errors.length) {
      throw new Error(
        `Function activator validation failed:\n${errors
          .map((error) =>
            V1_FunctionActivatorError.serialization.fromJson(error),
          )
          .map((error) => `- ${error.message}`)
          .join('\n')}`,
      );
    }
  }

  async publishFunctionActivatorToSandbox(
    input: V1_FunctionActivatorInput,
  ): Promise<void> {
    const errors =
      await this.engineServerClient.publishFunctionActivatorToSandbox(
        V1_FunctionActivatorInput.serialization.toJson(input),
      );
    if (errors.length) {
      throw new Error(
        `Function activator validation failed:\n${errors
          .map((error) =>
            V1_FunctionActivatorError.serialization.fromJson(error),
          )
          .map((error) => `- ${error.message}`)
          .join('\n')}`,
      );
    }
  }
}
