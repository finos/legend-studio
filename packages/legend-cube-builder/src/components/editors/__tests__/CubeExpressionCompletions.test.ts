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
import { PrimitiveType, SchemaColumn } from '@finos/legend-cube';
import { getCubeExpressionCompletions } from '../CubeExpressionCompletions.js';

const COLUMNS = [
  new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
  new SchemaColumn('CITY', PrimitiveType.get('String'), true),
  new SchemaColumn('ship date', PrimitiveType.get('StrictDate'), false),
  new SchemaColumn('PAYLOAD', PrimitiveType.get('Variant'), true),
];

const labels = (text: string): string[] =>
  getCubeExpressionCompletions(text, COLUMNS).map((each) => each.label);

describe("A Pure expression's completions as it is typed", () => {
  test('Lists the columns after `$x.`, with their types, a name that is not an identifier quoted', () => {
    const completions = getCubeExpressionCompletions('x | $x.', COLUMNS);
    expect(completions.map((each) => each.label)).toEqual([
      'ORDER_ID',
      'CITY',
      'ship date',
      'PAYLOAD',
    ]);
    expect(completions.map((each) => each.insertText)).toEqual([
      'ORDER_ID',
      'CITY',
      "'ship date'",
      'PAYLOAD',
    ]);
    expect(completions.map((each) => each.detail)).toEqual([
      'Whole number',
      'Text, optional',
      'Date',
      'Variant, optional',
    ]);
    // what was typed of the name is replaced
    expect(
      getCubeExpressionCompletions('x | $x.CI', COLUMNS)[0]?.replaceLength,
    ).toBe(2);
  });

  test("Lists them after `$`, as the lambda's parameter and the column", () => {
    expect(labels('row | $')).toEqual([
      'row.ORDER_ID',
      'row.CITY',
      'row.ship date',
      'row.PAYLOAD',
    ]);
    const [first] = getCubeExpressionCompletions('row | $ro', COLUMNS);
    expect(first?.insertText).toBe('row.ORDER_ID');
    expect(first?.replaceLength).toBe(2);
    expect(labels('row | $x')).toEqual([]);
    // `x` until the parameter is written
    expect(labels('$')[0]).toBe('x.ORDER_ID');
  });

  test("Lists a column's functions after `->`: its type's, then every value's, `toOne()` first for an optional one", () => {
    expect(labels('x | $x.ORDER_ID->')).toEqual([
      'abs',
      'round',
      'floor',
      'ceiling',
      'toString',
      'isEmpty',
      'isNotEmpty',
      'in',
      'toOne',
    ]);
    expect(labels('x | $x.CITY->')).toEqual([
      'toOne',
      'contains',
      'startsWith',
      'endsWith',
      'toUpper',
      'toLower',
      'trim',
      'length',
      'substring',
      'indexOf',
      'isEmpty',
      'isNotEmpty',
      'in',
    ]);
    expect(labels("x | $x.'ship date'->ye")).toEqual([
      'year',
      'monthNumber',
      'dayOfMonth',
      'toString',
      'isEmpty',
      'isNotEmpty',
      'in',
      'toOne',
    ]);
    expect(labels('x | $x.PAYLOAD->')).toEqual(['toOne', 'get', 'to']);
    const [contains] = getCubeExpressionCompletions(
      'x | $x.CITY->toOne()->co',
      COLUMNS,
    );
    // after a call, nothing is known of the value's type
    expect(contains).toBeUndefined();
    const [snippet] = getCubeExpressionCompletions(
      'x | $x.CITY->sta',
      COLUMNS,
    ).filter((each) => each.label === 'startsWith');
    expect(snippet?.insertText).toBe("startsWith('${1}')");
    expect(snippet?.isSnippet).toBe(true);
    expect(snippet?.replaceLength).toBe(3);
  });

  test('Lists nothing elsewhere, e.g. in a string or after a call', () => {
    expect(labels("x | $x.CITY == 'a")).toEqual([]);
    expect(labels('x | 1 + ')).toEqual([]);
    // an unknown column: every value's functions only
    expect(labels('x | $x.NOT_THERE->')).toEqual([
      'isEmpty',
      'isNotEmpty',
      'in',
      'toOne',
    ]);
  });
});
