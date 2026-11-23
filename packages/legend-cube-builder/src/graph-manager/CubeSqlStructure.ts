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

// The SQL of an island, `#SQL{…}#`, as steps to draw: its clauses in the
// order they run, as SQL writes them. The engine parses the SQL (a host asks
// it for the tree), Cube reads the tree's clauses and prints what each says;
// it checks none of it.

/** What a step of an island's SQL is */
export enum CubeSqlStepKind {
  /** An ingest data set, `i('definition.dataSet')` */
  DATA_SET = 'dataSet',
  /** A name of the Pure around the island whose rows it reads, `var('name')` */
  VARIABLE = 'variable',
  /** Any other source: a table, an access point, a function, CSV… */
  SOURCE = 'source',
  JOIN = 'join',
  WHERE = 'where',
  GROUP_BY = 'groupBy',
  HAVING = 'having',
  SELECT = 'select',
  ORDER_BY = 'orderBy',
  OFFSET = 'offset',
  LIMIT = 'limit',
  /** `union`, `intersect` or `except` */
  SET = 'set',
  /** A query the SQL after it reads by a name: `with name as (…)`, `(…) name` */
  NAMED = 'named',
}

/** How a join of an island's SQL joins, as the engine's tree says it */
export enum CubeSqlJoinType {
  INNER = 'INNER',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FULL = 'FULL',
  CROSS = 'CROSS',
}

/** A step of an island's SQL */
export interface CubeSqlStep {
  readonly kind: CubeSqlStepKind;
  /**
   * What it says, as SQL: a Where's condition, a Select's columns, a join's
   * `on …`, a source's path or call, a named query's name; empty when it
   * says nothing more, e.g. a cross join
   */
  readonly text: string;
  /** The steps whose rows it reads, in order: a join's left, then its right */
  readonly inputs: readonly CubeSqlStep[];
  /**
   * What kind it is of its kind: a join's type (`CubeSqlJoinType`), a set
   * operation's words (`union all`), a source's function (`tb`, `p`, `func`,
   * `csv`…, `table` for a table by name), `distinct` for a Select that is
   */
  readonly variant?: string | undefined;
  /** The name the SQL after it calls a source by: `o` in `from i('…') o` */
  readonly alias?: string | undefined;
  /** A data set's ingest definition, by path, then its name */
  readonly dataSet?: readonly [string, string] | undefined;
  /** A variable's name */
  readonly variable?: string | undefined;
  /** A Select's columns, by the names its rows give them: `*` for all */
  readonly columns?: readonly string[] | undefined;
}

/** Each step of an island's SQL, a step after the steps it reads */
export const listCubeSqlSteps = (last: CubeSqlStep): CubeSqlStep[] => [
  ...last.inputs.flatMap(listCubeSqlSteps),
  last,
];
