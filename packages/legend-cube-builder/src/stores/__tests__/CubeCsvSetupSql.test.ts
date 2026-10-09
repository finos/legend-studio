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
import { CUBE_CSV_MESSAGE } from '../../__lib__/LegendCubeDirectConnectionLabels.js';
import {
  buildCubeCsvTable,
  CUBE_CSV_MAX_ROWS,
  CubeCsvColumnType,
  CubeCsvError,
  inferCubeCsvColumnType,
  parseCubeCsv,
  toCubeCsvName,
} from '../source-picker/CubeCsvSetupSql.js';
import { splitCubeSetupSql } from '../source-picker/CubeDirectConnectionTabState.js';

const { INTEGER, BIGINT, DOUBLE, BOOLEAN, DATE, TIMESTAMP, VARCHAR } =
  CubeCsvColumnType;

const errorOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    if (error instanceof CubeCsvError) {
      return error.message;
    }
    throw error;
  }
  throw new Error('Expected a CubeCsvError');
};

describe('Reading a CSV', () => {
  test('Splits records on line breaks and fields on commas, keeping empty fields', () => {
    expect(parseCubeCsv('a,b,c\n1,,3\r\n4,5,\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
      ['4', '5', ''],
    ]);
  });

  test('Reads quoted fields with commas, doubled quotes and line breaks', () => {
    expect(
      parseCubeCsv('name,note\n"Smith, J","said ""hi""\nthen left"\n'),
    ).toEqual([
      ['name', 'note'],
      ['Smith, J', 'said "hi"\nthen left'],
    ]);
  });

  test('Skips blank lines and a byte order mark, but keeps a record of one quoted empty field', () => {
    expect(parseCubeCsv('﻿a\n\n1\n\r\n""\n')).toEqual([['a'], ['1'], ['']]);
    expect(parseCubeCsv('')).toEqual([]);
    expect(parseCubeCsv('a,b')).toEqual([['a', 'b']]);
  });

  test('Refuses a quoted field that is never closed, naming the line it starts on', () => {
    expect(errorOf(() => parseCubeCsv('a,b\n1,"two\nthree\n'))).toBe(
      CUBE_CSV_MESSAGE.UNCLOSED_QUOTE(2),
    );
  });
});

describe("Guessing a CSV column's type from its values", () => {
  test.each([
    [['1', '-2', '+3', ''], INTEGER],
    [['2147483647', '-2147483648'], INTEGER],
    [['2147483648'], BIGINT],
    [['9223372036854775807', '-9223372036854775808'], BIGINT],
    [['9223372036854775808'], VARCHAR],
    [['1', '2.5', '1e3', '.5'], DOUBLE],
    [['007', '12'], VARCHAR],
    [['0.5', '00.5'], VARCHAR],
    [['0', '0.25'], DOUBLE],
    [['true', 'FALSE', ''], BOOLEAN],
    [['2024-02-29', '1999-12-31'], DATE],
    [['2023-02-29'], VARCHAR],
    [['2024-01-01 10:30', '2024-01-02T23:59:59.125', '2024-01-03'], TIMESTAMP],
    [['2024-01-01 24:00'], VARCHAR],
    [['1', 'a'], VARCHAR],
    [['', ''], VARCHAR],
    [[], VARCHAR],
  ])('Types %j as %s', (values, type) => {
    expect(inferCubeCsvColumnType(values)).toBe(type);
  });
});

describe('Naming what a CSV creates', () => {
  test('Keeps letters, digits and underscores, never starting with a digit, and steps around reserved words', () => {
    expect(toCubeCsvName(' Order Date ', 'x')).toBe('Order_Date');
    expect(toCubeCsvName('2024 sales', 'x')).toBe('_2024_sales');
    expect(toCubeCsvName('order', 'x')).toBe('order_');
    expect(toCubeCsvName('Select', 'x')).toBe('Select_');
    // DuckDB's type and function keywords too, but not those a column may use
    expect(toCubeCsvName('at', 'x')).toBe('at_');
    expect(toCubeCsvName('join', 'x')).toBe('join_');
    expect(toCubeCsvName('interval', 'x')).toBe('interval');
    expect(toCubeCsvName('---', 'column_3')).toBe('column_3');
    expect(toCubeCsvName('', 'csv_data')).toBe('csv_data');
  });
});

