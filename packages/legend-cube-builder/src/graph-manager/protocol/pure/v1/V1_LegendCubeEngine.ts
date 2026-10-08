/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  EmitRole,
  type IR,
  lambda,
  type ModelContext,
  type Schema,
  storeAccessor,
} from '@finos/legend-cube';
import { V1_EngineServerClient, V1_RenderStyle } from '@finos/legend-graph';
import {
  type PlainObject,
  stringifyLosslessJSON,
  type TracerService,
} from '@finos/legend-shared';
import {
  type AccessorPath,
  type CubeEngine,
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
  type CubeResult,
  type NodeId,
} from '../../../CubeEngine.js';
import {
  V1_buildCubeEngineError,
  V1_toCubeEngineError,
} from './V1_CubeEngineErrors.js';
import {
  V1_CubeUnreadableResultError,
  V1_readCubeExecutionResult,
} from './V1_CubeExecutionResultReader.js';
import { V1_serializeCubeLambda } from './V1_CubeLambdaSerializer.js';
import { V1_buildCubeModelOutline } from './V1_CubeModelOutlineBuilder.js';
import { V1_buildCubeSchema } from './V1_CubeRelationTypeAdapter.js';

/** The engine client's configuration, as the host gives it (legend-graph doesn't export its type) */
export type V1_CubeEngineConfig = ConstructorParameters<
  typeof V1_EngineServerClient
>[0];

/** The only model kind the slice runs: Pure text (PLAN §6.2.2) */
const TEXT_MODEL_TYPE = 'text';

const EXECUTION_CLIENT_VERSION = 'vX_X_X';

/**
 * The node an execution lambda runs: the one its `from` call is stamped with
 * (`{| <relation>->limit(…)->from(runtime)}`), where errors without a stamp go
 */
const captureNodeOf = (executionLambda: IR): NodeId | undefined => {
  const from =
    executionLambda.k === 'lambda' ? executionLambda.body[0] : undefined;
  return from?.k === 'func' ? from.origin?.nodeId : undefined;
};

/** The message for a model of a kind this version can't run (PLAN §8.7) */
export const V1_unsupportedModelMessage = (type: string): string =>
  `This cube's model kind "${type}" isn't supported yet.`;

/**
 * The Legend engine behind the Cube engine port (PLAN §8.7). It sends the
 * cube's saved model context as it is, lambdas as protocol JSON with lossless
 * numbers, and reads every response itself: the graph manager's wrappers drop
 * type parameters and read numbers lossily (D8).
 */
export class V1_LegendCubeEngine implements CubeEngine {
  readonly client: V1_EngineServerClient;

  constructor(config: V1_CubeEngineConfig, tracerService: TracerService) {
    this.client = new V1_EngineServerClient(config);
    // every call throws without one
    this.client.setTracerService(tracerService);
  }

