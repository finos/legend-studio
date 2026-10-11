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

import { buildQuickFilterRule } from '../filter/FilterBuilder.js';
import { FilterOperator } from '../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
} from '../filter/FilterTree.js';
import type { Query } from '../graph/Query.js';
import {
  AggregationFunction,
  type ColumnAggregation,
  getAggregationAutoName,
} from '../nodes/transforms/Aggregation.js';
import { Filter } from '../nodes/transforms/Filter.js';
import { Group } from '../nodes/transforms/Group.js';
import {
  type ColumnDirection,
  Sort,
  SortDirection,
} from '../nodes/transforms/Sort.js';
import { foldColumnName, isValidColumnName } from '../schema/ColumnName.js';
import type { Schema } from '../schema/Schema.js';
import { isSortableType } from '../types/TypeCompatibility.js';
import { TypeFamily } from '../types/TypeFamily.js';
import type { CubeType } from '../types/CubeType.js';
import { parseValue } from '../values/ValueEntry.js';
import type { CheckedDrilldown } from './Drilldown.js';

// The query of one level of the grid's drill-down (spec §12.2, PLAN §11.10),
// derived from the run's query: Cube's own nodes appended after the node it
// ran, so every database workaround applies as to any query. The user's
// query is never changed; a derived one is run and dropped.

/** A cell's value as the engine returned it: exact text for an integer or a decimal */
export type DrilldownCell = string | number | boolean | null;

/**
 * The filter that finds a group's rows again by one of its keys, as the
 * engine returned it: Is Empty for an empty key; for a float, `In` of the
 * value and the 32-bit float nearest it, written in full, since a 32-bit
 * column's value comes back as its shortest text (`0.02`), which the
 * database's widened value never equals, and Cube can't tell such a column by
 * its type (PLAN §11.10); else the grid's 'Filter by' rule
 * (`buildQuickFilterRule`), Equal on the value read as the column's type.
 * `undefined` when the value can't be compared.
 */
export const buildDrilldownKeyRule = (
  column: string,
  type: CubeType,
  cell: DrilldownCell,
): ColumnComparisonFilter | undefined => {
  if (cell !== null && type.family === TypeFamily.FLOAT) {
    const value = parseValue(String(cell), type);
    if (value === undefined || value.kind !== 'float') {
      return undefined;
    }
    const single = Math.fround(Number(value.value));
    if (!Number.isFinite(single) || single === Number(value.value)) {
      return new ColumnComparisonFilter(column, FilterOperator.EQUAL, value);
    }
    return new ColumnComparisonFilter(column, FilterOperator.IN, [
      value,
      { kind: 'float', value: String(single) },
    ]);
  }
  return buildQuickFilterRule(column, type, cell);
};

export interface DrilldownLevelRequest {
  /** The query of the run being expanded, and the node it ran */
  readonly query: Query;
  readonly captureId: string;
  /** That node's schema: the run's columns */
  readonly schema: Schema;
  /** The drill-down, checked against the schema (`checkDrilldown`) */
  readonly drilldown: CheckedDrilldown;
  /**
   * The keys of the expanded groups, outermost first, one per level already
   * expanded: none for the top level, as many as there are levels for the
   * rows of the innermost groups
   */
  readonly keys: readonly DrilldownCell[];
  /** The grid's sort, by the run's column names */
  readonly sorts: readonly ColumnDirection[];
}

export interface DrilldownLevel {
  /** The derived query, its selected node the one to run */
  readonly query: Query;
  /** Whether the level's rows are the run's rows rather than groups */
  readonly isLeaf: boolean;
  /** The level's group columns: the drill-down's levels down to this one, none for the rows */
  readonly groupColumns: readonly string[];
  /**
   * The output column holding each of the run's columns, by the run's column
   * name: the column itself at the leaf and for a group column, its
   * aggregation at a group level; a column with neither is empty there
   */
  readonly columns: ReadonlyMap<string, string>;
  /** The output column counting each group's rows; none at the leaf */
  readonly countColumn: string | undefined;
}

/**
 * A name for a level's output column that no column has in any case: the
 * base, else numbered (`Count Rows 2`, as a Group by's, PLAN §11.5); Cube's
 * fallback (`cube_value`, `cube_value2`) when neither is a valid name, e.g.
 * past the length limit
 */
const freeName = (
  base: string | undefined,
  taken: Set<string>,
  fallback: string,
): string => {
  const candidates = function* (): Generator<string> {
    if (base && isValidColumnName(base)) {
      yield base;
      for (let index = 2; ; index += 1) {
        const numbered = `${base} ${index}`;
        if (!isValidColumnName(numbered)) {
          break;
        }
        yield numbered;
      }
    }
    yield fallback;
    for (let index = 2; ; index += 1) {
      yield `${fallback}${index}`;
    }
  };
  for (const name of candidates()) {
    if (!taken.has(foldColumnName(name))) {
      taken.add(foldColumnName(name));
      return name;
    }
  }
  // the fallbacks never end
  throw new Error('No free column name');
};

