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

import {
  type ColumnFormat,
  ColumnFormatStyle,
  type CubeType,
  isColumnFormatStyle,
  PrimitiveType,
  TypeFamily,
} from '@finos/legend-cube';
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

/**
 * The digits after the point a decimal column keeps, e.g. 4 for
 * `Numeric(14,4)`; none for another type, whose group rows round to
 * `CUBE_GRID_FLOAT_DECIMAL_PLACES` (an Average of integers keeps 2 places)
 */
export const getTypeScale = (type: CubeType): number | undefined =>
  type instanceof PrimitiveType &&
  type.family === TypeFamily.DECIMAL &&
  type.params.length >= 2
    ? type.params[1]
    : undefined;

/**
 * How a group row shows a number it aggregates (the review of the demo,
 * 2026-10-13): its thousands grouped, an integer's too, since a sum or a
 * count is a quantity, not an id; a fraction rounded to the column's scale,
 * or to `CUBE_GRID_FLOAT_DECIMAL_PLACES` places for a column without one,
 * so an Average doesn't show every digit. A value that isn't a number, or a
 * column that isn't numeric, shows as it is. Copying keeps the exact value.
 */
export const formatGroupRowValue = (
  value: Exclude<CubeResultValue, null>,
  family: TypeFamily,
  scale?: number | undefined,
): string => {
  const text = String(value);
  if (!isNumericFamily(family) || typeof value === 'boolean') {
    return text;
  }
  const parts = PLAIN_NUMBER_TEXT.exec(text.trim())?.groups;
  if (!parts) {
    return text;
  }
  const places = scale ?? CUBE_GRID_FLOAT_DECIMAL_PLACES;
  // the fraction's digits, the point left out
  const fraction = (parts.fraction ?? '').slice(1);
  if (fraction.length <= places) {
    return groupThousands(text.trim());
  }
  const rounded = Number(text).toFixed(places);
  // a value that rounds to zero shows no sign
  return groupThousands(
    Number(rounded) === 0 ? rounded.replace(/^-/u, '') : rounded,
  );
};

/** The ISO 4217 codes the browser formats (PLAN §11.10: codes, not symbols, §21) */
export const getCubeCurrencyCodes = (): readonly string[] => {
  const supportedValuesOf = (
    Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    }
  ).supportedValuesOf;
  return supportedValuesOf?.('currency') ?? ['EUR', 'GBP', 'JPY', 'USD'];
};

/** Why a format can't be used, if it can't: a style or a currency this browser doesn't know */
export const getColumnFormatProblem = (
  format: ColumnFormat,
): string | undefined => {
  if (!isColumnFormatStyle(format.style)) {
    return `The format "${format.style}" is unknown, so the column shows its values as they are.`;
  }
  if (
    format.style === ColumnFormatStyle.CURRENCY &&
    !getCubeCurrencyCodes().includes(format.currency ?? '')
  ) {
    return `The currency "${format.currency ?? ''}" is unknown, so the column shows its values as they are.`;
  }
  return undefined;
};

/**
 * A number formatted as the column's format says (spec §13.1, PLAN §11.10),
 * from its exact text, so no digit is lost (`Intl.NumberFormat` reads a
 * decimal string exactly); `undefined` for a value that isn't a number or a
 * format that can't be used (`getColumnFormatProblem`), which shows as if
 * none were set
 */
export const formatColumnValue = (
  value: Exclude<CubeResultValue, null>,
  format: ColumnFormat,
): { readonly text: string; readonly negative: boolean } | undefined => {
  const text = String(value).trim();
  const parsed = typeof value === 'boolean' ? undefined : parseNumberText(text);
  if (!parsed || getColumnFormatProblem(format) !== undefined) {
    return undefined;
  }
  // with no places set, the value's own: '20.20' keeps its zero (a
  // currency at least its usual cents), as the grid shows it unformatted
  const ownPlaces = Math.min(
    20,
    /e/iu.test(text)
      ? Math.max(0, parsed.digits.length - parsed.point)
      : (text.split('.')[1]?.length ?? 0),
  );
  const places = format.decimalPlaces;
  const formatter = new Intl.NumberFormat('en-US', {
    style:
      format.style === ColumnFormatStyle.CURRENCY
        ? 'currency'
        : format.style === ColumnFormatStyle.PERCENT
          ? 'percent'
          : 'decimal',
    ...(format.style === ColumnFormatStyle.CURRENCY
      ? { currency: format.currency }
      : {}),
    useGrouping: format.grouping,
    // a negative that rounds to zero shows as zero, with no sign
    signDisplay: 'negative',
    ...(places !== undefined
      ? { minimumFractionDigits: places, maximumFractionDigits: places }
      : format.style === ColumnFormatStyle.PERCENT
        ? { minimumFractionDigits: 0, maximumFractionDigits: 20 }
        : {
            minimumFractionDigits: Math.max(
              ownPlaces,
              format.style === ColumnFormatStyle.CURRENCY
                ? (new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: format.currency,
                  }).resolvedOptions().minimumFractionDigits ?? 0)
                : 0,
            ),
            maximumFractionDigits: 20,
          }),
  });
  // a decimal string keeps every digit, where a JS number would round
  const shown = (number: string): string =>
    formatter.format(number as unknown as number);
  const signed = shown(text);
  // negative as shown: one that rounds to zero isn't
  const negative = parsed.negative && signed.includes('-');
  return format.parenthesesIfNegative && negative
    ? { text: `(${shown(text.replace(/^-/u, ''))})`, negative }
    : { text: signed, negative };
};
