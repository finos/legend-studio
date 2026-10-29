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

import {
  MESSAGE_DRILLDOWN_AGGREGATION_COLUMN_NOT_IN_OUTPUT,
  MESSAGE_DRILLDOWN_AGGREGATION_INCOMPATIBLE,
  MESSAGE_DRILLDOWN_AGGREGATION_LISTED_TWICE,
  MESSAGE_DRILLDOWN_AGGREGATION_UNKNOWN,
  MESSAGE_DRILLDOWN_COLUMN_LISTED_TWICE,
  MESSAGE_DRILLDOWN_COLUMN_NOT_GROUPABLE,
  MESSAGE_DRILLDOWN_COLUMN_NOT_IN_OUTPUT,
} from '../messages/CubeMessages.js';
import {
  AggregationFunction,
  getAvailableAggregations,
  isAggregationFunction,
  SUMMARY_AGGREGATION_FUNCTIONS,
} from '../nodes/transforms/Aggregation.js';
import {
  FilterOperator,
  isOperatorAvailable,
} from '../filter/FilterOperator.js';
import { foldColumnName } from '../schema/ColumnName.js';
import type { Schema } from '../schema/Schema.js';
import { isSortableType } from '../types/TypeCompatibility.js';
import { isNumericFamily } from '../types/TypeFamily.js';
import type { CubeType } from '../types/CubeType.js';
import type { JsonObject } from '../utils/Json.js';

// The grid's drill-down (spec §12.2, PLAN §11.10): the levels the results
// expand by, outermost first, and how a group row shows each other column.
// It is saved with the cube (`meta.drilldown`) but is never part of the query:
// each level's query is derived from the run's (`DrilldownQuery.ts`).

/**
 * How a group row shows a column, where it differs from the default
 * (`getDefaultDrilldownAggregation`): an aggregation function, or `null` to
 * leave the column empty. The function is kept as saved, so an unknown one
 * is held and reported, never dropped (as a Group's, PLAN §11.5).
 */
export interface DrilldownAggregation {
  readonly column: string;
  readonly function: string | null;
  readonly rest?: JsonObject;
}

export interface Drilldown {
  /** The columns the results expand by, outermost first */
  readonly columns: readonly string[];
  /** A column's aggregation where it differs from the default, at most one per column */
  readonly aggregations: readonly DrilldownAggregation[];
  readonly rest?: JsonObject;
}

/**
 * Whether a column of the type can be a level: one that groups
 * (`isSortableType`) and whose groups can be found again by Equal, so not
 * StrictTime, which has no Equal (review of M7)
 */
export const isDrilldownLevelType = (type: CubeType): boolean =>
  isSortableType(type) && isOperatorAvailable(FilterOperator.EQUAL, type);

/** Whether a value has a `DrilldownAggregation`'s shape */
export const isDrilldownAggregation = (
  value: unknown,
): value is DrilldownAggregation => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { column, function: fn } = value as Partial<
    Record<keyof DrilldownAggregation, unknown>
  >;
  return typeof column === 'string' && (fn === null || typeof fn === 'string');
};

/**
 * How a group row shows a column with no aggregation of its own (PLAN §11.10,
 * user 2026-10-11): a number its Sum, any other column nothing
 */
export const getDefaultDrilldownAggregation = (
  type: CubeType,
): AggregationFunction | null =>
  isNumericFamily(type.family) ? AggregationFunction.SUM : null;

/**
 * Whether a group row knows the function: a Group's, but those of PLAN
 * §11.27, which it doesn't offer yet (Percentile and Join Text take a
 * setting, which a drill-down's aggregation has no place for)
 */
const isDrilldownFunction = (fn: string): fn is AggregationFunction =>
  isAggregationFunction(fn) && !SUMMARY_AGGREGATION_FUNCTIONS.includes(fn);

/** The functions a group row can show for a column of the type: a Group's it knows (`isDrilldownFunction`), but Count rows, which takes no column */
export const getDrilldownAggregations = (
  type: CubeType,
): readonly AggregationFunction[] =>
  getAvailableAggregations(type).filter(
    (aggregation) =>
      aggregation !== AggregationFunction.COUNT_ROWS &&
      isDrilldownFunction(aggregation),
  );

/** The drill-down's saved aggregation of a column, by name in any case, if it has one */
const findSaved = (
  drilldown: Drilldown,
  column: string,
): DrilldownAggregation | undefined =>
  drilldown.aggregations.find(
    (aggregation) =>
      foldColumnName(aggregation.column) === foldColumnName(column),
  );

/**
 * A drill-down checked against the columns of the run it expands (the
 * capture node's schema): the levels and aggregations it can use, and a
 * message for each it can't. A level or an aggregation that can't be used is
 * left out of the derived queries, never the whole drill-down, so the cube
 * still runs (PLAN §11.10).
 */
