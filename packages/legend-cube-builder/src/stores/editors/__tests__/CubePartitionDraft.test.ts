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
  type ColumnAggregation,
  type ColumnDirection,
  Partition,
  PrimitiveType,
  Schema,
  SchemaColumn,
  SortDirection,
  WindowRankFunction,
} from '@finos/legend-cube';
import { CubePartitionDraft } from '../CubePartitionDraft.js';

const { COUNT, DISTINCT_COUNT, SUM, AVERAGE, MAX, COUNT_ROWS } =
  AggregationFunction;
const { RANK, DENSE_RANK, ROW_NUMBER } = WindowRankFunction;
const { ASC, DESC } = SortDirection;

const ORDERS = new Schema([
  new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
  new SchemaColumn('CUSTOMER_ID', PrimitiveType.get('String'), true),
  new SchemaColumn('ORDER_DATE', PrimitiveType.get('StrictDate'), true),
  new SchemaColumn('SHIP_COUNTRY', PrimitiveType.get('String'), true),
  new SchemaColumn('FREIGHT', PrimitiveType.get('Float'), true),
]);

const RANK_AGGREGATION: ColumnAggregation = {
  column: undefined,
  function: RANK,
  name: 'Rank',
};

const BY_DATE: ColumnDirection = { column: 'ORDER_DATE', direction: DESC };

/** The window-function rows without their keys, which come from a counter shared by every draft */
const rowsOf = (
  draft: CubePartitionDraft,
): {
  column: string | undefined;
  function: string;
  name: string;
  named: boolean;
}[] =>
  draft.rows.map(({ column, function: fn, name, named }) => ({
    column,
    function: fn,
    name,
    named,
  }));

/** The sort rows without their keys */
const sortRowsOf = (draft: CubePartitionDraft): ColumnDirection[] =>
  draft.sortRows.map(({ column, direction }) => ({ column, direction }));

/** A window-function row's key: its own counter, not the sort rows' */
const rowKey = (draft: CubePartitionDraft, index: number): number =>
  draft.rows[index]?.key ?? -1;

/** A sort row's key: its own counter, not the window-function rows' */
const sortKey = (draft: CubePartitionDraft, index: number): number =>
  draft.sortRows[index]?.key ?? -1;

