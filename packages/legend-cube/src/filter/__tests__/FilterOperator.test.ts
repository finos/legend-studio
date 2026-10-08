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
import { PRIMITIVE_TYPE_PATH } from '../../types/PrimitiveTypeRegistry.js';
import {
  EMPTY_OPERATORS,
  hasUnescapedPatternCharacter,
  PATTERN_OPERATORS,
  FILTER_OPERATOR_DESCRIPTIONS,
  FILTER_OPERATORS,
  FilterOperator,
  getAvailableOperators,
  getDefaultOperator,
  getFilterValueShape,
  getNegatedOperator,
  isExactFloatComparison,
  isFilterOperator,
  isOperatorAvailable,
  NEGATIVE_OPERATORS,
  SET_OPERATORS,
} from '../FilterOperator.js';

// the rows of spec §8.2, as names, in the spec's order
const BOOLEAN_ROW = ['Equal', 'NotEqual', 'IsEmpty', 'IsNotEmpty'];
const STRING_ROW = [
  'Equal',
  'NotEqual',
  'StartsWith',
  'DoesNotStartWith',
  'Contains',
  'DoesNotContain',
  'EndsWith',
  'DoesNotEndWith',
  'IsEmpty',
  'IsNotEmpty',
  'In',
  'NotIn',
];
const ENUM_ROW = ['Equal', 'NotEqual', 'IsEmpty', 'IsNotEmpty', 'In', 'NotIn'];
const ORDERED_ROW = [
  'Equal',
  'NotEqual',
  'GreaterThan',
  'GreaterThanOrEqual',
  'LessThan',
  'LessThanOrEqual',
  'IsEmpty',
  'IsNotEmpty',
  'In',
  'NotIn',
];
const EMPTY_ONLY_ROW = ['IsEmpty', 'IsNotEmpty'];

const P = PRIMITIVE_TYPE_PATH;

