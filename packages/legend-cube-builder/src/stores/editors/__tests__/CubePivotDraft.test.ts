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

import { afterEach, describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  Connection,
  CubeDocument,
  type LiteralValue,
  Pivot,
  printIR,
  Query,
  Schema,
  SchemaColumn,
  PrimitiveType,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createFakeNorthwindOutline,
  type FakeCubeEngine,
} from '../../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../CubeEditorState.js';
import { PIVOT_VALUE_DISABLED_REASON } from '../../../__lib__/LegendCubeLabels.js';
import { CUBE_NORTHWIND_MODEL } from '../../fixtures/CubeNorthwindModel.js';
import { CubePivotDraft, toPivotValue } from '../CubePivotDraft.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const integer = (value: string): LiteralValue => ({ kind: 'integer', value });
const string = (value: string): LiteralValue => ({ kind: 'string', value });

const states: CubeEditorState[] = [];
afterEach(() => {
  states.splice(0).forEach((state) => state.dispose());
});

/** ORDERS, then the pivot, captured, on a DuckDB cube */
const open = (
  pivot = new Pivot('pivot101'),
): { state: CubeEditorState; fake: FakeCubeEngine; draft: CubePivotDraft } => {
  const { host, fake } = TEST__createCubeHost({
    outline: createFakeNorthwindOutline('DuckDB'),
  });
  const state = new CubeEditorState(
    host,
    new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), pivot],
        [new Connection('relational101', pivot.id, 'tds')],
        pivot.id,
      ),
    }),
  );
  states.push(state);
  return { state, fake, draft: new CubePivotDraft(pivot, state) };
};

const ORDERS = new Schema(ORDERS_COLUMNS);

