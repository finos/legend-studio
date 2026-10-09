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
  Group,
  PrimitiveType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { CubeGroupDraft } from '../CubeGroupDraft.js';

const { COUNT, DISTINCT_COUNT, SUM, AVERAGE, COUNT_ROWS } = AggregationFunction;

const ORDERS = new Schema([
  new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
  new SchemaColumn('CUSTOMER_ID', PrimitiveType.get('String'), true),
  new SchemaColumn('SHIP_COUNTRY', PrimitiveType.get('String'), true),
  new SchemaColumn('FREIGHT', PrimitiveType.get('Float'), true),
]);

/** The rows without their keys, which come from a counter shared by every draft */
const rowsOf = (
  draft: CubeGroupDraft,
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

const keyOf = (draft: CubeGroupDraft, index: number): number =>
  draft.rows[index]?.key ?? -1;

describe('Group draft', () => {
  test('Opens a group without aggregations with one blank row, which builds nothing', () => {
    const group = new Group('group101');
    const draft = new CubeGroupDraft(group);
    expect(draft.columns).toEqual([]);
    expect(rowsOf(draft)).toEqual([
      { column: '', function: '', name: '', named: false },
    ]);
    expect(draft.aggregations).toEqual([]);
    expect(draft.build()).toBe(group);
    // another blank row added and nothing picked: the same group
    draft.addRow();
    expect(draft.build()).toBe(group);
  });

  test('Opens a row per saved aggregation, its name typed only when it differs from the auto-name', () => {
    const group = new Group(
      'group101',
      ['SHIP_COUNTRY'],
      [
        { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
        { column: 'FREIGHT', function: SUM, name: 'Total freight' },
        { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
        { column: undefined, function: COUNT_ROWS, name: 'Rows' },
      ],
      { note: 'kept' },
    );
    const draft = new CubeGroupDraft(group);
    expect(draft.columns).toEqual(['SHIP_COUNTRY']);
    expect(rowsOf(draft)).toEqual([
      {
        column: 'ORDER_ID',
        function: COUNT,
        name: 'ORDER_ID Count',
        named: false,
      },
      { column: 'FREIGHT', function: SUM, name: 'Total freight', named: true },
      {
        column: undefined,
        function: COUNT_ROWS,
        name: 'Count Rows',
        named: false,
      },
      { column: undefined, function: COUNT_ROWS, name: 'Rows', named: true },
    ]);
    expect(new Set(draft.rows.map(({ key }) => key)).size).toBe(4);
    expect(draft.build()).toBe(group);
  });

  test("Ticks keys into the input's order, whatever the order they are ticked in", () => {
    const draft = new CubeGroupDraft(new Group('group101'));
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    draft.toggleColumn('FREIGHT', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY', 'FREIGHT']);
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'FREIGHT']);
    expect(draft.build().columns).toEqual(['ORDER_ID', 'FREIGHT']);
  });

  test("Keeps a saved order of keys until a key is ticked, then follows the input's", () => {
    const group = new Group(
      'group101',
      ['SHIP_COUNTRY', 'ORDER_ID'],
      [{ column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' }],
    );
    const draft = new CubeGroupDraft(group);
    expect(draft.columns).toEqual(['SHIP_COUNTRY', 'ORDER_ID']);
    expect(draft.build()).toBe(group);
    draft.toggleColumn('CUSTOMER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'CUSTOMER_ID', 'SHIP_COUNTRY']);
    // the same keys picked again, but the engine follows their order: a change
    draft.toggleColumn('CUSTOMER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    const built = draft.build();
    expect(built).not.toBe(group);
    expect(built.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    expect(built.aggregations).toEqual(group.aggregations);
  });

  test('Keeps a saved key the input lacks last, until it is unticked', () => {
    const draft = new CubeGroupDraft(
      new Group('group101', ['SHIPPER', 'SHIP_COUNTRY']),
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
    expect(draft.build().columns).toEqual([
      'ORDER_ID',
      'SHIP_COUNTRY',
      'FREIGHT',
    ]);
  });

  test('Unticks every key, for one group of all the rows', () => {
    const group = new Group(
      'group101',
      ['ORDER_ID', 'SHIP_COUNTRY'],
      [{ column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' }],
      { note: 'kept' },
    );
    const draft = new CubeGroupDraft(group);
    draft.clearColumns();
    expect(draft.columns).toEqual([]);
    const built = draft.build();
    expect(built).not.toBe(group);
    expect(built.id).toBe('group101');
    expect(built.columns).toEqual([]);
    expect(built.aggregations).toEqual(group.aggregations);
  });

  test('Picking a column with no function yet sets Count, and the name follows the column', () => {
    const draft = new CubeGroupDraft(new Group('group101'));
    const key = keyOf(draft, 0);
    draft.setColumn(key, 'ORDER_ID');
    expect(rowsOf(draft)).toEqual([
      {
        column: 'ORDER_ID',
        function: COUNT,
        name: 'ORDER_ID Count',
        named: false,
      },
    ]);
    draft.setColumn(key, 'CUSTOMER_ID');
    expect(rowsOf(draft)).toEqual([
      {
        column: 'CUSTOMER_ID',
        function: COUNT,
        name: 'CUSTOMER_ID Count',
        named: false,
      },
    ]);
  });

  test('Picking a column keeps the function already picked', () => {
    const draft = new CubeGroupDraft(new Group('group101'));
    const key = keyOf(draft, 0);
    draft.setFunction(key, SUM);
    // a column function without a column has no auto-name yet
    expect(rowsOf(draft)).toEqual([
      { column: '', function: SUM, name: '', named: false },
    ]);
    draft.setColumn(key, 'FREIGHT');
    expect(rowsOf(draft)).toEqual([
      { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum', named: false },
    ]);
  });

  test('Switching between column functions keeps the column, and the name follows the function', () => {
    const draft = new CubeGroupDraft(
      new Group(
        'group101',
        [],
        [{ column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' }],
      ),
    );
    const key = keyOf(draft, 0);
    draft.setFunction(key, AVERAGE);
    expect(rowsOf(draft)).toEqual([
      {
        column: 'FREIGHT',
        function: AVERAGE,
        name: 'FREIGHT Average',
        named: false,
      },
    ]);
    draft.setFunction(key, DISTINCT_COUNT);
    expect(draft.rows[0]?.name).toBe('FREIGHT Distinct Count');
  });

  test('Switching to Count rows clears the column and names the row Count Rows', () => {
    const draft = new CubeGroupDraft(
      new Group(
        'group101',
        [],
        [{ column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' }],
      ),
    );
    draft.setFunction(keyOf(draft, 0), COUNT_ROWS);
    expect(rowsOf(draft)).toEqual([
      {
        column: undefined,
        function: COUNT_ROWS,
        name: 'Count Rows',
        named: false,
      },
    ]);
    expect(draft.rows[0]?.column).toBeUndefined();
    expect(draft.build().aggregations).toEqual([
      { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
    ]);
  });

  test('Switching from Count rows back to a column function leaves a column to pick and no name', () => {
    const draft = new CubeGroupDraft(
      new Group(
        'group101',
        [],
        [{ column: undefined, function: COUNT_ROWS, name: 'Count Rows' }],
      ),
    );
    const key = keyOf(draft, 0);
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

  test('Keeps a typed name exactly as typed, through column and function changes', () => {
    const draft = new CubeGroupDraft(new Group('group101'));
    const key = keyOf(draft, 0);
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
    draft.setFunction(key, COUNT_ROWS);
    expect(rowsOf(draft)).toEqual([
      {
        column: undefined,
        function: COUNT_ROWS,
        name: ' Order count ',
        named: true,
      },
    ]);
    expect(draft.build().aggregations).toEqual([
      { column: undefined, function: COUNT_ROWS, name: ' Order count ' },
    ]);
  });

  test('Follows the column and function again once the auto-name is typed', () => {
    const draft = new CubeGroupDraft(
      new Group(
        'group101',
        [],
        [{ column: 'ORDER_ID', function: COUNT, name: 'Orders' }],
      ),
    );
    const key = keyOf(draft, 0);
    expect(draft.rows[0]?.named).toBe(true);
    draft.setName(key, 'ORDER_ID Count');
    expect(draft.rows[0]?.named).toBe(false);
    draft.setColumn(key, 'CUSTOMER_ID');
    expect(draft.rows[0]?.name).toBe('CUSTOMER_ID Count');
    draft.setFunction(key, DISTINCT_COUNT);
    expect(draft.rows[0]?.name).toBe('CUSTOMER_ID Distinct Count');
    // and for Count rows
    draft.setName(key, 'Rows');
    draft.setFunction(key, COUNT_ROWS);
    expect(draft.rows[0]?.name).toBe('Rows');
    draft.setName(key, 'Count Rows');
    expect(draft.rows[0]?.named).toBe(false);
    draft.setFunction(key, COUNT);
    draft.setColumn(key, 'ORDER_ID');
    expect(draft.rows[0]?.name).toBe('ORDER_ID Count');
  });

  test('Adds blank rows, each with its own key, and removes rows down to none', () => {
    const draft = new CubeGroupDraft(
      new Group(
        'group101',
        [],
        [
          { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
          { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
        ],
      ),
    );
    draft.addRow();
    draft.addRow();
    expect(draft.rows).toHaveLength(4);
    expect(new Set(draft.rows.map(({ key }) => key)).size).toBe(4);
    expect(rowsOf(draft).slice(2)).toEqual([
      { column: '', function: '', name: '', named: false },
      { column: '', function: '', name: '', named: false },
    ]);
    draft.removeRow(keyOf(draft, 0));
    expect(rowsOf(draft).map(({ column }) => column)).toEqual([
      'FREIGHT',
      '',
      '',
    ]);
    expect(draft.build().aggregations).toEqual([
      { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
    ]);
    draft.rows.map(({ key }) => key).forEach((key) => draft.removeRow(key));
    // no blank row comes back
    expect(draft.rows).toEqual([]);
    expect(draft.aggregations).toEqual([]);
    expect(draft.build().aggregations).toEqual([]);
  });

  test('Leaves out a row with no column, blank or undefined, unless it is Count rows', () => {
    const draft = new CubeGroupDraft(new Group('group101'));
    // a column function with no column yet
    draft.setFunction(keyOf(draft, 0), SUM);
    // a blank row
    draft.addRow();
    draft.addRow();
    draft.setFunction(keyOf(draft, 2), COUNT_ROWS);
    draft.addRow();
    draft.setColumn(keyOf(draft, 3), 'ORDER_ID');
    expect(rowsOf(draft).map(({ column }) => column)).toEqual([
      '',
      '',
      undefined,
      'ORDER_ID',
    ]);
    expect(draft.aggregations).toEqual([
      { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
      { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
    ]);
    expect(draft.build().aggregations).toEqual(draft.aggregations);
  });

  test('Keeps a saved column function without a column until something changes, then leaves it out', () => {
    // an imported spec can hold one, which a row can't build
    const group = new Group(
      'group101',
      [],
      [
        { column: undefined, function: SUM, name: 'Total' },
        { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
      ],
    );
    const draft = new CubeGroupDraft(group);
    expect(draft.rows[0]?.column).toBeUndefined();
    expect(draft.aggregations).toEqual([
      { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
    ]);
    expect(draft.build()).toBe(group);
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    expect(draft.build().aggregations).toEqual([
      { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
    ]);
  });

  test('Gives the original back until something changes, and once the changes are undone', () => {
    const group = new Group(
      'group101',
      ['SHIP_COUNTRY'],
      [{ column: 'ORDER_ID', function: COUNT, name: 'Orders' }],
      { note: 'kept' },
    );
    const draft = new CubeGroupDraft(group);
    const key = keyOf(draft, 0);
    expect(draft.build()).toBe(group);
    draft.setName(key, 'Order count');
    expect(draft.build()).not.toBe(group);
    expect(draft.build().aggregations).toEqual([
      { column: 'ORDER_ID', function: COUNT, name: 'Order count' },
    ]);
    draft.setName(key, 'Orders');
    expect(draft.build()).toBe(group);
    draft.setColumn(key, 'CUSTOMER_ID');
    expect(draft.build()).not.toBe(group);
    draft.setColumn(key, 'ORDER_ID');
    expect(draft.build()).toBe(group);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.build().columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    draft.toggleColumn('ORDER_ID', ORDERS);
    draft.addRow();
    expect(draft.build()).toBe(group);
  });

  test('Builds a group with the same id and saved rest, the picked keys and the aggregations', () => {
    const group = new Group('group101', [], [], { note: 'kept' });
    const draft = new CubeGroupDraft(group);
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    draft.setColumn(keyOf(draft, 0), 'FREIGHT');
    draft.setFunction(keyOf(draft, 0), SUM);
    draft.addRow();
    draft.setFunction(keyOf(draft, 1), COUNT_ROWS);
    const built = draft.build();
    expect(built).toBeInstanceOf(Group);
    expect(built).not.toBe(group);
    expect(built.id).toBe('group101');
    expect(built.rest).toBe(group.rest);
    expect(built.columns).toEqual(['SHIP_COUNTRY']);
    expect(built.aggregations).toEqual([
      { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
      { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
    ]);
  });

  test('Keeps an unknown saved function, with its column and name, through edits', () => {
    const group = new Group(
      'group101',
      [],
      [
        { column: 'FREIGHT', function: 'Median', name: 'Middle' },
        { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
      ],
    );
    const draft = new CubeGroupDraft(group);
    expect(rowsOf(draft)[0]).toEqual({
      column: 'FREIGHT',
      function: 'Median',
      name: 'Middle',
      named: true,
    });
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    expect(draft.build().aggregations).toEqual(group.aggregations);
    // picking another column keeps the function as saved
    draft.setColumn(keyOf(draft, 0), 'ORDER_ID');
    expect(draft.build().aggregations).toEqual([
      { column: 'ORDER_ID', function: 'Median', name: 'Middle' },
      { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
    ]);
  });
  test('Follows the column and function on a row that had no auto-name yet, its empty name never typed', () => {
    // a saved column with no function: no auto-name, so the empty name follows
    const draft = new CubeGroupDraft(
      new Group(
        'group101',
        [],
        [{ column: 'FREIGHT', function: '', name: '' }],
      ),
    );
    expect(rowsOf(draft)[0]?.named).toBe(false);
    draft.setFunction(keyOf(draft, 0), SUM);
    expect(rowsOf(draft)[0]).toEqual({
      column: 'FREIGHT',
      function: SUM,
      name: 'FREIGHT Sum',
      named: false,
    });
    // a name typed, then cleared back to the empty name shown: it follows again
    const blank = new CubeGroupDraft(new Group('group102'));
    blank.setName(keyOf(blank, 0), 'x');
    blank.setName(keyOf(blank, 0), '');
    blank.setColumn(keyOf(blank, 0), 'FREIGHT');
    expect(rowsOf(blank)[0]).toEqual({
      column: 'FREIGHT',
      function: COUNT,
      name: 'FREIGHT Count',
      named: false,
    });
  });

  test("Puts the keys in the input's order on an untick too, a key the input lacks last", () => {
    const group = new Group(
      'group101',
      ['FREIGHT', 'ORDER_ID', 'GONE', 'SHIP_COUNTRY'],
      [{ column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' }],
    );
    const draft = new CubeGroupDraft(group);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.columns).toEqual(['SHIP_COUNTRY', 'FREIGHT', 'GONE']);
    expect(draft.build().columns).toEqual(['SHIP_COUNTRY', 'FREIGHT', 'GONE']);
  });

  test('Keeps a saved function this version does not know with no column, Rank or empty, through other edits (Q4)', () => {
    const group = new Group(
      'group101',
      [],
      [
        { column: undefined, function: 'Rank', name: 'R' },
        { column: undefined, function: '', name: 'E' },
        { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
      ],
    );
    const draft = new CubeGroupDraft(group);
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    draft.addRow();
    expect(draft.build().aggregations).toEqual([
      { column: undefined, function: 'Rank', name: 'R' },
      { column: undefined, function: '', name: 'E' },
      { column: 'ORDER_ID', function: COUNT, name: 'ORDER_ID Count' },
    ]);
  });
});
