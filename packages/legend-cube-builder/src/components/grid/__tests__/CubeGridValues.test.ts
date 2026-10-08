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
  formatDuration,
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
});