describe('Setup SQL for a CSV', () => {
  test('Creates the table in the csv schema, then inserts every row, each value as its type', () => {
    const table = buildCubeCsvTable(
      [
        'id,name,price,active,day,at,code,empty',
        "1,O'Brien,2.5,true,2024-01-02,2024-01-02T03:04:05,007,",
        '2,"Line one\nline two; end",3,FALSE,2024-01-03,2024-01-03 00:00,042,',
      ].join('\n'),
      'My Orders',
    );
    expect(table.table).toBe('My_Orders');
    expect(table.rowCount).toBe(2);
    expect(table.columns).toEqual([
      { name: 'id', type: INTEGER },
      { name: 'name', type: VARCHAR },
      { name: 'price', type: DOUBLE },
      { name: 'active', type: BOOLEAN },
      { name: 'day', type: DATE },
      { name: 'at_', type: TIMESTAMP },
      { name: 'code', type: VARCHAR },
      { name: 'empty', type: VARCHAR },
    ]);
    expect(table.sql).toBe(
      [
        'create schema if not exists csv;',
        'drop table if exists csv.My_Orders;',
        'create table csv.My_Orders (id INTEGER, name VARCHAR, price DOUBLE, active BOOLEAN, day DATE, at_ TIMESTAMP, code VARCHAR, empty VARCHAR);',
        'insert into csv.My_Orders values',
        "(1, 'O''Brien', 2.5, true, DATE '2024-01-02', TIMESTAMP '2024-01-02 03:04:05', '007', NULL),",
        "(2, 'Line one' || chr(10) || 'line two; end', 3, false, DATE '2024-01-03', TIMESTAMP '2024-01-03 00:00', '042', NULL);",
      ].join('\n'),
    );
  });

  test("Gives the form's setup SQL one statement per step, whatever the values hold", () => {
    const rows = Array.from(
      { length: 2500 },
      (_, index) => `${index},"a;\nb;"`,
    );
    const table = buildCubeCsvTable(['n,text', ...rows].join('\n'), 'many');
    const statements = splitCubeSetupSql(table.sql);
    // schema, drop, create, then 1000 rows per insert
    expect(statements).toHaveLength(6);
    expect(statements.slice(3).map((each) => each.split('\n').length)).toEqual([
      1001, 1001, 501,
    ]);
  });

  test('Names columns from the header, made safe and distinct, and a table without a name csv_data', () => {
    const table = buildCubeCsvTable('Name,name,,order,1st\na,b,c,d,e', '');
    expect(table.table).toBe('csv_data');
    expect(table.columns.map((column) => column.name)).toEqual([
      'Name',
      'name_2',
      'column_3',
      'order_',
      '_1st',
    ]);
  });

  test('Creates an empty table from a header alone', () => {
    const table = buildCubeCsvTable('a,b\n', 't');
    expect(table.rowCount).toBe(0);
    expect(splitCubeSetupSql(table.sql)).toEqual([
      'create schema if not exists csv',
      'drop table if exists csv.t',
      'create table csv.t (a VARCHAR, b VARCHAR)',
    ]);
  });

  test('Refuses an empty CSV, a row whose values do not match the header, and too many rows', () => {
    expect(errorOf(() => buildCubeCsvTable('\n\n', 't'))).toBe(
      CUBE_CSV_MESSAGE.EMPTY,
    );
    expect(errorOf(() => buildCubeCsvTable('a,b\n1,2\n3\n', 't'))).toBe(
      CUBE_CSV_MESSAGE.RAGGED_ROW(2, 1, 2),
    );
    expect(CUBE_CSV_MESSAGE.RAGGED_ROW(2, 1, 2)).toBe(
      'Row 2 has 1 value, but the header names 2 columns',
    );
    const tooMany = [
      'a',
      ...Array.from({ length: CUBE_CSV_MAX_ROWS + 1 }, (_, i) => `${i}`),
    ].join('\n');
    expect(errorOf(() => buildCubeCsvTable(tooMany, 't'))).toBe(
      CUBE_CSV_MESSAGE.TOO_MANY_ROWS(CUBE_CSV_MAX_ROWS + 1, CUBE_CSV_MAX_ROWS),
    );
    expect(
      buildCubeCsvTable(tooMany.split('\n').slice(0, -1).join('\n'), 't')
        .rowCount,
    ).toBe(CUBE_CSV_MAX_ROWS);
    expect(errorOf(() => buildCubeCsvTable('a\n'.repeat(2_600_000), 't'))).toBe(
      CUBE_CSV_MESSAGE.TOO_LONG(5_000_000),
    );
  });
});
