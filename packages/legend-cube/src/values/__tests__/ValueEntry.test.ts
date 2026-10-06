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
import {
  type CubeType,
  EnumType,
  OpaqueType,
  PrimitiveType,
} from '../../types/CubeType.js';
import { PRIMITIVE_TYPE_INFOS } from '../../types/PrimitiveTypeRegistry.js';
import { TypeFamily } from '../../types/TypeFamily.js';
import {
  getLiteralKinds,
  getLiteralText,
  type LiteralKind,
  type LiteralValue,
} from '../LiteralValue.js';
import { checkValue, parseValue, type ValueProblem } from '../ValueEntry.js';

const type = (path: string, params: number[] = []): PrimitiveType =>
  PrimitiveType.get(path, params);

const BOOLEAN = type('Boolean');
const STRING = type('String');
const VARCHAR_0 = type('Varchar', [0]);
const VARCHAR_5 = type('Varchar', [5]);
const NUMBER = type('Number');
const INTEGER = type('Integer');
const SMALL_INT = type('SmallInt');
const U_BIG_INT = type('UBigInt');
const FLOAT4 = type('Float4');
const DOUBLE = type('Double');
const DECIMAL = type('Decimal');
const NUMERIC = type('Numeric', [10, 2]);
const DATE = type('Date');
const STRICT_DATE = type('StrictDate');
const DATE_TIME = type('DateTime');
const TIMESTAMP = type('Timestamp');
const STRICT_TIME = type('StrictTime');
const VARIANT = type('Variant');
const COLOR = new EnumType('my::model::Color', ['RED', 'GREEN']);
const SIZE = new EnumType('my::model::Size', ['S', 'M']);
const UNKNOWN = OpaqueType.get('my::model::Unknown');

const integer = (value: string): LiteralValue => ({ kind: 'integer', value });
const float = (value: string): LiteralValue => ({ kind: 'float', value });
const decimal = (value: string): LiteralValue => ({ kind: 'decimal', value });

/**
 * The integer range of every type in the INTEGER family, as [type, min, max].
 * Integer literals are Java longs in the engine, so `Integer` and the 64-bit
 * types stop at the Java long range, `UBigInt` included.
 */
const INTEGER_RANGES: [string, string, string][] = [
  ['Integer', '-9223372036854775808', '9223372036854775807'],
  ['TinyInt', '-128', '127'],
  ['UTinyInt', '0', '255'],
  ['SmallInt', '-32768', '32767'],
  ['USmallInt', '0', '65535'],
  ['Int', '-2147483648', '2147483647'],
  ['UInt', '0', '4294967295'],
  ['BigInt', '-9223372036854775808', '9223372036854775807'],
  ['UBigInt', '0', '9223372036854775807'],
];

