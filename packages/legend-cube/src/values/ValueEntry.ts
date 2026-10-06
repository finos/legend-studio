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
  type CubeType,
  isEnumType,
  isPrimitiveType,
} from '../types/CubeType.js';
import { TypeFamily } from '../types/TypeFamily.js';
import { assertUnreachable } from '../utils/AssertionUtils.js';
import {
  type EnteredValue,
  type LiteralValue,
  getLiteralText,
} from './LiteralValue.js';

/**
 * Why an entered value is not a valid value of its type:
 * - `required`: there is no value;
 * - `invalid`: the text is not a value of the type;
 * - `outOfRange`: the text is a number, but the type can't hold it (e.g. 300 for
 *   `TinyInt`).
 */
export type ValueProblem =
  | { readonly reason: 'required' }
  | { readonly reason: 'invalid' | 'outOfRange'; readonly text: string };

type ReadResult = LiteralValue | 'invalid' | 'outOfRange';

const INTEGER_TEXT = /^[+-]?\d+$/u;
// e.g. `5`, `-5.`, `+.5`, `5.25e-3`; no hex, `Infinity`, `NaN` or `_`
const NUMBER_TEXT =
  /^(?<sign>[+-]?)(?:(?<integer>\d+)(?:\.(?<fraction>\d*))?|\.(?<leadingFraction>\d+))(?<exponent>[eE][+-]?\d+)?$/u;
const STRICT_DATE_TEXT = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;
const DATE_TIME_TEXT =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.\d{1,9})?$/u;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** `+007` → `7`, `-0` → `0` */
const canonicalizeInteger = (text: string): string => {
  const digits = text.replace(/^[+-]/u, '').replace(/^0+(?=\d)/u, '');
  return text.startsWith('-') && digits !== '0' ? `-${digits}` : digits;
};

/**
 * Reads a number into the JSON number grammar (what the engine protocol
 * accepts): `+5` → `5`, `007` → `7`, `.5` → `0.5`, `5.` → `5`, `-0` → `0`.
 */
const readNumber = (text: string): string | undefined => {
  const groups = NUMBER_TEXT.exec(text)?.groups;
  if (!groups) {
    return undefined;
  }
  const { sign, integer: integerDigits = '', exponent } = groups;
  const fraction = groups.fraction ?? groups.leadingFraction ?? '';
  const integerPart = integerDigits.replace(/^0+(?=\d)/u, '') || '0';
  const isZero = /^0*$/u.test(integerDigits + fraction);
  return `${sign === '-' && !isZero ? '-' : ''}${integerPart}${fraction ? `.${fraction}` : ''}${exponent ?? ''}`;
};

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const isValidDate = (year: number, month: number, day: number): boolean =>
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <=
    (month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0));

const isStrictDate = (text: string): boolean => {
  const date = STRICT_DATE_TEXT.exec(text)?.groups;
  return Boolean(
    date &&
      isValidDate(Number(date.year), Number(date.month), Number(date.day)),
  );
};

const isDateTime = (text: string): boolean => {
  const dateTime = DATE_TIME_TEXT.exec(text)?.groups;
  return Boolean(
    dateTime &&
      isValidDate(
        Number(dateTime.year),
        Number(dateTime.month),
        Number(dateTime.day),
      ) &&
      Number(dateTime.hour) <= 23 &&
      Number(dateTime.minute) <= 59 &&
      Number(dateTime.second) <= 59,
  );
};

/** Reads text as a value of the type. Both `parseValue()` and `checkValue()` rely on it. */
const readLiteral = (text: string, type: CubeType): ReadResult => {
  switch (type.family) {
    case TypeFamily.STRING:
      return { kind: 'string', value: text };
    case TypeFamily.BOOLEAN:
      return text === 'true' || text === 'false'
        ? { kind: 'boolean', value: text === 'true' }
        : 'invalid';
    case TypeFamily.INTEGER: {
      if (!INTEGER_TEXT.test(text)) {
        return 'invalid';
      }
      const value = canonicalizeInteger(text);
      const range = isPrimitiveType(type) ? type.info.integerRange : undefined;
      if (range && (BigInt(value) < range.min || BigInt(value) > range.max)) {
        return 'outOfRange';
      }
      return { kind: 'integer', value };
    }
    case TypeFamily.FLOAT: {
      const value = readNumber(text);
      if (value === undefined) {
        return 'invalid';
      }
      // e.g. 1e400, which a double can't hold
      return Number.isFinite(Number(value))
        ? { kind: 'float', value }
        : 'outOfRange';
    }
    case TypeFamily.DECIMAL:
    case TypeFamily.NUMBER: {
      // NOTE: the precision and scale of `Numeric(p,s)` are not enforced:
      // `price > 1.555` on a `Numeric(10,2)` column is a meaningful filter
      const value = readNumber(text);
      return value === undefined ? 'invalid' : { kind: 'decimal', value };
    }
    case TypeFamily.STRICT_DATE:
      return isStrictDate(text)
        ? { kind: 'strictDate', value: text }
        : 'invalid';
    case TypeFamily.DATETIME:
      return isDateTime(text) ? { kind: 'dateTime', value: text } : 'invalid';
    case TypeFamily.DATE:
      if (isStrictDate(text)) {
        return { kind: 'strictDate', value: text };
      }
      return isDateTime(text) ? { kind: 'dateTime', value: text } : 'invalid';
    case TypeFamily.ENUM:
      return isEnumType(type) && type.values.includes(text)
        ? { kind: 'enum', value: text }
        : 'invalid';
    case TypeFamily.STRICT_TIME:
    case TypeFamily.VARIANT:
    case TypeFamily.OPAQUE:
      return 'invalid';
    default:
      return assertUnreachable(type.family);
  }
};

// STRING values are taken as typed; other types ignore surrounding whitespace
const readEnteredText = (text: string, type: CubeType): ReadResult =>
  readLiteral(type.family === TypeFamily.STRING ? text : text.trim(), type);

/**
 * Reads the text entered for a value of the given type. Returns:
 * - a literal of the type's kind, with numbers in canonical form;
 * - `{kind: 'invalid', text}` when the text is not a value of the type, keeping
 *   the text as typed so it can be shown and fixed;
 * - `undefined` when the input is empty.
 *
 * STRING values are taken as typed: they are not trimmed, and `''` is a value.
 */
export const parseValue = (text: string, type: CubeType): EnteredValue => {
  if (type.family !== TypeFamily.STRING && !text.trim()) {
    return undefined;
  }
  const result = readEnteredText(text, type);
  return typeof result === 'string' ? { kind: 'invalid', text } : result;
};

/**
 * Checks an entered value against a type, returning its problem, if any.
 *
 * A literal is read again from its text and must come back unchanged. So a
 * literal of another kind (e.g. after the column type changed), one out of the
 * type's range, or one not in canonical form (e.g. from a hand-edited spec) is
 * a problem too.
 */
export const checkValue = (
  value: EnteredValue,
  type: CubeType,
): ValueProblem | undefined => {
  if (value === undefined) {
    return { reason: 'required' };
  }
  if (value.kind === 'invalid') {
    return {
      reason:
        readEnteredText(value.text, type) === 'outOfRange'
          ? 'outOfRange'
          : 'invalid',
      text: value.text,
    };
  }
  const text = getLiteralText(value);
  const result = readEnteredText(text, type);
  if (typeof result === 'string') {
    return { reason: result, text };
  }
  return result.kind === value.kind && result.value === value.value
    ? undefined
    : { reason: 'invalid', text };
};
