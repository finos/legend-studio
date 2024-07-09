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
  type AbstractPureGraphManager,
  type ExecutionResult,
  type GraphDataOrigin,
  type PureModel,
  type RawExecutionPlan,
  type RootGraphFetchTree,
  type V1_ExecutionResult,
  type V1_PureModelContext,
  type V1_RootGraphFetchTree,
  LegendSDLC,
  PureClientVersion,
  V1_buildExecutionError,
  V1_buildExecutionResult,
  V1_ExecutionError,
  V1_GraphBuilderContextBuilder,
  V1_LegendSDLC,
  V1_ProcessingContext,
  V1_Protocol,
  V1_PureGraphManager,
  V1_PureModelContextPointer,
  V1_pureModelContextPropSchema,
  V1_serializeExecutionResult,
} from '@finos/legend-graph';
import { createModelSchema, optional, primitive } from 'serializr';
import {
  type PlainObject,
  assertErrorThrown,
  guaranteeType,
  NetworkClientError,
  returnUndefOnError,
  SerializationFactory,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { DSL_DataQuality_PureGraphManagerExtension } from '../DSL_DataQuality_PureGraphManagerExtension.js';
import {
  V1_buildDataQualityGraphFetchTree,
  V1_transformRootGraphFetchTreeToDataQualityRootGraphFetchTree,
} from './transformation/V1_ValueSpecificationBuilderHelper.js';
import type { DataQualityRootGraphFetchTree } from '../../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';

const DQ_GENERATE_EXECUTION_PLAN = 'generate execution plan';
const DQ_EXECUTE_PLAN = 'execute plan';
const DQ_DEBUG_EXECUTION_PLAN = 'debug execution plan';
const DQ_FETCH_PROPERTY_PATH_TREE = 'dq fetch property path tree';

export class V1_DQExecuteInput {
  clientVersion: string | undefined;
  model!: V1_PureModelContext;
  packagePath!: string;
  queryLimit: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DQExecuteInput, {
      clientVersion: optional(primitive()),
      model: V1_pureModelContextPropSchema,
      packagePath: primitive(),
      queryLimit: optional(primitive()),
    }),
  );
}

export class V1_DSL_Data_Quality_PureGraphManagerExtension extends DSL_DataQuality_PureGraphManagerExtension {
  declare graphManager: V1_PureGraphManager;
  static readonly DEV_PROTOCOL_VERSION = PureClientVersion.VX_X_X;

  constructor(graphManager: AbstractPureGraphManager) {
    super(graphManager);
    this.graphManager = guaranteeType(graphManager, V1_PureGraphManager);
  }

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  private buildPureModelSDLCPointer(
    origin: GraphDataOrigin,
    clientVersion: string | undefined,
  ): V1_PureModelContextPointer {
    if (origin instanceof LegendSDLC) {
      return new V1_PureModelContextPointer(
        clientVersion
          ? new V1_Protocol(
              V1_PureGraphManager.PURE_PROTOCOL_NAME,
              clientVersion,
            )
          : undefined,
        new V1_LegendSDLC(origin.groupId, origin.artifactId, origin.versionId),
      );
    }
    throw new UnsupportedOperationError('Unsupported graph origin');
  }

  private executeValidation = (
    input: PlainObject<V1_DQExecuteInput>,
    options?: {
      returnAsResponse?: boolean;
    },
  ): Promise<PlainObject<V1_ExecutionResult> | Response> => {
    const engineServerClient = this.graphManager.engine.getEngineServerClient();
    return engineServerClient.postWithTracing(
      engineServerClient.getTraceData(DQ_EXECUTE_PLAN),
      `${engineServerClient._pure()}/dataquality/execute`,
      input,
      {},
      undefined,
      undefined,
      { enableCompression: true },
      {
        skipProcessing: Boolean(options?.returnAsResponse),
      },
    );
  };

  private async runValidationAndReturnString(
    input: V1_DQExecuteInput,
  ): Promise<string> {
    return (
      (await this.executeValidation(
        V1_DQExecuteInput.serialization.toJson(input),
        {
          returnAsResponse: true,
        },
      )) as Response
    ).text();
  }

  createExecutionInput(
    graph: PureModel,
    packagePath: string,
    clientVersion: string | undefined,
    previewLimit: number | undefined,
    dqExecuteInput: V1_DQExecuteInput,
  ): V1_DQExecuteInput {
    dqExecuteInput.clientVersion = clientVersion;
    dqExecuteInput.model = graph.origin
      ? this.buildPureModelSDLCPointer(graph.origin, undefined)
      : this.graphManager.getFullGraphModelData(graph);
    dqExecuteInput.packagePath = packagePath;
    dqExecuteInput.queryLimit = previewLimit;
    return dqExecuteInput;
  }

