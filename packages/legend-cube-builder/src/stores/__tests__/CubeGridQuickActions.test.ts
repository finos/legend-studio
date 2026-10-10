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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  ColumnComparisonFilter,
  CubeDocument,
  Connection,
  Filter,
  FilterOperator,
  type Group,
  Limit,
  OpaqueType,
  PrimitiveType,
  Query,
  Schema,
  SchemaColumn,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import type { DataGridGetContextMenuItemsParams } from '@finos/legend-lego/data-grid';
import { flowResult, runInAction } from 'mobx';
import {
  CUBE_QUICK_ACTION_DISABLED_REASON,
  FILTER_FLOAT_COMPARISON_HINT,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import { getCubeGridContextMenuItems } from '../../components/grid/CubeResultGrid.js';
import type {
  CubeResult,
  CubeResultValue,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeRowCountDraft } from '../editors/CubeRowCountDraft.js';
import {
  getCubeGridQuickActions,
  getGroupByCountName,
} from '../CubeGridQuickActions.js';

const P = 'meta::pure::precisePrimitives::';
const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const COLUMNS = [
  new SchemaColumn('ORDER_ID', PrimitiveType.get(`${P}SmallInt`), false),
  new SchemaColumn(
    'SHIP_COUNTRY',
    PrimitiveType.get(`${P}Varchar`, [15]),
    true,
  ),
  new SchemaColumn('FREIGHT', PrimitiveType.get(`${P}Double`), true),
  new SchemaColumn('TOTAL', PrimitiveType.get(`${P}BigInt`), true),
  new SchemaColumn('SHIPPED_AT', PrimitiveType.get(`${P}Timestamp`), true),
  new SchemaColumn('PAYLOAD', PrimitiveType.get('Variant'), true),
  new SchemaColumn('BLOB', OpaqueType.get('my::model::Blob'), true),
];
const position = (name: string): number =>
  COLUMNS.findIndex((column) => column.name === name);
/** One row, a value per column */
const ROW: CubeResultValue[] = [
  '10248',
  'France',
  32.38,
  '9007199254740993',
  '2024-02-29T13:45:12.123456000+0000',
  '{"a": 1}',
  'x',
];
const RESULT: CubeResult = {
  columns: COLUMNS.map((column) => column.name),
  rows: [ROW],
  sql: [],
  durationMs: 1,
};

/** The table alone, run once */
const setUp = async (): Promise<{
  state: CubeEditorState;
  fake: FakeCubeEngine;
}> => {
  const { host, fake } = TEST__createCubeHost({ result: RESULT });
  const state = new CubeEditorState(
    host,
    new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [northwindTable('relational101', 'ORDERS', COLUMNS)],
        [],
        'relational101',
      ),
    }),
  );
  await flowResult(state.execution.execute());
  expect(state.execution.result).toBeDefined();
  return { state, fake };
};

const actionsOn = (
  state: CubeEditorState,
  column: string,
  cell: CubeResultValue = ROW[position(column)] ?? null,
): ReturnType<typeof getCubeGridQuickActions> =>
  getCubeGridQuickActions(state, position(column), cell);

const reasons = (
  state: CubeEditorState,
  column: string,
  cell?: CubeResultValue,
): (string | undefined)[] =>
  actionsOn(state, column, cell).map((action) => action.disabledReason);