/**
 * The query of one level of the drill-down, derived from the run's: after
 * the node it ran, a Filter of the expanded groups' keys (one rule each,
 * `buildDrilldownKeyRule`, joined by And), then at a group level a Group by
 * the levels down to this one, with each other column's aggregation
 * (`CheckedDrilldown.aggregationOf`) under a Group's own name and a Count
 * rows, then a Sort. At a group level the grid's sort on a group column is
 * kept, on another column becomes its aggregation's, and is left out on a
 * column with none; then the groups are sorted by the new level's column,
 * unless the grid already sorts by it, so a level cut at the row limit is
 * always the same. At the
 * leaf the grid's sort is kept as it is. A sort on a type that can't be
 * sorted is left out. Throws when a key can't be compared, or there are more
 * keys than levels.
 */
export const deriveDrilldownLevel = (
  request: DrilldownLevelRequest,
): DrilldownLevel => {
  const { captureId, schema, drilldown, keys, sorts } = request;
  const levels = drilldown.columns;
  if (keys.length > levels.length) {
    throw new Error(
      `A drill-down of ${levels.length} levels can't expand ${keys.length} keys`,
    );
  }
  const typeOf = (name: string): CubeType => {
    const type = schema.type(name);
    if (!type) {
      throw new Error(`The run has no column "${name}"`);
    }
    return type;
  };
  let query = request.query;
  let lastId = captureId;
  const append = (node: Filter | Group | Sort): void => {
    query = query.add(node, lastId);
    // `add` selects a node it puts after the selected one, else not
    if (query.selected !== node.id) {
      query = query.select(node.id);
    }
    lastId = node.id;
  };

  // the expanded groups' keys
  const rules: FilterRule[] = keys.map((cell, index) => {
    const column = levels[index] as string;
    const rule = buildDrilldownKeyRule(column, typeOf(column), cell);
    if (!rule) {
      throw new Error(
        `Can't find the rows of the group whose ${column} is ${JSON.stringify(cell)}`,
      );
    }
    return rule;
  });
  if (rules.length) {
    append(
      new Filter(
        query.generateId(Filter.TYPE),
        rules.length === 1
          ? rules[0]
          : new CompositeFilter(CompositeFilterOperator.AND, rules),
      ),
    );
  }

  const isLeaf = keys.length === levels.length;
  const groupColumns = isLeaf ? [] : levels.slice(0, keys.length + 1);
  const columns = new Map<string, string>();
  let countColumn: string | undefined;
  if (isLeaf) {
    schema.names().forEach((name) => columns.set(name, name));
  } else {
    const taken = new Set(schema.names().map(foldColumnName));
    const aggregations: ColumnAggregation[] = [];
    schema.columns.forEach(({ name }) => {
      if (groupColumns.includes(name)) {
        columns.set(name, name);
        return;
      }
      const fn = drilldown.aggregationOf(name);
      if (fn !== null) {
        const output = freeName(
          getAggregationAutoName(fn, name),
          taken,
          'cube_value',
        );
        aggregations.push({ column: name, function: fn, name: output });
        columns.set(name, output);
      }
    });
    countColumn = freeName(
      getAggregationAutoName(AggregationFunction.COUNT_ROWS, undefined),
      taken,
      'cube_count',
    );
    aggregations.push({
      column: undefined,
      function: AggregationFunction.COUNT_ROWS,
      name: countColumn,
    });
    append(new Group(query.generateId(Group.TYPE), groupColumns, aggregations));
  }

  // the grid's sort, by the level's columns
  const levelSorts = sorts.flatMap(({ column, direction }) => {
    const output = columns.get(column);
    const sortable =
      output !== undefined &&
      (isLeaf || groupColumns.includes(column)
        ? isSortableType(typeOf(column))
        : true);
    return sortable ? [{ column: output, direction }] : [];
  });
  // the groups always end sorted by the level's own column, so a level cut
  // at the row limit is the same each time, whatever the grid's sort leaves
  // tied: a constant outer key, equal aggregations (review of M7)
  const levelColumn = groupColumns.at(-1);
  if (
    levelColumn !== undefined &&
    !levelSorts.some(({ column }) => column === levelColumn)
  ) {
    levelSorts.push({ column: levelColumn, direction: SortDirection.ASC });
  }
  if (levelSorts.length) {
    append(new Sort(query.generateId(Sort.TYPE), levelSorts));
  }
  return { query, isLeaf, groupColumns, columns, countColumn };
};
