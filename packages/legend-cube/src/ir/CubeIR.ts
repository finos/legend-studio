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

import type { JsonObject } from '../utils/Json.js';
import type { LiteralValue } from '../values/LiteralValue.js';

/**
 * Which query node an IR node was emitted for, and what part of it the IR
 * node is (e.g. a Join's `rename` or `select`). The serializer stamps it on
 * the protocol JSON as `cube:<nodeId>:<role>`, and the engine echoes it back
 * in errors, so they can be shown on the right canvas node.
 */
export interface Origin {
  readonly nodeId: string;
  /** One of `EmitRole`; never contains `:` */
  readonly role: string;
}

/**
 * The Cube IR: a host-free model of the Pure expression Cube runs, one-to-one
 * with the engine's protocol JSON (which the builder's serializer produces).
 * Every arrow call and operator is a `func` whose first parameter is its
 * receiver or left operand, as the engine's parser builds it.
 */
export type IR =
  | {
      readonly k: 'func';
      readonly name: string;
      readonly params: readonly IR[];
      readonly origin?: Origin;
    }
  | {
      readonly k: 'property';
      readonly name: string;
      readonly receiver: IR;
      readonly origin?: Origin;
    }
  | { readonly k: 'var'; readonly name: string }
  | {
      readonly k: 'lambda';
      readonly params: readonly string[];
      readonly body: readonly IR[];
    }
  | {
      readonly k: 'literal';
      readonly value: LiteralValue;
      readonly origin?: Origin;
    }
  | { readonly k: 'collection'; readonly values: readonly IR[] }
  | {
      readonly k: 'colSpec';
      readonly name: string;
      readonly fn1?: IR;
      readonly fn2?: IR;
    }
  | { readonly k: 'colSpecArray'; readonly specs: readonly IR[] }
  | {
      readonly k: 'storeAccessor';
      /** The Database element's path, then the schema and table names as stored (quotes included) */
      readonly path: readonly [string, string, string];
      readonly origin?: Origin;
    }
  /**
   * A data product's access point (`#P{dp.ap}#`, PLAN §6.8): never one with
   * parameters, so it has none
   */
  | {
      readonly k: 'dataProductAccessor';
      /** The data product's element path, then the access point's id; its group is not part of it */
      readonly path: readonly [string, string];
      readonly origin?: Origin;
    }
  /**
   * A data set of a deployed ingest definition (`#I{definition.dataSet}#`):
   * read as data, never its metadata
   */
  | {
      readonly k: 'ingestAccessor';
      /** The ingest definition's element path, then the data set's name */
      readonly path: readonly [string, string];
      readonly origin?: Origin;
      /** The deployed definition's URN, which the host reads it by: not part of the query */
      readonly urn?: string;
    }
  /** A packageable element, such as the runtime; never a type */
  | { readonly k: 'elementPtr'; readonly path: string }
  /** A type argument, e.g. of `cast`: `@String`, `@meta::pure::precisePrimitives::Varchar(15)` */
  | {
      readonly k: 'genericType';
      readonly path: string;
      readonly params?: readonly number[];
    }
  /** An enumeration value, e.g. `JoinKind.INNER` */
  | {
      readonly k: 'enumValue';
      readonly enumPath: string;
      readonly value: string;
      readonly origin?: Origin;
    }
  /**
   * `let <name> = <value>`, a statement of a lambda with several, which the
   * last one reads as `$<name>`: how a window is isolated from what follows
   * it (window isolation, PLAN §8.6)
   */
  | {
      readonly k: 'let';
      readonly name: string;
      readonly value: IR;
      readonly origin?: Origin;
    }
  /** Protocol JSON passed through as is */
  | { readonly k: 'raw'; readonly json: unknown }
  /**
   * A lambda Cube holds as the engine's JSON, an Extend column's expression
   * (PLAN §11.7): without source information, its number literals as their
   * digit strings; written with its numbers digit for digit and the origin on
   * each value specification
   */
  | {
      readonly k: 'lambdaJson';
      readonly json: JsonObject;
      readonly origin?: Origin;
    };

/** An IR expression whose value is a relation */
export type RelationExpr = IR;

export type IRKind = IR['k'];

/** The kinds of IR node that carry an origin */
export type IRWithOrigin = Extract<IR, { readonly origin?: Origin }>;

