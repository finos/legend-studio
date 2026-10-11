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
import { TypeFamily } from '@finos/legend-cube';
import {
  compareCellValues,
  compareNumberText,
  formatCellValue,
  formatDuration,
  groupThousands,
  isNumericFamily,
} from '../CubeGridValues.js';

const sortedText = (values: string[]): string[] =>
  [...values].sort(compareNumberText);

describe('Cube grid values', () => {
  test('Orders numbers written as text by their value, digit for digit', () => {
    expect(sortedText(['10', '9', '-1', '0', '2.5', '-10', '-2.5'])).toEqual([
      '-10',
      '-2.5',
      '-1',
      '0',
      '2.5',
      '9',
      '10',
    ]);
    // past what a JS number holds
    expect(compareNumberText('9007199254740993', '9007199254740992')).toBe(1);
    expect(
      compareNumberText('0.10000000000000000001', '0.1000000000000000000'),
    ).toBe(1);
  });

  test('Treats the same value written differently as equal', () => {
    expect(compareNumberText('12.30', '12.3')).toBe(0);
    expect(compareNumberText('007', '7')).toBe(0);
    expect(compareNumberText('0', '-0')).toBe(0);
    expect(compareNumberText('0.00', '0')).toBe(0);
    expect(compareNumberText('1.5E+3', '1500')).toBe(0);
    expect(compareNumberText('1E-7', '0.0000001')).toBe(0);
  });

  test('Orders small and large magnitudes, and keeps text that is not a number in text order', () => {
    expect(sortedText(['0.5', '0.05', '5', '0.005'])).toEqual([
      '0.005',
      '0.05',
      '0.5',
      '5',
    ]);
    expect(compareNumberText('abc', 'abd')).toBe(-1);
  });

  test('Puts nulls first, and compares JS numbers with exact text by value', () => {
    expect(compareCellValues(null, '1')).toBeLessThan(0);
    expect(compareCellValues('1', null)).toBeGreaterThan(0);
    expect(compareCellValues(null, null)).toBe(0);
    expect(compareCellValues(undefined, null)).toBe(0);
    expect(compareCellValues(2.5, 10)).toBeLessThan(0);
    expect(compareCellValues('9', 10)).toBeLessThan(0);
  });

  test('Knows which type families are numbers', () => {
    expect(
      [
        TypeFamily.INTEGER,
        TypeFamily.FLOAT,
        TypeFamily.DECIMAL,
        TypeFamily.NUMBER,
      ].every(isNumericFamily),
    ).toBe(true);
    expect(isNumericFamily(TypeFamily.STRING)).toBe(false);
    expect(isNumericFamily(TypeFamily.STRICT_DATE)).toBe(false);
  });

  test('Shows a run time in milliseconds under a second, else in seconds', () => {
    expect(formatDuration(566.4)).toBe('566 ms');
    expect(formatDuration(1250)).toBe('1.3 s');
  });

  test('Groups the thousands of a number written as text, keeping every digit and the sign', () => {
    expect(groupThousands('31102024.71')).toBe('31,102,024.71');
    expect(groupThousands('-1234.5')).toBe('-1,234.5');
    expect(groupThousands('1000')).toBe('1,000');
    expect(groupThousands('999')).toBe('999');
    expect(groupThousands('0.123456789')).toBe('0.123456789');
    expect(groupThousands('9007199254740993')).toBe('9,007,199,254,740,993');
    // anything else is kept as it is
    expect(groupThousands('1.5e21')).toBe('1.5e21');
    expect(groupThousands('abc')).toBe('abc');
    expect(groupThousands('')).toBe('');
  });

  test('Shows Decimal and Number values grouped with every digit, Float values grouped and rounded to 2 places, and the rest as they are', () => {
    expect(formatCellValue('31102024.71', TypeFamily.DECIMAL)).toBe(
      '31,102,024.71',
    );
    expect(formatCellValue('12.300', TypeFamily.DECIMAL)).toBe('12.300');
    expect(formatCellValue('1234567', TypeFamily.NUMBER)).toBe('1,234,567');
    expect(formatCellValue(31.10202471, TypeFamily.FLOAT)).toBe('31.10');
    expect(formatCellValue(1234567.891, TypeFamily.FLOAT)).toBe('1,234,567.89');
    expect(formatCellValue(-2.005, TypeFamily.FLOAT)).toBe('-2.00');
    expect(formatCellValue(5124, TypeFamily.FLOAT)).toBe('5,124.00');
    // a Float written as text reads the same
    expect(formatCellValue('0.5', TypeFamily.FLOAT)).toBe('0.50');
    // rounded to zero, with no sign
    expect(formatCellValue(-0.001, TypeFamily.FLOAT)).toBe('0.00');
    // what isn't a finite number is kept
    expect(formatCellValue(Number.NaN, TypeFamily.FLOAT)).toBe('NaN');
    expect(formatCellValue(1e21, TypeFamily.FLOAT)).toBe('1e+21');
    expect(formatCellValue('n/a', TypeFamily.FLOAT)).toBe('n/a');
    // ids and years get no commas
    expect(formatCellValue('10692', TypeFamily.INTEGER)).toBe('10692');
    expect(formatCellValue('2026', TypeFamily.INTEGER)).toBe('2026');
    expect(formatCellValue('31102024', TypeFamily.STRING)).toBe('31102024');
    expect(formatCellValue(true, TypeFamily.BOOLEAN)).toBe('true');
  });
});