// Text that is a value of the type: [type, text, the literal it reads as]
const ACCEPTED: [CubeType, string, LiteralValue][] = [
  // STRING: as typed, with no trimming and no length check
  [STRING, 'abc', { kind: 'string', value: 'abc' }],
  [VARCHAR_5, '  padded  ', { kind: 'string', value: '  padded  ' }],
  [STRING, '', { kind: 'string', value: '' }],
  [STRING, '   ', { kind: 'string', value: '   ' }],
  [
    VARCHAR_0,
    'longer than zero',
    { kind: 'string', value: 'longer than zero' },
  ],
  // BOOLEAN
  [BOOLEAN, 'true', { kind: 'boolean', value: true }],
  [BOOLEAN, 'false', { kind: 'boolean', value: false }],
  [BOOLEAN, ' true ', { kind: 'boolean', value: true }],
  // INTEGER, canonicalized
  [INTEGER, '42', integer('42')],
  [INTEGER, '+5', integer('5')],
  [INTEGER, '007', integer('7')],
  [INTEGER, '-007', integer('-7')],
  [INTEGER, '000', integer('0')],
  [INTEGER, '-0', integer('0')],
  [INTEGER, ' 42 ', integer('42')],
  // the bounds of every integer width
  ...INTEGER_RANGES.flatMap(
    ([path, min, max]): [CubeType, string, LiteralValue][] => [
      [type(path), min, integer(min)],
      [type(path), max, integer(max)],
    ],
  ),
  // FLOAT, canonicalized to the JSON number grammar
  [DOUBLE, '1.5', float('1.5')],
  [DOUBLE, '.5', float('0.5')],
  [DOUBLE, '-.5', float('-0.5')],
  [DOUBLE, '5.', float('5')],
  [DOUBLE, '+5', float('5')],
  [DOUBLE, '007.50', float('7.50')],
  [DOUBLE, '-0', float('0')],
  [DOUBLE, '-0.0', float('0.0')],
  [DOUBLE, '1e3', float('1e3')],
  [DOUBLE, '1.e3', float('1e3')],
  [DOUBLE, '1E-7', float('1E-7')],
  [DOUBLE, '2.5e+10', float('2.5e+10')],
  [FLOAT4, '1e300', float('1e300')],
  [type('Float'), ' 3.25 ', float('3.25')],
  // DECIMAL and NUMBER: same grammar; precision and scale are not enforced
  [NUMERIC, '1.555', decimal('1.555')],
  [NUMERIC, '+007.5', decimal('7.5')],
  [DECIMAL, '1e400', decimal('1e400')],
  [
    DECIMAL,
    '12345678901234567890.123456789',
    decimal('12345678901234567890.123456789'),
  ],
  [NUMBER, '5', decimal('5')],
  [NUMBER, '-.25', decimal('-0.25')],
  // STRICT_DATE
  [STRICT_DATE, '2024-02-29', { kind: 'strictDate', value: '2024-02-29' }],
  [STRICT_DATE, '2000-02-29', { kind: 'strictDate', value: '2000-02-29' }],
  [STRICT_DATE, '1999-12-31', { kind: 'strictDate', value: '1999-12-31' }],
  [STRICT_DATE, ' 2024-01-01 ', { kind: 'strictDate', value: '2024-01-01' }],
  // DATETIME: seconds required, 1 to 9 fraction digits
  [
    TIMESTAMP,
    '2024-02-29T13:45:12',
    { kind: 'dateTime', value: '2024-02-29T13:45:12' },
  ],
  [
    TIMESTAMP,
    '2024-02-29T00:00:00.1',
    { kind: 'dateTime', value: '2024-02-29T00:00:00.1' },
  ],
  [
    DATE_TIME,
    '2024-12-31T23:59:59.123456789',
    { kind: 'dateTime', value: '2024-12-31T23:59:59.123456789' },
  ],
  // DATE (abstract): a date or a date-time
  [DATE, '2024-02-29', { kind: 'strictDate', value: '2024-02-29' }],
  [
    DATE,
    '2024-02-29T13:45:12',
    { kind: 'dateTime', value: '2024-02-29T13:45:12' },
  ],
  // ENUM: one of the values, unqualified
  [COLOR, 'RED', { kind: 'enum', value: 'RED' }],
  [COLOR, ' GREEN ', { kind: 'enum', value: 'GREEN' }],
];