  /** The model's Pure text, or an unsupported-model error for any other kind */
  private textOf(model: ModelContext, nodeId?: NodeId): string {
    if (model._type !== TEXT_MODEL_TYPE || typeof model.code !== 'string') {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        V1_unsupportedModelMessage(model._type),
        nodeId,
      );
    }
    return model.code;
  }

  async loadModel(model: ModelContext): Promise<CubeModelOutline> {
    const code = this.textOf(model);
    try {
      return V1_buildCubeModelOutline(
        await this.client.grammarToJSON_model(code),
      );
    } catch (error) {
      throw V1_toCubeEngineError(error, undefined, CubeEngineErrorKind.COMPILE);
    }
  }

  resolveSchemas(
    model: ModelContext,
    accessors: ReadonlyMap<NodeId, AccessorPath>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    return this.typeAll(
      model,
      new Map(
        [...accessors].map(([nodeId, path]) => [
          nodeId,
          lambda(
            [],
            [storeAccessor(path, { nodeId, role: EmitRole.ACCESSOR })],
          ),
        ]),
      ),
    );
  }

  typeLambdas(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    return this.typeAll(model, lambdas);
  }

  /** Types every lambda in one batch call: one entry per key, whatever fails */
  private async typeAll(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const typed = new Map<NodeId, Schema | CubeEngineError>();
    if (!lambdas.size) {
      return typed;
    }
    const failAll = (error: unknown): Map<NodeId, CubeEngineError> =>
      new Map(
        [...lambdas.keys()].map((nodeId) => [
          nodeId,
          V1_toCubeEngineError(error, nodeId, CubeEngineErrorKind.COMPILE),
        ]),
      );
    let response: PlainObject;
    try {
      this.textOf(model);
      const body = stringifyLosslessJSON({
        model,
        lambdas: Object.fromEntries(
          [...lambdas].map(([nodeId, ir]) => [
            nodeId,
            V1_serializeCubeLambda(ir),
          ]),
        ),
      });
      // sent as text, so numbers keep every digit; the client sends a string body as it is
      response = (await this.client.batchLambdasRelationType(
        body as unknown as PlainObject,
      )) as unknown as PlainObject;
    } catch (error) {
      return failAll(error);
    }
    // the engine answers `result`; legend-graph's response type says `results` (LG-1)
    const results = (response.result ?? response.results ?? {}) as PlainObject;
    const errors = (response.errors ?? {}) as PlainObject;
    // own keys only: a node id like `__proto__` mustn't read Object.prototype
    lambdas.forEach((_, nodeId) => {
      const relationType = Object.hasOwn(results, nodeId)
        ? results[nodeId]
        : undefined;
      if (relationType) {
        try {
          typed.set(nodeId, V1_buildCubeSchema(relationType as PlainObject));
        } catch (error) {
          typed.set(
            nodeId,
            new CubeEngineError(
              CubeEngineErrorKind.COMPILE,
              (error as Error).message,
              nodeId,
            ),
          );
        }
        return;
      }
      typed.set(
        nodeId,
        V1_buildCubeEngineError(
          Object.hasOwn(errors, nodeId) ? errors[nodeId] : undefined,
          nodeId,
          CubeEngineErrorKind.COMPILE,
        ) ??
          new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            `The engine gave no type for this node`,
            nodeId,
          ),
      );
    });
    return typed;
  }

  async execute(
    model: ModelContext,
    executionLambda: IR,
    options?: { abortController?: AbortController | undefined },
  ): Promise<CubeResult> {
    const captureId = captureNodeOf(executionLambda);
    const startedAt = Date.now();
    let text: string;
    try {
      this.textOf(model);
      const body = stringifyLosslessJSON({
        clientVersion: EXECUTION_CLIENT_VERSION,
        function: V1_serializeCubeLambda(executionLambda),
        model,
        context: { _type: 'BaseExecutionContext' },
        parameterValues: [],
      });
      // `returnAsResponse` leaves the body unread, so it can be read losslessly
      const response = (await this.client.runQuery(
        body as unknown as PlainObject,
        {
          returnAsResponse: true,
          abortController: options?.abortController,
        },
      )) as Response;
      text = await response.text();
    } catch (error) {
      throw V1_toCubeEngineError(
        error,
        captureId,
        CubeEngineErrorKind.EXECUTION,
      );
    }
    try {
      return {
        ...V1_readCubeExecutionResult(text),
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error instanceof V1_CubeUnreadableResultError) {
        throw new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          error.message,
          captureId,
        );
      }
      throw error;
    }
  }

  async renderPure(lambdaIR: IR): Promise<string> {
    try {
      // sent as text, as typing and execution are: the serialized lambda holds
      // lossless numbers, which plain JSON.stringify would write as objects
      return await this.client.JSONToGrammar_lambda(
        stringifyLosslessJSON(
          V1_serializeCubeLambda(lambdaIR),
        ) as unknown as PlainObject,
        V1_RenderStyle.PRETTY,
      );
    } catch (error) {
      throw V1_toCubeEngineError(error, undefined, CubeEngineErrorKind.COMPILE);
    }
  }
}
