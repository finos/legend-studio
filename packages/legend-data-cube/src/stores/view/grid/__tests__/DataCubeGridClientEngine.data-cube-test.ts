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
import { CORE_PURE_PATH, PRIMITIVE_TYPE } from '@finos/legend-graph';
import { autoSizeNonVariantColumns } from '../DataCubeGridClientEngine.js';
import { DataCubeColumnConfiguration } from '../../../core/model/DataCubeConfiguration.js';

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