describe('Pivot draft', () => {
  test('Gives the original back until something changes, and when the changes undo themselves', () => {
    const pivot = new Pivot('pivot101', ['SHIP_COUNTRY'], 'SHIP_VIA', [
      integer('1'),
    ]);
    const { draft } = open(pivot);
    expect(draft.build() === pivot).toBe(true);
    draft.toggleRow('SHIP_CITY', ORDERS);
    expect(draft.build() === pivot).toBe(false);
    draft.toggleRow('SHIP_CITY', ORDERS);
    expect(draft.build() === pivot).toBe(true);
  });

  test("Keeps the row columns in the input's order, and none after None", () => {
    const { draft } = open();
    draft.toggleRow('SHIP_COUNTRY', ORDERS);
    draft.toggleRow('ORDER_ID', ORDERS);
    expect(draft.rows).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    draft.clearRows();
    expect(draft.build().rows).toEqual([]);
  });

  test('Drops the values, picked and loaded, when another pivot column is picked', () => {
    const { draft } = open(
      new Pivot('pivot101', [], 'SHIP_VIA', [integer('1'), integer('2')]),
    );
    draft.loaded = { column: 'SHIP_VIA', values: [integer('1')], more: false };
    draft.setColumn('SHIP_VIA');
    expect(draft.values).toHaveLength(2);
    draft.setColumn('EMPLOYEE_ID');
    expect(draft.values).toEqual([]);
    expect(draft.loaded).toBeUndefined();
    expect(draft.build().column).toBe('EMPLOYEE_ID');
  });

  test('Keeps the values ticked in the order the engine listed them, those it did not list after', () => {
    const { draft } = open(
      new Pivot('pivot101', [], 'SHIP_VIA', [integer('9')]),
    );
    draft.loaded = {
      column: 'SHIP_VIA',
      values: [integer('1'), integer('2'), integer('3')],
      more: false,
    };
    draft.toggleValue(integer('3'));
    draft.toggleValue(integer('1'));
    expect(draft.values).toEqual([integer('1'), integer('3'), integer('9')]);
    draft.toggleValue(integer('9'));
    expect(draft.values).toEqual([integer('1'), integer('3')]);
    draft.pickAllValues();
    expect(draft.values).toEqual([integer('1'), integer('2'), integer('3')]);
    draft.clearValues();
    expect(draft.build().values).toEqual([]);
  });

  test("Won't tick a value that can't name a column, or differs only in case from one ticked, and All skips them", () => {
    const { draft } = open(new Pivot('pivot101', [], 'SHIP_COUNTRY'));
    draft.loaded = {
      column: 'SHIP_COUNTRY',
      values: [
        string('A'),
        string('a'),
        string('b'),
        string('q"t'),
        string('q`t'),
      ],
      more: false,
    };
    draft.toggleValue(string('a'));
    expect(draft.untickableReason(string('A'))).toBe(
      PIVOT_VALUE_DISABLED_REASON.DIFFERS_ONLY_IN_CASE,
    );
    expect(draft.untickableReason(string('a'))).toBeUndefined();
    expect(draft.untickableReason(string('q"t'))).toBe(
      PIVOT_VALUE_DISABLED_REASON.NOT_A_COLUMN_NAME,
    );
    // Databricks and MemSQL quote names with backticks
    expect(draft.untickableReason(string('q`t'))).toBe(
      PIVOT_VALUE_DISABLED_REASON.NOT_A_COLUMN_NAME,
    );
    draft.pickAllValues();
    expect(draft.values).toEqual([string('a'), string('b')]);
    draft.clearValues();
    draft.pickAllValues();
    expect(draft.values).toEqual([string('A'), string('b')]);
  });

  test('Ticks at most 100 values: All stops there, keeping those ticked, and the rest say why', () => {
    const { draft } = open(
      new Pivot('pivot101', [], 'EMPLOYEE_ID', [integer('5000')]),
    );
    draft.loaded = {
      column: 'EMPLOYEE_ID',
      values: Array.from({ length: 100 }, (_, index) => integer(String(index))),
      more: true,
    };
    draft.pickAllValues();
    expect(draft.values).toHaveLength(100);
    expect(draft.values).toContainEqual(integer('5000'));
    expect(draft.untickableReason(integer('99'))).toBe(
      PIVOT_VALUE_DISABLED_REASON.TOO_MANY,
    );
    // one ticked can still be unticked
    expect(draft.untickableReason(integer('5000'))).toBeUndefined();
    expect(draft.build().validate([ORDERS])).toBe(true);
  });

  test('Builds a new pivot when only the aggregation column, or one value of as many, changes', () => {
    const pivot = new Pivot(
      'pivot101',
      ['SHIP_COUNTRY'],
      'SHIP_VIA',
      [integer('1'), integer('3')],
      { function: AggregationFunction.SUM, column: 'FREIGHT' },
    );
    const { draft } = open(pivot);
    draft.setAggregationColumn('ORDER_ID');
    const byOrder = draft.build();
    expect(byOrder === pivot).toBe(false);
    expect(byOrder.aggregation).toEqual({
      function: 'Sum',
      column: 'ORDER_ID',
    });
    draft.setAggregationColumn('FREIGHT');
    expect(draft.build() === pivot).toBe(true);
    draft.loaded = {
      column: 'SHIP_VIA',
      values: [integer('1'), integer('2'), integer('3')],
      more: false,
    };
    draft.toggleValue(integer('1'));
    draft.toggleValue(integer('2'));
    const swapped = draft.build();
    expect(swapped === pivot).toBe(false);
    expect(swapped.values).toEqual([integer('2'), integer('3')]);
  });

  test('Drops the answer of a load still on its way when another pivot column is picked, and loads that one', async () => {
    const { fake, draft } = open(new Pivot('pivot101', [], 'SHIP_VIA'));
    let answer: (result: CubeResult) => void = () => undefined;
    fake.execute.mockImplementationOnce(
      () =>
        new Promise<CubeResult>((resolve) => {
          answer = resolve;
        }),
    );
    const stale = flowResult(draft.loadValues());
    for (
      let tries = 0;
      !fake.execute.mock.calls.length && tries < 50;
      tries++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(fake.execute).toHaveBeenCalledTimes(1);
    draft.setColumn('EMPLOYEE_ID');
    expect(draft.loading).toBe(false);
    answer({
      columns: ['SHIP_VIA'],
      rows: [['1'], ['2']],
      sql: [],
      durationMs: 1,
    });
    await stale.catch(() => undefined);
    expect(draft.loaded).toBeUndefined();
    expect(draft.loadError).toBeUndefined();
    expect(draft.loading).toBe(false);
    draft.pickAllValues();
    expect(draft.values).toEqual([]);
    fake.execute.mockResolvedValueOnce({
      columns: ['EMPLOYEE_ID'],
      rows: [['5'], ['6']],
      sql: [],
      durationMs: 1,
    });
    await flowResult(draft.loadValues());
    expect(draft.loaded).toEqual({
      column: 'EMPLOYEE_ID',
      values: [integer('5'), integer('6')],
      more: false,
    });
  });

  test('Takes no column for Count rows, and one to pick for the others, keeping the one it had', () => {
    const { draft } = open();
    expect(draft.aggregation).toEqual({
      function: AggregationFunction.COUNT_ROWS,
      column: undefined,
    });
    draft.setFunction(AggregationFunction.SUM);
    expect(draft.aggregation).toEqual({ function: 'Sum', column: '' });
    draft.setAggregationColumn('FREIGHT');
    draft.setFunction(AggregationFunction.MAX);
    expect(draft.aggregation).toEqual({ function: 'Max', column: 'FREIGHT' });
    draft.setFunction(AggregationFunction.COUNT_ROWS);
    expect(draft.build().aggregation).toEqual({
      function: 'CountRows',
      column: undefined,
    });
  });

  test("Loads the pivot column's non-empty values from the engine: once each, ascending, at most 100", async () => {
    const { fake, draft } = open(new Pivot('pivot101', [], 'SHIP_VIA'));
    fake.execute.mockResolvedValueOnce({
      columns: ['SHIP_VIA'],
      rows: [['1'], ['2'], [null], ['3']],
      sql: [],
      durationMs: 1,
    });
    await flowResult(draft.loadValues());
    expect(draft.loadError).toBeUndefined();
    expect(draft.loaded).toEqual({
      column: 'SHIP_VIA',
      values: [integer('1'), integer('2'), integer('3')],
      more: false,
    });
    expect(draft.loading).toBe(false);
    const ran = printIR(fake.execute.mock.calls[0]?.[1] as never);
    // empty values are filtered out before the 101 rows that tell whether
    // there are more are taken
    expect(ran).toContain(
      '->select(~[SHIP_VIA])->filter({row | !($row.SHIP_VIA->isEmpty())})->distinct()->sort(~SHIP_VIA->ascending())->limit(101)',
    );
    // the pivot isn't in the query that loads them
    expect(ran).not.toContain('pivot');
  });

  test('Says when the engine has more values than it lists, and why it failed', async () => {
    const { fake, draft } = open(new Pivot('pivot101', [], 'SHIP_VIA'));
    fake.execute.mockResolvedValueOnce({
      columns: ['SHIP_VIA'],
      rows: Array.from({ length: 101 }, (_, index) => [String(index)]),
      sql: [],
      durationMs: 1,
    });
    await flowResult(draft.loadValues());
    expect(draft.loaded?.values).toHaveLength(100);
    expect(draft.loaded?.more).toBe(true);
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'No such table\nat'),
    );
    await flowResult(draft.loadValues());
    expect(draft.loadError).toBe('No such table');
    // with no pivot column, there is nothing to load
    const blank = open().draft;
    await flowResult(blank.loadValues());
    expect(blank.loaded).toBeUndefined();
  });

  test("Reads a value of the column's type from what the engine gives for a cell", () => {
    const schema = new Schema([
      new SchemaColumn('D', PrimitiveType.get('StrictDate'), true),
      new SchemaColumn('B', PrimitiveType.get('Boolean'), true),
      new SchemaColumn('N', PrimitiveType.get('Integer'), true),
    ]);
    expect(toPivotValue('2024-01-31T00:00:00.000+0000', schema, 'D')).toEqual({
      kind: 'strictDate',
      value: '2024-01-31',
    });
    expect(toPivotValue(true, schema, 'B')).toEqual({
      kind: 'boolean',
      value: true,
    });
    expect(toPivotValue('12', schema, 'N')).toEqual(integer('12'));
    expect(toPivotValue('x', schema, 'N')).toBeUndefined();
    expect(toPivotValue(null, schema, 'N')).toBeUndefined();
    expect(toPivotValue('1', schema, 'NOPE')).toBeUndefined();
  });
});
