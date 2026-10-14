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
import { CubeSchemaColumnsTable } from '../CubeSchemaColumnsTable.js';

/**
 * The columns of the table picked last, under the source dialog's list, as
 * an access point's preview shows them (the review of the demo, 2026-10-13):
 * loading, then the columns, or why they couldn't be read. A failure doesn't
 * keep the table from being added: Add asks the engine again.
 */
export const CubeTablePreview: React.FC<{
  /** The table's name, as the list shows it */
  name: string;
  /** Its columns, or why they couldn't be read; `undefined` while they load */
  columns: Schema | string | undefined;
}> = ({ name, columns }) => (
  <section
    className="flex max-h-48 flex-col gap-1 overflow-auto rounded-sm border border-[var(--color-border-default)] p-2"
    aria-label="Table preview"
  >
    <span className="font-medium">{`Columns of ${name}`}</span>
    {columns === undefined ? (
      <span className="text-base text-[var(--color-text-secondary)]">
        loading columns
      </span>
    ) : typeof columns === 'string' ? (
      <span className="text-base text-[var(--color-status-error)]">
        {columns}
      </span>
    ) : (
      <CubeSchemaColumnsTable schema={columns} />
    )}
  </section>
);
