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
import {
  AggregationFunction,
  checkDrilldown,
  type ColumnFormat,
  ColumnFormatStyle,
  PrimitiveType,
  Schema,
  SchemaColumn,
  TypeFamily,
} from '@finos/legend-cube';
import { render } from '@testing-library/react';
import type { CubeExecutionResult } from '../../../stores/CubeExecutionState.js';
import {
  buildCubeColumnDefs,
  CubeCell,
  LOCAL_AGGREGATIONS,
} from '../CubeResultGrid.js';

const RED = 'text-[var(--color-status-error)]';

const cellOf = (value: string, format?: ColumnFormat): HTMLElement =>
  render(
    <CubeCell
      {...({
        value,
        family: TypeFamily.DECIMAL,
        format,
      } as unknown as Parameters<typeof CubeCell>[0])}
    />,
  ).container;

const format = (init: Partial<ColumnFormat>): ColumnFormat => ({
  style: ColumnFormatStyle.NUMBER,
  grouping: true,
  redIfNegative: false,
  parenthesesIfNegative: false,
  ...init,
});

describe('Cube cell formats', () => {
  test('Shows a negative in red only when its format asks for red, parentheses or not (spec §21)', () => {
    const red = cellOf('-1234.5', format({ redIfNegative: true }));
    expect(red.textContent).toBe('-1,234.5');
    expect(red.querySelector('span')?.className).toContain(RED);
    // parentheses alone don't make it red, the spec's bug
    const parentheses = cellOf(
      '-1234.5',
      format({ parenthesesIfNegative: true }),
    );
    expect(parentheses.textContent).toBe('(1,234.5)');
    expect(parentheses.querySelector('span')?.className).not.toContain(RED);
    // a positive value never is
    expect(
      cellOf('1234.5', format({ redIfNegative: true })).querySelector('span')
        ?.className,
    ).not.toContain(RED);
  });

  test('Shows the exact value on hover, and falls back to the default without a usable format', () => {
    expect(
      cellOf('1234.5678', format({ decimalPlaces: 1 })).querySelector('span')
        ?.title,
    ).toBe('1234.5678');
    expect(
      cellOf('1234.5', format({ style: 'currency', currency: 'XYZ' }))
        .textContent,
    ).toBe('1,234.5');
  });

  const groupRow = (keys: string[]) => ({
    id: JSON.stringify(keys),
    keys,
    isGroup: true,
    cells: [],
  });

  test("Leaves a group row's count unformatted, a count not being money, but formats its key and run rows (spec §13.1)", () => {
    const usd = format({
      style: ColumnFormatStyle.CURRENCY,
      currency: 'USD',
      decimalPlaces: 0,
    });
    const cell = (
      data: unknown,
      column: string,
      countOnGroupRows: boolean,
    ): string | null =>
      render(
        <CubeCell
          {...({
            value: '4',
            family: TypeFamily.DECIMAL,
            format: usd,
            data,
            column,
            levels: ['DESK'],
            countOnGroupRows,
          } as unknown as Parameters<typeof CubeCell>[0])}
        />,
      ).container.textContent;
    expect(cell(groupRow(['Rates']), 'NOTIONAL', true)).toBe('4');
    expect(cell(groupRow(['Rates']), 'NOTIONAL', false)).toBe('$4');
    // the group's own key is a value, formatted
    expect(cell(groupRow(['Rates']), 'DESK', true)).toBe('$4');
    // a run row's value is never a count
    expect(
      cell(
        { id: 'r', keys: ['Rates'], isGroup: false, cells: [] },
        'NOTIONAL',
        true,
      ),
    ).toBe('$4');
    expect(cell(['4'], 'NOTIONAL', true)).toBe('$4');
  });

  test('Marks a column as counted on group rows where the drill-down counts it, and number columns as numbers for Excel', () => {
    const schema = new Schema([
      new SchemaColumn('DESK', PrimitiveType.get('String'), false),
      new SchemaColumn('NOTIONAL', PrimitiveType.get('Decimal'), false),
      new SchemaColumn('PRICE', PrimitiveType.get('Float'), false),
    ]);
    const columns = buildCubeColumnDefs(
      { schema } as unknown as CubeExecutionResult,
      () => null,
      undefined,
      checkDrilldown(
        {
          columns: ['DESK'],
          aggregations: [
            { column: 'NOTIONAL', function: AggregationFunction.COUNT },
          ],
        },
        schema,
      ),
    );
    expect(
      columns.map((column) => [
        column.headerName,
        (column.cellRendererParams as { countOnGroupRows: boolean })
          .countOnGroupRows,
        column.cellClass,
      ]),
    ).toEqual([
      ['DESK', false, undefined],
      ['NOTIONAL', true, 'cube-excel-number'],
      ['PRICE', false, 'cube-excel-number'],
    ]);
  });

  test("Totals local mode's groups as numbers, though the engine writes integers and decimals as text", () => {
    const params = (values: unknown[]) =>
      ({ values }) as unknown as Parameters<typeof LOCAL_AGGREGATIONS.sum>[0];
    // ag-grid's own sum would join the texts: '10' + '2.5' + …
    expect(LOCAL_AGGREGATIONS.sum(params(['10', '2.5', null, 1]))).toBe(13.5);
    expect(LOCAL_AGGREGATIONS.avg(params(['10', '2', null]))).toBe(6);
    expect(LOCAL_AGGREGATIONS.min(params(['10', '-2.5', 'x']))).toBe(-2.5);
    expect(LOCAL_AGGREGATIONS.max(params(['10', '9007199254740993']))).toBe(
      9007199254740992,
    );
    // nothing to total
    expect(LOCAL_AGGREGATIONS.avg(params([null]))).toBeNull();
    expect(LOCAL_AGGREGATIONS.max(params([]))).toBeNull();
  });
});