describe('Partition draft', () => {
  test('Opens a new partition with no column, no sort row and one blank window-function row, which builds nothing', () => {
    const partition = new Partition('partition101');
    const draft = new CubePartitionDraft(partition);
    expect(draft.columns).toEqual([]);
    expect(draft.sortRows).toEqual([]);
    expect(rowsOf(draft)).toEqual([
      { column: '', function: '', name: '', named: false },
    ]);
    expect(draft.sorts).toEqual([]);
    expect(draft.aggregations).toEqual([]);
    expect(draft.aggregationUse).toEqual({ kind: 'window', sorted: false });
    expect(draft.build()).toBe(partition);
  });

  test('Opens with the saved columns, a sort row per key and a row per window function, a name typed only when it differs from the auto-name', () => {
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY', 'CUSTOMER_ID'],
      [BY_DATE, { column: 'ORDER_ID', direction: ASC }],
      [
        { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
        { column: 'FREIGHT', function: MAX, name: 'Biggest' },
        RANK_AGGREGATION,
        { column: undefined, function: DENSE_RANK, name: 'Place' },
        { column: undefined, function: ROW_NUMBER, name: 'Row Number' },
        { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
      ],
      { note: 'kept' },
    );
    const draft = new CubePartitionDraft(partition);
    // kept in the saved order until the picks change
    expect(draft.columns).toEqual(['SHIP_COUNTRY', 'CUSTOMER_ID']);
    expect(sortRowsOf(draft)).toEqual([
      BY_DATE,
      { column: 'ORDER_ID', direction: ASC },
    ]);
    // a window knows the rank functions, so their auto-names are theirs (a Group's aren't)
    expect(rowsOf(draft)).toEqual([
      { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum', named: false },
      { column: 'FREIGHT', function: MAX, name: 'Biggest', named: true },
      { column: undefined, function: RANK, name: 'Rank', named: false },
      { column: undefined, function: DENSE_RANK, name: 'Place', named: true },
      {
        column: undefined,
        function: ROW_NUMBER,
        name: 'Row Number',
        named: false,
      },
      {
        column: undefined,
        function: COUNT_ROWS,
        name: 'Count Rows',
        named: false,
      },
    ]);
    expect(new Set(draft.rows.map(({ key }) => key)).size).toBe(6);
    expect(new Set(draft.sortRows.map(({ key }) => key)).size).toBe(2);
    expect(draft.aggregationUse).toEqual({ kind: 'window', sorted: true });
    expect(draft.aggregations).toEqual(partition.aggregations);
    expect(draft.build()).toBe(partition);
  });

  test('Gives the original back until something changes, even with a saved sort key without a column', () => {
    // an imported spec can hold a key without a column, which a row can't build
    const partition = new Partition(
      'partition101',
      [],
      [{ column: '', direction: DESC }, BY_DATE],
      [RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    expect(sortRowsOf(draft)).toEqual([
      { column: '', direction: DESC },
      BY_DATE,
    ]);
    // the blank key is no sort key
    expect(draft.sorts).toEqual([BY_DATE]);
    expect(draft.build()).toBe(partition);
    // once something changes, it is left out
    draft.setSortDirection(sortKey(draft, 1), ASC);
    expect(draft.build().sorts).toEqual([
      { column: 'ORDER_DATE', direction: ASC },
    ]);
  });

  test('Gives the original back until something changes, even with a saved column the input lacks', () => {
    const partition = new Partition(
      'partition101',
      ['SHIPPER', 'SHIP_COUNTRY'],
      [BY_DATE],
      [RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    expect(draft.columns).toEqual(['SHIPPER', 'SHIP_COUNTRY']);
    expect(draft.build()).toBe(partition);
  });

  test('Gives the original back once the changes are undone', () => {
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_DATE],
      [{ column: 'FREIGHT', function: SUM, name: 'Total' }],
      { note: 'kept' },
    );
    const draft = new CubePartitionDraft(partition);
    const key = rowKey(draft, 0);
    draft.setName(key, 'Running total');
    expect(draft.build()).not.toBe(partition);
    draft.setName(key, 'Total');
    expect(draft.build()).toBe(partition);
    draft.setSortDirection(sortKey(draft, 0), ASC);
    expect(draft.build()).not.toBe(partition);
    draft.setSortDirection(sortKey(draft, 0), DESC);
    expect(draft.build()).toBe(partition);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.build()).not.toBe(partition);
    draft.toggleColumn('ORDER_ID', ORDERS);
    // a blank sort row and a blank window-function row build nothing
    draft.addSortRow();
    draft.addRow();
    expect(draft.build()).toBe(partition);
  });

  test("Ticks partition columns into the input's order, whatever the order they are ticked in", () => {
    const draft = new CubePartitionDraft(new Partition('partition101'));
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    draft.toggleColumn('CUSTOMER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'CUSTOMER_ID', 'SHIP_COUNTRY']);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.columns).toEqual(['CUSTOMER_ID', 'SHIP_COUNTRY']);
    expect(draft.build().columns).toEqual(['CUSTOMER_ID', 'SHIP_COUNTRY']);
  });

  test("Keeps a saved order of partition columns until a column is ticked, then follows the input's", () => {
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY', 'ORDER_ID'],
      [BY_DATE],
      [RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    draft.toggleColumn('CUSTOMER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'CUSTOMER_ID', 'SHIP_COUNTRY']);
    // the same columns again, but in the input's order now: a change
    draft.toggleColumn('CUSTOMER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    const built = draft.build();
    expect(built).not.toBe(partition);
    expect(built.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    expect(built.sorts).toEqual(partition.sorts);
    expect(built.aggregations).toEqual(partition.aggregations);
  });

  test('Keeps a saved partition column the input lacks listed last, until it is unticked', () => {
    const draft = new CubePartitionDraft(
      new Partition('partition101', ['SHIPPER', 'SHIP_COUNTRY'], [], []),
    );
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY', 'SHIPPER']);
    draft.toggleColumn('FREIGHT', ORDERS);
    expect(draft.columns).toEqual([
      'ORDER_ID',
      'SHIP_COUNTRY',
      'FREIGHT',
      'SHIPPER',
    ]);
    draft.toggleColumn('SHIPPER', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY', 'FREIGHT']);
  });

  test('Unticks every partition column, for one window over all the rows', () => {
    const partition = new Partition(
      'partition101',
      ['ORDER_ID', 'SHIP_COUNTRY'],
      [BY_DATE],
      [RANK_AGGREGATION],
      { note: 'kept' },
    );
    const draft = new CubePartitionDraft(partition);
    draft.clearColumns();
    expect(draft.columns).toEqual([]);
    const built = draft.build();
    expect(built).not.toBe(partition);
    expect(built.id).toBe('partition101');
    expect(built.columns).toEqual([]);
    expect(built.sorts).toEqual(partition.sorts);
    expect(built.aggregations).toEqual(partition.aggregations);
  });

  test('Adds blank ascending sort rows, each with its own key, and removes sort rows down to none', () => {
    const draft = new CubePartitionDraft(
      new Partition('partition101', [], [BY_DATE], [RANK_AGGREGATION]),
    );
    draft.addSortRow();
    draft.addSortRow();
    expect(sortRowsOf(draft)).toEqual([
      BY_DATE,
      { column: '', direction: ASC },
      { column: '', direction: ASC },
    ]);
    expect(new Set(draft.sortRows.map(({ key }) => key)).size).toBe(3);
    draft.removeSortRow(sortKey(draft, 0));
    expect(sortRowsOf(draft)).toEqual([
      { column: '', direction: ASC },
      { column: '', direction: ASC },
    ]);
    draft.sortRows
      .map(({ key }) => key)
      .forEach((key) => draft.removeSortRow(key));
    expect(draft.sortRows).toEqual([]);
    expect(draft.build().sorts).toEqual([]);
  });

  test("Sets a sort row's column and direction, and leaves out a sort row without a column", () => {
    const draft = new CubePartitionDraft(
      new Partition('partition101', [], [], [RANK_AGGREGATION]),
    );
    draft.addSortRow();
    draft.addSortRow();
    draft.setSortColumn(sortKey(draft, 1), 'ORDER_ID');
    draft.setSortDirection(sortKey(draft, 1), DESC);
    expect(sortRowsOf(draft)).toEqual([
      { column: '', direction: ASC },
      { column: 'ORDER_ID', direction: DESC },
    ]);
    expect(draft.sorts).toEqual([{ column: 'ORDER_ID', direction: DESC }]);
    expect(draft.build().sorts).toEqual([
      { column: 'ORDER_ID', direction: DESC },
    ]);
  });

  test('Moves a sort row up or down, never past either end', () => {
    const partition = new Partition(
      'partition101',
      [],
      [
        { column: 'A', direction: ASC },
        { column: 'B', direction: ASC },
        { column: 'C', direction: DESC },
      ],
      [RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    const [a, , c] = draft.sortRows;
    // at either end: nothing moves, so the original comes back
    draft.moveSortRow(a?.key ?? -1, -1);
    draft.moveSortRow(c?.key ?? -1, 1);
    expect(sortRowsOf(draft)).toEqual(partition.sorts);
    expect(draft.build()).toBe(partition);
    draft.moveSortRow(c?.key ?? -1, -1);
    expect(sortRowsOf(draft).map(({ column }) => column)).toEqual([
      'A',
      'C',
      'B',
    ]);
    draft.moveSortRow(a?.key ?? -1, 1);
    expect(draft.build().sorts).toEqual([
      { column: 'C', direction: DESC },
      { column: 'A', direction: ASC },
      { column: 'B', direction: ASC },
    ]);
  });

  test('Sorts the window only once a sort row has a column', () => {
    const draft = new CubePartitionDraft(
      new Partition('partition101', [], [], [RANK_AGGREGATION]),
    );
    expect(draft.aggregationUse).toEqual({ kind: 'window', sorted: false });
    draft.addSortRow();
    expect(draft.aggregationUse).toEqual({ kind: 'window', sorted: false });
    draft.setSortColumn(sortKey(draft, 0), 'ORDER_DATE');
    expect(draft.aggregationUse).toEqual({ kind: 'window', sorted: true });
    draft.setSortColumn(sortKey(draft, 0), '');
    expect(draft.aggregationUse).toEqual({ kind: 'window', sorted: false });
  });

  test('Picking a column with no function yet sets Count, and the name follows the column', () => {
    const draft = new CubePartitionDraft(new Partition('partition101'));
    const key = rowKey(draft, 0);
    draft.setColumn(key, 'ORDER_ID');
    expect(rowsOf(draft)).toEqual([
      {
        column: 'ORDER_ID',
        function: COUNT,
        name: 'ORDER_ID Count',
        named: false,
      },
    ]);
    draft.setFunction(key, SUM);
    expect(rowsOf(draft)).toEqual([
      { column: 'ORDER_ID', function: SUM, name: 'ORDER_ID Sum', named: false },
    ]);
    // a function already picked stays when the column changes
    draft.setColumn(key, 'FREIGHT');
    expect(rowsOf(draft)).toEqual([
      { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum', named: false },
    ]);
  });

  test.each([
    [COUNT_ROWS, 'Count Rows'],
    [RANK, 'Rank'],
    [DENSE_RANK, 'Dense Rank'],
    [ROW_NUMBER, 'Row Number'],
  ])(
    'Switching to %s clears the column and names the row %s',
    (fn, autoName) => {
      const draft = new CubePartitionDraft(
        new Partition(
          'partition101',
          [],
          [BY_DATE],
          [{ column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' }],
        ),
      );
      draft.setFunction(rowKey(draft, 0), fn);
      expect(rowsOf(draft)).toEqual([
        { column: undefined, function: fn, name: autoName, named: false },
      ]);
      expect(draft.build().aggregations).toEqual([
        { column: undefined, function: fn, name: autoName },
      ]);
    },
  );

  test('Switching from Rank back to Sum leaves a column to pick and no name', () => {
    const draft = new CubePartitionDraft(
      new Partition('partition101', [], [BY_DATE], [RANK_AGGREGATION]),
    );
    const key = rowKey(draft, 0);
    draft.setFunction(key, SUM);
    expect(rowsOf(draft)).toEqual([
      { column: '', function: SUM, name: '', named: false },
    ]);
    // no column yet: left out
    expect(draft.aggregations).toEqual([]);
    draft.setColumn(key, 'FREIGHT');
    expect(rowsOf(draft)).toEqual([
      { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum', named: false },
    ]);
  });

  test('Clears the column a saved Rank holds when Rank is picked again', () => {
    // an imported spec can hold one, which the node refuses
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE],
      [{ column: 'ORDER_ID', function: RANK, name: 'Rank' }],
    );
    const draft = new CubePartitionDraft(partition);
    // Rank's auto-name doesn't name a column, so the saved name follows
    expect(rowsOf(draft)).toEqual([
      { column: 'ORDER_ID', function: RANK, name: 'Rank', named: false },
    ]);
    // kept as saved until something changes
    expect(draft.aggregations).toEqual(partition.aggregations);
    expect(draft.build()).toBe(partition);
    draft.setFunction(rowKey(draft, 0), RANK);
    expect(draft.build().aggregations).toEqual([RANK_AGGREGATION]);
  });

  test('Keeps a typed name exactly as typed, through column and function changes', () => {
    const draft = new CubePartitionDraft(new Partition('partition101'));
    const key = rowKey(draft, 0);
    draft.setColumn(key, 'ORDER_ID');
    draft.setName(key, ' Order count ');
    expect(rowsOf(draft)).toEqual([
      {
        column: 'ORDER_ID',
        function: COUNT,
        name: ' Order count ',
        named: true,
      },
    ]);
    draft.setColumn(key, 'CUSTOMER_ID');
    draft.setFunction(key, DISTINCT_COUNT);
    expect(draft.rows[0]?.name).toBe(' Order count ');
    draft.setFunction(key, DENSE_RANK);
    expect(rowsOf(draft)).toEqual([
      {
        column: undefined,
        function: DENSE_RANK,
        name: ' Order count ',
        named: true,
      },
    ]);
  });

  test('Follows the column and function again once the auto-name is typed', () => {
    const draft = new CubePartitionDraft(
      new Partition(
        'partition101',
        [],
        [BY_DATE],
        [{ column: 'FREIGHT', function: SUM, name: 'Total' }],
      ),
    );
    const key = rowKey(draft, 0);
    expect(draft.rows[0]?.named).toBe(true);
    draft.setName(key, 'FREIGHT Sum');
    expect(draft.rows[0]?.named).toBe(false);
    draft.setFunction(key, AVERAGE);
    expect(draft.rows[0]?.name).toBe('FREIGHT Average');
    // and for a rank function
    draft.setFunction(key, RANK);
    expect(draft.rows[0]?.name).toBe('Rank');
    draft.setName(key, 'Place');
    draft.setFunction(key, ROW_NUMBER);
    expect(draft.rows[0]?.name).toBe('Place');
    draft.setName(key, 'Row Number');
    expect(draft.rows[0]?.named).toBe(false);
    draft.setFunction(key, DENSE_RANK);
    expect(draft.rows[0]?.name).toBe('Dense Rank');
  });

  test('Adds blank window-function rows, each with its own key, and removes rows down to none', () => {
    const draft = new CubePartitionDraft(
      new Partition('partition101', [], [BY_DATE], [RANK_AGGREGATION]),
    );
    draft.addRow();
    draft.addRow();
    expect(rowsOf(draft).slice(1)).toEqual([
      { column: '', function: '', name: '', named: false },
      { column: '', function: '', name: '', named: false },
    ]);
    expect(new Set(draft.rows.map(({ key }) => key)).size).toBe(3);
    draft.removeRow(rowKey(draft, 0));
    expect(draft.rows).toHaveLength(2);
    expect(draft.aggregations).toEqual([]);
    draft.rows.map(({ key }) => key).forEach((key) => draft.removeRow(key));
    // no blank row comes back
    expect(draft.rows).toEqual([]);
    expect(draft.build().aggregations).toEqual([]);
  });

  test('Builds a row with a column or a function that takes none; not a blank row or a column function without a column', () => {
    const draft = new CubePartitionDraft(new Partition('partition101'));
    // a blank row
    draft.addRow();
    // a column function with no column yet
    draft.setFunction(rowKey(draft, 1), SUM);
    draft.addRow();
    draft.setColumn(rowKey(draft, 2), 'ORDER_ID');
    draft.addRow();
    draft.setFunction(rowKey(draft, 3), COUNT_ROWS);
    draft.addRow();
    draft.setFunction(rowKey(draft, 4), ROW_NUMBER);
    expect(rowsOf(draft).map(({ column }) => column)).toEqual([
      '',
      '',
      'ORDER_ID',
      undefined,
      undefined,
    ]);
    expect(draft.rows.map((row) => draft.isBuiltRow(row))).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
    expect(draft.aggregations).toEqual([
      { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
      { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
      { column: undefined, function: ROW_NUMBER, name: 'Row Number' },
    ]);
    expect(draft.build().aggregations).toEqual(draft.aggregations);
  });

  test('Builds a saved function no window knows, or an empty one, with no column, and keeps it through other edits (Q4)', () => {
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE],
      [
        { column: undefined, function: 'NTile', name: 'Quartile' },
        { column: undefined, function: '', name: 'E' },
        { column: 'FREIGHT', function: 'Median', name: 'Middle' },
        { column: undefined, function: SUM, name: 'Total' },
        RANK_AGGREGATION,
      ],
    );
    const draft = new CubePartitionDraft(partition);
    expect(rowsOf(draft).slice(0, 3)).toEqual([
      { column: undefined, function: 'NTile', name: 'Quartile', named: true },
      { column: undefined, function: '', name: 'E', named: true },
      { column: 'FREIGHT', function: 'Median', name: 'Middle', named: true },
    ]);
    // a column function saved without a column can't be built
    expect(draft.rows.map((row) => draft.isBuiltRow(row))).toEqual([
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(draft.build()).toBe(partition);
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    draft.addRow();
    const built = draft.build();
    expect(built).not.toBe(partition);
    expect(built.aggregations).toEqual([
      { column: undefined, function: 'NTile', name: 'Quartile' },
      { column: undefined, function: '', name: 'E' },
      { column: 'FREIGHT', function: 'Median', name: 'Middle' },
      RANK_AGGREGATION,
    ]);
  });

  test('Builds a partition with the same id and saved rest, the picked columns, the sort keys and the window functions', () => {
    const partition = new Partition('partition101', [], [], [], {
      note: 'kept',
    });
    const draft = new CubePartitionDraft(partition);
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    draft.addSortRow();
    draft.setSortColumn(sortKey(draft, 0), 'ORDER_DATE');
    draft.setSortDirection(sortKey(draft, 0), DESC);
    draft.setColumn(rowKey(draft, 0), 'FREIGHT');
    draft.setFunction(rowKey(draft, 0), SUM);
    draft.addRow();
    draft.setFunction(rowKey(draft, 1), RANK);
    const built = draft.build();
    expect(built).toBeInstanceOf(Partition);
    expect(built).not.toBe(partition);
    expect(built.id).toBe('partition101');
    expect(built.rest).toBe(partition.rest);
    expect(built.columns).toEqual(['SHIP_COUNTRY']);
    expect(built.sorts).toEqual([BY_DATE]);
    expect(built.aggregations).toEqual([
      { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
      RANK_AGGREGATION,
    ]);
  });
});

describe('Partition draft: one change at a time', () => {
  const BY_ID: ColumnDirection = { column: 'ORDER_ID', direction: ASC };

  test('Removing a saved sort row, and nothing else, builds the partition without it', () => {
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE, BY_ID],
      [RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    draft.removeSortRow(draft.sortRows[0]?.key ?? -1);
    expect(draft.build().sorts).toEqual([BY_ID]);
  });

  test("Changing a saved sort row's column, and nothing else, builds the partition with it", () => {
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE],
      [RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    draft.setSortColumn(draft.sortRows[0]?.key ?? -1, 'ORDER_ID');
    expect(draft.build().sorts).toEqual([
      { column: 'ORDER_ID', direction: DESC },
    ]);
  });

  test('Removing a saved window-function row, and nothing else, builds the partition without it', () => {
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE],
      [{ column: 'FREIGHT', function: SUM, name: 'Total' }, RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    draft.removeRow(draft.rows[0]?.key ?? -1);
    expect(draft.build().aggregations).toEqual([RANK_AGGREGATION]);
  });

  test("A saved Rank holding an empty column ('') is a built row, so the editor judges it", () => {
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE],
      [{ column: '', function: RANK, name: 'Rank' }],
    );
    const draft = new CubePartitionDraft(partition);
    expect(draft.rows.map((row) => draft.isBuiltRow(row))).toEqual([true]);
  });

  test("A saved Rank holding an empty column ('') is kept through other edits", () => {
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE],
      [{ column: '', function: RANK, name: 'Rank' }],
    );
    const draft = new CubePartitionDraft(partition);
    expect(draft.aggregations).toEqual(partition.aggregations);
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    expect(draft.build().aggregations).toEqual([
      { column: '', function: RANK, name: 'Rank' },
    ]);
  });

  test('Adding a blank sort row, and nothing else, drops a saved sort key without a column', () => {
    // adding a row is a change, so build() compares: the blank key is left out
    const partition = new Partition(
      'partition101',
      [],
      [{ column: '', direction: DESC }, BY_DATE],
      [RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    draft.addSortRow();
    const built = draft.build();
    expect(built).not.toBe(partition);
    expect(built.sorts).toEqual([BY_DATE]);
  });

  test('Adding a blank window-function row, and nothing else, drops a saved column function without a column', () => {
    const partition = new Partition(
      'partition101',
      [],
      [BY_DATE],
      [{ column: undefined, function: SUM, name: 'Total' }, RANK_AGGREGATION],
    );
    const draft = new CubePartitionDraft(partition);
    draft.addRow();
    const built = draft.build();
    expect(built).not.toBe(partition);
    expect(built.aggregations).toEqual([RANK_AGGREGATION]);
  });

  test('Keeps the auto-name of a Rank row a column is picked on through the draft', () => {
    const draft = new CubePartitionDraft(
      new Partition('partition101', [], [BY_DATE], [RANK_AGGREGATION]),
    );
    draft.setColumn(draft.rows[0]?.key ?? -1, 'ORDER_ID');
    expect(draft.rows[0]?.name).toBe('Rank');
  });
});
