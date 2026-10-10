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
  GROUP_AGGREGATION_USE,
  type Schema,
  validateColumnAggregation,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  COLUMN_NAME_RULES_HINT,
  CUBE_GROUP_COLUMN_DISABLED_REASON,
  GROUP_EDITOR_NOTES,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeGroupRow,
  CubeGroupDraft,
  isBuiltGroupRow,
} from '../../stores/editors/CubeGroupDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeAggregationRowEditor } from './CubeAggregationRowEditor.js';
import { CubeColumnChecklist } from './CubeColumnChecklist.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const KEYS = 'Group columns';

/**
 * The functions a row can take: those its column's type offers, or every
 * column function before a column is picked, then Count rows; a function the
 * row holds that isn't among them (an unknown one kept as saved, or one its
 * column doesn't offer) stays listed, so the problem can be seen and fixed
 */
const functionOptions = (row: CubeGroupRow, schema: Schema): string[] => {
  const type = row.column ? schema.lookup(row.column)?.type : undefined;
  const offered: string[] = [
    ...(type
      ? getAvailableAggregations(type)
      : Object.values(AggregationFunction).filter(
          (fn) => fn !== AggregationFunction.COUNT_ROWS,
        )),
    AggregationFunction.COUNT_ROWS,
  ];
  return row.function && !offered.includes(row.function)
    ? [row.function, ...offered]
    : offered;
};

/**
 * The Group editor (spec §17.6, PLAN §11.5): the input's columns, each ticked
 * to group by it (a column that can't be compared is shown but can't be
 * ticked), then rows of aggregation column, function and output name. Each
 * row shows its first problem, as the node checks it. Rows can always be
 * added: a column can be aggregated several ways. The lists scroll on their
 * own, so the editor fits wherever it is shown.
 */
export const CubeGroupEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeGroupDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { aggregations } = draft;
  // a row's problem, as the node will judge it; a row left out has none
  let aggregationIndex = 0;
  const problems = draft.rows.map((row) => {
    if (!isBuiltGroupRow(row)) {
      return undefined;
    }
    const errors: string[] = [];
    validateColumnAggregation(aggregations, aggregationIndex, schema, errors);
    aggregationIndex += 1;
    return errors[0];
  });
  return (
    <div className="flex flex-col gap-2 text-base">
      <CubeColumnChecklist
        label={KEYS}
        schema={schema}
        picked={draft.columns}
        disabledReason={CUBE_GROUP_COLUMN_DISABLED_REASON}
        clearTitle="Untick every group column: one row for all the rows"
        readOnly={readOnly}
        onToggle={(name) => draft.toggleColumn(name, schema)}
        onClear={() => draft.clearColumns()}
      />
      <ul aria-label="Aggregations" className="max-h-80 overflow-auto">
        {draft.rows.map((row, index) => (
          <CubeAggregationRowEditor
            key={row.key}
            row={row}
            position={index + 1}
            schema={schema}
            use={GROUP_AGGREGATION_USE}
            functions={functionOptions(row, schema)}
            noColumnText={() => 'Every row'}
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
          title="Add an aggregation"
          disabled={readOnly}
          onClick={() => draft.addRow()}
        >
          Add aggregation
        </CubeButton>
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {[...GROUP_EDITOR_NOTES, COLUMN_NAME_RULES_HINT].map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
