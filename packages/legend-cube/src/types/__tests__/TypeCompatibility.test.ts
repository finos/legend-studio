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
} from '../CubeType.js';
import {
  areCompatibleTypes,
  ComparisonClass,
  getComparisonClass,
  getLeastCommonAncestor,
} from '../TypeCompatibility.js';

const type = (path: string, params: number[] = []): PrimitiveType =>
  PrimitiveType.get(path, params);

const BOOLEAN = type('Boolean');
const STRING = type('String');
const VARCHAR_0 = type('Varchar', [0]);
const VARCHAR_5 = type('Varchar', [5]);
const VARCHAR_40 = type('Varchar', [40]);
const NUMBER = type('Number');
const INTEGER = type('Integer');
const TINY_INT = type('TinyInt');
const SMALL_INT = type('SmallInt');
const INT = type('Int');
const BIG_INT = type('BigInt');
const U_BIG_INT = type('UBigInt');
const FLOAT = type('Float');
const FLOAT4 = type('Float4');
const DOUBLE = type('Double');
const DECIMAL = type('Decimal');
const NUMERIC_10_2 = type('Numeric', [10, 2]);
const NUMERIC_12_4 = type('Numeric', [12, 4]);
const DATE = type('Date');
const STRICT_DATE = type('StrictDate');
const DATE_TIME = type('DateTime');
const TIMESTAMP = type('Timestamp');
const STRICT_TIME = type('StrictTime');
const VARIANT = type('Variant');
const COLOR = new EnumType('my::model::Color', ['RED', 'GREEN']);
const COLOR_AGAIN = new EnumType('my::model::Color', ['RED']);
const SIZE = new EnumType('my::model::Size', ['S', 'M']);
const UNKNOWN = OpaqueType.get('my::model::Unknown');

const ALL_TYPES: CubeType[] = [
  BOOLEAN,
  STRING,
  VARCHAR_0,
  VARCHAR_5,
  VARCHAR_40,
  NUMBER,
  INTEGER,
  TINY_INT,
  SMALL_INT,
  INT,
  BIG_INT,
  U_BIG_INT,
  FLOAT,
  FLOAT4,
  DOUBLE,
  DECIMAL,
  NUMERIC_10_2,
  NUMERIC_12_4,
  DATE,
  STRICT_DATE,
  DATE_TIME,
  TIMESTAMP,
  STRICT_TIME,
  VARIANT,
  COLOR,
  COLOR_AGAIN,
  SIZE,
  UNKNOWN,
];

/**
 * The expected compatibility: two types are compatible exactly when one of these
 * groups holds both. Variant and opaque types are in none, so they are not even
 * compatible with themselves, and no group holds both `StrictDate` and
 * `Timestamp`.
 */
const COMPATIBLE_GROUPS: CubeType[][] = [
  [
    NUMBER,
    INTEGER,
    TINY_INT,
    SMALL_INT,
    INT,
    BIG_INT,
    U_BIG_INT,
    FLOAT,
    FLOAT4,
    DOUBLE,
    DECIMAL,
    NUMERIC_10_2,
    NUMERIC_12_4,
  ],
  [STRING, VARCHAR_0, VARCHAR_5, VARCHAR_40],
  [BOOLEAN],
  [DATE, STRICT_DATE],
  [DATE, DATE_TIME, TIMESTAMP],
  [STRICT_TIME],
  [COLOR, COLOR_AGAIN],
  [SIZE],
];

describe(unitTest('Type compatibility'), () => {
  test('Matches the expected compatibility for every pair of types', () => {
    const mismatches = ALL_TYPES.flatMap((a) =>
      ALL_TYPES.flatMap((b) => {
        const expected = COMPATIBLE_GROUPS.some(
          (group) => group.includes(a) && group.includes(b),
        );
        return areCompatibleTypes(a, b) === expected
          ? []
          : [`${a.fullName} and ${b.fullName} should be ${expected}`];
      }),
    );
    expect(mismatches).toEqual([]);
  });

  test.each<[CubeType, CubeType, boolean]>([
    [VARCHAR_5, VARCHAR_40, true],
    [SMALL_INT, DOUBLE, true],
    [NUMERIC_10_2, BIG_INT, true],
    [VARCHAR_5, SMALL_INT, false],
    [STRICT_DATE, TIMESTAMP, false],
    [STRICT_DATE, DATE_TIME, false],
    [DATE, TIMESTAMP, true],
    [BOOLEAN, BIG_INT, false],
    [VARIANT, VARIANT, false],
    [UNKNOWN, UNKNOWN, false],
    [COLOR, SIZE, false],
  ])('%s and %s: %s', (a, b, expected) => {
    expect(areCompatibleTypes(a, b)).toBe(expected);
    expect(areCompatibleTypes(b, a)).toBe(expected);
  });

  test.each<[CubeType, ComparisonClass | undefined]>([
    [VARCHAR_5, ComparisonClass.STRING],
    [U_BIG_INT, ComparisonClass.NUMERIC],
    [NUMERIC_10_2, ComparisonClass.NUMERIC],
    [NUMBER, ComparisonClass.NUMERIC],
    [TIMESTAMP, ComparisonClass.DATETIME],
    [DATE, ComparisonClass.DATE],
    [STRICT_TIME, ComparisonClass.STRICT_TIME],
    [COLOR, ComparisonClass.ENUM],
    [VARIANT, undefined],
    [UNKNOWN, undefined],
  ])('The comparison class of %s is %s', (cubeType, comparisonClass) => {
    expect(getComparisonClass(cubeType)).toBe(comparisonClass);
  });
});

describe(unitTest('Least common ancestor'), () => {
  test.each<[CubeType, CubeType, CubeType | undefined]>([
    [type('Varchar', [15]), type('Varchar', [2]), STRING],
    [NUMERIC_10_2, NUMERIC_12_4, DECIMAL],
    [INT, SMALL_INT, INTEGER],
    [SMALL_INT, DOUBLE, NUMBER],
    [FLOAT4, DOUBLE, FLOAT],
    [VARCHAR_5, STRING, STRING],
    [VARCHAR_5, VARCHAR_5, VARCHAR_5],
    [TIMESTAMP, DATE_TIME, DATE_TIME],
    [STRICT_DATE, DATE_TIME, DATE],
    [STRICT_DATE, TIMESTAMP, DATE],
    [BOOLEAN, STRING, undefined],
    [STRICT_TIME, STRICT_DATE, undefined],
    [VARIANT, STRING, undefined],
    [COLOR, COLOR_AGAIN, COLOR],
    [COLOR, SIZE, undefined],
    [UNKNOWN, UNKNOWN, UNKNOWN],
    [UNKNOWN, STRING, undefined],
  ])('Of %s and %s is %s', (a, b, expected) => {
    const ancestor = getLeastCommonAncestor(a, b);
    const reverse = getLeastCommonAncestor(b, a);
    if (expected === undefined) {
      expect(ancestor).toBeUndefined();
      expect(reverse).toBeUndefined();
    } else {
      expect(ancestor?.equals(expected)).toBe(true);
      expect(reverse?.equals(expected)).toBe(true);
    }
  });
});
