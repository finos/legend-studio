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

import type { Schema } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { getColumnTypeLabel } from '../../__lib__/LegendCubeLabels.js';
import { CubeRestrictDraft } from '../../stores/editors/CubeRestrictDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const KEEP = 'Columns to keep';

/**
 * The Restrict editor (spec §17.6): the input's columns, in its order, each
 * ticked to keep it. A saved column the input doesn't have stays listed, last
 * and ticked, until it is unticked. The list scrolls on its own, so the
 * editor fits wherever it is shown.
 */
export const CubeRestrictEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeRestrictDraft);
  const [schema] = props.inputSchemas as [Schema];
  // each once, though a saved restrict may repeat one (validation reports it)
  const missing = Array.from(
    new Set(draft.columns.filter((name) => !schema.lookup(name))),
  );
  return (
    <div className="flex flex-col gap-2 text-base">
      <div className="flex items-center gap-2">
        <span>{KEEP}</span>
        <span className="flex-1" />
        <CubeButton
          title="Keep every column of the input"
          disabled={readOnly}
          onClick={() => draft.selectAll(schema)}
        >
          All
        </CubeButton>
        <CubeButton
          title="Untick every column"
          disabled={readOnly}
          onClick={() => draft.clear()}
        >
          None
        </CubeButton>
      </div>
      <ul
        aria-label={KEEP}
        className="rounded-sm border border-[var(--color-border-subtle)]"
      >
        {schema.columns.map((column) => (
          <li key={column.name}>
            <label className="flex items-center gap-2 px-1 py-0.5">
              <input
                type="checkbox"
                checked={draft.columns.includes(column.name)}
                disabled={readOnly}
                onChange={() => draft.toggleColumn(column.name, schema)}
              />
              <CubeColumnTypeIcon
                type={column.type}
                className="text-[var(--color-text-secondary)]"
              />
              <span className="min-w-0 truncate">{column.name}</span>
              <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                {getColumnTypeLabel(column)}
              </span>
            </label>
          </li>
        ))}
        {missing.map((name) => (
          <li key={`missing:${name}`}>
            <label className="flex items-center gap-2 px-1 py-0.5 text-[var(--color-status-error)]">
              <input
                type="checkbox"
                checked={true}
                disabled={readOnly}
                onChange={() => draft.toggleColumn(name, schema)}
              />
              <span className="min-w-0 truncate">{name || '(blank)'}</span>
              <span className="shrink-0 text-sm">(not in the input)</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
});
