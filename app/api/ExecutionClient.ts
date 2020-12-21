/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serialize } from 'serializr';
import { client, ContentType, CHARSET, Parameters, ClientResponse, mergeRequestHeaders, RequestHeaders } from 'API/NetworkClient';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { JsonToGrammarInput } from 'EXEC/grammar/JsonToGrammarInput';
import { CompileResult } from 'EXEC/compilation/CompileResult';
import { TRACER_SPAN } from 'API/TracerClient';
import { IllegalStateError, guaranteeNonNullable, isObject } from 'Utilities/GeneralUtil';
import { ExecutionResultWithValues, ExecutionPlan } from 'EXEC/execution/ExecutionResult';
import { ExecuteInput } from 'EXEC/execution/ExecuteInput';
import { GenerationInput } from 'EXEC/generation/GenerationInput';
import { deflate } from 'pako';
import { LambdaReturnTypeResult } from 'EXEC/compilation/LambdaReturnTypeResult';
import { GenerationConfigurationDescription } from 'EXEC/fileGeneration/GenerationConfigurationDescription';
import { XsdToGrammarInput } from 'EXEC/grammar/XsdToGrammarInput';
import { PureModelContextGenerationInput } from 'EXEC/grammar/PureModelContextGenerationInput';
import { ImportConfigurationDescription, MODEL_IMPORT_MODE } from 'EXEC/modelImport/ImportConfigurationDescription';
import { PureModelContextDataObject } from 'MM/AbstractPureGraphManager';
import { FILE_GENERATION_MODE } from 'MM/model/packageableElements/fileGeneration/FileGeneration';

/**
 * Unlike the download call (GET requests) which is gziped, the upload call send uncompressed data which is in megabytes realms
 * for bigger project. This really slows down operations. As such, we compress data using `zlib` for all network calls to execution
 * server. This requires the backend to uncompress, which for small models might end up adding a little overhead, so in the future, we might
 * want to make this decision `to compress or to not compress` more smartly and dynamicly (e.g. potentially to scan the size of the data/model
 * and decide the compression strategy).
 */
const compressData = (data: Record<PropertyKey, unknown> | string): Blob => new Blob([deflate(isObject(data) ? JSON.stringify(data) : data)]);
const postWithTracingAndCompressedData = <T extends ClientResponse>(tracingSpanName: TRACER_SPAN, url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters, tracingTags?: Record<PropertyKey, unknown>): Promise<T> =>
  client.postWithTracing(tracingSpanName, url, compressData(data as Record<PropertyKey, unknown> | string), options, mergeRequestHeaders({ 'Content-Type': `${ContentType.APPLICATION_ZLIB};${CHARSET}` }, headers), parameters, tracingTags);

abstract class ServerClient {
  protected enableCompression = true;
  protected baseUrl?: string;

  setCompression(val: boolean): void { this.enableCompression = val }

  protected post<T extends ClientResponse>(tracingSpanName: TRACER_SPAN, url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters, tracingTags?: Record<PropertyKey, unknown>): Promise<T> {
    return this.enableCompression
      ? postWithTracingAndCompressedData(tracingSpanName, url, data, options, headers, parameters, tracingTags)
      : client.postWithTracing(tracingSpanName, url, data, options, headers, parameters, tracingTags);
  }
}

/**
 * NOTE: right now we only support execution server endpoints for version V1 (/pure/v1/*).
 * Technically, these endpoints only support V1 protocols and thus, method such as `execute` will require
 * `ExecuteInput` of V1, for this to happen, we might need to move all of these API logic into the specific
 * protocols folder, such as `models/protocols/v1/action`. As such, we will need to architect this differently:
 * First we need to remove `models/exec` move it into `models/protocols/v...` or have `models/exec/v...`
 * Second, we might need to have an extension sysem in place like what we have for `PureModel`
 * .. That being said, another complicating factor can be the fact that `v1/generate` supports a different sets
 * of parameters compared to `v2/generate`. That would require some heavy refactoring not just from the codebase
 * perspective, but also app usage perspective (as the newer endpoints might have deprecated or added a feature)
 */
class ExecutionClient extends ServerClient {
  static instance: ExecutionClient;
  private initialized = false;
  private version = 'v1';

