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

import { flow } from 'mobx';
import type { GeneratorFn, PlainObject } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  mergeObjects,
  HttpStatus,
  NetworkClientError,
} from '@finos/legend-studio-shared';
import type { Logger } from '../../../../../utils/Logger';
import { CORE_LOG_EVENT } from '../../../../../utils/Logger';
import { GenerationMode } from '../../../../metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { ImportConfigurationDescription } from '../../../../metamodels/pure/action/generation/ImportConfigurationDescription';
import { ImportMode } from '../../../../metamodels/pure/action/generation/ImportConfigurationDescription';
import type { RawLambda } from '../../../../metamodels/pure/model/rawValueSpecification/RawLambda';
import type { GenerationConfigurationDescription } from '../../../../metamodels/pure/action/generation/GenerationConfigurationDescription';
import { AbstractEngineConfig } from '../../../../metamodels/pure/action/AbstractEngineConfiguration';
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
import type { ServerClientConfig } from '@finos/legend-studio-network';
import type { V1_RawRelationalOperationElement } from '../model/packageableElements/store/relational/model/V1_RawRelationalOperationElement';
import type { RawRelationalOperationElement } from '../../../../metamodels/pure/model/packageableElements/store/relational/model/RawRelationalOperationElement';
import { V1_RelationalOperationElementJsonToGrammarInput } from './grammar/V1_RelationalOperationElementJsonToGrammarInput';
import { V1_RelationalOperationElementGrammarToJsonInput } from './grammar/V1_RelationalOperationElementGrammarToJson';

class EngineConfig extends AbstractEngineConfig {
  private engine: V1_Engine;

  setEnv(val: string | undefined): void {
    super.setEnv(val);
    this.engine.engineServerClient.setEnv(val);
  }

  setCurrentUserId(val: string | undefined): void {
    super.setCurrentUserId(val);
    this.engine.engineServerClient.setCurrentUserId(val);
  }

  setBaseUrl(val: string | undefined): void {
    super.setBaseUrl(val);
    this.engine.engineServerClient.setBaseUrl(val);
  }

  setUseClientRequestPayloadCompression(val: boolean): void {
    super.setUseClientRequestPayloadCompression(val);
    this.engine.engineServerClient.setCompression(val);
  }

  constructor(engine: V1_Engine) {
    super();
    this.engine = engine;
    this.baseUrl = this.engine.engineServerClient.baseUrl;
  }
}

export class V1_Engine {
  engineServerClient: V1_EngineServerClient;
  logger: Logger;
  config: EngineConfig;

  constructor(clientConfig: ServerClientConfig, logger: Logger) {
    this.engineServerClient = new V1_EngineServerClient(clientConfig);
    this.config = new EngineConfig(this);
    this.config.setBaseUrl(this.engineServerClient.baseUrl);
    this.config.setUseClientRequestPayloadCompression(
      this.engineServerClient.enableCompression,
    );
    this.logger = logger;
  }

  private serializePureModelContextData = (
    graph: V1_PureModelContextData,
  ): PlainObject<V1_PureModelContextData> => {
    const startTime = Date.now();
    const serializedGraph = V1_serializePureModelContextData(graph);
    this.logger.info(
      CORE_LOG_EVENT.GRAPH_PROTOCOL_SERIALIZED,
      Date.now() - startTime,
      'ms',
    );
    return serializedGraph;
  };

  getEngineServerClient(): V1_EngineServerClient {
    return this.engineServerClient;
  }

  // ------------------------------------------- Grammar -------------------------------------------

  pureModelContextDataToPureCode = flow(function* (
    this: V1_Engine,
    graph: V1_PureModelContextData,
  ): GeneratorFn<string> {
    const result = (yield this.engineServerClient.transformJSONToGrammar({
      modelDataContext: this.serializePureModelContextData(graph),
    })) as V1_GrammarToJsonInput;
    return result.code ?? '';
  });

