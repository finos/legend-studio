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
import { computeRowOrders, type RowOrder } from '../inference/RowOrder.js';
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
  letBinding,
  literal,
  type RelationExpr,
  variable,
} from './CubeIR.js';
import { originOf } from './EmitContext.js';
import { emitRowOrder } from './emitters/SortEmitter.js';

export interface ExecutionOptions {
  /**
   * The most rows to show. One more is fetched (`limit(rowLimit + 1)`), so a
   * result that has more can be detected. A whole number, at least 1. Left
   * out, the lambda has no limit of its own, as Show Pure shows the query:
   * the limit is how the grid runs it, not part of the user's query.
   */
  readonly rowLimit?: number | undefined;
  /** The path of the runtime to run the query with */
  readonly runtime: string;
  /**
   * The engine's name for the type of the database it runs on, e.g.
   * `SqlServer`, for the operations some write another way
   * (`getDialectWorkarounds`); without one, every operation is written the
   * native way
   */
  readonly databaseType?: string | undefined;
}

export interface RelationOptions {
  /**
   * Whether to write the rows' order where it is used, as a sort just before
   * each Limit, Drop or Slice that takes rows by it (PLAN §11.4): for running
   * the relation. Typing needs no sort, so by default none is written.
   */
  readonly withRowOrder?: boolean;
  /** The database type to write the relation for (`ExecutionOptions.databaseType`); typing needs none */
  readonly databaseType?: string | undefined;
}

/** The lets a run writes, in order, each binding a window before what reads it, and their names */
interface Isolation {
  readonly lets: IR[];
  readonly names: Set<string>;
}

/** What a let's name is made of: an identifier in any case, short enough for every database */
const LET_NAME_ID = /^[a-z0-9_]{1,28}$/u;

/**
 * The name of a node's let: `n_<id>`, lowercased, when the id is a short
 * identifier no other let has in any case (databases compare a CTE's name
 * without case), else `n_<k>`. A node id can be any text, and one that isn't
 * an identifier breaks the SQL (PLAN §11.6). Never a lambda parameter Cube
 * writes, since none starts with `n_`.
 */
const nameLet = (nodeId: string, taken: ReadonlySet<string>): string => {
  const own = `n_${nodeId.toLowerCase()}`;
  if (LET_NAME_ID.test(nodeId.toLowerCase()) && !taken.has(own)) {
    return own;
  }
  let index = 1;
  while (taken.has(`n_${index}`)) {
    index += 1;
  }
  return `n_${index}`;
};

/**
 * Builds the IR of queries, from the node types of a registry. Inference
 * runs once, when the emitter is created, with the registry's query rules,
 * as for the canvas.
 */
export class QueryEmitter {
  readonly query: Query;
  private readonly registry: NodeRegistry;
  private readonly inference: SchemaInferenceResult;
  private readonly rowOrders: ReadonlyMap<string, RowOrder | undefined>;

  constructor(query: Query, registry: NodeRegistry = createNodeRegistry()) {
    this.query = query;
    this.registry = registry;
    this.inference = buildSchemasAndValidity(query, registry.queryRules);
    this.rowOrders = computeRowOrders(query);
  }

  /**
   * Whether the node can be emitted: it and every node upstream of it are
   * valid and of a registered type
   */
  canEmit(nodeId: string): boolean {
    return this.findEmitError(nodeId, new Set()) === undefined;
  }

  /**
   * The relation expression of a node: its upstream tree, without `limit` or
   * `from`, e.g. for typing the node with the engine. The node must be one
   * `canEmit` accepts.
   */
  emitRelation(nodeId: string, options: RelationOptions = {}): RelationExpr {
    const error = this.findEmitError(nodeId, new Set());
    if (error) {
      throw new Error(error);
    }
    return this.emitNode(nodeId, options);
  }

  /** The lambda that types a node with the engine: `{| <relation>}` */
  emitTypingLambda(nodeId: string): IR {
    return lambda([], [this.emitRelation(nodeId)]);
  }

