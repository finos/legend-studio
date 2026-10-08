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
import { Distinct } from '../nodes/transforms/Distinct.js';
import { Drop } from '../nodes/transforms/Drop.js';
import { Slice } from '../nodes/transforms/Slice.js';

/** Which operations a database needs written another way (PLAN §11.4) */
export interface CubeDialectWorkarounds {
  /** Drop through row numbers: the database rejects the engine's `limit m,-1` */
  readonly drop: boolean;
  /** Slice through row numbers: the database rejects the engine's `limit m,n` */
  readonly slice: boolean;
  /** Distinct padded with a column: the engine writes `top N distinct`, which SQL Server rejects */
  readonly distinct: boolean;
}

const NO_WORKAROUNDS: CubeDialectWorkarounds = Object.freeze({
  drop: false,
  slice: false,
  distinct: false,
});

/**
 * The workarounds by the engine's database type names (its `DatabaseType`),
 * from plans of every M2 shape on each database (PLAN §11.4). BigQuery joins
 * only after a plan probe; Spanner never gets row numbers, which it doesn't
 * support. A `Map`: the type comes from the model, and must never reach an
 * object's prototype.
 */
export const CUBE_DIALECT_WORKAROUNDS: ReadonlyMap<
  string,
  CubeDialectWorkarounds
> = new Map<string, CubeDialectWorkarounds>([
  ['SqlServer', Object.freeze({ drop: true, slice: true, distinct: true })],
  ['Sybase', Object.freeze({ drop: true, slice: true, distinct: false })],
  ['SybaseIQ', Object.freeze({ drop: true, slice: true, distinct: false })],
  ['DB2', Object.freeze({ drop: true, slice: false, distinct: false })],
  ['MemSQL', Object.freeze({ drop: true, slice: false, distinct: false })],
]);

/** The workarounds of a database type; none for an unknown or missing type, which keep the native forms */
export const getDialectWorkarounds = (
  databaseType: string | undefined,
): CubeDialectWorkarounds =>
  (databaseType === undefined
    ? undefined
    : CUBE_DIALECT_WORKAROUNDS.get(databaseType)) ?? NO_WORKAROUNDS;

const WORKAROUND_TYPES: ReadonlySet<string> = new Set([
  Drop.TYPE,
  Slice.TYPE,
  Distinct.TYPE,
]);

/**
 * Whether running the query up to a node can depend on the database type: it
 * or a node upstream of it is a Drop, a Slice or a Distinct. Only then does a
 * run need the model's connections.
 */
export const needsDatabaseType = (query: Query, nodeId: string): boolean => {
  const seen = new Set<string>();
  const visit = (id: string): boolean => {
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    const node = query.getNode(id);
    return (
      node !== undefined &&
      (WORKAROUND_TYPES.has(node.type) ||
        query
          .getInputIds(id)
          .some((inputId) => inputId !== undefined && visit(inputId)))
    );
  };
  return visit(nodeId);
};
