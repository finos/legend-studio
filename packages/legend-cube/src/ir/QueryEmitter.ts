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

import type { Query } from '../graph/Query.js';
import {
  buildSchemasAndValidity,
  type SchemaInferenceResult,
} from '../inference/SchemaInference.js';
import {
  createNodeRegistry,
  type NodeRegistry,
  type TransformDefinition,
} from '../nodes/NodeRegistry.js';
import type { Schema } from '../schema/Schema.js';
import {
  EmitRole,
  elementPtr,
  func,
  type IR,
  lambda,
  literal,
  type RelationExpr,
} from './CubeIR.js';
import { originOf } from './EmitContext.js';

export interface ExecutionOptions {
  /**
   * The most rows to show. One more is fetched (`limit(rowLimit + 1)`), so a
   * result that has more can be detected. A whole number, at least 1.
   */
  readonly rowLimit: number;
  /** The path of the runtime to run the query with */
  readonly runtime: string;
}

/**
 * Builds the IR of queries, from the node types of a registry. Inference
 * runs once, when the emitter is created, with the registry's query rules,
 * as for the canvas.
 */
export class QueryEmitter {
  readonly query: Query;
  private readonly registry: NodeRegistry;
  private readonly inference: SchemaInferenceResult;

  constructor(query: Query, registry: NodeRegistry = createNodeRegistry()) {
    this.query = query;
    this.registry = registry;
    this.inference = buildSchemasAndValidity(query, registry.queryRules);
  }

  /**
   * Whether the node can be emitted: it is valid, which needs every node
   * upstream of it to be valid too, and of a registered type
   */
  canEmit(nodeId: string): boolean {
    const node = this.query.getNode(nodeId);
    return (
      node !== undefined &&
      this.inference.validity.get(nodeId)?.length === 0 &&
      this.registry.get(node.type) !== undefined
    );
  }

  /**
   * The relation expression of a node: its upstream tree, without `limit` or
   * `from`, e.g. for typing the node with the engine. The node and everything
   * upstream of it must be valid.
   */
  emitRelation(nodeId: string): RelationExpr {
    const node = this.query.getNode(nodeId);
    if (!node) {
      throw new Error(`Can't emit node "${nodeId}": it is not in the query`);
    }
    const errors = this.inference.validity.get(nodeId) ?? [];
    if (errors.length) {
      throw new Error(
        `Can't emit node "${nodeId}": it is invalid (${errors.join(' ')})`,
      );
    }
    const definition = this.registry.get(node.type);
    if (!definition) {
      throw new Error(
        `Can't emit node "${nodeId}": its type "${node.type}" is unknown`,
      );
    }
    const inputIds = this.query.getInputIds(nodeId);
    const inputs = inputIds.map((inputId) => {
      if (inputId === undefined) {
        throw new Error(`Can't emit node "${nodeId}": an input is missing`);
      }
      return this.emitRelation(inputId);
    });
    // the definition is the one registered for the node's type
    return (definition as TransformDefinition).emit(node, inputs, {
      inputSchemas: inputIds.map((inputId) => this.schemaOf(inputId as string)),
      schema: this.schemaOf(nodeId),
    });
  }

  /** The lambda that types a node with the engine: `{| <relation>}` */
  emitTypingLambda(nodeId: string): IR {
    return lambda([], [this.emitRelation(nodeId)]);
  }

  /**
   * The lambda that runs the query up to its capture node (the selected
   * node): `{| <relation>->limit(rowLimit + 1)->from(runtime)}`.
   */
  emitExecutionLambda(options: ExecutionOptions): IR {
    const { rowLimit, runtime } = options;
    if (!Number.isSafeInteger(rowLimit) || rowLimit < 1) {
      throw new Error(
        `The row limit must be a whole number of at least 1, but got ${rowLimit}`,
      );
    }
    if (!runtime) {
      throw new Error(`A query needs a runtime to run`);
    }
    const captureId = this.query.selected;
    if (captureId === undefined) {
      throw new Error(`An empty query can't run`);
    }
    const limitOrigin = originOf(captureId, EmitRole.LIMIT);
    const limited = func(
      'limit',
      [
        this.emitRelation(captureId),
        literal(
          { kind: 'integer', value: String(BigInt(rowLimit) + 1n) },
          limitOrigin,
        ),
      ],
      limitOrigin,
    );
    return lambda(
      [],
      [
        func(
          'from',
          [limited, elementPtr(runtime)],
          originOf(captureId, EmitRole.FROM),
        ),
      ],
    );
  }

  private schemaOf(nodeId: string): Schema {
    const schema = this.inference.schemas.get(nodeId);
    if (!schema) {
      throw new Error(`Node "${nodeId}" has no schema`);
    }
    return schema;
  }
}
