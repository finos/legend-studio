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
  isLossSafeNumber,
} from '@finos/legend-shared';
import type { RawLambda } from '../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import {
  GenerationMode,
  type GenerationConfigurationDescription,
} from '../../../../action/generation/GenerationConfigurationDescription.js';
import { TEMPORARY__AbstractEngineConfig } from '../../../../action/TEMPORARY__AbstractEngineConfig.js';
import {
  V1_EngineServerClient,
  type V1_GrammarParserBatchInputEntry,
} from './V1_EngineServerClient.js';
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
import { V1_GenerateFileInput } from './generation/V1_FileGenerationInput.js';
import { V1_GenerationConfigurationDescription } from './generation/V1_GenerationConfigurationDescription.js';
import { V1_GenerationOutput } from './generation/V1_GenerationOutput.js';
import { V1_ParserError } from './grammar/V1_ParserError.js';
import { V1_CompilationError } from './compilation/V1_CompilationError.js';
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
import {
  type V1_DatabaseBuilderInput,
  V1_serializeDatabaseBuilderInput,
} from './generation/V1_DatabaseBuilderInput.js';
import { type V1_ServiceConfigurationInfo } from './service/V1_ServiceConfiguration.js';
import {
  V1_ExecuteInput,
  V1_TestDataGenerationExecutionInput,
  V1_TestDataGenerationExecutionWithSeedInput,
} from './execution/V1_ExecuteInput.js';
import type { V1_ExecutionPlan } from '../model/executionPlan/V1_ExecutionPlan.js';
import {
  V1_EXECUTION_RESULT,
  V1_ZIPKIN_TRACE_HEADER,
  type V1_ExecutionResult,
} from './execution/V1_ExecutionResult.js';
import { V1_ServiceStorage } from './service/V1_ServiceStorage.js';
import { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult.js';
import type { V1_PureModelContext } from '../model/context/V1_PureModelContext.js';
import { deserialize, serialize } from 'serializr';
import { V1_ExecutionError } from './execution/V1_ExecutionError.js';
import { V1_PureModelContextText } from '../model/context/V1_PureModelContextText.js';
import { V1_QuerySearchSpecification } from './query/V1_QuerySearchSpecification.js';
import type {
  ExecutionOptions,
  TEMPORARY__EngineSetupConfig,
} from '../../../../AbstractPureGraphManager.js';
import type { ExternalFormatDescription } from '../../../../action/externalFormat/ExternalFormatDescription.js';
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
import { V1_deserializeExecutionResult } from './execution/V1_ExecutionHelper.js';
import type {
  ClassifierPathMapping,
  SubtypeInfo,
} from '../../../../action/protocol/ProtocolInfo.js';
import { V1_FunctionActivatorInfo } from './functionActivator/V1_FunctionActivatorInfo.js';
import { V1_FunctionActivatorError } from './functionActivator/V1_FunctionActivatorError.js';
import { V1_FunctionActivatorInput } from './functionActivator/V1_FunctionActivatorInput.js';
import {
  V1_serializeRawSQLExecuteInput,
  type V1_RawSQLExecuteInput,
} from './execution/V1_RawSQLExecuteInput.js';
import type { V1_ValueSpecification } from '../model/valueSpecification/V1_ValueSpecification.js';
import {
  V1_ArtifactGenerationExtensionOutput,
  V1_ArtifactGenerationExtensionInput,
} from './generation/V1_ArtifactGenerationExtensionApi.js';
import { V1_DatabaseToModelGenerationInput } from './relational/V1_DatabaseToModelGenerationInput.js';
import { V1_TestDataGenerationInput } from './service/V1_TestDataGenerationInput.js';
import {
  type V1_TestDataGenerationResult,
  V1_testDataGenerationResultModelSchema,
} from './service/V1_TestDataGenerationResult.js';
import { V1_RelationalConnectionBuilder } from './relational/V1_RelationalConnectionBuilder.js';
import type { PostValidationAssertionResult } from '../../../../../DSL_Service_Exports.js';
import { V1_DebugTestsResult } from './test/V1_DebugTestsResult.js';
import type { V1_GraphManagerEngine } from './V1_GraphManagerEngine.js';
import { type V1_RelationType } from '../model/packageableElements/type/V1_RelationType.js';
import {
  RelationTypeColumnMetadata,
  RelationTypeMetadata,
} from '../../../../action/relation/RelationTypeMetadata.js';
import { V1_CompleteCodeInput } from './compilation/V1_CompleteCodeInput.js';
import { CodeCompletionResult } from '../../../../action/compilation/Completion.js';
import { DeploymentResult } from '../../../../action/DeploymentResult.js';
import {
  LightPersistentDataCube,
  PersistentDataCube,
} from '../../../../action/query/PersistentDataCube.js';
import { V1_getGenericTypeFullPath } from '../helpers/V1_DomainHelper.js';
import { V1_relationTypeModelSchema } from '../transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.js';
import type {
  V1_RawLineageModel,
  V1_LineageInput,
} from '../model/lineage/V1_Lineage.js';

class V1_RemoteEngineConfig extends TEMPORARY__AbstractEngineConfig {
  private engine: V1_RemoteEngine;

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

  override setBaseUrlForServiceRegistration(val: string | undefined): void {
    super.setBaseUrlForServiceRegistration(val);
    this.engine.getEngineServerClient().setBaseUrlForServiceRegistration(val);
  }

  override setUseClientRequestPayloadCompression(val: boolean): void {
    super.setUseClientRequestPayloadCompression(val);
    this.engine.getEngineServerClient().setCompression(val);
  }

  override setEnableDebuggingPayload(val: boolean): void {
    super.setEnableDebuggingPayload(val);
    this.engine.getEngineServerClient().setDebugPayload(val);
  }

  constructor(engine: V1_RemoteEngine) {
    super();
    this.engine = engine;
    this.baseUrl = this.engine.getEngineServerClient().baseUrl;
  }
}

interface V1_RemoteEngineSetupConfig extends TEMPORARY__EngineSetupConfig {
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
export class V1_RemoteEngine implements V1_GraphManagerEngine {
  private readonly engineServerClient: V1_EngineServerClient;
  readonly logService: LogService;
  readonly config: V1_RemoteEngineConfig;

  constructor(clientConfig: ServerClientConfig, logService: LogService) {
    this.engineServerClient = new V1_EngineServerClient(clientConfig);
    this.config = new V1_RemoteEngineConfig(this);
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

  async setup(config: V1_RemoteEngineSetupConfig): Promise<void> {
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

  // ----------------------------------------- Server Client ----------------------------------------
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

  // ------------------------------------------- Protocol -------------------------------------------

  async getClassifierPathMapping(): Promise<ClassifierPathMapping[]> {
    try {
      return await this.engineServerClient.getClassifierPathMap();
    } catch {
      return [];
    }
  }

  async getSubtypeInfo(): Promise<SubtypeInfo> {
    try {
      return await this.engineServerClient.getSubtypeInfo();
    } catch {
      // NOTE: this is temporary until we have this API functional and released
      // See https://github.com/finos/legend-engine/pull/1858
      return {
        functionActivatorSubtypes: ['snowflakeM2MUdf', 'snowflakeApp'],
        storeSubtypes: [
          'MongoDatabase',
          'serviceStore',
          'relational',
          'binding',
        ],
      };
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

  transformPureModelContextDataToCode(
    graph: V1_PureModelContextData,
    pretty: boolean,
  ): Promise<string> {
    return this.engineServerClient.JSONToGrammar_model(
      this.serializePureModelContext(graph),
      pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
    );
  }

  async transformCodeToPureModelContextData(
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

  async transformValueSpecificationsToCode(
    input: Record<string, PlainObject<V1_ValueSpecification>>,
    pretty: boolean,
  ): Promise<Map<string, string>> {
    return deserializeMap(
      await this.engineServerClient.JSONToGrammar_valueSpecification_batch(
        input,
        pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
      ),
      (v) => v,
    );
  }

  async transformValueSpecificationToCode(
    input: PlainObject<V1_ValueSpecification>,
    pretty: boolean,
  ): Promise<string> {
    const code = await this.engineServerClient.JSONToGrammar_valueSpecification(
      input,
      pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
    );
    return code;
  }

  async transformCodeToValueSpecifications(
    input: Record<string, V1_GrammarParserBatchInputEntry>,
  ): Promise<Map<string, PlainObject>> {
    const batchResults =
      await this.engineServerClient.grammarToJSON_valueSpecification_batch(
        input,
      );
    const finalResults = new Map<string, PlainObject>();
    const results = batchResults.result;
    if (results) {
      Object.entries(results).forEach(([k, v]) => {
        finalResults.set(k, v);
      });
    }
    return finalResults;
  }

  async transformCodeToValueSpecification(
    input: string,
    returnSourceInformation?: boolean,
  ): Promise<PlainObject<V1_ValueSpecification>> {
    try {
      const batchResults =
        await this.engineServerClient.grammarToJSON_valueSpecification(
          input,
          undefined,
          undefined,
          undefined,
          returnSourceInformation,
        );
      return batchResults;
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
  async combineTextAndPMCD(
    graphText: string,
    compileContext: V1_PureModelContextData,
  ): Promise<V1_PureModelContextData> {
    const mainGraph = await this.pureCodeToPureModelContextDataJSON(graphText, {
      returnSourceInformation: false,
    });
    return V1_deserializePureModelContextData(
      mergeObjects(
        this.serializePureModelContext(compileContext),
        mainGraph,
        false,
      ),
    );
  }

  async getLambdaReturnType(
    lambdaReturnInput: V1_LambdaReturnTypeInput,
  ): Promise<string> {
    const returnType = await this.getLambdaReturnTypeFromRawInput(
      V1_LambdaReturnTypeInput.serialization.toJson(lambdaReturnInput),
    );
    return returnType;
  }

  async getLambdaReturnTypeFromRawInput(
    rawInput: PlainObject<V1_LambdaReturnTypeInput>,
  ): Promise<string> {
    try {
      return (
        (await this.engineServerClient.lambdaReturnType(
          rawInput,
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

  async getLambdaRelationTypeFromRawInput(
    rawInput: V1_LambdaReturnTypeInput,
  ): Promise<RelationTypeMetadata> {
    const result = deserialize(
      V1_relationTypeModelSchema,
      (await this.engineServerClient.lambdaRelationType(
        V1_LambdaReturnTypeInput.serialization.toJson(rawInput),
      )) as unknown as PlainObject<V1_RelationType>,
    );
    const relationType = new RelationTypeMetadata();
    relationType.columns = result.columns.map(
      (column) =>
        new RelationTypeColumnMetadata(
          V1_getGenericTypeFullPath(column.genericType),
          column.name,
        ),
    );
    return relationType;
  }

  async getCodeCompletion(
    rawInput: V1_CompleteCodeInput,
  ): Promise<CodeCompletionResult> {
    const result = CodeCompletionResult.serialization.fromJson(
      (await this.engineServerClient.completeCode(
        V1_CompleteCodeInput.serialization.toJson(rawInput),
      )) as unknown as PlainObject<CodeCompletionResult>,
    );
    return result;
  }

  // --------------------------------------------- Execution ---------------------------------------------

  async runQuery(
    input: V1_ExecuteInput,
    options?: ExecutionOptions,
  ): Promise<{
    executionResult: V1_ExecutionResult;
    executionTraceId?: string;
  }> {
    try {
      const executionResultMap = await this.runQueryAndReturnMap(
        input,
        options,
      );
      const executionResultInText =
        executionResultMap.get(V1_EXECUTION_RESULT) ?? '';
      const rawExecutionResult =
        returnUndefOnError(() =>
          this.parseExecutionResults(executionResultInText, options),
        ) ?? executionResultInText;
      const executionResult = V1_deserializeExecutionResult(rawExecutionResult);
      const executionTraceId = executionResultMap.get(V1_ZIPKIN_TRACE_HEADER);
      if (executionTraceId) {
        return { executionResult, executionTraceId };
      }
      return { executionResult };
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof NetworkClientError) {
        const executionTraceId = error.response.headers.get(
          V1_ZIPKIN_TRACE_HEADER,
        );
        const exexcutionError = V1_buildExecutionError(
          V1_ExecutionError.serialization.fromJson(
            error.payload as PlainObject<V1_ExecutionError>,
          ),
        );
        if (executionTraceId) {
          exexcutionError.executionTraceId = executionTraceId;
        }
        throw exexcutionError;
      }
      throw error;
    }
  }

  async exportData(
    input: V1_ExecuteInput,
    options?: ExecutionOptions,
  ): Promise<Response> {
    try {
      return guaranteeNonNullable(
        (await this.engineServerClient.runQuery(
          V1_ExecuteInput.serialization.toJson(input),
          {
            serializationFormat: options?.serializationFormat,
            returnAsResponse: true,
          },
        )) as Response,
      );
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

  async runQueryAndReturnMap(
    input: V1_ExecuteInput,
    options?: ExecutionOptions,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const response = (await this.engineServerClient.runQuery(
      V1_ExecuteInput.serialization.toJson(input),
      {
        returnAsResponse: true,
        serializationFormat: options?.serializationFormat,
        abortController: options?.abortController,
        tracingTags: options?.tracingtags,
      },
    )) as Response;
    result.set(V1_EXECUTION_RESULT, await response.text());
    if (options?.preservedResponseHeadersList) {
      response.headers.forEach((value, name) => {
        if (options.preservedResponseHeadersList?.includes(name)) {
          result.set(name, value);
        }
      });
    }
    return result;
  }

  /**
   * For parsing of execution results, we may want to maintain the precision of the numbers
   * coming in. To do this, we setup a custom parser for numbers, so that if the number
   * is unsafe to convert to number (we lose precision) we will keep them as strings.
   * This is useful when displaying the execution results.
   */
  parseExecutionResults(
    executionResultTxt: string,
    options: ExecutionOptions | undefined,
  ): PlainObject<V1_ExecutionResult> {
    if (options?.useLosslessParse) {
      return parseLosslessJSON(
        executionResultTxt,
      ) as PlainObject<V1_ExecutionResult>;
    }
    if (!options?.convertUnsafeNumbersToString) {
      return JSON.parse(executionResultTxt);
    }
    try {
      const customNumParser = (numVal: string): number | string => {
        if (isLossSafeNumber(numVal)) {
          return Number(numVal);
        }
        return numVal;
      };
      return parseLosslessJSON(
        executionResultTxt,
        undefined,
        customNumParser,
      ) as PlainObject<V1_ExecutionResult>;
    } catch {
      // fall back to regular parse if any issue with the custom number parsing
      return JSON.parse(executionResultTxt);
    }
  }

  generateExecutionPlan(
    input: V1_ExecuteInput,
  ): Promise<PlainObject<V1_ExecutionPlan>> {
    return this.engineServerClient.generatePlan(
      V1_ExecuteInput.serialization.toJson(input),
    );
  }

  generateLineage(
    input: V1_LineageInput,
  ): Promise<PlainObject<V1_RawLineageModel>> {
    return this.engineServerClient.generateLineage(
      V1_LineageInput.serialization.toJson(input),
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

  generateExecuteTestDataWithSeedData(
    input: V1_TestDataGenerationExecutionWithSeedInput,
  ): Promise<string> {
    return this.engineServerClient.generateTestDataWithSeed(
      V1_TestDataGenerationExecutionWithSeedInput.serialization.toJson(input),
    );
  }

  // --------------------------------------------- Test ---------------------------------------------

  async runTests(input: V1_RunTestsInput): Promise<V1_RunTestsResult> {
    const result = (await this.engineServerClient.runTests(
      V1_RunTestsInput.serialization.toJson(input),
    )) as unknown as PlainObject<V1_RunTestsResult>;
    return V1_RunTestsResult.serialization.fromJson(result);
  }

  async debugTests(input: V1_RunTestsInput): Promise<V1_DebugTestsResult> {
    const result = (await this.engineServerClient.debugTests(
      V1_RunTestsInput.serialization.toJson(input),
    )) as unknown as PlainObject<V1_DebugTestsResult>;
    return V1_DebugTestsResult.serialization.fromJson(result);
  }

  // -------------------------------------------  Generation -------------------------------------------

  async generateArtifacts(
    input: V1_ArtifactGenerationExtensionInput,
  ): Promise<V1_ArtifactGenerationExtensionOutput> {
    return V1_ArtifactGenerationExtensionOutput.serialization.fromJson(
      await this.engineServerClient.generateAritfacts(
        V1_ArtifactGenerationExtensionInput.serialization.toJson(input),
      ),
    );
  }

  // --------------------------------------------- Test Data Generation ---------------------------------------------

  async generateTestData(
    input: V1_TestDataGenerationInput,
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<V1_TestDataGenerationResult> {
    return deserialize(
      V1_testDataGenerationResultModelSchema(plugins),
      await this.engineServerClient.generateTestData(
        V1_TestDataGenerationInput.serialization.toJson(input),
      ),
    );
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
    textModel.code = await this.transformPureModelContextDataToCode(
      model,
      false,
    );
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
    return (await this.engineServerClient.TEMPORARY__getServerServiceInfo()) as unknown as V1_ServiceConfigurationInfo;
  }

  async registerService(
    input: V1_PureModelContext,
    server: string,
    executionMode: ServiceExecutionMode,
    TEMPORARY__useStoreModel: boolean,
    TEMPORARY__useGenerateLineage: boolean,
    TEMPORARY__useGenerateOpenApi: boolean,
  ): Promise<V1_ServiceRegistrationResult> {
    return V1_ServiceRegistrationResult.serialization.fromJson(
      await this.engineServerClient.INTERNAL__registerService(
        V1_serializePureModelContext(input),
        server,
        executionMode,
        TEMPORARY__useStoreModel,
        TEMPORARY__useGenerateLineage,
        TEMPORARY__useGenerateOpenApi,
      ),
    );
  }

  async getServiceVersionInfo(
    serviceUrl: string,
    serviceId: string,
  ): Promise<V1_ServiceStorage> {
    return V1_ServiceStorage.serialization.fromJson(
      await this.engineServerClient.TEMPORARY__getServiceVersionInfo(
        serviceUrl,
        serviceId,
      ),
    );
  }

  async activateServiceGeneration(
    serviceUrl: string,
    generationId: string,
  ): Promise<void> {
    await this.engineServerClient.TEMPORARY__activateGenerationId(
      serviceUrl,
      generationId,
    );
  }

  async runServicePostVal(
    servicePath: string,
    input: V1_PureModelContext,
    assertionId: string,
  ): Promise<PostValidationAssertionResult> {
    const result = (await this.engineServerClient.runServicePostVal(
      servicePath,
      V1_serializePureModelContext(input),
      assertionId,
    )) as unknown as PostValidationAssertionResult;

    return result;
  }

  // ------------------------------------------- Query -------------------------------------------

  async searchQueries(
    searchSpecification: V1_QuerySearchSpecification,
  ): Promise<V1_LightQuery[]> {
    return (
      await this.engineServerClient.searchQueries(
        V1_QuerySearchSpecification.serialization.toJson(searchSpecification),
      )
    ).map((query) => V1_LightQuery.serialization.fromJson(query));
  }

  async getQueries(queryIds: string[]): Promise<V1_LightQuery[]> {
    return (await this.engineServerClient.getQueries(queryIds)).map((query) =>
      V1_LightQuery.serialization.fromJson(query),
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

  async patchQuery(query: Partial<V1_Query>): Promise<V1_Query> {
    return V1_Query.serialization.fromJson(
      await this.engineServerClient.patchQuery(
        guaranteeNonNullable(query.id, `can't patch query without query id`),
        V1_Query.serialization.toJson(query),
      ),
    );
  }

  async deleteQuery(queryId: string): Promise<void> {
    await this.engineServerClient.deleteQuery(queryId);
  }

  async cancelUserExecutions(broadcastToCluster: boolean): Promise<string> {
    return this.engineServerClient.INTERNAL__cancelUserExecutions(
      guaranteeNonNullable(this.getCurrentUserId()),
      broadcastToCluster,
    );
  }
  // ------------------------------------------ QueryData Cube ------------------------------------------

  async searchDataCubes(
    searchSpecification: V1_QuerySearchSpecification,
  ): Promise<LightPersistentDataCube[]> {
    return (
      await this.engineServerClient.searchDataCubes(
        V1_QuerySearchSpecification.serialization.toJson(searchSpecification),
      )
    ).map((query) => LightPersistentDataCube.serialization.fromJson(query));
  }

  async getDataCubes(ids: string[]): Promise<LightPersistentDataCube[]> {
    return (await this.engineServerClient.getDataCubes(ids)).map((query) =>
      LightPersistentDataCube.serialization.fromJson(query),
    );
  }

  async getDataCube(id: string): Promise<PersistentDataCube> {
    return PersistentDataCube.serialization.fromJson(
      await this.engineServerClient.getDataCube(id),
    );
  }

  async createDataCube(
    dataCube: PersistentDataCube,
  ): Promise<PersistentDataCube> {
    return PersistentDataCube.serialization.fromJson(
      await this.engineServerClient.createDataCube(
        PersistentDataCube.serialization.toJson(dataCube),
      ),
    );
  }

  async updateDataCube(
    dataCube: PersistentDataCube,
  ): Promise<PersistentDataCube> {
    return PersistentDataCube.serialization.fromJson(
      await this.engineServerClient.updateDataCube(
        dataCube.id,
        PersistentDataCube.serialization.toJson(dataCube),
      ),
    );
  }

  async deleteDataCube(queryId: string): Promise<void> {
    await this.engineServerClient.deleteDataCube(queryId);
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
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      await this.engineServerClient.buildDatabase(
        V1_serializeDatabaseBuilderInput(input, plugins),
      ),
    );
  }

  async executeRawSQL(
    input: V1_RawSQLExecuteInput,
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<string> {
    return this.engineServerClient.executeRawSQL(
      V1_serializeRawSQLExecuteInput(input, plugins),
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
    const response = V1_FunctionActivatorError.serialization.fromJson(
      await this.engineServerClient.validateFunctionActivator(
        V1_FunctionActivatorInput.serialization.toJson(input),
      ),
    );

    if (response.errors.length) {
      throw new Error(
        `Function activator validation failed:\n${response.errors
          .map((error) => `\n ${error.message}`)
          .join('\n')}`,
      );
    }
  }

  async publishFunctionActivatorToSandbox(
    input: V1_FunctionActivatorInput,
  ): Promise<DeploymentResult> {
    const deploymentResult = DeploymentResult.serialization.fromJson(
      await this.engineServerClient.publishFunctionActivatorToSandbox(
        V1_FunctionActivatorInput.serialization.toJson(input),
      ),
    );
    if (!deploymentResult.successful) {
      throw new Error(
        `Function activator validation failed: ${deploymentResult.errors.join('\n')}`,
      );
    }
    return deploymentResult;
  }

  // ------------------------------------------- Relational -------------------------------------------

  async generateModelsFromDatabaseSpecification(
    input: V1_DatabaseToModelGenerationInput,
  ): Promise<V1_PureModelContextData> {
    try {
      const json =
        await this.engineServerClient.generateModelsFromDatabaseSpecification(
          V1_DatabaseToModelGenerationInput.serialization.toJson(input),
        );
      return V1_deserializePureModelContextData(json);
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

  async getAvailableRelationalDatabaseTypeConfigurations(): Promise<
    V1_RelationalConnectionBuilder[]
  > {
    return (
      await this.engineServerClient.getAvailableRelationalDatabaseTypeConfigurations()
    ).map((dbTypeToDataSourceAndAuthMap) =>
      V1_RelationalConnectionBuilder.serialization.fromJson(
        dbTypeToDataSourceAndAuthMap,
      ),
    );
  }
}
