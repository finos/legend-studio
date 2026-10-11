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

import { TypeFamily } from '@finos/legend-cube';
import type { CubeResultValue } from '../../graph-manager/CubeEngine.js';

// How the grid shows and sorts values (PLAN §9, Settled before M1.8).
// Integer and Decimal values arrive as their exact text and are never turned
// into JS numbers, which would lose digits.

const NUMERIC_FAMILIES: ReadonlySet<TypeFamily> = new Set([
  TypeFamily.INTEGER,
  TypeFamily.FLOAT,
  TypeFamily.DECIMAL,
  TypeFamily.NUMBER,
]);

export const isNumericFamily = (family: TypeFamily): boolean =>
  NUMERIC_FAMILIES.has(family);

const NUMBER_TEXT =
  /^(?<sign>[+-]?)(?<whole>\d*)(?:\.(?<fraction>\d*))?(?:[eE](?<exponent>[+-]?\d+))?$/u;

/** A number's text as sign, digits without leading or trailing zeros, and the position of the decimal point */
const parseNumberText = (
  text: string,
): { negative: boolean; digits: string; point: number } | undefined => {
  const groups = NUMBER_TEXT.exec(text.trim())?.groups;
  if (!groups || (!groups.whole && !groups.fraction)) {
    return undefined;
  }
  const {
    sign,
    whole = '',
    fraction = '',
    exponent = '0',
  } = groups as Partial<Record<string, string>>;
  const allDigits = whole + fraction;
  const leadingZeros = allDigits.length - allDigits.replace(/^0+/u, '').length;
  const digits = allDigits.slice(leadingZeros).replace(/0+$/u, '');
  return {
    negative: sign === '-' && digits !== '',
    digits,
    point: whole.length - leadingZeros + Number(exponent),
  };
};

const compareMagnitudes = (
  left: { digits: string; point: number },
  right: { digits: string; point: number },
): number => {
  if (!left.digits || !right.digits) {
    return (left.digits ? 1 : 0) - (right.digits ? 1 : 0);
  }
  if (left.point !== right.point) {
    return left.point < right.point ? -1 : 1;
  }
  const length = Math.max(left.digits.length, right.digits.length);
  const a = left.digits.padEnd(length, '0');
  const b = right.digits.padEnd(length, '0');
  return a === b ? 0 : a < b ? -1 : 1;
};

/** Compares two numbers written as text, digit for digit: `'9' < '10'`, `'9007199254740993' > '9007199254740992'` */
export const compareNumberText = (left: string, right: string): number => {
  const a = parseNumberText(left);
  const b = parseNumberText(right);
  if (!a || !b) {
    // not a number: keep a stable order by text
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (a.negative !== b.negative) {
    return a.negative ? -1 : 1;
  }
  const magnitude = compareMagnitudes(a, b);
  return a.negative ? -magnitude : magnitude;
};

/** Orders a column's values: nulls first, then numbers by value whether they are JS numbers or exact text */
export const compareCellValues = (
  left: CubeResultValue | undefined,
  right: CubeResultValue | undefined,
): number => {
  if (
    left === null ||
    left === undefined ||
    right === null ||
    right === undefined
  ) {
    return (left ?? null) === null ? ((right ?? null) === null ? 0 : -1) : 1;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (
    (typeof left === 'string' || typeof left === 'number') &&
    (typeof right === 'string' || typeof right === 'number')
  ) {
    return compareNumberText(String(left), String(right));
  }
  return String(left) < String(right)
    ? -1
    : String(left) > String(right)
      ? 1
      : 0;
};

/** A run's duration for the toolbar: milliseconds under a second, else seconds */
export const formatDuration = (durationMs: number): string =>
  durationMs < 1000
    ? `${Math.round(durationMs)} ms`
    : `${(durationMs / 1000).toFixed(1)} s`;

/** The decimal places a Float value shows in the grid */
export const CUBE_GRID_FLOAT_DECIMAL_PLACES = 2;

const PLAIN_NUMBER_TEXT = /^(?<sign>-?)(?<whole>\d+)(?<fraction>\.\d*)?$/u;

/**
 * Number text with a comma between each group of three digits of its whole
 * part ("31102024.71" reads "31,102,024.71"); any other text is kept as it is
 */
export const groupThousands = (text: string): string => {
  const groups = PLAIN_NUMBER_TEXT.exec(text)?.groups;
  if (!groups) {
    return text;
  }
  const { sign = '', whole = '', fraction = '' } = groups;
  return `${sign}${whole.replace(/\B(?=(?:\d{3})+(?!\d))/gu, ',')}${fraction}`;
};

/**
 * How the grid shows a value of a column of the family (PLAN §9, user,
 * 2026-10-10): Decimal and Number values keep every digit,
 * their thousands grouped; Float values are rounded to
 * `CUBE_GRID_FLOAT_DECIMAL_PLACES` places, grouped too; Integer values, and
 * everything else, show as they are, so ids and years get no commas. The
 * value itself is unchanged, so copying a cell copies its exact value.
 */
export const formatCellValue = (
  value: Exclude<CubeResultValue, null>,
  family: TypeFamily,
): string => {
  const text = String(value);
  switch (family) {
    case TypeFamily.DECIMAL:
    case TypeFamily.NUMBER:
      return groupThousands(text);
    case TypeFamily.FLOAT: {
      const number = typeof value === 'number' ? value : Number(text);
      if (
        typeof value === 'boolean' ||
        text.trim() === '' ||
        !Number.isFinite(number)
      ) {
        return text;
      }
      const rounded = number.toFixed(CUBE_GRID_FLOAT_DECIMAL_PLACES);
      // a value that rounds to zero shows no sign
      return groupThousands(
        Number(rounded) === 0 ? rounded.replace(/^-/u, '') : rounded,
      );
    }
    default:
      return text;
  }
};
