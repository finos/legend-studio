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
import { getColumnTypeLabel } from '../__lib__/LegendCubeLabels.js';
import { CubeColumnTypeIcon } from './editors/CubeColumnPicker.js';

/** A source's columns, with their precise types and whether they can be empty */
export const CubeSchemaColumnsTable: React.FC<{ schema: Schema }> = ({
  schema,
}) => (
  <table className="w-full text-base" aria-label="Columns">
    <thead>
      <tr className="text-left text-[var(--color-text-secondary)]">
        <th className="font-normal">Column</th>
        <th className="font-normal">Type</th>
      </tr>
    </thead>
    <tbody>
      {schema.columns.map((column) => (
        <tr key={column.name}>
          <td className="break-all pr-2">{column.name}</td>
          <td title={column.type.fullName}>
            <span className="flex items-center gap-1">
              <CubeColumnTypeIcon
                type={column.type}
                className="text-[var(--color-text-secondary)]"
              />
              {getColumnTypeLabel(column)}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
