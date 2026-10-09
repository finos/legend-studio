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

  test('Puts a negative float or decimal before an arrow or as an operand in parentheses', () => {
    const float = (value: string): IR => literal({ kind: 'float', value });
    const decimal = (value: string): IR => literal({ kind: 'decimal', value });
    expect(printIR(func('abs', [float('-1.5')]))).toBe('(-1.5)->abs()');
    expect(printIR(func('abs', [decimal('-1.5')]))).toBe('(-1.5D)->abs()');
    expect(printIR(func('greaterThan', [row('A'), float('-1.5')]))).toBe(
      '$row.A > (-1.5)',
    );
    expect(printIR(func('lessThan', [row('A'), decimal('-2')]))).toBe(
      '$row.A < (-2D)',
    );
    // positive numbers and bare negative numbers take none
    expect(printIR(func('abs', [float('1.5')]))).toBe('1.5->abs()');
    expect(printIR(float('-1.5'))).toBe('-1.5');
    expect(printIR(decimal('-1.5'))).toBe('-1.5D');
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

  test('Quotes the names Pure does not read as names', () => {
    expect(printIR(row('true'))).toBe("$row.'true'");
    expect(printIR(row('false'))).toBe("$row.'false'");
    expect(printIR(row('function'))).toBe("$row.'function'");
    expect(printIR(colSpec('false'))).toBe("~'false'");
    expect(printIR(colSpecArray([colSpec('true'), colSpec('A')]))).toBe(
      "~['true', A]",
    );
    expect(printIR(colSpec('function', lambda(['x'], [integer('1')])))).toBe(
      "~'function': x | 1",
    );
    // the other constraint keywords, which Pure lexes with `~…:` as one token
    ['owner', 'externalId', 'message', 'enforcementLevel'].forEach((word) => {
      expect(printIR(colSpec(word, lambda(['x'], [integer('1')])))).toBe(
        `~'${word}': x | 1`,
      );
      expect(printIR(row(word))).toBe(`$row.'${word}'`);
    });
    // only these exact words: other words, keywords and casings stay bare
    expect(printIR(row('True'))).toBe('$row.True');
    expect(printIR(row('FALSE'))).toBe('$row.FALSE');
    expect(printIR(row('functions'))).toBe('$row.functions');
    expect(printIR(row('let'))).toBe('$row.let');
    expect(printIR(row('all'))).toBe('$row.all');
    expect(printIR(colSpec('let'))).toBe('~let');
  });

  test('Escapes backslashes, quotes, line breaks and tabs in strings and names', () => {
    expect(printIR(text("a\nb\rc\td\\e'f"))).toBe("'a\\nb\\rc\\td\\\\e\\'f'");
    // every occurrence, not only the first
    expect(printIR(text("\\\\''\n\n\r\r\t\t"))).toBe(
      "'\\\\\\\\\\'\\'\\n\\n\\r\\r\\t\\t'",
    );
    expect(printIR(row("O'Brien's"))).toBe("$row.'O\\'Brien\\'s'");
    // the backslash is escaped first: a backslash then `n` is not a newline
    expect(printIR(text('a\\nb'))).toBe("'a\\\\nb'");
    expect(printIR(text('a\nb'))).toBe("'a\\nb'");
    expect(printIR(text('a\\nb'))).not.toBe(printIR(text('a\nb')));
    expect(printIR(text("\\'"))).toBe("'\\\\\\''");
    expect(printIR(row('a\nb'))).toBe("$row.'a\\nb'");
    expect(printIR(row('a\\tb'))).toBe("$row.'a\\\\tb'");
    expect(printIR(row('a\tb'))).toBe("$row.'a\\tb'");
    expect(printIR(colSpec('a\nb'))).toBe("~'a\\nb'");
    expect(printIR(colSpecArray([colSpec('a\r\nb'), colSpec('c')]))).toBe(
      "~['a\\r\\nb', c]",
    );
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
    // Pure ends every statement with `;` when there is more than one
    expect(printIR(lambda(['x'], [integer('1'), integer('2')]))).toBe(
      '{x | 1; 2;}',
    );
    expect(printIR(lambda([], [integer('1'), integer('2')]))).toBe('{| 1; 2;}');
  });

  test('Braces a column function with several parameters, which Pure does not read bare', () => {
    const rowNumber = colSpec(
      'cube_rn',
      lambda(
        ['p', 'w', 'r'],
        [func('rowNumber', [variable('p'), variable('r')])],
      ),
    );
    expect(printIR(colSpecArray([rowNumber]))).toBe(
      '~[cube_rn: {p, w, r | $p->rowNumber($r)}]',
    );
    expect(printIR(rowNumber)).toBe('~cube_rn: {p, w, r | $p->rowNumber($r)}');
    // one parameter stays bare
    expect(printIR(colSpec('cube_d', lambda(['x'], [integer('1')])))).toBe(
      '~cube_d: x | 1',
    );
  });

  test('Ends every statement of a column function with more than one with a semicolon', () => {
    const twoStatements = colSpec(
      'a',
      lambda(['x'], [integer('1'), integer('2')]),
    );
    expect(printIR(twoStatements)).toBe('~a: x | 1; 2;');
    expect(printIR(colSpecArray([twoStatements, colSpec('b')]))).toBe(
      '~[a: x | 1; 2;, b]',
    );
    expect(printIR(colSpec('a', lambda(['x'], [integer('1')])))).toBe(
      '~a: x | 1',
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
      'a float with an upper-case exponent',
      { kind: 'float', value: '1E3' },
      '1.0E3',
    ],
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
    [
      'a decimal with an upper-case exponent',
      { kind: 'decimal', value: '2E10' },
      '2.0E10D',
    ],
    ['a date', { kind: 'strictDate', value: '1997-01-01' }, '%1997-01-01'],
    [
      'a date-time',
      { kind: 'dateTime', value: '2024-01-02T12:00:00.123456789' },
      '%2024-01-02T12:00:00.123456789',
    ],
    ['an enumeration value', { kind: 'enum', value: 'EMEA' }, 'EMEA'],
    [
      'an enumeration value that is not an identifier',
      { kind: 'enum', value: 'Dark Blue' },
      "'Dark Blue'",
    ],
    [
      'an enumeration value that is a reserved word',
      { kind: 'enum', value: 'true' },
      "'true'",
    ],
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

  test('Quotes enumeration values that are not identifiers', () => {
    expect(printIR(enumValue('a::E', 'EMEA'))).toBe('a::E.EMEA');
    expect(printIR(enumValue('a::E', 'Dark Blue'))).toBe("a::E.'Dark Blue'");
    expect(printIR(enumValue('a::E', 'true'))).toBe("a::E.'true'");
    expect(printIR(enumValue('a::E', 'false'))).toBe("a::E.'false'");
    expect(printIR(enumValue('a::E', '1ST'))).toBe("a::E.'1ST'");
    expect(printIR(enumValue('a::E', "it's"))).toBe("a::E.'it\\'s'");
    expect(
      printIR(enumValue('meta::pure::functions::relation::JoinKind', 'INNER')),
    ).toBe('meta::pure::functions::relation::JoinKind.INNER');
  });

  test('Prints the forms the slice does not use', () => {
    expect(printIR({ k: 'let', name: 'n_join101', value: integer('1') })).toBe(
      'let n_join101 = 1',
    );
    expect(
      printIR({ k: 'block', statements: [integer('1'), variable('x')] }),
    ).toBe('{1; $x;}');
    expect(printIR({ k: 'block', statements: [integer('1')] })).toBe('{1}');
    expect(printIR({ k: 'raw', json: { _type: 'integer', value: 1 } })).toBe(
      '<raw {"_type":"integer","value":1}>',
    );
  });

  test('Redacts every literal, and no name or accessor', () => {
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

  test('Redacts the enumeration values of a filter, and no other enumeration value', () => {
    const value = { nodeId: 'filter101', role: 'value' };
    const options = { redactLiterals: true };
    expect(printIR(enumValue('a::Region', 'EMEA', value), options)).toBe('?');
    expect(
      printIR(
        func('in', [
          row('REGION'),
          collection([
            enumValue('a::Region', 'EMEA', value),
            enumValue('a::Region', 'Dark Blue', value),
          ]),
        ]),
        options,
      ),
    ).toBe('$row.REGION->in([?, ?])');
    // a join kind, and an enumeration value without origin, are not values users typed
    expect(
      printIR(
        enumValue('meta::pure::functions::relation::JoinKind', 'INNER', {
          nodeId: 'join101',
          role: 'join',
        }),
        options,
      ),
    ).toBe('meta::pure::functions::relation::JoinKind.INNER');
    expect(printIR(enumValue('a::Region', 'EMEA'), options)).toBe(
      'a::Region.EMEA',
    );
    // without the option, the value is printed
    expect(printIR(enumValue('a::Region', 'EMEA', value))).toBe(
      'a::Region.EMEA',
    );
  });

  test('Ignores origins', () => {
    const origin = { nodeId: 'filter101', role: 'column' };
    expect(printIR(columnAccess('row', 'A', origin))).toBe(
      printIR(columnAccess('row', 'A')),
    );
    expect(printIR(func('f', [variable('x')], origin))).toBe('$x->f()');
    const value = { nodeId: 'filter101', role: 'value' };
    expect(printIR(enumValue('a::Region', 'EMEA', value))).toBe(
      printIR(enumValue('a::Region', 'EMEA')),
    );
    expect(
      printIR(
        enumValue('meta::pure::functions::relation::JoinKind', 'LEFT', {
          nodeId: 'join101',
          role: 'join',
        }),
      ),
    ).toBe(
      printIR(enumValue('meta::pure::functions::relation::JoinKind', 'LEFT')),
    );
    expect(printIR(literal({ kind: 'string', value: 'France' }, value))).toBe(
      printIR(text('France')),
    );
    expect(
      printIR(
        storeAccessor(['a::Db', 'SCH', 'T'], {
          nodeId: 'relational101',
          role: 'accessor',
        }),
      ),
    ).toBe(printIR(storeAccessor(['a::Db', 'SCH', 'T'])));
  });
});
