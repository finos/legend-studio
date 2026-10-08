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