/** The parts of a query node an IR node can be, used as an origin's role */
export enum EmitRole {
  /** a source's store accessor */
  ACCESSOR = 'accessor',
  /** a Join's rename to a temporary name, a Rename's renames, and a Concat's rename of a converted column back to its name */
  RENAME = 'rename',
  /** a Join: the join call and its join kind */
  JOIN = 'join',
  /** a Join: the condition's comparisons and their `and` */
  CONDITION = 'condition',
  /** a Join: a key column in the condition */
  KEY = 'key',
  /** a Join: `toOne()` on a nullable left key */
  TO_ONE = 'toOne',
  /** a FULL Join: the extend that merges same-named keys */
  MERGE = 'merge',
  /** a FULL Join: a temporary key column read by the merge */
  MERGE_KEY = 'mergeKey',
  /** a FULL Join: `coalesce` of the two keys */
  COALESCE = 'coalesce',
  /** a FULL Join: `cast` of the merged key to the keys' common type; a Concat that converts types: `cast` of a column to the type both inputs share */
  CAST = 'cast',
  /** a select: a Join's last, a Restrict's, the one that drops a temporary column, and a Partition's that lists its columns in order */
  SELECT = 'select',
  /** a Filter: the filter call */
  FILTER = 'filter',
  /** a Filter: a comparison, `and`, `or`, `not`, or the `isEmpty` that keeps NULL rows in a negation */
  PREDICATE = 'predicate',
  /** a Filter: a column in a comparison */
  COLUMN = 'column',
  /** a Filter: a value in a comparison, a literal or an enumeration value */
  VALUE = 'value',
  /** a Limit: its limit call and its size (the capture's own limit is `limit`) */
  TAKE = 'take',
  /** a Drop: its drop call and its size */
  DROP = 'drop',
  /** a Slice: its slice call and its two bounds */
  SLICE = 'slice',
  /** a Distinct: its distinct call, and on SQL Server the column that pads it */
  DISTINCT = 'distinct',
  /** a Group: its groupBy call, or with no key its aggregate call */
  GROUP = 'group',
  /** a Group or a Partition: an aggregation's column read or `1` (Count rows), and its reduce; a Partition's rank function */
  AGGREGATION = 'aggregation',
  /** a Partition: its extends, their window and its sort keys (PLAN §11.6) */
  WINDOW = 'window',
  /** a Concat: its concatenate call */
  CONCAT = 'concat',
  /** a Difference: the extend of its differences, and each `coalesce` and `minus` in them (PLAN §11.7) */
  DIFFERENCE = 'difference',
  /** a Concat that converts types: the extend of an input's converted columns, and the column each reads */
  CONVERT = 'convert',
  /** a Limit, Drop or Slice: the sort by its input's order, written just before it */
  SORT = 'sort',
  /** a Sort: one of its keys, wherever the order is written */
  SORT_KEY = 'sortKey',
  /**
   * a Drop or Slice on a database that can't skip rows (PLAN §11.4): the
   * extend that numbers the rows, its window and `rowNumber`, and the
   * default key when no Sort orders the rows
   */
  ROW_NUMBER = 'rowNumber',
  /** a Drop or Slice on such a database: the filter on the row numbers */
  ROW_RANGE = 'rowRange',
  /** the capture node: the sort by its own order, before its limit */
  CAPTURE_SORT = 'captureSort',
  /** the capture node: `limit(rowLimit + 1)` and its literal */
  LIMIT = 'limit',
  /** the capture node: `from(runtime)` */
  FROM = 'from',
  /** a window node that isn't the capture: the `let` that binds it (PLAN §8.6) */
  LET = 'let',
  /** an Extend: the extend of each new column (PLAN §11.7) */
  EXTEND = 'extend',
  /** an Extend: a new column's expression, every value specification in it */
  EXPRESSION = 'expression',
}

// -------------------- constructors --------------------

export const func = (
  name: string,
  params: readonly IR[],
  origin?: Origin,
): IR =>
  origin ? { k: 'func', name, params, origin } : { k: 'func', name, params };

/** `$<variable>.<column>` */
export const columnAccess = (
  variable: string,
  name: string,
  origin?: Origin,
): IR => {
  const receiver: IR = { k: 'var', name: variable };
  return origin
    ? { k: 'property', name, receiver, origin }
    : { k: 'property', name, receiver };
};

export const variable = (name: string): IR => ({ k: 'var', name });

export const lambda = (params: readonly string[], body: readonly IR[]): IR => ({
  k: 'lambda',
  params,
  body,
});

export const literal = (value: LiteralValue, origin?: Origin): IR =>
  origin ? { k: 'literal', value, origin } : { k: 'literal', value };

export const collection = (values: readonly IR[]): IR => ({
  k: 'collection',
  values,
});

/** `~name`, or with a function, `~name: x | …` */
export const colSpec = (name: string, fn1?: IR): IR =>
  fn1 ? { k: 'colSpec', name, fn1 } : { k: 'colSpec', name };

/** `~name: x | … : y | …`, an aggregation: what each row gives, then how the group's values reduce */
export const aggregationColSpec = (name: string, fn1: IR, fn2: IR): IR => ({
  k: 'colSpec',
  name,
  fn1,
  fn2,
});

export const colSpecArray = (specs: readonly IR[]): IR => ({
  k: 'colSpecArray',
  specs,
});

export const storeAccessor = (
  path: readonly [string, string, string],
  origin?: Origin,
): IR =>
  origin ? { k: 'storeAccessor', path, origin } : { k: 'storeAccessor', path };

export const dataProductAccessor = (
  path: readonly [string, string],
  origin?: Origin,
): IR =>
  origin
    ? { k: 'dataProductAccessor', path, origin }
    : { k: 'dataProductAccessor', path };

export const ingestAccessor = (
  path: readonly [string, string],
  origin?: Origin,
  urn?: string,
): IR => ({
  k: 'ingestAccessor',
  path,
  ...(origin ? { origin } : {}),
  ...(urn !== undefined ? { urn } : {}),
});

export const elementPtr = (path: string): IR => ({ k: 'elementPtr', path });

/** An expression's lambda, as the engine's JSON (an Extend column's, PLAN §11.7) */
export const lambdaJson = (json: JsonObject, origin?: Origin): IR =>
  origin ? { k: 'lambdaJson', json, origin } : { k: 'lambdaJson', json };

/** `let <name> = <value>`; `variable(name)` reads it */
export const letBinding = (name: string, value: IR, origin?: Origin): IR =>
  origin ? { k: 'let', name, value, origin } : { k: 'let', name, value };

export const genericType = (
  path: string,
  params: readonly number[] = [],
): IR =>
  params.length
    ? { k: 'genericType', path, params }
    : { k: 'genericType', path };

export const enumValue = (
  enumPath: string,
  value: string,
  origin?: Origin,
): IR =>
  origin
    ? { k: 'enumValue', enumPath, value, origin }
    : { k: 'enumValue', enumPath, value };
