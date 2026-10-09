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
  buildQuickFilterRule,
  FilterOperator,
  Filter,
  isOperatorAvailable,
  isSortableType,
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

/**
 * The quick actions on a cell of the shown rows (spec §12.4, PLAN §11.4):
 * "Sort by" adds an ascending Sort on the cell's column, and "Filter by" an
 * Equal on its value (Is Empty on a null), after the node that runs, which
 * they replace as the node that runs. Both need the rows to be from the
 * current query, no run in flight, and a cube that can change; "Sort by" a
 * type that sorts, and "Filter by" a value its column's type can compare.
 * Read when the menu opens; `[]` when the position is not a column of the
 * shown rows.
 */
export const getCubeGridQuickActions = (
  editorState: CubeEditorState,
  position: number,
  cell: CubeResultValue,
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
  const rule = buildQuickFilterRule(column.name, column.type, cell);
  // what keeps both from being used, in order
  const blocked =
    result.query !== query
      ? CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS
      : execution.isRunning
        ? CUBE_QUICK_ACTION_DISABLED_REASON.RUNNING
        : editorState.readOnly
          ? READ_ONLY_CUBE_TITLE
          : undefined;
  const sortReason =
    blocked ??
    (isSortableType(column.type)
      ? undefined
      : CUBE_QUICK_ACTION_DISABLED_REASON.notSortable(typeName));
  const filterReason =
    blocked ??
    (rule
      ? undefined
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
        if (sortReason === undefined && editorState.document.query === query) {
          editorState.addConfiguredNode(
            Sort.byColumn(query.generateId(Sort.TYPE), column.name),
            afterId,
          );
        }
      },
    },
    {
      label: `Filter by "${column.name}"`,
      disabledReason: filterReason,
      hint:
        rule?.operator === FilterOperator.EQUAL &&
        column.type.family === TypeFamily.FLOAT
          ? FILTER_FLOAT_COMPARISON_HINT
          : undefined,
      apply: () => {
        if (
          filterReason === undefined &&
          rule &&
          editorState.document.query === query
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
