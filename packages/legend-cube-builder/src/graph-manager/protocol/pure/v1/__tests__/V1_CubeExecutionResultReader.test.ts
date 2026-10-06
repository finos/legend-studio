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
  V1_CubeUnreadableResultError,
  V1_readCubeExecutionResult,
} from '../V1_CubeExecutionResultReader.js';

const P = 'meta::pure::precisePrimitives::';

/** An execution response as the engine writes it (DEFAULT format), its rows as raw JSON text */
const response = (
  columns: [name: string, type: string][],
  rows: string[],
  activities = '[]',
): string =>
  `{"builder": {"_type":"tdsBuilder","columns":${JSON.stringify(
    columns.map(([name, type]) => ({ name, type })),
  )}}, "activities": ${activities}, "result" : {"columns" : ${JSON.stringify(
    columns.map(([name]) => name),
  )}, "rows" : [${rows.map((row) => `{"values": ${row}}`).join(',')}]}}`;

// the ALLTYPES rows (PLAN §6.2.4), as the engine sends them
const ALLTYPES = response(
  [
    ['ID', `${P}Int`],
    ['BI', `${P}BigInt`],
    ['F', `${P}Float4`],
    ['D', `${P}Double`],
    ['DEC', `${P}Numeric`],
    ['DT', 'StrictDate'],
    ['TS', `${P}Timestamp`],
    ['B', 'Boolean'],
    ['VC', `${P}Varchar`],
  ],
  [
    '[1,4,1.5,2.5,12.30,"2024-01-02","2024-01-02T03:04:05.678000000+0000",true,"abc"]',
    '[2,9007199254740993,5124.0,0.1,1.25,"2024-01-03","2024-01-02T13:00:00.000000000+0000",false,"xyz"]',
    '[3,null,null,null,null,null,null,null,null]',
  ],
  '[{"_type":"relational","sql":"select 1"},{"_type":"other"},{"_type":"relational","sql":"select 2"}]',
);

describe('Cube execution result reader', () => {
  test('Reads Integer and Decimal values as their exact text, and Float values as numbers', () => {
    const { rows } = V1_readCubeExecutionResult(ALLTYPES);
    expect(rows).toEqual([
      [
        '1',
        '4',
        1.5,
        2.5,
        '12.30',
        '2024-01-02',
        '2024-01-02T03:04:05.678000000+0000',
        true,
        'abc',
      ],
      [
        '2',
        '9007199254740993',
        5124,
        0.1,
        '1.25',
        '2024-01-03',
        '2024-01-02T13:00:00.000000000+0000',
        false,
        'xyz',
      ],
      ['3', null, null, null, null, null, null, null, null],
    ]);
  });

  test('Reads the column names in order, and the SQL of every relational activity', () => {
    const { columns, sql } = V1_readCubeExecutionResult(ALLTYPES);
    expect(columns).toEqual([
      'ID',
      'BI',
      'F',
      'D',
      'DEC',
      'DT',
      'TS',
      'B',
      'VC',
    ]);
    expect(sql).toEqual(['select 1', 'select 2']);
  });

  test("Reads a number in a column that isn't Float as text, whatever its token", () => {
    // an OTHER column is typed String, yet holds numbers
    const { rows } = V1_readCubeExecutionResult(
      response([['O', 'String']], ['[32.38]', '[5]']),
    );
    expect(rows).toEqual([['32.38'], ['5']]);
  });

  test('Reads a number as text when the builder gives its column no type', () => {
    const { rows } = V1_readCubeExecutionResult(
      `{"result": {"columns": ["X"], "rows": [{"values": [1.50]}]}}`,
    );
    expect(rows).toEqual([['1.50']]);
  });

  test('Matches values to columns by position, names with dots or spaces included', () => {
    const { columns, rows } = V1_readCubeExecutionResult(
      response(
        [
          ['a.b', 'String'],
          ['c d', 'String'],
        ],
        ['["x","y"]'],
      ),
    );
    expect(columns).toEqual(['a.b', 'c d']);
    expect(rows).toEqual([['x', 'y']]);
  });

  test('Reads a result with no rows', () => {
    expect(
      V1_readCubeExecutionResult(response([['ID', `${P}Int`]], [])).rows,
    ).toEqual([]);
  });

  test.each<[string, string, string]>([
    [
      'text that is not JSON',
      'clob20:abc',
      "The engine's response can't be read",
    ],
    [
      'a stack trace streamed after the start of a result',
      '{"result": {"columns": ["A"], "rows": [{"values": [1]}, java.lang.NullPointerException',
      "The engine's response can't be read",
    ],
    ['a response with no result', '{"builder": {}}', 'has no relation result'],
    [
      'a row with too few values',
      response(
        [
          ['A', 'String'],
          ['B', 'String'],
        ],
        ['["x"]'],
      ),
      `doesn't have one value per column`,
    ],
    [
      'a value that is not a scalar',
      response([['A', 'String']], ['[{"x": 1}]']),
      'A result value is not a scalar',
    ],
  ])('Refuses %s', (_, text, message) => {
    expect(() => V1_readCubeExecutionResult(text)).toThrow(
      V1_CubeUnreadableResultError,
    );
    expect(() => V1_readCubeExecutionResult(text)).toThrow(message);
  });
});