describe(unitTest('Filter operators'), () => {
  test('Are the sixteen of the spec, by name', () => {
    expect([...FILTER_OPERATORS]).toEqual([
      'Equal',
      'NotEqual',
      'GreaterThan',
      'GreaterThanOrEqual',
      'LessThan',
      'LessThanOrEqual',
      'StartsWith',
      'DoesNotStartWith',
      'EndsWith',
      'DoesNotEndWith',
      'Contains',
      'DoesNotContain',
      'In',
      'NotIn',
      'IsEmpty',
      'IsNotEmpty',
    ]);
    FILTER_OPERATORS.forEach((operator) =>
      expect(isFilterOperator(operator)).toBe(true),
    );
    ['equal', 'Not', '', undefined, null, 1].forEach((value) =>
      expect(isFilterOperator(value)).toBe(false),
    );
  });

  test('Read as the spec describes them', () => {
    expect(FILTER_OPERATOR_DESCRIPTIONS).toEqual({
      Equal: 'is',
      NotEqual: 'is not',
      GreaterThan: 'is greater than',
      GreaterThanOrEqual: 'is greater than or equal',
      LessThan: 'is less than',
      LessThanOrEqual: 'is less than or equal',
      StartsWith: 'starts with',
      DoesNotStartWith: 'does not start with',
      Contains: 'contains',
      DoesNotContain: 'does not contain',
      EndsWith: 'ends with',
      DoesNotEndWith: 'does not end with',
      In: 'is in list of',
      NotIn: 'is not in list of',
      IsEmpty: 'is empty',
      IsNotEmpty: 'is not empty',
    });
  });

  test('Come in negation pairs, both ways', () => {
    const pairs: [FilterOperator, FilterOperator][] = [
      [FilterOperator.EQUAL, FilterOperator.NOT_EQUAL],
      [FilterOperator.STARTS_WITH, FilterOperator.DOES_NOT_START_WITH],
      [FilterOperator.ENDS_WITH, FilterOperator.DOES_NOT_END_WITH],
      [FilterOperator.CONTAINS, FilterOperator.DOES_NOT_CONTAIN],
      [FilterOperator.IN, FilterOperator.NOT_IN],
      [FilterOperator.IS_EMPTY, FilterOperator.IS_NOT_EMPTY],
    ];
    pairs.forEach(([positive, negative]) => {
      expect(getNegatedOperator(positive)).toBe(negative);
      expect(getNegatedOperator(negative)).toBe(positive);
    });
    expect([...NEGATIVE_OPERATORS]).toEqual(pairs.map(([, n]) => n));
    [
      FilterOperator.GREATER_THAN,
      FilterOperator.GREATER_THAN_OR_EQUAL,
      FilterOperator.LESS_THAN,
      FilterOperator.LESS_THAN_OR_EQUAL,
    ].forEach((operator) =>
      expect(getNegatedOperator(operator)).toBeUndefined(),
    );
  });

  test('Know which operators are LIKE patterns, where a backslash is unsafe', () => {
    expect([...PATTERN_OPERATORS]).toEqual([
      'StartsWith',
      'DoesNotStartWith',
      'EndsWith',
      'DoesNotEndWith',
      'Contains',
      'DoesNotContain',
    ]);
    PATTERN_OPERATORS.forEach((operator) => {
      expect(getFilterValueShape(operator)).toBe('single');
      expect(hasUnescapedPatternCharacter(operator, 'CORP\\')).toBe(true);
      expect(hasUnescapedPatternCharacter(operator, 'a\\b\\c')).toBe(true);
      // a backslash that looks escaped, or that escapes a wildcard, is still
      // misread: the engine escapes `%` and `_` but never `\`
      expect(hasUnescapedPatternCharacter(operator, 'a\\\\b')).toBe(true);
      expect(hasUnescapedPatternCharacter(operator, '0\\%')).toBe(true);
      expect(hasUnescapedPatternCharacter(operator, 'a\\_')).toBe(true);
      // the wildcards and quotes the engine does escape are fine
      expect(hasUnescapedPatternCharacter(operator, `50%_O'Brien`)).toBe(false);
    });
    FILTER_OPERATORS.filter(
      (operator) => !PATTERN_OPERATORS.includes(operator),
    ).forEach((operator) =>
      expect(hasUnescapedPatternCharacter(operator, 'CORP\\')).toBe(false),
    );
  });

  test('Take no value, one value or a list of values', () => {
    expect([...EMPTY_OPERATORS]).toEqual(['IsEmpty', 'IsNotEmpty']);
    expect([...SET_OPERATORS]).toEqual(['In', 'NotIn']);
    FILTER_OPERATORS.forEach((operator) =>
      expect(getFilterValueShape(operator)).toBe(
        EMPTY_OPERATORS.includes(operator)
          ? 'none'
          : SET_OPERATORS.includes(operator)
            ? 'list'
            : 'single',
      ),
    );
    expect(getFilterValueShape(FilterOperator.EQUAL)).toBe('single');
    expect(getFilterValueShape(FilterOperator.NOT_IN)).toBe('list');
    expect(getFilterValueShape(FilterOperator.IS_NOT_EMPTY)).toBe('none');
  });
});