export interface CheckedDrilldown {
  /** The usable levels, outermost first, as the schema names them */
  readonly columns: readonly string[];
  readonly problems: readonly string[];
  /**
   * How a group row shows a column of the schema: a function, or `null` for
   * nothing; the column's saved aggregation where it is usable, else the
   * default
   */
  aggregationOf(column: string): AggregationFunction | null;
}

/**
 * Checks a drill-down against the schema of the run it expands. A level must
 * be a column of the schema, one that can be grouped and compared
 * (`isDrilldownLevelType`), and
 * not an earlier level again, all in any case (`foldColumnName`). A saved
 * aggregation must name a column of the schema, once, and be `null` or a
 * function its type offers (`getDrilldownAggregations`).
 */
export const checkDrilldown = (
  drilldown: Drilldown,
  schema: Schema,
): CheckedDrilldown => {
  const problems: string[] = [];
  const columnOf = (name: string) =>
    schema.columns.find(
      (column) => foldColumnName(column.name) === foldColumnName(name),
    );
  const columns: string[] = [];
  const seen = new Set<string>();
  drilldown.columns.forEach((name) => {
    const column = columnOf(name);
    if (seen.has(foldColumnName(name))) {
      problems.push(MESSAGE_DRILLDOWN_COLUMN_LISTED_TWICE(name));
    } else if (!column) {
      problems.push(MESSAGE_DRILLDOWN_COLUMN_NOT_IN_OUTPUT(name));
    } else if (!isDrilldownLevelType(column.type)) {
      problems.push(
        MESSAGE_DRILLDOWN_COLUMN_NOT_GROUPABLE(name, column.type.displayName),
      );
    } else {
      columns.push(column.name);
    }
    seen.add(foldColumnName(name));
  });
  const usable = new Map<string, AggregationFunction | null>();
  const aggregated = new Set<string>();
  drilldown.aggregations.forEach(({ column: name, function: fn }) => {
    const column = columnOf(name);
    if (aggregated.has(foldColumnName(name))) {
      problems.push(MESSAGE_DRILLDOWN_AGGREGATION_LISTED_TWICE(name));
    } else if (!column) {
      problems.push(MESSAGE_DRILLDOWN_AGGREGATION_COLUMN_NOT_IN_OUTPUT(name));
    } else if (fn === null) {
      usable.set(column.name, null);
    } else if (!isDrilldownFunction(fn)) {
      problems.push(MESSAGE_DRILLDOWN_AGGREGATION_UNKNOWN(fn, name));
    } else if (!getDrilldownAggregations(column.type).includes(fn)) {
      problems.push(MESSAGE_DRILLDOWN_AGGREGATION_INCOMPATIBLE(fn, name));
    } else {
      usable.set(column.name, fn);
    }
    aggregated.add(foldColumnName(name));
  });
  return {
    columns,
    problems,
    aggregationOf: (name) => {
      const column = columnOf(name);
      if (!column) {
        throw new Error(`The drill-down's schema has no column "${name}"`);
      }
      return usable.has(column.name)
        ? (usable.get(column.name) as AggregationFunction | null)
        : getDefaultDrilldownAggregation(column.type);
    },
  };
};

// ---------------------------------------- edits ----------------------------------------

/** No levels and no saved aggregation: a cube without a drill-down saves none */
export const isEmptyDrilldown = (drilldown: Drilldown | undefined): boolean =>
  !drilldown ||
  (!drilldown.columns.length &&
    !drilldown.aggregations.length &&
    !Object.keys(drilldown.rest ?? {}).length);

const EMPTY_DRILLDOWN: Drilldown = Object.freeze({
  columns: Object.freeze([]),
  aggregations: Object.freeze([]),
});

/** The drill-down with the column as its innermost level, unless it is a level already (in any case) */
export const addDrilldownLevel = (
  drilldown: Drilldown | undefined,
  column: string,
): Drilldown => {
  const current = drilldown ?? EMPTY_DRILLDOWN;
  return current.columns.some(
    (level) => foldColumnName(level) === foldColumnName(column),
  )
    ? current
    : { ...current, columns: [...current.columns, column] };
};

/** The drill-down without the level at the position, the levels inside it moving out one */
export const removeDrilldownLevel = (
  drilldown: Drilldown,
  index: number,
): Drilldown => ({
  ...drilldown,
  columns: drilldown.columns.filter((_, position) => position !== index),
});

/**
 * The drill-down with the column's group-row aggregation set: saved only where
 * it differs from the default for the column's type, so a choice back to the
 * default removes it
 */
export const setDrilldownAggregation = (
  drilldown: Drilldown | undefined,
  column: string,
  type: CubeType,
  fn: AggregationFunction | null,
): Drilldown => {
  const current = drilldown ?? EMPTY_DRILLDOWN;
  const saved = findSaved(current, column);
  const others = current.aggregations.filter(
    (aggregation) => aggregation !== saved,
  );
  return {
    ...current,
    aggregations:
      fn === getDefaultDrilldownAggregation(type)
        ? others
        : [
            ...others,
            {
              ...(saved?.rest ? { rest: saved.rest } : {}),
              column,
              function: fn,
            },
          ],
  };
};
