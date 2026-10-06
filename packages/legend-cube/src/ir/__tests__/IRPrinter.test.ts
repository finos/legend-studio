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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import type { LiteralValue } from '../../values/LiteralValue.js';
import {
  colSpec,
  colSpecArray,
  collection,
  columnAccess,
  elementPtr,
  enumValue,
  func,
  genericType,
  type IR,
  lambda,
  literal,
  storeAccessor,
  variable,
} from '../CubeIR.js';
import { printIR } from '../IRPrinter.js';

const integer = (value: string): IR => literal({ kind: 'integer', value });
const text = (value: string): IR => literal({ kind: 'string', value });
const row = (name: string): IR => columnAccess('row', name);

describe(unitTest('IR printer'), () => {
  test('Prints calls on their first parameter', () => {
    expect(printIR(func('now', []))).toBe('now()');
    expect(printIR(func('f', [variable('x'), integer('1'), text('a')]))).toBe(
      "$x->f(1, 'a')",
    );
    expect(printIR(func('toOne', [row('A')]))).toBe('$row.A->toOne()');
    expect(
      printIR(
        func('cast', [
          func('coalesce', [row('A'), row('B')]),
          genericType('String'),
        ]),
      ),
    ).toBe('$row.A->coalesce($row.B)->cast(@String)');
  });

  test('Prints operators infix, with operands that are operators in parentheses', () => {
    const operators: [string, string][] = [
      ['equal', '=='],
      ['greaterThan', '>'],
      ['greaterThanEqual', '>='],
      ['lessThan', '<'],
      ['lessThanEqual', '<='],
      ['and', '&&'],
      ['or', '||'],
    ];
    operators.forEach(([name, symbol]) =>
      expect(printIR(func(name, [row('A'), integer('1')]))).toBe(
        `$row.A ${symbol} 1`,
      ),
    );
    const a = func('equal', [row('A'), integer('1')]);
    const b = func('lessThan', [row('B'), integer('3')]);
    expect(printIR(func('and', [a, b]))).toBe('($row.A == 1) && ($row.B < 3)');
    expect(printIR(func('or', [func('and', [a, b]), a]))).toBe(
      '(($row.A == 1) && ($row.B < 3)) || ($row.A == 1)',
    );
    // an operator name with another number of parameters is a call
    expect(printIR(func('and', [a]))).toBe('($row.A == 1)->and()');
  });

  test('Prints a negation with parentheses, always', () => {
    expect(printIR(func('not', [row('A')]))).toBe('!($row.A)');
    expect(
      printIR(func('not', [func('greaterThan', [row('A'), integer('5')])])),
    ).toBe('!($row.A > 5)');
    expect(
      printIR(
        func('and', [
          func('not', [func('isEmpty', [row('A')])]),
          func('isEmpty', [row('B')]),
        ]),
      ),
    ).toBe('(!($row.A->isEmpty())) && $row.B->isEmpty()');
  });

  test('Puts an operator or a negative number before an arrow in parentheses', () => {
    expect(
      printIR(func('toOne', [func('equal', [row('A'), integer('1')])])),
    ).toBe('($row.A == 1)->toOne()');
    expect(printIR(func('abs', [integer('-3')]))).toBe('(-3)->abs()');
    expect(printIR(func('greaterThan', [row('A'), integer('-5')]))).toBe(
      '$row.A > (-5)',
    );
    expect(printIR(integer('-5'))).toBe('-5');
  });

  test('Quotes names that are not identifiers', () => {
    expect(printIR(row('A_1'))).toBe('$row.A_1');
    expect(printIR(row('_a'))).toBe('$row._a');
    expect(printIR(row('a b'))).toBe("$row.'a b'");
    expect(printIR(row('1st'))).toBe("$row.'1st'");
    expect(printIR(row('a.b'))).toBe("$row.'a.b'");
    expect(printIR(row("it's"))).toBe("$row.'it\\'s'");
    expect(printIR(row('back\\slash'))).toBe("$row.'back\\\\slash'");
    expect(printIR(colSpec('a b'))).toBe("~'a b'");
    expect(printIR(colSpec('id__cube_r'))).toBe('~id__cube_r');
  });

  test('Prints lambdas', () => {
    expect(printIR(lambda(['x'], [variable('x')]))).toBe('{x | $x}');
    expect(
      printIR(
        lambda(
          ['l', 'r'],
          [func('equal', [columnAccess('l', 'a'), columnAccess('r', 'b')])],
        ),
      ),
    ).toBe('{l, r | $l.a == $r.b}');
    expect(printIR(lambda([], [integer('1')]))).toBe('{| 1}');
    expect(printIR(lambda(['x'], [integer('1'), integer('2')]))).toBe(
      '{x | 1; 2}',
    );
  });

  test.each<[string, LiteralValue, string]>([
    ['a string', { kind: 'string', value: 'France' }, "'France'"],
    ['an empty string', { kind: 'string', value: '' }, "''"],
    [
      'a string with quotes',
      { kind: 'string', value: "it's \\ 50%_" },
      "'it\\'s \\\\ 50%_'",
    ],
    ['a string with spaces', { kind: 'string', value: ' a ' }, "' a '"],
    ['true', { kind: 'boolean', value: true }, 'true'],
    ['false', { kind: 'boolean', value: false }, 'false'],
    [
      'an integer',
      { kind: 'integer', value: '9007199254740993' },
      '9007199254740993',
    ],
    ['a negative integer', { kind: 'integer', value: '-3' }, '-3'],
    ['a whole float', { kind: 'float', value: '1000000' }, '1000000.0'],
    ['a float', { kind: 'float', value: '32.38' }, '32.38'],
    ['a float with an exponent', { kind: 'float', value: '1e3' }, '1.0e3'],
    [
      'a float with a decimal exponent',
      { kind: 'float', value: '-1.5E-3' },
      '-1.5E-3',
    ],
    ['a whole decimal', { kind: 'decimal', value: '1' }, '1D'],
    [
      'a decimal',
      { kind: 'decimal', value: '0.10000000000000000001' },
      '0.10000000000000000001D',
    ],
    [
      'a decimal with an exponent',
      { kind: 'decimal', value: '2e10' },
      '2.0e10D',
    ],
    ['a date', { kind: 'strictDate', value: '1997-01-01' }, '%1997-01-01'],
    [
      'a date-time',
      { kind: 'dateTime', value: '2024-01-02T12:00:00.123456789' },
      '%2024-01-02T12:00:00.123456789',
    ],
    ['an enumeration value', { kind: 'enum', value: 'EMEA' }, 'EMEA'],
  ])('Prints %s', (_, value, expected) => {
    expect(printIR(literal(value))).toBe(expected);
    expect(printIR(literal(value), { redactLiterals: true })).toBe('?');
  });

  test('Prints collections, columns, accessors and types', () => {
    expect(printIR(collection([integer('1'), text('a')]))).toBe("[1, 'a']");
    expect(printIR(collection([]))).toBe('[]');
    expect(printIR(colSpec('A'))).toBe('~A');
    expect(printIR(colSpec('A', lambda(['x'], [columnAccess('x', 'B')])))).toBe(
      '~A: x | $x.B',
    );
    expect(
      printIR({
        k: 'colSpec',
        name: 'total',
        fn1: lambda(['x'], [columnAccess('x', 'B')]),
        fn2: lambda(['y'], [func('sum', [variable('y')])]),
      }),
    ).toBe('~total: x | $x.B : y | $y->sum()');
    expect(
      printIR(
        colSpecArray([
          colSpec('A'),
          colSpec('b c'),
          colSpec('K', lambda(['x'], [integer('1')])),
        ]),
      ),
    ).toBe("~[A, 'b c', K: x | 1]");
    // segments as stored, quotes and dots included
    expect(printIR(storeAccessor(['a::Db', 'SCH', '"a.b"']))).toBe(
      '#>{a::Db.SCH."a.b"}#',
    );
    expect(printIR(elementPtr('a::Runtime'))).toBe('a::Runtime');
    expect(printIR(genericType('String'))).toBe('@String');
    expect(
      printIR(genericType('meta::pure::precisePrimitives::Varchar', [15])),
    ).toBe('@meta::pure::precisePrimitives::Varchar(15)');
    expect(
      printIR(genericType('meta::pure::precisePrimitives::Numeric', [10, 2])),
    ).toBe('@meta::pure::precisePrimitives::Numeric(10, 2)');
    expect(printIR(enumValue('a::Region', 'EMEA'))).toBe('a::Region.EMEA');
  });

  test('Prints the forms the slice does not use', () => {
    expect(printIR({ k: 'let', name: 'n_join101', value: integer('1') })).toBe(
      'let n_join101 = 1',
    );
    expect(
      printIR({ k: 'block', statements: [integer('1'), variable('x')] }),
    ).toBe('{1; $x}');
    expect(printIR({ k: 'raw', json: { _type: 'integer', value: 1 } })).toBe(
      '<raw {"_type":"integer","value":1}>',
    );
  });

  test('Redacts every literal and nothing else', () => {
    const filter = func('filter', [
      storeAccessor(['a::Db', 'SCH', 'T']),
      lambda(
        ['row'],
        [
          func('and', [
            func('equal', [row('NAME'), text('secret')]),
            func('in', [row('ID'), collection([integer('1'), integer('2')])]),
          ]),
        ],
      ),
    ]);
    expect(printIR(filter, { redactLiterals: true })).toBe(
      '#>{a::Db.SCH.T}#->filter({row | ($row.NAME == ?) && $row.ID->in([?, ?])})',
    );
    expect(printIR(filter)).toBe(
      "#>{a::Db.SCH.T}#->filter({row | ($row.NAME == 'secret') && $row.ID->in([1, 2])})",
    );
  });

  test('Ignores origins', () => {
    const origin = { nodeId: 'filter101', role: 'column' };
    expect(printIR(columnAccess('row', 'A', origin))).toBe(
      printIR(columnAccess('row', 'A')),
    );
    expect(printIR(func('f', [variable('x')], origin))).toBe('$x->f()');
  });
});
