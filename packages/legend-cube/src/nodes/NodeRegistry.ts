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
import type { RelationExpr } from '../ir/CubeIR.js';
import type { EmitContext } from '../ir/EmitContext.js';
import { emitFilter } from '../ir/emitters/FilterEmitter.js';
import { emitDistinct } from '../ir/emitters/DistinctEmitter.js';
import { emitDrop } from '../ir/emitters/DropEmitter.js';
import { emitJoin } from '../ir/emitters/JoinEmitter.js';
import { emitLimit } from '../ir/emitters/LimitEmitter.js';
import { emitRename } from '../ir/emitters/RenameEmitter.js';
import { emitRestrict } from '../ir/emitters/RestrictEmitter.js';
import { emitSlice } from '../ir/emitters/SliceEmitter.js';
import { emitSort } from '../ir/emitters/SortEmitter.js';
import { emitRelationalTableSource } from '../ir/emitters/RelationalTableSourceEmitter.js';
import { emitDataProductAccessPointSource } from '../ir/emitters/DataProductAccessPointSourceEmitter.js';
import { FILTER_CODEC } from '../spec/codecs/FilterCodec.js';
import { DISTINCT_CODEC } from '../spec/codecs/DistinctCodec.js';
import { DROP_CODEC } from '../spec/codecs/DropCodec.js';
import { JOIN_CODEC } from '../spec/codecs/JoinCodec.js';
import { LIMIT_CODEC } from '../spec/codecs/LimitCodec.js';
import { RENAME_CODEC } from '../spec/codecs/RenameCodec.js';
import { RESTRICT_CODEC } from '../spec/codecs/RestrictCodec.js';
import { SLICE_CODEC } from '../spec/codecs/SliceCodec.js';
import { SORT_CODEC } from '../spec/codecs/SortCodec.js';
import { RELATIONAL_TABLE_SOURCE_CODEC } from '../spec/codecs/RelationalTableSourceCodec.js';
import { DATA_PRODUCT_ACCESS_POINT_SOURCE_CODEC } from '../spec/codecs/DataProductAccessPointSourceCodec.js';
import type { NodeSpecCodec } from '../spec/NodeSpecCodec.js';
import {
  DataProductAccessPointSource,
  sourcesAreOneKind,
} from './sources/DataProductAccessPointSource.js';
import {
  RelationalTableSource,
  relationalSourcesShareDatabase,
} from './sources/RelationalTableSource.js';
import { Distinct } from './transforms/Distinct.js';
import { Drop } from './transforms/Drop.js';
import { Filter } from './transforms/Filter.js';
import { Join } from './transforms/Join.js';
import { Limit } from './transforms/Limit.js';
import { Rename } from './transforms/Rename.js';
import { Restrict } from './transforms/Restrict.js';
import { Slice } from './transforms/Slice.js';
import { Sort } from './transforms/Sort.js';
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
  /**
   * Builds the IR of a valid node from the IR of its inputs, in port order: a
   * relation expression, e.g. `<input>->filter({row | …})`
   */
  emit(
    node: N,
    inputs: readonly RelationExpr[],
    context: EmitContext,
  ): RelationExpr;
  /** How the saved spec stores the node's own fields */
  readonly spec: NodeSpecCodec<N>;
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
  /** The source's relation expression, e.g. a store accessor */
  emit(
    node: S,
    inputs: readonly RelationExpr[],
    context: EmitContext,
  ): RelationExpr;
  /** How the saved spec stores the node's own fields */
  readonly spec: NodeSpecCodec<S>;
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
    emit: (node) => emitRelationalTableSource(node),
    spec: RELATIONAL_TABLE_SOURCE_CODEC,
  };

/**
 * A data product's access point (PLAN §6.8). Not in `createNodeRegistry()`
 * until its source dialog tab exists: registering a source adds it to the
 * palette and the context menu
 */
