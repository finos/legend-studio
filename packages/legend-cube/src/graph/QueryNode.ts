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

import type { Schema } from '../schema/Schema.js';
import { ensureSchemas } from '../inference/ValidationUtils.js';

let nextKey = 1;

/**
 * A node of the query graph: a source (no input port) or a transform (one or
 * two input ports). Nodes are immutable: an edit creates a new node with the
 * same `id` and a new `key`.
 */
export abstract class QueryNode {
  /** Assigned at construction from a monotonic sequence: the node's identity for change detection */
  readonly key: number;
  /** Unique within the query and shown to users, e.g. `filter101` */
  readonly id: string;

  constructor(id: string) {
    if (!id) {
      throw new Error(`Query node id cannot be empty`);
    }
    this.key = nextKey;
    nextKey += 1;
    this.id = id;
  }

  /** The type discriminator, e.g. `filter` */
  abstract get type(): string;

  /** The named input slots, in order: none for a source, one for a unary transform, two for a binary one */
  abstract get ports(): readonly string[];

  /** Labels for the input ports, shown on the edges that feed them */
  get portLabels(): readonly string[] {
    return [];
  }

  /**
   * Whether edits may change which nodes feed this one. Not for a node whose
   * port semantics are unknown, such as an Unknown node.
   */
  get acceptsNewInputs(): boolean {
    return true;
  }

  /**
   * The node to keep once its two inputs swap ports: by default this node. A
   * node whose settings name its inputs by side, such as a Join's key
   * columns, returns a new node (same id) with those settings swapped too.
   */
  withSwappedInputs(): QueryNode {
    return this;
  }

  /**
   * Checks the node against its input schemas, given in port order, and
   * appends a message to `errors` for each problem found.
   */
  abstract validate(
    inputSchemas: readonly Schema[],
    errors?: string[],
  ): boolean;

  /** The output schema for valid input schemas, given in port order */
  abstract schematize(inputSchemas: readonly Schema[]): Schema | undefined;

  /** A one-line description for the canvas and the details panel */
  abstract describe(): string;

  /**
   * The description without the values users typed, which may be sensitive,
   * for logs and telemetry. By default the description, which has none.
   */
  describeRedacted(): string {
    return this.describe();
  }
}

/** What resolving a source gave: nothing yet, its schema, or the error to show */
export type SourceResolution =
  | { readonly kind: 'unresolved' }
  | { readonly kind: 'resolved'; readonly schema: Schema }
  | { readonly kind: 'failed'; readonly message: string };

export const UNRESOLVED: SourceResolution = Object.freeze({
  kind: 'unresolved',
});

const SOURCE_PORTS: readonly string[] = Object.freeze([]);

/** A node with no input: its schema comes from resolving it against the model */
export abstract class SourceNode extends QueryNode {
  get ports(): readonly string[] {
    return SOURCE_PORTS;
  }
}

export const UNARY_PORTS: readonly string[] = Object.freeze(['tds']);

/** A transform with one input. By default its output schema is its input schema. */
export abstract class UnaryNode extends QueryNode {
  get ports(): readonly string[] {
    return UNARY_PORTS;
  }

  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    const [schema] = ensureSchemas(inputSchemas, this.ports);
    return schema;
  }
}

export const BINARY_PORTS: readonly string[] = Object.freeze(['tds1', 'tds2']);

export const BINARY_PORT_LABELS: readonly string[] = Object.freeze([
  'Left',
  'Right',
]);

/** A transform with two inputs, labelled Left and Right on the canvas */
export abstract class BinaryNode extends QueryNode {
  get ports(): readonly string[] {
    return BINARY_PORTS;
  }

  override get portLabels(): readonly string[] {
    return BINARY_PORT_LABELS;
  }
}
