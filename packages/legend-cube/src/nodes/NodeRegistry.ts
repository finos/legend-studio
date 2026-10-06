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

import type {
  QueryNode,
  SourceNode,
  SourceResolution,
} from '../graph/QueryNode.js';
import type { QueryRule } from '../inference/SchemaInference.js';
import {
  RelationalTableSource,
  relationalSourcesShareDatabase,
} from './sources/RelationalTableSource.js';
import { UnknownNode } from './UnknownNode.js';

/** What the palette, the context menu and the saved-spec codec know about a type of node */
export interface NodeDefinition {
  readonly type: string;
  readonly label: string;
  /** An icon name, which the UI maps to an icon */
  readonly icon: string;
  /** Shows a BETA badge */
  readonly beta: boolean;
}

export interface TransformDefinition<N extends QueryNode = QueryNode>
  extends NodeDefinition {
  readonly kind: 'transform';
  /** A new node of the type, with default settings */
  create(id: string): N;
}

export interface SourceDefinition<S extends SourceNode = SourceNode>
  extends NodeDefinition {
  readonly kind: 'source';
  /** An unresolved source from what the source picker returned */
  fromCoordinates(id: string, coordinates: unknown): S;
  /** A new source with the same id and settings, and this resolution */
  resolve(node: S, resolution: SourceResolution): S;
  /** Rules over the whole query that this kind of source needs */
  readonly queryRules?: readonly QueryRule[];
}

export type AnyNodeDefinition = TransformDefinition | SourceDefinition;

export const RELATIONAL_TABLE_SOURCE_DEFINITION: SourceDefinition<RelationalTableSource> =
  {
    kind: 'source',
    type: RelationalTableSource.TYPE,
    label: 'Relational Database Table',
    icon: 'table',
    beta: false,
    fromCoordinates: (id, coordinates) =>
      RelationalTableSource.fromCoordinates(id, coordinates),
    resolve: (node, resolution) => node.withResolution(resolution),
    queryRules: [relationalSourcesShareDatabase],
  };

/**
 * The node types Cube offers, as the one source of truth for the palette, the
 * context menu and the saved-spec codec. The Unknown type is reserved: it is
 * what an unregistered type decodes to.
 */
export class NodeRegistry {
  private readonly definitions = new Map<string, AnyNodeDefinition>();

  constructor(definitions: readonly AnyNodeDefinition[] = []) {
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition: AnyNodeDefinition): void {
    if (definition.type === UnknownNode.TYPE) {
      throw new Error(`Node type "${UnknownNode.TYPE}" is reserved`);
    }
    if (this.definitions.has(definition.type)) {
      throw new Error(`Node type "${definition.type}" is already registered`);
    }
    this.definitions.set(definition.type, definition);
  }

  get(type: string): AnyNodeDefinition | undefined {
    return this.definitions.get(type);
  }

  /** The source definitions, in registration order */
  get sources(): SourceDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (definition): definition is SourceDefinition =>
        definition.kind === 'source',
    );
  }

  /** The transform definitions, in registration order */
  get transforms(): TransformDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (definition): definition is TransformDefinition =>
        definition.kind === 'transform',
    );
  }

  /** The query rules of every registered source, for schema inference */
  get queryRules(): QueryRule[] {
    return this.sources.flatMap((definition) => definition.queryRules ?? []);
  }
}

/** A registry with every node type Cube supports */
export const createNodeRegistry = (): NodeRegistry =>
  new NodeRegistry([RELATIONAL_TABLE_SOURCE_DEFINITION]);
