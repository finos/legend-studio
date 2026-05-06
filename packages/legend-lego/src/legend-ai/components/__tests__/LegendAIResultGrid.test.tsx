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

import { describe, test, expect, afterEach, jest } from '@jest/globals';
import { render, cleanup } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIResultGrid } from '../LegendAIResultGrid.js';
import type { LegendAIGridData } from '../../LegendAITypes.js';

jest.mock('../../../data-grid/index.js', () => ({
  DataGrid: (props: {
    columnDefs: unknown[];
    rowData: unknown[];
    alwaysShowHorizontalScroll?: boolean;
  }) => (
    <div
      data-testid="mock-data-grid"
      data-cols={props.columnDefs.length}
      data-rows={props.rowData.length}
      data-hscroll={String(props.alwaysShowHorizontalScroll ?? false)}
    />
  ),
}));

afterEach(cleanup);

describe(unitTest('LegendAIResultGrid'), () => {
  test('renders empty message when no columns', () => {
    const data: LegendAIGridData = { columnDefs: [], rowData: [] };
    const { container } = render(<LegendAIResultGrid data={data} />);
    expect(container.textContent).toContain('No results to display');
  });

  test('renders data grid with few columns (fitGridWidth)', () => {
    const data: LegendAIGridData = {
      columnDefs: [
        { colId: 'name', headerName: 'name', field: 'name' },
        { colId: 'age', headerName: 'age', field: 'age' },
      ],
      rowData: [{ name: 'Alice', age: 30 }],
    };
    const { container } = render(<LegendAIResultGrid data={data} />);
    const grid = container.querySelector('[data-testid="mock-data-grid"]');
    expect(grid).toBeDefined();
    expect(grid?.getAttribute('data-cols')).toBe('2');
    expect(grid?.getAttribute('data-rows')).toBe('1');
    // Few columns → no horizontal scroll
    expect(grid?.getAttribute('data-hscroll')).toBe('false');
  });

  test('renders data grid with many columns (fitCellContents + hscroll)', () => {
    const cols = Array.from({ length: 8 }, (_, i) => ({
      colId: `col${i}`,
      headerName: `col${i}`,
      field: `col${i}`,
    }));
    const data: LegendAIGridData = {
      columnDefs: cols,
      rowData: [Object.fromEntries(cols.map((c) => [c.field, 'val']))],
    };
    const { container } = render(<LegendAIResultGrid data={data} />);
    const grid = container.querySelector('[data-testid="mock-data-grid"]');
    expect(grid).toBeDefined();
    expect(grid?.getAttribute('data-cols')).toBe('8');
    // Many columns → horizontal scroll enabled
    expect(grid?.getAttribute('data-hscroll')).toBe('true');
  });

  test('wraps grid in ag-theme-balham container', () => {
    const data: LegendAIGridData = {
      columnDefs: [{ colId: 'x', headerName: 'x', field: 'x' }],
      rowData: [{ x: 1 }],
    };
    const { container } = render(<LegendAIResultGrid data={data} />);
    const wrapper = container.querySelector('.legend-ai__grid.ag-theme-balham');
    expect(wrapper).toBeDefined();
  });

  test('infers column defs from row keys when columnDefs is empty', () => {
    const data: LegendAIGridData = {
      columnDefs: [],
      rowData: [{ alpha: 1, beta: 2, gamma: 3 }],
    };
    const { container } = render(<LegendAIResultGrid data={data} />);
    const grid = container.querySelector('[data-testid="mock-data-grid"]');
    expect(grid).toBeDefined();
    expect(grid?.getAttribute('data-cols')).toBe('3');
    expect(grid?.getAttribute('data-rows')).toBe('1');
  });
});
