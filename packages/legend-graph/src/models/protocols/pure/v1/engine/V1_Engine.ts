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

import type {
  Log,
  PlainObject,
  ServerClientConfig,
} from '@finos/legend-shared';
import {
  LogEvent,
  losslessParse,
  assertErrorThrown,
  guaranteeNonNullable,
  mergeObjects,
  HttpStatus,
  NetworkClientError,
} from '@finos/legend-shared';
import { GRAPH_MANAGER_LOG_EVENT } from '../../../../../graphManager/GraphManagerLogEvent';
import type { ImportConfigurationDescription } from '../../../../../graphManager/action/generation/ImportConfigurationDescription';
import { ImportMode } from '../../../../../graphManager/action/generation/ImportConfigurationDescription';
import type { RawLambda } from '../../../../metamodels/pure/rawValueSpecification/RawLambda';
import { GenerationMode } from '../../../../../graphManager/action/generation/GenerationConfigurationDescription';
import type { GenerationConfigurationDescription } from '../../../../../graphManager/action/generation/GenerationConfigurationDescription';
import { TEMP__AbstractEngineConfig } from '../../../../../graphManager/action/TEMP__AbstractEngineConfig';
import { V1_EngineServerClient } from './V1_EngineServerClient';
import type { V1_PureModelContextData } from '../model/context/V1_PureModelContextData';
import type { V1_LambdaReturnTypeResult } from '../engine/compilation/V1_LambdaReturnTypeResult';
import {
  V1_JsonToGrammarInput,
  V1_RenderStyle,
} from '../engine/grammar/V1_JsonToGrammarInput';
import { V1_GrammarToJsonInput } from '../engine/grammar/V1_GrammarToJson';
import type { V1_RawLambda } from '../model/rawValueSpecification/V1_RawLambda';
import {
  V1_deserializePureModelContextData,
  V1_serializePureModelContext,
  V1_serializePureModelContextData,
} from '../transformation/pureProtocol/V1_PureProtocolSerialization';
import { V1_ServiceTestResult } from '../engine/service/V1_ServiceTestResult';
import { V1_serializeRawValueSpecification } from '../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper';
import { V1_transformRawLambda } from '../transformation/pureGraph/from/V1_RawValueSpecificationTransformer';
import { V1_GenerateFileInput } from '../engine/generation/V1_FileGenerationInput';
import { V1_ImportConfigurationDescription } from '../engine/import/V1_ImportConfigurationDescription';
import { V1_GenerationConfigurationDescription } from '../engine/generation/V1_GenerationConfigurationDescription';
import { V1_GenerationOutput } from '../engine/generation/V1_GenerationOutput';
import { V1_ParserError } from '../engine/grammar/V1_ParserError';
import { V1_CompilationError } from '../engine/compilation/V1_CompilationError';
import type { V1_RawRelationalOperationElement } from '../model/packageableElements/store/relational/model/V1_RawRelationalOperationElement';
import type { RawRelationalOperationElement } from '../../../../metamodels/pure/packageableElements/store/relational/model/RawRelationalOperationElement';
import { V1_RelationalOperationElementJsonToGrammarInput } from './grammar/V1_RelationalOperationElementJsonToGrammarInput';
import { V1_RelationalOperationElementGrammarToJsonInput } from './grammar/V1_RelationalOperationElementGrammarToJson';
import { V1_GraphTransformerContextBuilder } from '../transformation/pureGraph/from/V1_GraphTransformerContext';
import type { PureProtocolProcessorPlugin } from '../../PureProtocolProcessorPlugin';
import {
  V1_buildCompilationError,
  V1_buildGenerationConfigurationDescription,
  V1_buildImportConfigurationDescription,
  V1_buildParserError,
} from './V1_EngineHelper';
import { V1_LightQuery, V1_Query } from './query/V1_Query';
import { V1_DatabaseBuilderInput } from './generation/V1_DatabaseBuilderInput';
import type { V1_ServiceConfigurationInfo } from './service/V1_ServiceConfiguration';
import { V1_ExecuteInput } from './execution/V1_ExecuteInput';
import type { V1_ExecutionPlan } from '../model/executionPlan/V1_ExecutionPlan';
import type { V1_ExecutionResult } from './execution/V1_ExecutionResult';
import { V1_serializeExecutionResult } from './execution/V1_ExecutionResult';
import { V1_ServiceStorage } from './service/V1_ServiceStorage';
import { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult';
import type { V1_PureModelContext } from '../model/context/V1_PureModelContext';
import { ServiceExecutionMode } from '../../../../../graphManager/action/service/ServiceExecutionMode';

class V1_EngineConfig extends TEMP__AbstractEngineConfig {
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
  private engineServerClient: V1_EngineServerClient;
  log: Log;
  config: V1_EngineConfig;

  constructor(clientConfig: ServerClientConfig, log: Log) {
    this.engineServerClient = new V1_EngineServerClient(clientConfig);
    this.config = new V1_EngineConfig(this);
    this.config.setBaseUrl(this.engineServerClient.baseUrl);
    this.config.setUseClientRequestPayloadCompression(
      this.engineServerClient.enableCompression,
    );
    this.log = log;
  }

  private serializePureModelContextData = (
    graph: V1_PureModelContextData,
  ): PlainObject<V1_PureModelContextData> => {
    const startTime = Date.now();
    const serializedGraph = V1_serializePureModelContextData(graph);
    this.log.info(
      LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_PROTOCOL_SERIALIZED),
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

  // ------------------------------------------- Grammar -------------------------------------------

  async pureModelContextDataToPureCode(
    graph: V1_PureModelContextData,
  ): Promise<string> {
    return (
      ((
        await this.engineServerClient.transformJSONToGrammar({
          modelDataContext: this.serializePureModelContextData(graph),
        })
      ).code as string | undefined) ?? ''
    );
  }

  async pureCodeToPureModelContextData(
    code: string,
    options?: { onError?: () => void },
  ): Promise<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      await this.pureCodeToPureModelContextDataJson(code, options),
    );
  }

  private async pureCodeToPureModelContextDataJson(
    code: string,
    options?: { onError?: () => void },
  ): Promise<PlainObject<V1_PureModelContextData>> {
    const parsingResult = await this.engineServerClient.transformGrammarToJSON({
      code,
    });
    if (parsingResult.codeError) {
      options?.onError?.();
      throw V1_buildParserError(
        V1_ParserError.serialization.fromJson(
          parsingResult.codeError as PlainObject<V1_ParserError>,
        ),
      );
    }
    return guaranteeNonNullable(
      parsingResult.modelDataContext,
    ) as PlainObject<V1_PureModelContextData>;
  }

  async transformLambdasToCode(
    inputLambdas: Map<string, RawLambda>,
    pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[],
    pretty?: boolean,
  ): Promise<Map<string, string>> {
    const lambdas: Record<string, PlainObject<V1_RawLambda>> = {};
    inputLambdas.forEach((inputLambda, key) => {
      lambdas[key] = V1_serializeRawValueSpecification(
        V1_transformRawLambda(
          inputLambda,
          new V1_GraphTransformerContextBuilder(
            pureProtocolProcessorPlugins,
          ).build(),
        ),
      );
    });
    const result = V1_GrammarToJsonInput.serialization.fromJson(
      await this.engineServerClient.transformJSONToGrammar({
        isolatedLambdas: { lambdas },
        renderStyle: pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
      }),
    );
    return result.isolatedLambdas ?? new Map<string, string>();
  }

  async transformCodeToLambda(
    lambda: string,
    lambdaId: string,
  ): Promise<V1_RawLambda | undefined> {
    const result = V1_JsonToGrammarInput.serialization.fromJson(
      await this.engineServerClient.transformGrammarToJSON({
        isolatedLambdas: { [lambdaId]: lambda },
      }),
    );
    const lambdaResult = guaranteeNonNullable(result.isolatedLambdas);
    const parserError = lambdaResult.lambdaErrors?.get(lambdaId);
    if (parserError) {
      throw V1_buildParserError(parserError);
    }
    return lambdaResult.lambdas?.get(lambdaId);
  }

  async transformRelationalOperationElementsToPureCode(
    inputOperations: Map<string, RawRelationalOperationElement>,
  ): Promise<Map<string, string>> {
    const operations: Record<
      string,
      PlainObject<V1_RawRelationalOperationElement>
    > = {};
    inputOperations.forEach((inputOperation, key) => {
      operations[key] =
        inputOperation as PlainObject<V1_RawRelationalOperationElement>;
    });
    const result =
      V1_RelationalOperationElementGrammarToJsonInput.serialization.fromJson(
        await this.engineServerClient.transformRelationalOperationElementJSONToGrammar(
          {
            operations,
          },
        ),
      );
    return result.operations;
  }

  async transformPureCodeToRelationalOperationElement(
    operation: string,
    operationId: string,
  ): Promise<V1_RawRelationalOperationElement | undefined> {
    const result =
      V1_RelationalOperationElementJsonToGrammarInput.serialization.fromJson(
        await this.engineServerClient.transformRelationalOperationElementGrammarToJSON(
          {
            operations: { [operationId]: operation },
          },
        ),
      );
    const parserError = result.operationErrors?.get(operationId);
    if (parserError) {
      throw V1_buildParserError(parserError);
    }
    return result.operations.get(operationId);
  }

  // ------------------------------------------- Compile -------------------------------------------

  async compilePureModelContextData(
    model: V1_PureModelContextData,
    options?: { onError?: (() => void) | undefined } | undefined,
  ): Promise<void> {
    try {
      await this.engineServerClient.compile(
        this.serializePureModelContextData(model),
      );
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
    compileContext?: V1_PureModelContextData,
    options?: { onError?: () => void },
  ): Promise<V1_PureModelContextData> {
    const mainGraph = await this.pureCodeToPureModelContextDataJson(
      graphText,
      options,
    );
    const pureModelContextDataJson = compileContext
      ? mergeObjects(
          this.serializePureModelContextData(compileContext),
          mainGraph,
          false,
        )
      : mainGraph;
    try {
      await this.engineServerClient.compile(pureModelContextDataJson);
      return V1_deserializePureModelContextData(mainGraph);
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
    lambda: V1_RawLambda,
    model: V1_PureModelContextData,
  ): Promise<string> {
    try {
      return (
        (await this.engineServerClient.lambdaReturnType(
          V1_serializeRawValueSpecification(lambda),
          this.serializePureModelContextData(model),
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
    useLosslessParse: boolean,
  ): Promise<V1_ExecutionResult> {
    const executionResultInText = await (
      (await this.engineServerClient.execute(
        V1_ExecuteInput.serialization.toJson(input),
        true,
      )) as Response
    ).text();
    return V1_serializeExecutionResult(
      useLosslessParse
        ? losslessParse(executionResultInText)
        : JSON.parse(executionResultInText),
    );
  }

  generateExecutionPlan(
    input: V1_ExecuteInput,
  ): Promise<PlainObject<V1_ExecutionPlan>> {
    return this.engineServerClient.generatePlan(
      V1_ExecuteInput.serialization.toJson(input),
    );
  }

  generateMappingTestData(input: V1_ExecuteInput): Promise<string> {
    return this.engineServerClient.generateTestDataWithDefaultSeed(
      V1_ExecuteInput.serialization.toJson(input),
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
    configs: Record<PropertyKey, unknown>,
    type: string,
    generationMode: GenerationMode,
    model: V1_PureModelContextData,
  ): Promise<V1_GenerationOutput[]> {
    return (
      await this.engineServerClient.generateFile(
        generationMode,
        type,
        V1_GenerateFileInput.serialization.toJson(
          new V1_GenerateFileInput(model, configs),
        ),
      )
    ).map((output) => V1_GenerationOutput.serialization.fromJson(output));
  }

  // ------------------------------------------- Schema Import -------------------------------------------

  async transformExternalFormatToProtocol(
    externalFormat: string,
    type: string,
    mode: ImportMode,
  ): Promise<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      await this.engineServerClient.transformExternalFormatToProtocol(
        JSON.parse(externalFormat),
        type,
        mode,
      ),
    );
  }

  async getAvailableImportConfigurationDescriptions(): Promise<
    ImportConfigurationDescription[]
  > {
    const schemaImportDescriptions = (
      await this.engineServerClient.getAvailableSchemaImportDescriptions()
    ).map((gen) => ({ ...gen, modelImportMode: ImportMode.SCHEMA_IMPORT }));
    const codeImportDescriptions = (
      await this.engineServerClient.getAvailableCodeImportDescriptions()
    ).map((gen) => ({ ...gen, modelImportMode: ImportMode.CODE_IMPORT }));
    return [...schemaImportDescriptions, ...codeImportDescriptions].map(
      (description) =>
        V1_buildImportConfigurationDescription(
          V1_ImportConfigurationDescription.serialization.fromJson(description),
        ),
    );
  }

  // ------------------------------------------- Service -------------------------------------------

  async getServerServiceInfo(): Promise<V1_ServiceConfigurationInfo> {
    return (await this.engineServerClient.getServerServiceInfo()) as unknown as V1_ServiceConfigurationInfo;
  }

  async runServiceTests(
    model: V1_PureModelContextData,
  ): Promise<V1_ServiceTestResult[]> {
    return (
      await this.engineServerClient.runServiceTests(
        V1_serializePureModelContextData(model),
      )
    ).map((result) => V1_ServiceTestResult.serialization.fromJson(result));
  }

  async registerService(
    input: V1_PureModelContext,
    server: string,
    executionMode: ServiceExecutionMode,
  ): Promise<V1_ServiceRegistrationResult> {
    return V1_ServiceRegistrationResult.serialization.fromJson(
      await this.engineServerClient.registerService(
        V1_serializePureModelContext(input),
        server,
        executionMode === ServiceExecutionMode.FULL_INTERACTIVE
          ? 'fullInteractive'
          : executionMode === ServiceExecutionMode.SEMI_INTERACTIVE
          ? 'semiInteractive'
          : undefined,
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

  async getQueries(options?: {
    search?: string | undefined;
    projectCoordinates?: string[] | undefined;
    showCurrentUserQueriesOnly?: boolean | undefined;
    limit?: number | undefined;
  }): Promise<V1_LightQuery[]> {
    return (await this.engineServerClient.getQueries(options)).map((query) =>
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
      await this.engineServerClient.createQuery(query),
    );
  }

  async updateQuery(query: V1_Query): Promise<V1_Query> {
    return V1_Query.serialization.fromJson(
      await this.engineServerClient.updateQuery(query.id, query),
    );
  }

  async deleteQuery(queryId: string): Promise<void> {
    await this.engineServerClient.deleteQuery(queryId);
  }

  // --------------------------------------------- Utilities ---------------------------------------------

  async buildDatabase(
    input: V1_DatabaseBuilderInput,
  ): Promise<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      await this.engineServerClient.buildDatabase(
        V1_DatabaseBuilderInput.serialization.toJson(input),
      ),
    );
  }
}
