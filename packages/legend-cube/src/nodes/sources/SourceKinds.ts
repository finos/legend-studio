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
import { IngestDatasetSource } from './IngestDatasetSource.js';
import { RelationalTableSource } from './RelationalTableSource.js';
import { ServiceSource } from './ServiceSource.js';
import { FunctionSource } from './FunctionSource.js';
import { DataSpaceSource } from './DataSpaceSource.js';

/**
 * The kinds of source a query reads, one per query (PLAN §6.8), but for the
 * lakehouse's two (below): each kind's name, as messages give it, and its
 * source node types. Messages name two kinds in this order. A new kind of
 * source joins with a row.
 */
const SOURCE_KINDS: readonly {
  readonly name: string;
  readonly types: readonly string[];
}[] = [
  // a function joins the tables of its model (PLAN §6.5)
  {
    name: 'database tables',
    types: [RelationalTableSource.TYPE, FunctionSource.TYPE],
  },
  { name: 'data products', types: [DataProductAccessPointSource.TYPE] },
  { name: 'ingest data sets', types: [IngestDatasetSource.TYPE] },
  { name: 'services', types: [ServiceSource.TYPE] },
  // a data space's classes run with its mapping (PLAN §11.25)
  { name: 'data spaces', types: [DataSpaceSource.TYPE] },
];

/** The index of a node type's kind in SOURCE_KINDS, or -1 for a node of none */
const kindOf = (type: string): number =>
  SOURCE_KINDS.findIndex((kind) => kind.types.includes(type));

const nameOf = (kind: number): string => SOURCE_KINDS[kind]?.name ?? '';

/**
 * The name of a source node type's kind, as messages give it, e.g. `ingest
 * data sets`; none for a type of no kind
 */
export const getSourceKindName = (type: string): string | undefined =>
  SOURCE_KINDS[kindOf(type)]?.name;

/**
 * Data products and ingest data sets, the two kinds one query may read
 * together (PLAN §11.29): both run on one lakehouse runtime, and a data
 * product's access points read ingest data sets. Studio types and runs both
 * on its workspace; a host that can't run them together keeps them apart
 * with `lakehouseSourcesAreApart`
 */
const LAKEHOUSE_KINDS: readonly number[] = [
  kindOf(DataProductAccessPointSource.TYPE),
  kindOf(IngestDatasetSource.TYPE),
];

const isLakehouseKind = (kind: number): boolean =>
  LAKEHOUSE_KINDS.includes(kind);

/** The query's sources of a kind, in order; nodes of no kind, such as Unknown ones, left out */
const sourcesOf = (query: Query): { id: string; kind: number }[] =>
  query.nodes
    .map((node) => ({ id: node.id, kind: kindOf(node.type) }))
    .filter((source) => source.kind >= 0);

/** The message of a source of one kind in a query whose first source is of another */
const mixedKindsMessage = (kind: number, firstKind: number): string =>
  MESSAGE_SOURCE_KINDS_MIXED(
    [nameOf(Math.min(kind, firstKind)), nameOf(Math.max(kind, firstKind))],
    nameOf(firstKind),
  );

/**
 * A query reads one kind of source (PLAN §6.8), or data products with ingest
 * data sets (§11.29): its first source of a kind fixes the kind, and each
 * source of a kind that can't join it is invalid, with a message naming both
 * kinds. Nodes of no kind, such as Unknown ones, are ignored. Registered
 * once, on the data product source.
 */
export const sourcesAreOneKind: QueryRule = (query: Query) => {
  const sources = sourcesOf(query);
  const [first] = sources;
  const errors = new Map<string, string[]>();
  if (first) {
    sources
      .filter(
        (source) =>
          source.kind !== first.kind &&
          !(isLakehouseKind(source.kind) && isLakehouseKind(first.kind)),
      )
      .forEach((source) =>
        errors.set(source.id, [mixedKindsMessage(source.kind, first.kind)]),
      );
  }
  return errors;
};

/**
 * Data products and ingest data sets kept apart, for a host that can't run
 * them together, as a query read them before §11.29: in a query whose first
 * source is of one of the two kinds, each source of the other is invalid,
 * with the message `sourcesAreOneKind` gave it. Sources of other kinds are
 * left to that rule
 */
export const lakehouseSourcesAreApart: QueryRule = (query: Query) => {
  const sources = sourcesOf(query);
  const [first] = sources;
  const errors = new Map<string, string[]>();
  if (first && isLakehouseKind(first.kind)) {
    sources
      .filter(
        (source) => source.kind !== first.kind && isLakehouseKind(source.kind),
      )
      .forEach((source) =>
        errors.set(source.id, [mixedKindsMessage(source.kind, first.kind)]),
      );
  }
  return errors;
};