/** The filter of the node a Filter by added */
const addedFilter = (state: CubeEditorState): ColumnComparisonFilter => {
  const node = state.document.query.getNode(
    state.document.query.selected ?? '',
  );
  expect(node).toBeInstanceOf(Filter);
  return (node as Filter).filter as ColumnComparisonFilter;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Grid quick actions', () => {
  test('Offers Sort by, Group by and Filter by on a cell of fresh rows', async () => {
    const { state } = await setUp();
    const actions = actionsOn(state, 'SHIP_COUNTRY');
    expect(actions.map((action) => action.label)).toEqual([
      'Sort by "SHIP_COUNTRY"',
      'Group by "SHIP_COUNTRY"',
      'Filter by "SHIP_COUNTRY"',
    ]);
    expect(actions.map((action) => action.disabledReason)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(actions.map((action) => action.hint)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  test('Sorts ascending by the column after the node that ran, as one undo step that runs nothing', async () => {
    const { state, fake } = await setUp();
    actionsOn(state, 'SHIP_COUNTRY')[0]?.apply();
    const { query } = state.document;
    expect(query.selected).toBe('sort101');
    const sort = query.getNode('sort101') as Sort;
    expect(sort.sorts).toEqual([
      { column: 'SHIP_COUNTRY', direction: SortDirection.ASC },
    ]);
    expect(query.getInputIds('sort101')).toEqual(['relational101']);
    expect(state.history).toHaveLength(1);
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(state.execution.isStale).toBe(true);
    // the editor panel stays as it was
    expect(state.nodeEditor.node).toBeUndefined();
  });

  test('Adds another Sort after a Sort, whose order then breaks the ties, with no warning', async () => {
    const { state } = await setUp();
    actionsOn(state, 'SHIP_COUNTRY')[0]?.apply();
    await flowResult(state.execution.execute());
    actionsOn(state, 'ORDER_ID')[0]?.apply();
    expect(state.document.query.selected).toBe('sort102');
    expect(state.document.query.getInputIds('sort102')).toEqual(['sort101']);
    expect(state.derivedWarnings.size).toBe(0);
  });

  test('Groups by the column after the node that ran, counting every row, as one undo step that runs nothing', async () => {
    const { state, fake } = await setUp();
    actionsOn(state, 'SHIP_COUNTRY')[1]?.apply();
    const { query } = state.document;
    expect(query.selected).toBe('group101');
    const group = query.getNode('group101') as Group;
    expect(group.columns).toEqual(['SHIP_COUNTRY']);
    expect(group.aggregations).toEqual([
      {
        column: undefined,
        function: AggregationFunction.COUNT_ROWS,
        name: 'Count Rows',
      },
    ]);
    expect(query.getInputIds('group101')).toEqual(['relational101']);
    expect(state.analysis.validity.get('group101')).toEqual([]);
    expect(state.history).toHaveLength(1);
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(state.execution.isStale).toBe(true);
    expect(state.nodeEditor.node).toBeUndefined();
  });

  test('Names the Count rows of a Group by on a Group after the free name, Count Rows 2, and the Group is valid', async () => {
    const { state, fake } = await setUp();
    actionsOn(state, 'SHIP_COUNTRY')[1]?.apply();
    // run the Group, whose rows have a Count Rows column already
    fake.execute.mockResolvedValueOnce({
      columns: ['SHIP_COUNTRY', 'Count Rows'],
      rows: [['France', '77']],
      sql: [],
      durationMs: 1,
    });
    await flowResult(state.execution.execute());
    expect(state.execution.isStale).toBe(false);
    getCubeGridQuickActions(state, 0, 'France')[1]?.apply();
    const { query } = state.document;
    expect(query.selected).toBe('group102');
    expect(query.getInputIds('group102')).toEqual(['group101']);
    expect((query.getNode('group102') as Group).aggregations).toEqual([
      {
        column: undefined,
        function: AggregationFunction.COUNT_ROWS,
        name: 'Count Rows 2',
      },
    ]);
    expect(state.analysis.validity.get('group102')).toEqual([]);
  });

  test("Can't group by a type that can't be compared", async () => {
    const { state } = await setUp();
    expect(reasons(state, 'PAYLOAD')[1]).toBe(
      CUBE_QUICK_ACTION_DISABLED_REASON.notGroupable('Variant'),
    );
    actionsOn(state, 'PAYLOAD')[1]?.apply();
    expect(state.document.query.getNode('group101')).toBeUndefined();
    expect(state.history).toHaveLength(0);
  });

  test('Splices the Group before a node after the one that ran, which then sees its columns', async () => {
    const { state } = await setUp();
    // a Filter after the table, while the table is the node that ran
    state.applyQuery(
      state.document.query.add(
        new Filter(
          'filter101',
          new ColumnComparisonFilter('ORDER_ID', FilterOperator.IS_NOT_EMPTY),
        ),
        'relational101',
      ),
    );
    state.applyQuery(state.document.query.select('relational101'));
    await flowResult(state.execution.execute());
    actionsOn(state, 'SHIP_COUNTRY')[1]?.apply();
    const { query } = state.document;
    expect(query.getInputIds('group101')).toEqual(['relational101']);
    expect(query.getInputIds('filter101')).toEqual(['group101']);
    // the Filter's column is gone after the Group: visible, and undone in one step
    expect(state.analysis.validity.get('filter101')?.length).toBeGreaterThan(0);
    state.undo();
    expect(state.document.query.getNode('group101')).toBeUndefined();
    expect(state.document.query.getInputIds('filter101')).toEqual([
      'relational101',
    ]);
  });

  test('Names the Count rows of a Group by after the free name: Count Rows, then with a number', () => {
    const schema = (...names: string[]): Schema =>
      new Schema(
        names.map(
          (name) => new SchemaColumn(name, PrimitiveType.get('Integer'), false),
        ),
      );
    expect(getGroupByCountName(schema('SHIP_COUNTRY'))).toBe('Count Rows');
    // a Group of a Group: in any case
    expect(getGroupByCountName(schema('SHIP_COUNTRY', 'count rows'))).toBe(
      'Count Rows 2',
    );
    expect(getGroupByCountName(schema('Count Rows', 'COUNT ROWS 2', 'x'))).toBe(
      'Count Rows 3',
    );
  });

  test("Filters on the cell's value, read as the column's type", async () => {
    const { state } = await setUp();
    actionsOn(state, 'SHIP_COUNTRY')[2]?.apply();
    expect(addedFilter(state).value).toEqual({
      kind: 'string',
      value: 'France',
    });
    expect(state.document.query.selected).toBe('filter101');
    expect(state.analysis.validity.get('filter101')).toEqual([]);
  });

  test.each<[string, CubeResultValue, unknown]>([
    // never through Number(): it would lose the last digit
    [
      'TOTAL',
      '9007199254740993',
      { kind: 'integer', value: '9007199254740993' },
    ],
    [
      'SHIPPED_AT',
      '2024-02-29T13:45:12.123456000+0000',
      { kind: 'dateTime', value: '2024-02-29T13:45:12.123456000' },
    ],
  ])('Reads a %s cell exactly', async (column, cell, value) => {
    const { state } = await setUp();
    actionsOn(state, column, cell)[2]?.apply();
    expect(addedFilter(state).value).toEqual(value);
  });

  test('Filters a null cell with Is Empty, whatever its type', async () => {
    const { state } = await setUp();
    expect(reasons(state, 'PAYLOAD', null)[2]).toBeUndefined();
    actionsOn(state, 'PAYLOAD', null)[2]?.apply();
    expect(addedFilter(state).operator).toBe(FilterOperator.IS_EMPTY);
  });

  test('Notes that comparing floating-point values may not match, and still filters', async () => {
    const { state } = await setUp();
    const [, , filterBy] = actionsOn(state, 'FREIGHT');
    expect(filterBy?.disabledReason).toBeUndefined();
    expect(filterBy?.hint).toBe(FILTER_FLOAT_COMPARISON_HINT);
  });

  test("Can't sort a Variant column, or filter on a value its type can't compare", async () => {
    const { state } = await setUp();
    expect(reasons(state, 'PAYLOAD')).toEqual([
      CUBE_QUICK_ACTION_DISABLED_REASON.notSortable('Variant'),
      CUBE_QUICK_ACTION_DISABLED_REASON.notGroupable('Variant'),
      CUBE_QUICK_ACTION_DISABLED_REASON.notComparable('Variant'),
    ]);
    expect(reasons(state, 'BLOB')).toEqual([
      CUBE_QUICK_ACTION_DISABLED_REASON.notSortable('Blob'),
      CUBE_QUICK_ACTION_DISABLED_REASON.notGroupable('Blob'),
      CUBE_QUICK_ACTION_DISABLED_REASON.notComparable('Blob'),
    ]);
    // a value that doesn't read as the column's type
    expect(reasons(state, 'TOTAL', 'abc')).toEqual([
      undefined,
      undefined,
      CUBE_QUICK_ACTION_DISABLED_REASON.UNREADABLE_VALUE,
    ]);
  });

  test('Disables both on rows from an earlier query, during a run, and in a read-only cube', async () => {
    const { state, fake } = await setUp();
    // the query changed since the run
    state.applyQuery(
      state.document.query.add(
        new Filter(
          'filter101',
          new ColumnComparisonFilter('ORDER_ID', FilterOperator.IS_NOT_EMPTY),
        ),
        'relational101',
      ),
    );
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS,
      CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS,
      CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS,
    ]);
    // a disabled action does nothing
    actionsOn(state, 'SHIP_COUNTRY')[0]?.apply();
    expect(state.document.query.getNode('sort101')).toBeUndefined();
    // undo gives back a copy of the query: its rows are stale too, so run again
    state.undo();
    await flowResult(state.execution.execute());
    // a run in flight
    let finish!: (result: CubeResult) => void;
    fake.execute.mockReturnValueOnce(
      new Promise<CubeResult>((resolve) => {
        finish = resolve;
      }),
    );
    const run = flowResult(state.execution.execute());
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      CUBE_QUICK_ACTION_DISABLED_REASON.RUNNING,
      CUBE_QUICK_ACTION_DISABLED_REASON.RUNNING,
      CUBE_QUICK_ACTION_DISABLED_REASON.RUNNING,
    ]);
    finish(RESULT);
    await run;
    runInAction(() => {
      state.readOnly = true;
    });
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      READ_ONLY_CUBE_TITLE,
      READ_ONLY_CUBE_TITLE,
      READ_ONLY_CUBE_TITLE,
    ]);
  });

  test('Disables all three while the node editor holds edits, which choosing one would apply first', async () => {
    const { host } = TEST__createCubeHost({ result: RESULT });
    const state = new CubeEditorState(
      host,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', COLUMNS),
            new Limit('limit101', 10),
          ],
          [new Connection('relational101', 'limit101', 'tds')],
          'limit101',
        ),
      }),
    );
    await flowResult(state.execution.execute());
    state.nodeEditor.open('limit101');
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    (state.nodeEditor.draft as CubeRowCountDraft<Limit>).setSizeText('5');
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      CUBE_QUICK_ACTION_DISABLED_REASON.EDITING,
      CUBE_QUICK_ACTION_DISABLED_REASON.EDITING,
      CUBE_QUICK_ACTION_DISABLED_REASON.EDITING,
    ]);
    actionsOn(state, 'SHIP_COUNTRY')[0]?.apply();
    expect(state.document.query.getNode('sort101')).toBeUndefined();
  });

  test('Does nothing when the query changed after the menu opened', async () => {
    const { state } = await setUp();
    // Sort by, from a menu opened before a Filter was added
    const before = actionsOn(state, 'SHIP_COUNTRY');
    expect(before.map((action) => action.disabledReason)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    state.applyQuery(
      state.document.query.add(
        new Filter(
          'filter101',
          new ColumnComparisonFilter('ORDER_ID', FilterOperator.IS_NOT_EMPTY),
        ),
        'relational101',
      ),
    );
    const ids = (): string =>
      state.document.query.nodes.map(({ id }) => id).join();
    const afterFilter = ids();
    before[0]?.apply();
    expect(ids()).toBe(afterFilter);
    // Filter by, from a menu opened before a Sort was added
    state.undo();
    await flowResult(state.execution.execute());
    const fresh = actionsOn(state, 'SHIP_COUNTRY');
    actionsOn(state, 'ORDER_ID')[0]?.apply();
    const afterSort = ids();
    fresh[2]?.apply();
    expect(ids()).toBe(afterSort);
  });

  test('Disables all three while the node editor holds input not yet stored, which closing it would commit', async () => {
    const { state } = await setUp();
    const remove = state.nodeEditor.addFlusher(() => undefined, {
      isPending: () => true,
    });
    expect(state.hasEditsToApply).toBe(false);
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      CUBE_QUICK_ACTION_DISABLED_REASON.EDITING,
      CUBE_QUICK_ACTION_DISABLED_REASON.EDITING,
      CUBE_QUICK_ACTION_DISABLED_REASON.EDITING,
    ]);
    actionsOn(state, 'SHIP_COUNTRY')[0]?.apply();
    expect(state.document.query.getNode('sort101')).toBeUndefined();
    remove();
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  test('Disables all three on rows run in another context, though the query is the same', async () => {
    const { state } = await setUp();
    const { query } = state.document;
    state.applyDocument(state.document.withContext({ ...CONTEXT }));
    // by identity: a diff of queries can't be reported
    expect(state.document.query === query).toBe(true);
    expect(reasons(state, 'SHIP_COUNTRY')).toEqual([
      CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS,
      CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS,
      CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS,
    ]);
    actionsOn(state, 'SHIP_COUNTRY')[0]?.apply();
    expect(state.document.query.getNode('sort101')).toBeUndefined();
  });

  test('Does nothing when the cube changed in any way after the menu opened, not only its query', async () => {
    const { state } = await setUp();
    const before = actionsOn(state, 'SHIP_COUNTRY');
    // hiding the graph leaves the query as it is
    state.setShowGraph(false);
    const { query } = state.document;
    before.forEach((action) => action.apply());
    // by identity: a diff of queries can't be reported
    expect(state.document.query === query).toBe(true);
    expect(state.history).toHaveLength(1);
  });

  test('Filters a null Float cell with Is Empty, with no note on comparing floats', async () => {
    const { state } = await setUp();
    const [, , filterBy] = actionsOn(state, 'FREIGHT', null);
    expect(filterBy?.disabledReason).toBeUndefined();
    expect(filterBy?.hint).toBeUndefined();
    filterBy?.apply();
    expect(addedFilter(state).operator).toBe(FilterOperator.IS_EMPTY);
  });

  test("Adds no node in a read-only cube, or where the query can't take it", async () => {
    const { state } = await setUp();
    const before = state.document.query;
    runInAction(() => {
      state.readOnly = true;
    });
    state.addConfiguredNode(
      Sort.byColumn('sort101', 'ORDER_ID'),
      'relational101',
    );
    expect(state.document.query === before).toBe(true);
    expect(state.document.query.getNode('sort101') === undefined).toBe(true);
    expect(state.history).toHaveLength(0);
    runInAction(() => {
      state.readOnly = false;
    });
    state.addConfiguredNode(Sort.byColumn('sort101', 'ORDER_ID'), 'missing999');
    expect(state.document.query === before).toBe(true);
    expect(state.history).toHaveLength(0);
  });

  test('Offers nothing on a position that is not a column of the rows', async () => {
    const { state } = await setUp();
    expect(getCubeGridQuickActions(state, COLUMNS.length, 'x')).toEqual([]);
  });
});

