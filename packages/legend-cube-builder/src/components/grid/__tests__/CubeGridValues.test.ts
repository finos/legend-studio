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
  type ColumnFormat,
  ColumnFormatStyle,
  PrimitiveType,
  TypeFamily,
} from '@finos/legend-cube';
import {
  compareCellValues,
  compareNumberText,
  formatCellValue,
  formatDuration,
  groupThousands,
  isNumericFamily,
  formatColumnValue,
  getColumnFormatProblem,
  getCubeCurrencyCodes,
  formatGroupRowValue,
  getTypeScale,
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

  const format = (init: Partial<ColumnFormat>): ColumnFormat => ({
    style: ColumnFormatStyle.NUMBER,
    grouping: false,
    redIfNegative: false,
    parenthesesIfNegative: false,
    ...init,
  });

  test("Formats a number column's values from their exact text, every digit kept unless places are set", () => {
    const usd = format({
      style: ColumnFormatStyle.CURRENCY,
      currency: 'USD',
      decimalPlaces: 2,
      grouping: true,
    });
    expect(formatColumnValue('12345678901234567890.125', usd)).toEqual({
      text: '$12,345,678,901,234,567,890.13',
      negative: false,
    });
    expect(formatColumnValue('0.10000000000000000001', format({}))?.text).toBe(
      '0.10000000000000000001',
    );
    expect(formatColumnValue(1234.5, format({ grouping: true }))?.text).toBe(
      '1,234.5',
    );
    expect(
      formatColumnValue('0.1234', format({ style: ColumnFormatStyle.PERCENT }))
        ?.text,
    ).toBe('12.34%');
    expect(formatColumnValue('3', format({ decimalPlaces: 2 }))?.text).toBe(
      '3.00',
    );
  });

  test("Shows a Variant's JSON on one line, and text that isn't JSON as it is (PLAN §11.20)", () => {
    expect(
      formatCellValue(
        '{"name":"ann","tags":["a","b"],"n":1.0}',
        TypeFamily.VARIANT,
      ),
    ).toBe('{name: ann, tags: [a, b], n: 1.0}');
    expect(formatCellValue('not json', TypeFamily.VARIANT)).toBe('not json');
    // a String column's JSON text is shown as it is
    expect(formatCellValue('{"a":1}', TypeFamily.STRING)).toBe('{"a":1}');
  });

  test('Shows a negative in parentheses when asked, and says it is negative for red', () => {
    expect(
      formatColumnValue(
        '-1234.5',
        format({ grouping: true, parenthesesIfNegative: true }),
      ),
    ).toEqual({ text: '(1,234.5)', negative: true });
    expect(formatColumnValue('-1234.5', format({}))).toEqual({
      text: '-1234.5',
      negative: true,
    });
    // zero is never negative
    expect(formatColumnValue('-0', format({}))?.negative).toBe(false);
  });

  test("Leaves a value that isn't a number, or a format it can't use, to the default", () => {
    expect(formatColumnValue('abc', format({}))).toBeUndefined();
    expect(formatColumnValue(true, format({}))).toBeUndefined();
    const unknownCurrency = format({
      style: ColumnFormatStyle.CURRENCY,
      currency: '$',
    });
    expect(formatColumnValue('1', unknownCurrency)).toBeUndefined();
    expect(getColumnFormatProblem(unknownCurrency)).toBe(
      'The currency "$" is unknown, so the column shows its values as they are.',
    );
    expect(getColumnFormatProblem(format({ style: 'scientific' }))).toBe(
      'The format "scientific" is unknown, so the column shows its values as they are.',
    );
    expect(getColumnFormatProblem(format({}))).toBeUndefined();
    expect(getCubeCurrencyCodes()).toEqual(
      expect.arrayContaining(['USD', 'EUR', 'GBP', 'JPY', 'CHF']),
    );
  });

  test("With no places set, keeps the value's own digits, a currency at least its cents (review of M7)", () => {
    const usd = format({ style: ColumnFormatStyle.CURRENCY, currency: 'USD' });
    expect(formatColumnValue('20.20', usd)?.text).toBe('$20.20');
    expect(formatColumnValue('20', usd)?.text).toBe('$20.00');
    expect(formatColumnValue('20.125', usd)?.text).toBe('$20.125');
    expect(formatColumnValue('2.5000', format({}))?.text).toBe('2.5000');
    expect(
      formatColumnValue(
        '1',
        format({ style: ColumnFormatStyle.CURRENCY, currency: 'JPY' }),
      )?.text,
    ).toBe('¥1');
  });

  test('Shows a negative that rounds to zero as zero: no sign, not red, no parentheses (review of M7)', () => {
    const noCents = format({
      style: ColumnFormatStyle.CURRENCY,
      currency: 'USD',
      decimalPlaces: 0,
      redIfNegative: true,
      parenthesesIfNegative: true,
    });
    expect(formatColumnValue('-0.4', noCents)).toEqual({
      text: '$0',
      negative: false,
    });
    expect(formatColumnValue('-1.4', noCents)).toEqual({
      text: '($1)',
      negative: true,
    });
    expect(formatColumnValue('-0', format({}))).toEqual({
      text: '0',
      negative: false,
    });
  });
});

describe("Group rows' aggregated numbers", () => {
  test("Rounds a fraction to the column's scale, or 2 places, and groups the thousands, an integer's too", () => {
    expect(
      formatGroupRowValue('264.61327566137567', TypeFamily.DECIMAL, 4),
    ).toBe('264.6133');
    expect(formatGroupRowValue('264.61327566137567', TypeFamily.FLOAT)).toBe(
      '264.61',
    );
    // an Average of integers keeps 2 places
    expect(formatGroupRowValue('12.3456', TypeFamily.INTEGER)).toBe('12.35');
    expect(formatGroupRowValue('37171394', TypeFamily.INTEGER)).toBe(
      '37,171,394',
    );
    // a sum at the column's own scale keeps every digit
    expect(
      formatGroupRowValue('12345678901234567890.25', TypeFamily.DECIMAL, 2),
    ).toBe('12,345,678,901,234,567,890.25');
    expect(formatGroupRowValue('-0.001', TypeFamily.FLOAT)).toBe('0.00');
    expect(formatGroupRowValue('text', TypeFamily.STRING)).toBe('text');
  });

  test("Reads the scale of a decimal column's type, and none of another", () => {
    expect(getTypeScale(PrimitiveType.get('Numeric', [14, 4]))).toBe(4);
    expect(getTypeScale(PrimitiveType.get('Integer'))).toBeUndefined();
    expect(getTypeScale(PrimitiveType.get('Float'))).toBeUndefined();
  });
});