  generatePlan = async (
    graph: PureModel,
    packagePath: string,
  ): Promise<RawExecutionPlan> => {
    const input = this.createExecutionInput(
      graph,
      packagePath,
      V1_DSL_Data_Quality_PureGraphManagerExtension.DEV_PROTOCOL_VERSION,
      undefined,
      new V1_DQExecuteInput(),
    );

    const serializedInput = V1_DQExecuteInput.serialization.toJson(input);

    const engineServerClient = this.graphManager.engine.getEngineServerClient();

    return engineServerClient.postWithTracing(
      engineServerClient.getTraceData(DQ_GENERATE_EXECUTION_PLAN),
      `${engineServerClient._pure()}/dataquality/generatePlan`,
      serializedInput,
      {},
      undefined,
      undefined,
      { enableCompression: true },
    );
  };

  execute = async (
    graph: PureModel,
    packagePath: string,
    previewLimit: number,
  ): Promise<ExecutionResult> => {
    const input = this.createExecutionInput(
      graph,
      packagePath,
      V1_DSL_Data_Quality_PureGraphManagerExtension.DEV_PROTOCOL_VERSION,
      previewLimit,
      new V1_DQExecuteInput(),
    );

    try {
      const validationResultInText =
        await this.runValidationAndReturnString(input);
      const rawExecutionResult =
        returnUndefOnError(() =>
          this.graphManager.engine.parseExecutionResults(
            validationResultInText,
            undefined,
          ),
        ) ?? validationResultInText;
      const v1_executionResult =
        V1_serializeExecutionResult(rawExecutionResult);
      return V1_buildExecutionResult(v1_executionResult);
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
  };

  debugExecutionPlanGeneration = async (
    graph: PureModel,
    packagePath: string,
  ): Promise<{ plan: RawExecutionPlan; debug: string }> => {
    const input = this.createExecutionInput(
      graph,
      packagePath,
      V1_DSL_Data_Quality_PureGraphManagerExtension.DEV_PROTOCOL_VERSION,
      undefined,
      new V1_DQExecuteInput(),
    );

    const serializedInput = V1_DQExecuteInput.serialization.toJson(input);
    const engineServerClient = this.graphManager.engine.getEngineServerClient();

    const result: { plan: RawExecutionPlan; debug: string[] } =
      await engineServerClient.postWithTracing(
        engineServerClient.getTraceData(DQ_DEBUG_EXECUTION_PLAN),
        `${engineServerClient._pure()}/dataquality/debugPlan`,
        serializedInput,
        {},
        undefined,
        undefined,
        { enableCompression: true },
      );
    return {
      plan: result.plan,
      debug: result.debug.join('\n'),
    };
  };

  fetchStructuralValidations = async (
    graph: PureModel,
    packagePath: string,
  ): Promise<RootGraphFetchTree> => {
    const engineServerClient = this.graphManager.engine.getEngineServerClient();
    const input = this.createExecutionInput(
      graph,
      packagePath,
      V1_DSL_Data_Quality_PureGraphManagerExtension.DEV_PROTOCOL_VERSION,
      undefined,
      new V1_DQExecuteInput(),
    );

    const serializedInput = V1_DQExecuteInput.serialization.toJson(input);
    const V1_rootGraphFetchTree: V1_RootGraphFetchTree =
      await engineServerClient.postWithTracing(
        engineServerClient.getTraceData(DQ_FETCH_PROPERTY_PATH_TREE),
        `${engineServerClient._pure()}/dataquality/propertyPathTree`,
        serializedInput,
        {},
        undefined,
        undefined,
        { enableCompression: true },
      );

    const V1_dataQualityRootGraphFetchTree =
      V1_transformRootGraphFetchTreeToDataQualityRootGraphFetchTree(
        V1_rootGraphFetchTree,
      );
    const context = new V1_GraphBuilderContextBuilder(
      graph,
      graph,
      this.graphManager.graphBuilderExtensions,
      this.graphManager.logService,
    ).build();
    return V1_buildDataQualityGraphFetchTree(
      V1_dataQualityRootGraphFetchTree,
      context,
      undefined,
      [],
      new V1_ProcessingContext(''),
      true,
    ) as DataQualityRootGraphFetchTree;
  };
}