  pureCodeToPureModelContextData = flow(function* (
    this: V1_Engine,
    code: string,
    options?: { onError?: () => void },
  ): GeneratorFn<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      (yield this.pureCodeToPureModelContextDataJson(
        code,
        options,
      )) as PlainObject<V1_PureModelContextData>,
    );
  });

  private pureCodeToPureModelContextDataJson = flow(function* (
    this: V1_Engine,
    code: string,
    options?: { onError?: () => void },
  ): GeneratorFn<PlainObject<V1_PureModelContextData>> {
    const parsingResult = (yield this.engineServerClient.transformGrammarToJSON(
      {
        code,
      },
    )) as PlainObject<V1_JsonToGrammarInput>;
    if (parsingResult.codeError) {
      options?.onError?.();
      throw V1_ParserError.serialization
        .fromJson(parsingResult.codeError as PlainObject<V1_ParserError>)
        .build();
    }
    return guaranteeNonNullable(
      parsingResult.modelDataContext,
    ) as PlainObject<V1_PureModelContextData>;
  });

  transformLambdasToCode = flow(function* (
    this: V1_Engine,
    inputLambdas: Map<string, RawLambda>,
    pretty?: boolean,
  ): GeneratorFn<Map<string, string>> {
    const lambdas: Record<string, PlainObject<V1_RawLambda>> = {};
    inputLambdas.forEach((inputLambda, key) => {
      lambdas[key] = V1_serializeRawValueSpecification(
        V1_transformRawLambda(inputLambda),
      );
    });
    const result = V1_GrammarToJsonInput.serialization.fromJson(
      (yield this.engineServerClient.transformJSONToGrammar({
        isolatedLambdas: { lambdas },
        renderStyle: pretty ? V1_RenderStyle.PRETTY : V1_RenderStyle.STANDARD,
      })) as PlainObject<V1_GrammarToJsonInput>,
    );
    return result.isolatedLambdas ?? new Map<string, string>();
  });

  transformCodeToLambda = flow(function* (
    this: V1_Engine,
    lambda: string,
    lambdaId: string,
  ): GeneratorFn<V1_RawLambda | undefined> {
    const result = V1_JsonToGrammarInput.serialization.fromJson(
      (yield this.engineServerClient.transformGrammarToJSON({
        isolatedLambdas: { [lambdaId]: lambda },
      })) as PlainObject<V1_JsonToGrammarInput>,
    );
    const lambdaResult = guaranteeNonNullable(result.isolatedLambdas);
    const parserError = lambdaResult.lambdaErrors?.get(lambdaId);
    if (parserError) {
      throw parserError.build();
    }
    return lambdaResult.lambdas?.get(lambdaId);
  });

  transformRelationalOperationElementsToPureCode = flow(function* (
    this: V1_Engine,
    inputOperations: Map<string, RawRelationalOperationElement>,
  ): GeneratorFn<Map<string, string>> {
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
        (yield this.engineServerClient.transformRelationalOperationElementJSONToGrammar(
          {
            operations,
          },
        )) as PlainObject<V1_RelationalOperationElementGrammarToJsonInput>,
      );
    return result.operations;
  });

  transformPureCodeToRelationalOperationElement = flow(function* (
    this: V1_Engine,
    operation: string,
    operationId: string,
  ): GeneratorFn<V1_RawRelationalOperationElement | undefined> {
    const result =
      V1_RelationalOperationElementJsonToGrammarInput.serialization.fromJson(
        (yield this.engineServerClient.transformRelationalOperationElementGrammarToJSON(
          {
            operations: { [operationId]: operation },
          },
        )) as PlainObject<V1_RelationalOperationElementJsonToGrammarInput>,
      );
    const parserError = result.operationErrors?.get(operationId);
    if (parserError) {
      throw parserError.build();
    }
    return result.operations.get(operationId);
  });

  // ------------------------------------------- Compile -------------------------------------------

  compilePureModelContextData = flow(function* (
    this: V1_Engine,
    model: V1_PureModelContextData,
    options?: { onError?: () => void },
  ): GeneratorFn<undefined> {
    try {
      yield this.engineServerClient.compile(
        this.serializePureModelContextData(model),
      );
      return undefined;
    } catch (error: unknown) {
      assertErrorThrown(error);
      options?.onError?.();
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_CompilationError.serialization
          .fromJson(error.payload as PlainObject<V1_CompilationError>)
          .build();
      }
      throw error;
    }
  });

  compileText = flow(function* (
    this: V1_Engine,
    graphText: string,
    compileContext?: V1_PureModelContextData,
    options?: { onError?: () => void },
  ): GeneratorFn<V1_PureModelContextData> {
    const mainGraph = (yield this.pureCodeToPureModelContextDataJson(
      graphText,
      options,
    )) as PlainObject<V1_PureModelContextData>;
    const pureModelContextDataJson = compileContext
      ? mergeObjects(
          this.serializePureModelContextData(compileContext),
          mainGraph,
          false,
        )
      : mainGraph;
    try {
      yield this.engineServerClient.compile(pureModelContextDataJson);
      return V1_deserializePureModelContextData(mainGraph);
    } catch (error: unknown) {
      assertErrorThrown(error);
      options?.onError?.();
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_CompilationError.serialization
          .fromJson(error.payload as PlainObject<V1_CompilationError>)
          .build();
      }
      throw error;
    }
  });

  getLambdaReturnType = flow(function* (
    this: V1_Engine,
    lambda: V1_RawLambda,
    model: V1_PureModelContextData,
  ): GeneratorFn<string> {
    try {
      const lambdaReturnType = (yield this.engineServerClient.lambdaReturnType(
        V1_serializeRawValueSpecification(lambda),
        this.serializePureModelContextData(model),
      )) as V1_LambdaReturnTypeResult;
      return lambdaReturnType.returnType;
    } catch (error: unknown) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_CompilationError.serialization
          .fromJson(error.payload as PlainObject<V1_CompilationError>)
          .build();
      }
      throw error;
    }
  });

  // ------------------------------------------- Schema Import -------------------------------------------

  transformExternalFormatToProtocol = flow(function* (
    this: V1_Engine,
    externalFormat: string,
    type: string,
    mode: ImportMode,
  ): GeneratorFn<V1_PureModelContextData> {
    return V1_deserializePureModelContextData(
      (yield this.engineServerClient.transformExternalFormatToProtocol(
        JSON.parse(externalFormat),
        type,
        mode,
      )) as PlainObject<V1_PureModelContextData>,
    );
  });

  getAvailableImportConfigurationDescriptions = flow(function* (
    this: V1_Engine,
  ): GeneratorFn<ImportConfigurationDescription[]> {
    const schemaImportDescriptions = (
      (yield this.engineServerClient.getAvailableSchemaImportDescriptions()) as PlainObject<V1_ImportConfigurationDescription>[]
    ).map((gen) => ({ ...gen, modelImportMode: ImportMode.SCHEMA_IMPORT }));
    const codeImportDescriptions = (
      (yield this.engineServerClient.getAvailableCodeImportDescriptions()) as PlainObject<V1_ImportConfigurationDescription>[]
    ).map((gen) => ({ ...gen, modelImportMode: ImportMode.CODE_IMPORT }));
    return [...schemaImportDescriptions, ...codeImportDescriptions].map(
      (description) =>
        V1_ImportConfigurationDescription.serialization
          .fromJson(description)
          .build(),
    );
  });

  // ------------------------------------------- File Generation -------------------------------------------

  getAvailableGenerationConfigurationDescriptions = flow(function* (
    this: V1_Engine,
  ): GeneratorFn<GenerationConfigurationDescription[]> {
    const schemaGenerationDescriptions = (
      (yield this.engineServerClient.getAvailableSchemaGenerationDescriptions()) as PlainObject<V1_GenerationConfigurationDescription>[]
    ).map((gen) => ({
      ...gen,
      generationMode: GenerationMode.SCHEMA_GENERATION,
    }));
    const codeGenerationDescriptions = (
      (yield this.engineServerClient.getAvailableCodeGenerationDescriptions()) as PlainObject<V1_GenerationConfigurationDescription>[]
    ).map((gen) => ({
      ...gen,
      generationMode: GenerationMode.CODE_GENERATION,
    }));
    return [...schemaGenerationDescriptions, ...codeGenerationDescriptions].map(
      (description) =>
        V1_GenerationConfigurationDescription.serialization
          .fromJson(description)
          .build(),
    );
  });

  generateFile = flow(function* (
    this: V1_Engine,
    configs: Record<PropertyKey, unknown>,
    type: string,
    generationMode: GenerationMode,
    model: V1_PureModelContextData,
  ): GeneratorFn<V1_GenerationOutput[]> {
    const input = new V1_GenerateFileInput(model, configs);
    return (
      (yield this.engineServerClient.generateFile(
        generationMode,
        type,
        V1_GenerateFileInput.serialization.toJson(input),
      )) as PlainObject<V1_GenerationOutput>[]
    ).map((output) => V1_GenerationOutput.serialization.fromJson(output));
  });

  // ------------------------------------------- Service -------------------------------------------

  runServiceTests = flow(function* (
    this: V1_Engine,
    servicePath: string,
    model: V1_PureModelContextData,
  ): GeneratorFn<V1_ServiceTestResult[]> {
    return (
      (yield this.engineServerClient.runServiceTests(
        V1_serializePureModelContextData(model),
      )) as PlainObject<V1_ServiceTestResult>[]
    ).map((result) => V1_ServiceTestResult.serialization.fromJson(result));
  });
}
