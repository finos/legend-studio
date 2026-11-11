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

import { describe, test, expect, jest } from '@jest/globals';
import type { GridApi } from 'ag-grid-community';
import {
  CORE_PURE_PATH,
  PRIMITIVE_TYPE,
  type TabularDataSet,
} from '@finos/legend-graph';
import {
  autoSizeNonVariantColumns,
  buildRowData,
  INTERNAL__GRID_CLIENT_MISSING_VALUE,
} from '../DataCubeGridClientEngine.js';
import { DataCubeColumnConfiguration } from '../../../core/model/DataCubeConfiguration.js';
import { DataCubeSnapshot } from '../../../core/DataCubeSnapshot.js';

interface MockApi {
  getColumns: () => { getColId: () => string }[];
  autoSizeColumns: ReturnType<typeof jest.fn>;
}

const makeApi = (colIds: string[]): MockApi => ({
  getColumns: () => colIds.map((colId) => ({ getColId: () => colId })),
  autoSizeColumns: jest.fn(),
});

describe('autoSizeNonVariantColumns', () => {
  test('auto-sizes every displayed column except Variant columns', () => {
    const columns = [
      new DataCubeColumnConfiguration('payload', CORE_PURE_PATH.VARIANT),
      new DataCubeColumnConfiguration('name', PRIMITIVE_TYPE.STRING),
    ];
    const api = makeApi(['payload', 'name']);

    autoSizeNonVariantColumns(api as unknown as GridApi, columns);

    expect(api.autoSizeColumns).toHaveBeenCalledWith(['name']);
  });

  test('auto-sizes every displayed column when there is no Variant column', () => {
    const columns = [
      new DataCubeColumnConfiguration('name', PRIMITIVE_TYPE.STRING),
    ];
    const api = makeApi(['name']);

    autoSizeNonVariantColumns(api as unknown as GridApi, columns);

    expect(api.autoSizeColumns).toHaveBeenCalledWith(['name']);
  });
});

describe('buildRowData', () => {
  // vertical pivot on Desk and horizontal pivot on Year
  const snapshot = DataCubeSnapshot.create({});
  snapshot.data.groupBy = {
    columns: [{ name: 'Desk', type: PRIMITIVE_TYPE.STRING }],
  };
  snapshot.data.pivot = {
    columns: [{ name: 'Year', type: PRIMITIVE_TYPE.STRING }],
    castColumns: [],
  };
  const _result = (rows: unknown[][]) =>
    ({
      columns: [
        'Desk',
        '2023__|__Qty',
        '2023__|__count',
        '2024__|__Qty',
        '2024__|__count',
      ],
      rows: rows.map((values) => ({ values })),
    }) as unknown as TabularDataSet;

  test('counts the rows of a group across pivot values', () => {
    const [row] = buildRowData(_result([['A', 10, 2, 30, 3]]), snapshot);
    expect(row?.count).toBe(5);
  });

  test('counts no rows for pivot values a group has no data for', () => {
    // e.g. desk A has no trades in 2023
    const [row] = buildRowData(_result([['A', null, null, 30, 3]]), snapshot);
    expect(row?.['2023__|__count']).toBe(INTERNAL__GRID_CLIENT_MISSING_VALUE);
    expect(row?.count).toBe(3);
  });
});