describe('Grid context menu', () => {
  const params = (
    colId: string | undefined,
  ): DataGridGetContextMenuItemsParams<readonly CubeResultValue[]> =>
    ({
      column: colId === undefined ? null : { getColId: () => colId },
      node: { data: ROW },
      defaultItems: ['copy', 'export'],
    }) as unknown as DataGridGetContextMenuItemsParams<
      readonly CubeResultValue[]
    >;

  test("Puts the quick actions first on a cell, then a separator and ag-grid's own items", async () => {
    const { state } = await setUp();
    const items = getCubeGridContextMenuItems(state, params('c1'));
    expect(
      items.map((item) => (typeof item === 'string' ? item : item.name)),
    ).toEqual([
      'Sort by "SHIP_COUNTRY"',
      'Group by "SHIP_COUNTRY"',
      'Filter by "SHIP_COUNTRY"',
      'separator',
      'copy',
      'export',
    ]);
    const filterBy = items[2];
    expect(typeof filterBy === 'object' && filterBy.disabled).toBe(false);
  });

  test("Shows an enabled item's note as its tooltip, and none without a note", async () => {
    const { state } = await setUp();
    const [, , filterBy] = getCubeGridContextMenuItems(state, params('c2'));
    expect(filterBy).toMatchObject({
      name: 'Filter by "FREIGHT"',
      disabled: false,
      tooltip: FILTER_FLOAT_COMPARISON_HINT,
    });
    const [sortBy] = getCubeGridContextMenuItems(state, params('c1'));
    expect(typeof sortBy === 'object' && 'tooltip' in sortBy).toBe(false);
  });

  test('Shows a disabled item with its reason as the tooltip', async () => {
    const { state } = await setUp();
    const [sortBy] = getCubeGridContextMenuItems(state, params('c5'));
    expect(sortBy).toMatchObject({
      name: 'Sort by "PAYLOAD"',
      disabled: true,
      tooltip: CUBE_QUICK_ACTION_DISABLED_REASON.notSortable('Variant'),
    });
  });

  test("Gives ag-grid's own items only outside a cell", async () => {
    const { state } = await setUp();
    expect(getCubeGridContextMenuItems(state, params(undefined))).toEqual([
      'copy',
      'export',
    ]);
  });
});