export const DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION: SourceDefinition<DataProductAccessPointSource> =
  {
    kind: 'source',
    type: DataProductAccessPointSource.TYPE,
    label: 'Data Product',
    icon: 'dataProduct',
    beta: true,
    fromCoordinates: (id, coordinates) =>
      DataProductAccessPointSource.fromCoordinates(id, coordinates),
    resolve: (node, resolution) => node.withResolution(resolution),
    // once, here: the registry joins every definition's rules
    queryRules: [sourcesAreOneKind],
    emit: (node) => emitDataProductAccessPointSource(node),
    spec: DATA_PRODUCT_ACCESS_POINT_SOURCE_CODEC,
  };

export const SORT_DEFINITION: TransformDefinition<Sort> = {
  kind: 'transform',
  type: Sort.TYPE,
  label: 'Sort by Column',
  icon: 'sort',
  beta: false,
  create: (id) => new Sort(id),
  emit: emitSort,
  spec: SORT_CODEC,
};

export const FILTER_DEFINITION: TransformDefinition<Filter> = {
  kind: 'transform',
  type: Filter.TYPE,
  label: 'Filter by Column',
  icon: 'filter',
  beta: false,
  create: (id) => new Filter(id),
  emit: emitFilter,
  spec: FILTER_CODEC,
};

export const RESTRICT_DEFINITION: TransformDefinition<Restrict> = {
  kind: 'transform',
  type: Restrict.TYPE,
  label: 'Restrict Columns',
  icon: 'restrict',
  beta: false,
  create: (id) => new Restrict(id),
  emit: emitRestrict,
  spec: RESTRICT_CODEC,
};

export const RENAME_DEFINITION: TransformDefinition<Rename> = {
  kind: 'transform',
  type: Rename.TYPE,
  label: 'Rename Columns',
  icon: 'rename',
  beta: false,
  create: (id) => new Rename(id),
  emit: emitRename,
  spec: RENAME_CODEC,
};

export const DISTINCT_DEFINITION: TransformDefinition<Distinct> = {
  kind: 'transform',
  type: Distinct.TYPE,
  label: 'Distinct Values',
  icon: 'distinct',
  beta: false,
  create: (id) => new Distinct(id),
  emit: emitDistinct,
  spec: DISTINCT_CODEC,
};

export const DROP_DEFINITION: TransformDefinition<Drop> = {
  kind: 'transform',
  type: Drop.TYPE,
  label: 'Drop first <x> rows',
  icon: 'drop',
  beta: false,
  create: (id) => new Drop(id, Drop.DEFAULT_SIZE),
  emit: emitDrop,
  spec: DROP_CODEC,
};

export const LIMIT_DEFINITION: TransformDefinition<Limit> = {
  kind: 'transform',
  type: Limit.TYPE,
  label: 'Take first <x> rows',
  icon: 'limit',
  beta: false,
  create: (id) => new Limit(id, Limit.DEFAULT_SIZE),
  emit: emitLimit,
  spec: LIMIT_CODEC,
};

export const SLICE_DEFINITION: TransformDefinition<Slice> = {
  kind: 'transform',
  type: Slice.TYPE,
  label: 'Take rows <x> to <y>',
  icon: 'slice',
  beta: false,
  create: (id) => new Slice(id, Slice.DEFAULT_START, Slice.DEFAULT_STOP),
  emit: emitSlice,
  spec: SLICE_CODEC,
};

export const JOIN_DEFINITION: TransformDefinition<Join> = {
  kind: 'transform',
  type: Join.TYPE,
  label: 'Join Another Input',
  icon: 'join',
  beta: false,
  create: (id) => new Join(id),
  emit: emitJoin,
  spec: JOIN_CODEC,
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

/** A registry with every node type Cube supports: sources, then transforms in menu order */
export const createNodeRegistry = (): NodeRegistry =>
  new NodeRegistry([
    RELATIONAL_TABLE_SOURCE_DEFINITION,
    SORT_DEFINITION,
    FILTER_DEFINITION,
    RESTRICT_DEFINITION,
    RENAME_DEFINITION,
    DISTINCT_DEFINITION,
    DROP_DEFINITION,
    LIMIT_DEFINITION,
    SLICE_DEFINITION,
    JOIN_DEFINITION,
  ]);