// Text that is not a value of the type: [type, text, why]
const REJECTED: [CubeType, string, ValueProblem['reason']][] = [
  // empty input, except for STRING
  [INTEGER, '', 'required'],
  [INTEGER, '   ', 'required'],
  [BOOLEAN, '', 'required'],
  [STRICT_DATE, ' ', 'required'],
  [COLOR, '', 'required'],
  [VARIANT, '', 'required'],
  // BOOLEAN takes exactly `true` or `false`
  [BOOLEAN, 'TRUE', 'invalid'],
  [BOOLEAN, 'True', 'invalid'],
  [BOOLEAN, '1', 'invalid'],
  [BOOLEAN, 'yes', 'invalid'],
  // INTEGER
  [INTEGER, '1e3', 'invalid'],
  [INTEGER, '5.0', 'invalid'],
  [INTEGER, '0x10', 'invalid'],
  [INTEGER, '0b1', 'invalid'],
  [INTEGER, '1_000', 'invalid'],
  [INTEGER, '1 000', 'invalid'],
  [INTEGER, '--5', 'invalid'],
  [INTEGER, '5-', 'invalid'],
  [INTEGER, 'Infinity', 'invalid'],
  [INTEGER, 'abc', 'invalid'],
  // one past the bounds of every integer width
  ...INTEGER_RANGES.flatMap(
    ([path, min, max]): [CubeType, string, ValueProblem['reason']][] => [
      [type(path), String(BigInt(min) - 1n), 'outOfRange'],
      [type(path), String(BigInt(max) + 1n), 'outOfRange'],
    ],
  ),
  [U_BIG_INT, '18446744073709551615', 'outOfRange'],
  [SMALL_INT, '+0040000', 'outOfRange'],
  // FLOAT
  [DOUBLE, '0x10', 'invalid'],
  [DOUBLE, '0b1', 'invalid'],
  [DOUBLE, '0o7', 'invalid'],
  [DOUBLE, 'Infinity', 'invalid'],
  [DOUBLE, '-Infinity', 'invalid'],
  [DOUBLE, 'NaN', 'invalid'],
  [DOUBLE, '1_000.5', 'invalid'],
  [DOUBLE, '1,5', 'invalid'],
  [DOUBLE, '.', 'invalid'],
  [DOUBLE, 'e5', 'invalid'],
  [DOUBLE, '1e', 'invalid'],
  [DOUBLE, '1e400', 'outOfRange'],
  [FLOAT4, '-1e400', 'outOfRange'],
  // DECIMAL and NUMBER
  [NUMERIC, 'abc', 'invalid'],
  [DECIMAL, 'NaN', 'invalid'],
  [NUMBER, '0x10', 'invalid'],
  // STRICT_DATE: a valid calendar date
  [STRICT_DATE, '2023-02-29', 'invalid'],
  [STRICT_DATE, '1900-02-29', 'invalid'],
  [STRICT_DATE, '2024-04-31', 'invalid'],
  [STRICT_DATE, '2024-13-01', 'invalid'],
  [STRICT_DATE, '2024-00-10', 'invalid'],
  [STRICT_DATE, '2024-01-00', 'invalid'],
  [STRICT_DATE, '2024-1-01', 'invalid'],
  [STRICT_DATE, '20240101', 'invalid'],
  [STRICT_DATE, '2024-01-01T00:00:00', 'invalid'],
  // DATETIME: hour and minute literals are truncated to the day by the engine
  [TIMESTAMP, '2024-02-29T13:45', 'invalid'],
  [TIMESTAMP, '2024-02-29T13', 'invalid'],
  [TIMESTAMP, '2024-02-29', 'invalid'],
  [DATE_TIME, '2024-02-29T24:00:00', 'invalid'],
  [DATE_TIME, '2024-02-29T23:60:00', 'invalid'],
  [DATE_TIME, '2024-02-29T23:59:60', 'invalid'],
  [DATE_TIME, '2023-02-29T00:00:00', 'invalid'],
  [DATE_TIME, '2024-02-29 13:45:12', 'invalid'],
  [DATE_TIME, '2024-02-29T13:45:12Z', 'invalid'],
  [DATE_TIME, '2024-02-29T13:45:12+0000', 'invalid'],
  [DATE_TIME, '2024-02-29T13:45:12.', 'invalid'],
  [DATE_TIME, '2024-02-29T13:45:12.1234567890', 'invalid'],
  // DATE (abstract)
  [DATE, '2024-02-29T13:45', 'invalid'],
  [DATE, '2024-02', 'invalid'],
  // ENUM: exactly one of the values
  [COLOR, 'BLUE', 'invalid'],
  [COLOR, 'red', 'invalid'],
  [COLOR, 'Color.RED', 'invalid'],
  // types that take no values
  [STRICT_TIME, '13:45:12', 'invalid'],
  [VARIANT, '{}', 'invalid'],
  [UNKNOWN, 'anything', 'invalid'],
];

describe(unitTest('Value entry'), () => {
  test.each(ACCEPTED)('Reads %s value %j', (cubeType, text, expected) => {
    expect(parseValue(text, cubeType)).toEqual(expected);
    // the literal's text reads back as the same literal...
    expect(parseValue(getLiteralText(expected), cubeType)).toEqual(expected);
    // ...so checking the literal finds no problem
    expect(checkValue(expected, cubeType)).toBeUndefined();
  });

  test.each(REJECTED)('Rejects %s value %j as %s', (cubeType, text, reason) => {
    const value = parseValue(text, cubeType);
    if (reason === 'required') {
      expect(value).toBeUndefined();
      expect(checkValue(value, cubeType)).toEqual({ reason });
    } else {
      // the text is kept as typed, untrimmed, so it can be shown and fixed
      expect(value).toEqual({ kind: 'invalid', text });
      expect(checkValue(value, cubeType)).toEqual({ reason, text });
    }
  });

  test('Integer ranges cover every type of the INTEGER family', () => {
    expect(
      PRIMITIVE_TYPE_INFOS.filter(
        (info) => info.family === TypeFamily.INTEGER,
      ).map((info) => info.shortName),
    ).toEqual(INTEGER_RANGES.map(([path]) => path));
  });

  test('Keeps invalid text exactly as typed', () => {
    expect(parseValue(' 12a ', INTEGER)).toEqual({
      kind: 'invalid',
      text: ' 12a ',
    });
  });
});

