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
  getAvailableAggregations,
  isSortableType,
  type Schema,
  validateColumnAggregation,
  WINDOW_RANK_FUNCTIONS,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  COLUMN_NAME_RULES_HINT,
  CUBE_PARTITION_COLUMN_DISABLED_REASON,
  getPartitionNoColumnText,
  PARTITION_EDITOR_NOTES,
} from '../../__lib__/LegendCubeLabels.js';
import type { CubeAggregationRow } from '../../stores/editors/CubeAggregationRows.js';
import { CubePartitionDraft } from '../../stores/editors/CubePartitionDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeAggregationRowEditor } from './CubeAggregationRowEditor.js';
import { CubeColumnChecklist } from './CubeColumnChecklist.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';
import {
  CubeSortRowEditor,
  getSortRowProblems,
  getTakenSortColumns,
} from './CubeSortRowEditor.js';

const FUNCTIONS = 'Window functions';
const COLUMNS = 'Partition columns';
const SORTS = 'Sort columns';

/** The functions that take no column, after the column functions */
const NO_COLUMN_FUNCTIONS: readonly string[] = [
  AggregationFunction.COUNT_ROWS,
  ...WINDOW_RANK_FUNCTIONS,
];

/**
 * The functions a row can take: those its column's type offers, or every
 * column function before a column is picked, then Count rows and the rank
 * functions; a function the row holds that isn't among them (an unknown one
 * kept as saved, or one its column doesn't offer) stays listed, so the
 * problem can be seen and fixed
 */
const functionOptions = (row: CubeAggregationRow, schema: Schema): string[] => {
  const type = row.column ? schema.lookup(row.column)?.type : undefined;
  const offered: string[] = [
    ...(type
      ? getAvailableAggregations(type)
      : Object.values(AggregationFunction).filter(
          (fn) => fn !== AggregationFunction.COUNT_ROWS,
        )),
    ...NO_COLUMN_FUNCTIONS,
  ];
  return row.function && !offered.includes(row.function)
    ? [row.function, ...offered]
    : offered;
};

/**
 * The Partition editor (spec §17.6, PLAN §11.6), in the original's order
 * (Q4): rows of window function column, function and output name; the
 * partition columns, each ticked (a column that can't be compared is shown
 * but can't be ticked); then the sort rows, as a Sort's. Each row shows its
 * first problem, as the node checks it. Window functions can always be added;
 * a sort row only while a sortable column has none. The lists scroll on their
 * own, so the editor fits wherever it is shown.
 */
export const CubePartitionEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubePartitionDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { aggregations, aggregationUse, sortRows } = draft;
  // a row's problem, as the node Apply stores will judge it (the original
  // until something changes, whose blank sort key still counts as a sort);
  // a row left out has none
  const { aggregationUse: judgedUse } = draft.build();
  let aggregationIndex = 0;
  const problems = draft.rows.map((row) => {
    if (!draft.isBuiltRow(row)) {
      return undefined;
    }
    const errors: string[] = [];
    validateColumnAggregation(
      aggregations,
      aggregationIndex,
      schema,
      errors,
      judgedUse,
    );
    aggregationIndex += 1;
    return errors[0];
  });
  const sortProblems = getSortRowProblems(sortRows, schema);
  const sortable = schema.columns.filter((column) =>
    isSortableType(column.type),
  );
  const canAddSortRow = !readOnly && sortRows.length < sortable.length;
  return (
    <div className="flex flex-col gap-2 text-base">
      <span>{FUNCTIONS}</span>
      <ul aria-label={FUNCTIONS} className="max-h-80 overflow-auto">
        {draft.rows.map((row, index) => (
          <CubeAggregationRowEditor
            key={row.key}
            row={row}
            position={index + 1}
            schema={schema}
            use={aggregationUse}
            functions={functionOptions(row, schema)}
            noColumnText={getPartitionNoColumnText}
            problem={problems[index]}
            readOnly={readOnly}
            onColumn={(column) => draft.setColumn(row.key, column)}
            onFunction={(fn) => draft.setFunction(row.key, fn)}
            onName={(name) => draft.setName(row.key, name)}
            onRemove={() => draft.removeRow(row.key)}
          />
        ))}
      </ul>
      <div>
        <CubeButton
          title="Add a window function"
          disabled={readOnly}
          onClick={() => draft.addRow()}
        >
          Add window function
        </CubeButton>
      </div>
      <CubeColumnChecklist
        label={COLUMNS}
        schema={schema}
        picked={draft.columns}
        disabledReason={CUBE_PARTITION_COLUMN_DISABLED_REASON}
        clearTitle="Untick every partition column: one window over all the rows"
        readOnly={readOnly}
        onToggle={(name) => draft.toggleColumn(name, schema)}
        onClear={() => draft.clearColumns()}
      />
      <span>{SORTS}</span>
      <ul aria-label={SORTS} className="max-h-80 overflow-auto">
        {sortRows.map((row, index) => (
          <CubeSortRowEditor
            key={row.key}
            row={row}
            position={index + 1}
            count={sortRows.length}
            schema={schema}
            takenColumns={getTakenSortColumns(sortRows, row)}
            problem={sortProblems[index]}
            readOnly={readOnly}
            onColumn={(column) => draft.setSortColumn(row.key, column)}
            onDirection={(direction) =>
              draft.setSortDirection(row.key, direction)
            }
            onMove={(offset) => draft.moveSortRow(row.key, offset)}
            onRemove={() => draft.removeSortRow(row.key)}
          />
        ))}
      </ul>
      <div>
        <CubeButton
          title={
            canAddSortRow
              ? 'Add a column to sort the window by'
              : 'Every column that can be sorted already has a row'
          }
          disabled={!canAddSortRow}
          onClick={() => draft.addSortRow()}
        >
          Add sort column
        </CubeButton>
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {[...PARTITION_EDITOR_NOTES, COLUMN_NAME_RULES_HINT].map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