const AVAILABILITY: [string, CubeType, string[]][] = [
  [P.BOOLEAN, PrimitiveType.get(P.BOOLEAN), BOOLEAN_ROW],
  [P.STRING, PrimitiveType.get(P.STRING), STRING_ROW],
  [`${P.VARCHAR}(5)`, PrimitiveType.get(P.VARCHAR, [5]), STRING_ROW],
  [`${P.VARCHAR}(0)`, PrimitiveType.get(P.VARCHAR, [0]), STRING_ROW],
  [P.NUMBER, PrimitiveType.get(P.NUMBER), ORDERED_ROW],
  [P.INTEGER, PrimitiveType.get(P.INTEGER), ORDERED_ROW],
  [P.TINY_INT, PrimitiveType.get(P.TINY_INT), ORDERED_ROW],
  [P.U_TINY_INT, PrimitiveType.get(P.U_TINY_INT), ORDERED_ROW],
  [P.SMALL_INT, PrimitiveType.get(P.SMALL_INT), ORDERED_ROW],
  [P.U_SMALL_INT, PrimitiveType.get(P.U_SMALL_INT), ORDERED_ROW],
  [P.INT, PrimitiveType.get(P.INT), ORDERED_ROW],
  [P.U_INT, PrimitiveType.get(P.U_INT), ORDERED_ROW],
  [P.BIG_INT, PrimitiveType.get(P.BIG_INT), ORDERED_ROW],
  [P.U_BIG_INT, PrimitiveType.get(P.U_BIG_INT), ORDERED_ROW],
  [P.FLOAT, PrimitiveType.get(P.FLOAT), ORDERED_ROW],
  [P.FLOAT4, PrimitiveType.get(P.FLOAT4), ORDERED_ROW],
  [P.DOUBLE, PrimitiveType.get(P.DOUBLE), ORDERED_ROW],
  [P.DECIMAL, PrimitiveType.get(P.DECIMAL), ORDERED_ROW],
  [`${P.NUMERIC}(10,2)`, PrimitiveType.get(P.NUMERIC, [10, 2]), ORDERED_ROW],
  [P.DATE, PrimitiveType.get(P.DATE), ORDERED_ROW],
  [P.STRICT_DATE, PrimitiveType.get(P.STRICT_DATE), ORDERED_ROW],
  [P.DATE_TIME, PrimitiveType.get(P.DATE_TIME), ORDERED_ROW],
  [P.TIMESTAMP, PrimitiveType.get(P.TIMESTAMP), ORDERED_ROW],
  [P.STRICT_TIME, PrimitiveType.get(P.STRICT_TIME), EMPTY_ONLY_ROW],
  [P.VARIANT, PrimitiveType.get(P.VARIANT), EMPTY_ONLY_ROW],
  [
    'an enumeration',
    new EnumType('trading::Region', ['EMEA', 'APAC']),
    ENUM_ROW,
  ],
  ['an unknown type', OpaqueType.get('x::Blob'), EMPTY_ONLY_ROW],
];

describe(unitTest('Filter operator availability'), () => {
  test.each(AVAILABILITY)(
    'Offers the right operators, in order, for %s',
    (_, type, expected) => {
      expect([...getAvailableOperators(type)]).toEqual(expected);
      FILTER_OPERATORS.forEach((operator) =>
        expect(isOperatorAvailable(operator, type)).toBe(
          expected.includes(operator),
        ),
      );
    },
  );

  test.each(AVAILABILITY)(
    'Starts a new row on %s with Equal, or the first operator offered',
    (_, type, expected) => {
      expect(getDefaultOperator(type)).toBe(
        expected.includes('Equal') ? 'Equal' : expected[0],
      );
    },
  );

  test('Covers every type of the registry', () => {
    const covered = new Set(AVAILABILITY.map(([, type]) => type.path));
    Object.values(PRIMITIVE_TYPE_PATH).forEach((path) =>
      expect(covered.has(path)).toBe(true),
    );
  });

  test('Flags exact comparisons on floating-point columns only', () => {
    const exact = [
      FilterOperator.EQUAL,
      FilterOperator.NOT_EQUAL,
      FilterOperator.IN,
      FilterOperator.NOT_IN,
    ];
    [P.FLOAT, P.FLOAT4, P.DOUBLE].forEach((path) =>
      FILTER_OPERATORS.forEach((operator) =>
        expect(isExactFloatComparison(operator, PrimitiveType.get(path))).toBe(
          exact.includes(operator),
        ),
      ),
    );
    [P.INTEGER, P.DECIMAL, P.NUMBER, P.STRING].forEach((path) =>
      exact.forEach((operator) =>
        expect(isExactFloatComparison(operator, PrimitiveType.get(path))).toBe(
          false,
        ),
      ),
    );
  });
});