describe(unitTest('Value checking'), () => {
  test.each<[LiteralValue, CubeType, ValueProblem]>([
    // a literal of another kind, e.g. after the column type changed
    [
      { kind: 'string', value: '5' },
      SMALL_INT,
      { reason: 'invalid', text: '5' },
    ],
    [decimal('5'), INTEGER, { reason: 'invalid', text: '5' }],
    [float('1.5'), NUMERIC, { reason: 'invalid', text: '1.5' }],
    [integer('1'), BOOLEAN, { reason: 'invalid', text: '1' }],
    [
      { kind: 'boolean', value: true },
      STRING,
      { reason: 'invalid', text: 'true' },
    ],
    [
      { kind: 'dateTime', value: '2024-01-01T00:00:00' },
      STRICT_DATE,
      { reason: 'invalid', text: '2024-01-01T00:00:00' },
    ],
    [
      { kind: 'strictDate', value: '2024-01-01' },
      TIMESTAMP,
      { reason: 'invalid', text: '2024-01-01' },
    ],
    [{ kind: 'enum', value: 'RED' }, SIZE, { reason: 'invalid', text: 'RED' }],
    [
      { kind: 'string', value: 'RED' },
      COLOR,
      { reason: 'invalid', text: 'RED' },
    ],
    [{ kind: 'string', value: 'x' }, VARIANT, { reason: 'invalid', text: 'x' }],
    // stale or hand-edited literals: out of range, or not canonical
    [integer('40000'), SMALL_INT, { reason: 'outOfRange', text: '40000' }],
    [integer('+5'), INTEGER, { reason: 'invalid', text: '+5' }],
    [integer(' 5'), INTEGER, { reason: 'invalid', text: ' 5' }],
    [integer(''), INTEGER, { reason: 'invalid', text: '' }],
    [decimal('.5'), DECIMAL, { reason: 'invalid', text: '.5' }],
    [float('1e400'), DOUBLE, { reason: 'outOfRange', text: '1e400' }],
    [
      { kind: 'strictDate', value: '2023-02-29' },
      STRICT_DATE,
      { reason: 'invalid', text: '2023-02-29' },
    ],
  ])('Finds a problem with %j as %s', (literal, cubeType, problem) => {
    expect(checkValue(literal, cubeType)).toEqual(problem);
  });

  test('Requires a value', () => {
    expect(checkValue(undefined, STRING)).toEqual({ reason: 'required' });
    expect(checkValue(undefined, INTEGER)).toEqual({ reason: 'required' });
  });

  test('Keeps invalid values invalid, even when their text now reads', () => {
    expect(checkValue({ kind: 'invalid', text: '5' }, INTEGER)).toEqual({
      reason: 'invalid',
      text: '5',
    });
    expect(
      checkValue({ kind: 'invalid', text: '300' }, type('TinyInt')),
    ).toEqual({ reason: 'outOfRange', text: '300' });
  });
});

test(unitTest('Literal kinds by type'), () => {
  const kinds: [CubeType, LiteralKind[]][] = [
    [BOOLEAN, ['boolean']],
    [VARCHAR_5, ['string']],
    [SMALL_INT, ['integer']],
    [FLOAT4, ['float']],
    [NUMERIC, ['decimal']],
    [NUMBER, ['decimal']],
    [STRICT_DATE, ['strictDate']],
    [TIMESTAMP, ['dateTime']],
    [DATE, ['strictDate', 'dateTime']],
    [COLOR, ['enum']],
    [STRICT_TIME, []],
    [VARIANT, []],
    [UNKNOWN, []],
  ];
  kinds.forEach(([cubeType, expected]) =>
    expect(getLiteralKinds(cubeType)).toEqual(expected),
  );
});
