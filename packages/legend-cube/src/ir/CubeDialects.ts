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
import { Limit } from '../nodes/transforms/Limit.js';
import { Slice } from '../nodes/transforms/Slice.js';

/**
 * Which operations a database needs written another way (PLAN §11.4), as
 * the engine's plan for it gets them wrong: the database rejects the SQL, or
 * the SQL takes the wrong rows
 */
export interface CubeDialectWorkarounds {
  /**
   * Drop through row numbers: the engine writes `limit m,-1`, which SQL
   * Server, Sybase, Sybase IQ and DB2 reject, or numbers the rows itself by
   * the first sort key only (MemSQL)
   */
  readonly drop: boolean;
  /**
   * Slice through row numbers: the engine writes `limit m,n`, which SQL
   * Server and Sybase reject, or numbers the rows by the first sort key only
   * (Sybase IQ)
   */
  readonly slice: boolean;
  /**
   * A Limit after a Sort on several columns through row numbers: in a
   * subquery, the engine numbers its rows by the first sort key only (Sybase
   * IQ), so ties on it take any rows
   */
  readonly limit: boolean;
  /**
   * Distinct padded with a column, so it keeps its own query: the engine
   * writes a distinct then a limit as `select top N distinct`, which SQL
   * Server rejects, or numbers a limit's rows inside the `select distinct`,
   * which then removes nothing (Sybase IQ)
   */
  readonly distinct: boolean;
}

const NO_WORKAROUNDS: CubeDialectWorkarounds = Object.freeze({
  drop: false,
  slice: false,
  limit: false,
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
  [
    'SqlServer',
    Object.freeze({ drop: true, slice: true, limit: false, distinct: true }),
  ],
  [
    'Sybase',
    Object.freeze({ drop: true, slice: true, limit: false, distinct: false }),
  ],
  [
    'SybaseIQ',
    Object.freeze({ drop: true, slice: true, limit: true, distinct: true }),
  ],
  [
    'DB2',
    Object.freeze({ drop: true, slice: false, limit: false, distinct: false }),
  ],
  [
    'MemSQL',
    Object.freeze({ drop: true, slice: false, limit: false, distinct: false }),
  ],
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
  Limit.TYPE,
  Distinct.TYPE,
]);

/**
 * Whether running the query up to a node can depend on the database type: it
 * or a node upstream of it is a Drop, a Slice, a Limit or a Distinct. Only
 * then does a run need the model's connections.
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