  /**
   * The lambda that runs the query up to its capture node (the selected
   * node): `{| <relation>->limit(rowLimit + 1)->from(runtime)}`, with no
   * `limit` when `rowLimit` is left out. The relation
   * is written with its rows' order where it is used, and the capture's own
   * order, if any, as a sort before the limit, so the rows shown are in it.
   *
   * Each node upstream of the capture whose type is an isolation boundary (a
   * window) is bound with a `let`, after the lets it reads, and read by name
   * (PLAN §8.6). The lambda is then
   * `{| {| <lets>; <relation>}->from(runtime)->sort(…)->limit(rowLimit + 1)}`:
   * a `from()` can't go inside a let, and the capture's sort and limit go
   * after it, since inside, the ORDER BY ends in a subquery that some
   * databases don't keep. Typing lambdas never bind: they type the same.
   */
  emitExecutionLambda(options: ExecutionOptions): IR {
    const { rowLimit, runtime, databaseType } = options;
    if (
      rowLimit !== undefined &&
      (!Number.isSafeInteger(rowLimit) || rowLimit < 1)
    ) {
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
    const error = this.findEmitError(captureId, new Set());
    if (error) {
      throw new Error(error);
    }
    const isolation: Isolation = { lets: [], names: new Set() };
    const relation = this.emitNode(
      captureId,
      { withRowOrder: true, databaseType },
      isolation,
    );
    const order = this.rowOrders.get(captureId);
    const sortedAndLimited = (rows: RelationExpr): RelationExpr => {
      const sorted = order?.length
        ? emitRowOrder(
            rows,
            order,
            this.schemaOf(captureId),
            originOf(captureId, EmitRole.CAPTURE_SORT),
          )
        : rows;
      if (rowLimit === undefined) {
        return sorted;
      }
      const limitOrigin = originOf(captureId, EmitRole.LIMIT);
      return func(
        'limit',
        [
          sorted,
          literal(
            { kind: 'integer', value: String(BigInt(rowLimit) + 1n) },
            limitOrigin,
          ),
        ],
        limitOrigin,
      );
    };
    const from = (rows: IR): IR =>
      func(
        'from',
        [rows, elementPtr(runtime)],
        originOf(captureId, EmitRole.FROM),
      );
    return lambda(
      [],
      [
        isolation.lets.length
          ? sortedAndLimited(from(lambda([], [...isolation.lets, relation])))
          : from(sortedAndLimited(relation)),
      ],
    );
  }

  /** Why the node can't be emitted, if it can't; `checked` holds the nodes already found emittable */
  private findEmitError(
    nodeId: string,
    checked: Set<string>,
  ): string | undefined {
    if (checked.has(nodeId)) {
      return undefined;
    }
    const node = this.query.getNode(nodeId);
    if (!node) {
      return `Can't emit node "${nodeId}": it is not in the query`;
    }
    const errors = this.inference.validity.get(nodeId);
    if (!errors || errors.length) {
      return `Can't emit node "${nodeId}": it is invalid (${(errors ?? []).join(' ')})`;
    }
    if (!this.registry.get(node.type)) {
      return `Can't emit node "${nodeId}": its type "${node.type}" is unknown`;
    }
    for (const inputId of this.query.getInputIds(nodeId)) {
      const error =
        inputId === undefined
          ? `Can't emit node "${nodeId}": an input is missing`
          : this.findEmitError(inputId, checked);
      if (error) {
        return error;
      }
    }
    checked.add(nodeId);
    return undefined;
  }

  /**
   * An input's relation: with `isolation`, an isolation boundary is bound
   * with a let, after the lets its own relation reads, and read by name. A
   * node feeds one node only (`Query`), so each is bound once.
   */
  private emitInput(
    nodeId: string,
    options: RelationOptions,
    isolation: Isolation | undefined,
  ): RelationExpr {
    if (!isolation || !this.isIsolationBoundary(nodeId)) {
      return this.emitNode(nodeId, options, isolation);
    }
    const value = this.emitNode(nodeId, options, isolation);
    const name = nameLet(nodeId, isolation.names);
    isolation.names.add(name);
    isolation.lets.push(
      letBinding(name, value, originOf(nodeId, EmitRole.LET)),
    );
    return variable(name);
  }

  private isIsolationBoundary(nodeId: string): boolean {
    const node = this.query.getNode(nodeId);
    const definition = node && this.registry.get(node.type);
    return definition?.kind === 'transform' && !!definition.isolationBoundary;
  }

  private emitNode(
    nodeId: string,
    options: RelationOptions,
    isolation?: Isolation,
  ): RelationExpr {
    const { withRowOrder, databaseType } = options;
    const node = this.query.getNode(nodeId);
    const definition = node && this.registry.get(node.type);
    if (!node || !definition) {
      throw new Error(`Can't emit node "${nodeId}"`);
    }
    const inputIds = this.query.getInputIds(nodeId) as readonly string[];
    const [inputId] = inputIds;
    // only a node that takes rows by their order gets it (a unary one)
    const inputOrder =
      withRowOrder && node.consumesInputOrder && inputId !== undefined
        ? this.rowOrders.get(inputId)
        : undefined;
    // the definition is the one registered for the node's type
    return (definition as TransformDefinition).emit(
      node,
      inputIds.map((id) => this.emitInput(id, options, isolation)),
      {
        inputSchemas: inputIds.map((id) => this.schemaOf(id)),
        schema: this.schemaOf(nodeId),
        ...(inputOrder ? { inputOrder } : {}),
        ...(databaseType === undefined ? {} : { databaseType }),
      },
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
