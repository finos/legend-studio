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

import { describe, expect, test } from '@jest/globals';
import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { CORE_PURE_PATH, PRIMITIVE_TYPE } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { generateColumnDefs } from '../DataCubeGridConfigurationBuilder.js';
import { INTERNAL__GRID_CLIENT_MISSING_VALUE } from '../DataCubeGridClientEngine.js';
import { DataCubeSnapshot } from '../../../core/DataCubeSnapshot.js';
import { DataCubeConfiguration } from '../../../core/model/DataCubeConfiguration.js';
import { newColumnConfiguration } from '../../../core/DataCubeConfigurationBuilder.js';
import { DEFAULT_COLUMN_WIDTH } from '../../../core/DataCubeQueryEngine.js';

const buildColumnDefs = () => {
  const columns = [
    { name: 'payload', type: CORE_PURE_PATH.VARIANT },
    { name: 'name', type: PRIMITIVE_TYPE.STRING },
  ];
  const snapshot = DataCubeSnapshot.create({});
  snapshot.data.sourceColumns = columns;
  snapshot.data.selectColumns = columns;
  const configuration = new DataCubeConfiguration();
  configuration.columns = columns.map((column) =>
    newColumnConfiguration(column),
  );
  return generateColumnDefs(snapshot, configuration) as ColDef[];
};

const columnDef = (name: string) =>
  guaranteeNonNullable(buildColumnDefs().find((def) => def.colId === name));

const format = (def: ColDef, value: unknown) =>
  (def.valueFormatter as (params: ValueFormatterParams) => string)({
    value,
  } as ValueFormatterParams);

describe('generateColumnDefs — Variant (JSON) column', () => {
  test('shows a JSON document on one line, but copies and exports its JSON text', () => {
    const payload = columnDef('payload');
    expect(format(payload, '{"name":"ann","tags":["a","b"]}')).toBe(
      '{name: ann, tags: [a, b]}',
    );
    expect(format(payload, INTERNAL__GRID_CLIENT_MISSING_VALUE)).toBe('');
    expect(payload.useValueFormatterForExport).toBe(false);
    expect(columnDef('name').useValueFormatterForExport).toBe(true);
  });

  test('can be grouped on but not pivoted on', () => {
    const payload = columnDef('payload');
    expect(payload.enableRowGroup).toBe(true);
    expect(payload.enablePivot).toBe(false);
    expect(columnDef('name').enablePivot).toBe(true);
  });

  test('starts at the default width, not stretched to fit its documents, but is not capped: it can still be widened by hand or auto-sized to fit content explicitly', () => {
    const payload = columnDef('payload');
    expect(payload.width).toBe(DEFAULT_COLUMN_WIDTH);
    expect(payload.maxWidth).toBeUndefined();
    expect(payload.resizable).toBe(true);
    expect(columnDef('name').width).toBeUndefined();
  });
});
