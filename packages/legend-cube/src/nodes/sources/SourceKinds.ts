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

import type { Query } from '../../graph/Query.js';
import type { QueryRule } from '../../inference/SchemaInference.js';
import { MESSAGE_SOURCE_KINDS_MIXED } from '../../messages/CubeMessages.js';
import { DataProductAccessPointSource } from './DataProductAccessPointSource.js';
import { RelationalTableSource } from './RelationalTableSource.js';

/**
 * The kinds of source a query reads, one per query (PLAN §6.8): each kind's
 * name, as messages give it, and its source node types. Messages name two
 * kinds in this order. A new kind of source joins with a row.
 */
const SOURCE_KINDS: readonly {
  readonly name: string;
  readonly types: readonly string[];
}[] = [
  { name: 'database tables', types: [RelationalTableSource.TYPE] },
  { name: 'data products', types: [DataProductAccessPointSource.TYPE] },
];

/** The index of a node type's kind in SOURCE_KINDS, or -1 for a node of none */
const kindOf = (type: string): number =>
  SOURCE_KINDS.findIndex((kind) => kind.types.includes(type));

const nameOf = (kind: number): string => SOURCE_KINDS[kind]?.name ?? '';

/**
 * A query reads one kind of source (PLAN §6.8): its first source of a kind
 * fixes the kind, and each source of another kind is invalid, with a message
 * naming both kinds. Nodes of no kind, such as Unknown ones, are ignored.
 * Registered once, on the data product source.
 */
export const sourcesAreOneKind: QueryRule = (query: Query) => {
  const sources = query.nodes
    .map((node) => ({ id: node.id, kind: kindOf(node.type) }))
    .filter((source) => source.kind >= 0);
  const [first] = sources;
  const errors = new Map<string, string[]>();
  if (first) {
    sources
      .filter((source) => source.kind !== first.kind)
      .forEach((source) =>
        errors.set(source.id, [
          MESSAGE_SOURCE_KINDS_MIXED(
            [
              nameOf(Math.min(source.kind, first.kind)),
              nameOf(Math.max(source.kind, first.kind)),
            ],
            nameOf(first.kind),
          ),
        ]),
      );
  }
  return errors;
};
