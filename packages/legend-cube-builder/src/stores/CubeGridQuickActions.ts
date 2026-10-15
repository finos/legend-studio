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
  AggregationFunction,
  buildDrilldownKeyRule,
  FilterOperator,
  Filter,
  foldColumnName,
  getAggregationAutoName,
  Group,
  isOperatorAvailable,
  isSortableType,
  type Schema,
  Sort,
  TypeFamily,
} from '@finos/legend-cube';
import {
  CUBE_QUICK_ACTION_DISABLED_REASON,
  FILTER_FLOAT_COMPARISON_HINT,
  READ_ONLY_CUBE_TITLE,
} from '../__lib__/LegendCubeLabels.js';
import type { CubeResultValue } from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';

/**
 * The name of a Group by's Count rows: `Count Rows`, or with a number after it
 * when an input column already has that name in any case, e.g. on a Group of
 * a Group (PLAN §11.5)
 */
export const getGroupByCountName = (schema: Schema): string => {
  const base = getAggregationAutoName(
    AggregationFunction.COUNT_ROWS,
    undefined,
  ) as string;
  const taken = new Set(schema.names().map(foldColumnName));
  let name = base;
  for (let suffix = 2; taken.has(foldColumnName(name)); suffix += 1) {
    name = `${base} ${suffix}`;
  }
  return name;
};

/** One of the grid's quick actions on a cell (spec §12.4) */
export interface CubeGridQuickAction {
  /** e.g. `Sort by "SHIP_COUNTRY"` */
  readonly label: string;
  /** Why it can't be used, its tooltip then; `undefined` when it can */
  readonly disabledReason: string | undefined;
  /** A note shown as its tooltip when it can be used, e.g. on comparing floats */
  readonly hint: string | undefined;
  /** Adds its node after the node that runs, as one undo step; nothing runs */
  readonly apply: () => void;
}

/** What a cell of the grid holds */
export enum CubeGridCellKind {
  /** A run row's value, or a group row's key */
  VALUE = 'value',
  /** A group row's aggregation of its rows' values (PLAN §11.10) */
  AGGREGATE = 'aggregate',
  /** A group row's column with no aggregation: nothing */
  EMPTY = 'empty',
}

/**
 * What keeps the grid's actions that add a node after the node that ran from
 * being used, in order (the quick actions, Explore JSON and Parse as JSON,
 * PLAN §11.20): rows from an earlier query, edits not applied yet, a run in
 * flight, a cube that can't change; `undefined` when nothing does
 */
export const getCubeGridActionBlocker = (
  editorState: CubeEditorState,
): string | undefined => {
  const { execution, document } = editorState;
  return execution.result?.query !== document.query || execution.isStale
    ? CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS
    : // choosing would apply the edits first, leaving these rows stale
      editorState.hasEditsToApply || editorState.nodeEditor.hasPendingInput()
      ? CUBE_QUICK_ACTION_DISABLED_REASON.EDITING
      : execution.isRunning
        ? CUBE_QUICK_ACTION_DISABLED_REASON.RUNNING
        : editorState.readOnly
          ? READ_ONLY_CUBE_TITLE
          : undefined;
};

/**
 * The quick actions on a cell of the shown rows (spec §12.4, PLAN §11.4,
 * §11.5 and §11.10): "Sort by" adds an ascending Sort on the cell's column,
 * "Group by" a Group by it with Count rows, and "Filter by" an Equal on its
 * value (Is Empty on a null; on a float, In the value and its 32-bit value
 * when they differ, so a `REAL` value is found, as a drill-down's key is,
 * PLAN §11.14), after the node that runs, which they replace as
 * the node that runs; a group row's cell other than its key has no value of a
 * row, so "Filter by" is disabled there. All need the rows to be from the current query, no run in
 * flight, and a cube that can change; "Sort by" and "Group by" a type that
 * compares, and "Filter by" a value its column's type can compare.
 * Read when the menu opens; `[]` when the position is not a column of the
 * shown rows.
 */
export const getCubeGridQuickActions = (
  editorState: CubeEditorState,
  position: number,
  cell: CubeResultValue,
  cellKind = CubeGridCellKind.VALUE,
): CubeGridQuickAction[] => {
  const { execution, document } = editorState;
  const { result } = execution;
  const column = result?.schema.columns[position];
  if (!result || !column) {
    return [];
  }
  const { query } = document;
  const afterId = query.selected;
  const typeName = column.type.displayName;
  const rule =
    cellKind === CubeGridCellKind.VALUE
      ? buildDrilldownKeyRule(column.name, column.type, cell)
      : undefined;
  const blocked = getCubeGridActionBlocker(editorState);
  const sortReason =
    blocked ??
    (isSortableType(column.type)
      ? undefined
      : CUBE_QUICK_ACTION_DISABLED_REASON.notSortable(typeName));
  const groupReason =
    blocked ??
    (isSortableType(column.type)
      ? undefined
      : CUBE_QUICK_ACTION_DISABLED_REASON.notGroupable(typeName));
  const filterReason =
    blocked ??
    (rule
      ? undefined
      : cellKind === CubeGridCellKind.AGGREGATE
        ? CUBE_QUICK_ACTION_DISABLED_REASON.AGGREGATE_VALUE
        : cellKind === CubeGridCellKind.EMPTY
          ? CUBE_QUICK_ACTION_DISABLED_REASON.NO_VALUE
          : isOperatorAvailable(FilterOperator.EQUAL, column.type)
            ? CUBE_QUICK_ACTION_DISABLED_REASON.UNREADABLE_VALUE
            : CUBE_QUICK_ACTION_DISABLED_REASON.notComparable(typeName));
  return [
    {
      label: `Sort by "${column.name}"`,
      disabledReason: sortReason,
      hint: undefined,
      apply: () => {
        // as the menu found it: nothing changed since it opened
        if (sortReason === undefined && editorState.document === document) {
          editorState.addConfiguredNode(
            Sort.byColumn(query.generateId(Sort.TYPE), column.name),
            afterId,
          );
        }
      },
    },
    {
      label: `Group by "${column.name}"`,
      disabledReason: groupReason,
      hint: undefined,
      apply: () => {
        if (groupReason === undefined && editorState.document === document) {
          editorState.addConfiguredNode(
            new Group(
              query.generateId(Group.TYPE),
              [column.name],
              [
                {
                  column: undefined,
                  function: AggregationFunction.COUNT_ROWS,
                  name: getGroupByCountName(result.schema),
                },
              ],
            ),
            afterId,
          );
        }
      },
    },
    {
      label: `Filter by "${column.name}"`,
      disabledReason: filterReason,
      hint:
        (rule?.operator === FilterOperator.EQUAL ||
          rule?.operator === FilterOperator.IN) &&
        column.type.family === TypeFamily.FLOAT
          ? FILTER_FLOAT_COMPARISON_HINT
          : undefined,
      apply: () => {
        if (
          filterReason === undefined &&
          rule &&
          editorState.document === document
        ) {
          editorState.addConfiguredNode(
            new Filter(query.generateId(Filter.TYPE), rule),
            afterId,
          );
        }
      },
    },
  ];
};
