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

import { FILTER_OPERATOR_DESCRIPTIONS } from '../filter/FilterOperator.js';
import { findPatternWildcardOperator } from '../filter/FilterTree.js';
import type { Query } from '../graph/Query.js';
import type { QueryNode } from '../graph/QueryNode.js';
import {
  MESSAGE_CONDITION_WILDCARD,
  MESSAGE_FILTER_VALUE_WILDCARD,
  MESSAGE_PIVOT_UNSUPPORTED_DATABASE,
} from '../messages/CubeMessages.js';
import { Distinct } from '../nodes/transforms/Distinct.js';
import { Drop } from '../nodes/transforms/Drop.js';
import {
  ExpressionFilter,
  findLikeFunctionWithWildcard,
} from '../nodes/transforms/ExpressionFilter.js';
import { Filter } from '../nodes/transforms/Filter.js';
import { Limit } from '../nodes/transforms/Limit.js';
import { Pivot } from '../nodes/transforms/Pivot.js';
import { Slice } from '../nodes/transforms/Slice.js';

/**
 * Which operations a database needs written another way (PLAN §11.4), as
 * the engine's plan for it gets them wrong: the database rejects the SQL, or
 * the SQL takes the wrong rows
 */
export interface CubeDialectWorkarounds {
  /**
   * Drop through row numbers: for a Drop inside a query, the engine writes
   * `limit m,-1`, which SQL Server, Sybase and DB2 reject, or numbers the
   * rows itself by the first sort key only (Sybase IQ, MemSQL), or after a
   * descending key writes `nulls firstoffset m`, one word (ClickHouse)
   */
  readonly drop: boolean;
  /**
   * Slice through row numbers: for a Slice inside a query, the engine writes
   * `limit m,n`, which SQL Server and Sybase reject, or numbers the rows
   * itself by the first sort key only (Sybase IQ)
   */
  readonly slice: boolean;
  /**
   * Limit through row numbers: in a subquery, the engine numbers a limit's
   * rows itself, by the first sort key only, in a column it always names
   * `row_number` (Sybase IQ), so ties on that key take any rows and an input
   * column of that name clashes
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
  [
    'ClickHouse',
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

/**
 * The database types with no default `LIKE` escape character (PLAN §11.11):
 * the engine escapes `%` and `_` in the patterns of StartsWith, EndsWith and
 * Contains with `\` but writes no `ESCAPE` clause, so these read `\%` as a
 * backslash then any text, and the rows are wrong, with no error. Found on
 * DuckDB; H2 reads `\` as its escape character.
 */
const NO_LIKE_ESCAPE_TYPES: ReadonlySet<string> = new Set(['DuckDB']);

/** Whether a database type has no default `LIKE` escape character, so a pattern can't be given `%` or `_` */
export const hasNoLikeEscape = (
  databaseType: string | undefined,
): databaseType is string =>
  databaseType !== undefined && NO_LIKE_ESCAPE_TYPES.has(databaseType);

/**
 * What in a node gives `%` or `_` to a pattern, as its message for a
 * database type: a Filter's StartsWith, EndsWith or Contains value, negated
 * or not, or a Filter by Expression's literal given to `startsWith`,
 * `endsWith` or `contains`; `undefined` when nothing does. Only literals are
 * read.
 */
const findPatternWildcard = (
  node: QueryNode,
): ((databaseType: string) => string) | undefined => {
  if (node instanceof Filter) {
    const operator = findPatternWildcardOperator(node.filter);
    return operator === undefined
      ? undefined
      : (databaseType) =>
          MESSAGE_FILTER_VALUE_WILDCARD(
            FILTER_OPERATOR_DESCRIPTIONS[operator],
            databaseType,
          );
  }
  if (node instanceof ExpressionFilter) {
    const fn = findLikeFunctionWithWildcard(node.lambda);
    return fn === undefined
      ? undefined
      : (databaseType) => MESSAGE_CONDITION_WILDCARD(fn, databaseType);
  }
  return undefined;
};

/** Whether a node gives `%` or `_` to a pattern, so whether it can run depends on the database type */
export const givesPatternWildcard = (node: QueryNode): boolean =>
  findPatternWildcard(node) !== undefined;

/**
 * The database types known not to run the engine's static `pivot()` (PLAN
 * §11.12): H2 can't translate it, 13 types assert "pivot is not supported",
 * and Trino and Athena plan it with no PIVOT. Snowflake, Databricks, MemSQL
 * (SingleStore) and DuckDB run it; a type in neither list is allowed, for
 * the engine to judge. A `Set`: the type comes from the model.
 */
export const PIVOT_UNSUPPORTED_DATABASE_TYPES: ReadonlySet<string> = new Set([
  'H2',
  'Postgres',
  'SqlServer',
  'Sybase',
  'SybaseIQ',
  'DB2',
  'Spanner',
  'Oracle',
  'Trino',
  'Presto',
  'Redshift',
  'Hive',
  'BigQuery',
  'Athena',
  'ClickHouse',
  'Composite',
]);

/** Whether a node of the type can run on the database type: a Pivot only where it isn't known to fail; any type when none is known */
const getTypeProblem = (
  type: string,
  databaseType: string,
): string | undefined =>
  type === Pivot.TYPE && PIVOT_UNSUPPORTED_DATABASE_TYPES.has(databaseType)
    ? MESSAGE_PIVOT_UNSUPPORTED_DATABASE(databaseType)
    : undefined;

/**
 * Why a node of the type can't be added on the database type, before it
 * exists (PLAN §11.12): a Pivot on a database known not to run it.
 * `undefined` when it can, or no type is known.
 */
export const getDatabaseProblemOfType = (
  type: string,
  databaseType: string | undefined,
): string | undefined =>
  databaseType === undefined ? undefined : getTypeProblem(type, databaseType);

/**
 * A node's problems on a database type: a Pivot where it can't run (PLAN
 * §11.12); `%` or `_` given to a pattern, on a database with no default
 * `LIKE` escape character (`hasNoLikeEscape`, PLAN §11.11), as `\` is
 * refused everywhere. None for another type, or none known.
 */
export const getDatabaseProblems = (
  node: QueryNode,
  databaseType: string | undefined,
): string[] => {
  if (databaseType === undefined) {
    return [];
  }
  const typeProblem = getTypeProblem(node.type, databaseType);
  const pattern = hasNoLikeEscape(databaseType)
    ? findPatternWildcard(node)
    : undefined;
  return [
    ...(typeProblem === undefined ? [] : [typeProblem]),
    ...(pattern ? [pattern(databaseType)] : []),
  ];
};

const WORKAROUND_TYPES: ReadonlySet<string> = new Set([
  Drop.TYPE,
  Slice.TYPE,
  Limit.TYPE,
  Distinct.TYPE,
]);

/**
 * Whether how a node runs depends on the database type: a Drop, a Slice, a
 * Limit or a Distinct, which some databases take another way (PLAN §11.4); a
 * Pivot, which some can't run (§11.12); a filter that gives `%` or `_` to a
 * pattern (`givesPatternWildcard`, §11.11). The one rule for when Cube needs
 * the database type.
 */
export const dependsOnDatabaseType = (node: QueryNode): boolean =>
  WORKAROUND_TYPES.has(node.type) ||
  node.type === Pivot.TYPE ||
  givesPatternWildcard(node);

/**
 * Whether running the query up to a node can depend on the database type: it
 * or a node upstream of it does (`dependsOnDatabaseType`). Only then does a
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
      (dependsOnDatabaseType(node) ||
        query
          .getInputIds(id)
          .some((inputId) => inputId !== undefined && visit(inputId)))
    );
  };
  return visit(nodeId);
};