  initialize(url: string): void {
    if (this.initialized) { throw new IllegalStateError('Execution client initialization should only happen once') }
    this.baseUrl = url;
    this.initialized = true;
  }

  private _base = (): string => guaranteeNonNullable(this.baseUrl, 'Execution server URL is not configured')
  currentUser = (baseUrl: string): string => `${baseUrl}/api/server/v1/currentUser`;
  private pureProtocol = (): string => `${this._base()}/api/pure/${this.version}`

  // transformation
  transformGrammarToJSON = (input: GrammarToJsonInput): Promise<JsonToGrammarInput> =>
    this.post(TRACER_SPAN.GRAMMAR_TO_JSON, `${this.pureProtocol()}/grammar/transformGrammarToJson`, serialize(GrammarToJsonInput, input))
  transformJSONToGrammar = (input: JsonToGrammarInput): Promise<GrammarToJsonInput> =>
    this.post(TRACER_SPAN.JSON_TO_GRAMMAR, `${this.pureProtocol()}/grammar/transformJsonToGrammar`, serialize(JsonToGrammarInput, input))
  transformXsdToProtocol = (input: XsdToGrammarInput): Promise<PureModelContextDataObject> =>
    this.post(TRACER_SPAN.XSD_TO_PROTOCOL, `${this.pureProtocol()}/schemaImport/xsd`, serialize(XsdToGrammarInput, input))
  transformExternalFormatToProtocol = (input: PureModelContextGenerationInput, key: string, mode: MODEL_IMPORT_MODE): Promise<PureModelContextDataObject> =>
    this.post(TRACER_SPAN.EXTERNAL_FORMAT_TO_PROTOCOL, `${this.pureProtocol()}/${mode}/${key}`, serialize(PureModelContextGenerationInput, input))

  // get available imports descriptions
  getAvailableSchemaImportDescriptions = (): Promise<ImportConfigurationDescription[]> => client.get(`${this.pureProtocol()}/schemaImport/availableImports`)
  getAvailableCodeImportDescriptions = (): Promise<ImportConfigurationDescription[]> => client.get(`${this.pureProtocol()}/codeImport/availableImports`)
  // generate file
  generateFile = (mode: FILE_GENERATION_MODE, key: string, input: GenerationInput): Promise<PureModelContextDataObject> =>
    this.post(TRACER_SPAN.GENERATE_FILE, `${this.pureProtocol()}/${mode}/${key}`, input)

  // get available file generation configurations
  getAvailableCodeGenerationDescriptions = (): Promise<GenerationConfigurationDescription[]> => client.get(`${this.pureProtocol()}/codeGeneration/availableGenerations`)
  getAvailableSchemaGenerationDescriptions = (): Promise<GenerationConfigurationDescription[]> => client.get(`${this.pureProtocol()}/schemaGeneration/availableGenerations`)

  // compilation
  compile = (model: PureModelContextDataObject): Promise<CompileResult> =>
    this.post(TRACER_SPAN.COMPILE, `${this.pureProtocol()}/compilation/compile`, model)
  /**
   * TODO: We used to have an API called `compilation/compileGrammar`.
   * This API is our attempt to reduce traffic between the application and server. However, this is actually not the ideal thing to do at the moment
   * It makes more sense to do this at a more generic manner. The current APIs should accept a more generic shape for graph model data.
   * e.g. PureGrammarContextData or PureModelContextData that supports mixed data: code and model context data.
   */
  lambdaReturnType = (lambdaReturnTypeInput: { model: PureModelContextDataObject; lambda: Record<PropertyKey, unknown> }): Promise<LambdaReturnTypeResult> =>
    this.post(TRACER_SPAN.GET_LAMBDA_RETURN_TYPE, `${this.pureProtocol()}/compilation/lambdaReturnType`, lambdaReturnTypeInput)

  // execution
  execute = (executeInput: ExecuteInput): Promise<ExecutionResultWithValues> =>
    this.post(TRACER_SPAN.EXECUTE, `${this.pureProtocol()}/execution/execute`, executeInput)
  generatePlan = (executeInput: ExecuteInput): Promise<ExecutionPlan> =>
    this.post(TRACER_SPAN.GENERATE_EXECUTION_PLAN, `${this.pureProtocol()}/execution/generatePlan`, executeInput)
}

ExecutionClient.instance = new ExecutionClient();
export const executionClient = ExecutionClient.instance;
