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

import { isSortableType, type Schema } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { CubeSortDraft } from '../../stores/editors/CubeSortDraft.js';
import { CubeButton } from '../CubeButton.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';
import {
  CubeSortRowEditor,
  getSortRowProblems,
  getTakenSortColumns,
} from './CubeSortRowEditor.js';

/**
 * The Sort editor (spec §17.6: an ordered list of column and direction rows,
 * added, removed and reordered). The first row sorts first. A column that
 * can't be sorted, or that another row has, can't be picked; a saved one
 * stays shown with its problem. The rows scroll on their own, so the editor
 * fits wherever it is shown.
 */
export const CubeSortEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeSortDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { rows } = draft;
  const problems = getSortRowProblems(rows, schema);
  const sortable = schema.columns.filter((column) =>
    isSortableType(column.type),
  );
  const canAddRow = !readOnly && rows.length < sortable.length;
  return (
    <div className="flex flex-col gap-2 text-base">
      <ul aria-label="Sort columns" className="max-h-80 overflow-auto">
        {rows.map((row, index) => (
          <CubeSortRowEditor
            key={row.key}
            row={row}
            position={index + 1}
            count={rows.length}
            schema={schema}
            takenColumns={getTakenSortColumns(rows, row)}
            problem={problems[index]}
            readOnly={readOnly}
            onColumn={(column) => draft.setColumn(row.key, column)}
            onDirection={(direction) => draft.setDirection(row.key, direction)}
            onMove={(offset) => draft.moveRow(row.key, offset)}
            onRemove={() => draft.removeRow(row.key)}
          />
        ))}
      </ul>
      <div>
        <CubeButton
          title={
            canAddRow
              ? 'Add a column to sort by'
              : 'Every column that can be sorted already has a row'
          }
          disabled={!canAddRow}
          onClick={() => draft.addRow()}
        >
          Add sort column
        </CubeButton>
      </div>
    </div>
  );
});
