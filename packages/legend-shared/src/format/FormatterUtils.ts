/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  type JavaScriptValue,
  type Replacer,
  stringify as losslessStringify,
  parse as losslessParse,
  isSafeNumber as lossIsSafeNumber,
} from 'lossless-json';
import CSVParser, {
  type LocalFile,
  type ParseLocalConfig,
  type UnparseConfig,
} from 'papaparse';
import { assertNonNullable } from '../error/AssertionUtils.js';

export const capitalize = (value: string): string =>
  value.length >= 1
    ? `${(value[0] as string).toUpperCase()}${value.substring(1, value.length)}`
    : value;

export const toSentenceCase = (value: string | undefined): string =>
  (value ?? '').trim().replace(/^(?:\w+)\b/u, (val) => capitalize(val));

export const TITLE_CASE_EXCEPTION_WORDS = [
  // We roughly follow AP style for simplicity
  // See https://en.wikipedia.org/wiki/Title_case
  'a',
  'an',
  'the',
  'but',
  'by',
  'nor',
  'and',
  'or',
  'so',
  'as',
  'yet',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'at',
  'out',
  'to',
  'up',
];

export const toTitleCase = (value: string | undefined): string =>
  (value ?? '')
    .trim()
    .replace(/\b(?:\w+)\b/gu, (val) => {
      // lowercase minor words (typically articles, short prepositions, and some conjunctions)
      if (TITLE_CASE_EXCEPTION_WORDS.includes(val.toLowerCase())) {
        return val.toLowerCase();
      }
      return capitalize(val);
    })
    // always capitalize first and last word
    .replace(/^(?:\w+)\b/u, (val) => capitalize(val))
    .replace(/\b(?:\w+)$/u, (val) => capitalize(val));

export const prettyCONSTName = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  // This handles our constant naming convention, e.g. SOME_VALUE, __PRIVATE_VALUE__, etc.
  if (value.trim().match(/^[A-Z_]+$/)) {
    return toTitleCase(value.trim().replace(/_+/gu, ' ').toLowerCase());
  }
  return (
    capitalize(value.trim())
      // NOTE: here we must use capturing group as we also need to capture the breakpoint/separator as chunks
      .split(/(?<chunk>[A-Z][a-z]+|[0-9]+)/)
      .map((chunk) =>
        chunk.toUpperCase() === chunk
          ? chunk
          : chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase(),
      )
      .filter(Boolean)
      .join(' ')
      .replace(/_+/gu, ' ')
      .replace(/\s+/gu, ' ')
  );
};

export const tryToFormatJSONString = (value: string, tabSize = 2): string => {
  try {
    return JSON.stringify(JSON.parse(value), undefined, tabSize);
  } catch {
    return value;
  }
};

export const tryToMinifyJSONString = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value.replace(/\n\s*/g, '');
  }
};

/**
 * NOTE: this splits a string value into an array of strings by using a
 * delimiter of a comma if the string is only one line. However, if the
 * string has multiple lines, the delimiter will not be applied. This is so
 * that for an example input of multiple lines like
 *       One, Comma in One
 *       Two
 *       Three
 * will still equal 3 elements (['One, Comma in One', 'Two', 'Three']) rather than 4
 */
export const parseCSVString = (value: string): string[] | undefined => {
  let parseData;
  if (value.includes('\n')) {
    parseData = value.trim().split(/\r?\n|\r|\n/g);
    return parseData;
  } else {
    const parseResult = CSVParser.parse<string[]>(value.trim(), {
      delimiter: ',',
    });
    parseData = parseResult.data.flat();
    if (parseResult.errors.length) {
      // if (
      //   parseResult.errors[0] &&
      //   parseResult.errors[0].code === 'UndetectableDelimiter' &&
      //   parseResult.errors[0].type === 'Delimiter' &&
      //   parseResult.data.length === 1
      // ) {
      //   // NOTE: this happens when the user only put one item in the value input
      //   // we can go the other way by ensure the input has a comma but this is arguably neater
      //   // as it tinkers with the parser
      // } else {
      //   // there were some parsing error, escape
      //   // NOTE: ideally, we could show a warning here
      // }
      return undefined;
    } else {
      return parseData;
    }
  }
};

export const parseCSVFile = (
  file: LocalFile,
  config: ParseLocalConfig<unknown[], LocalFile>,
): void => CSVParser.parse(file, config);

export const csvStringify = (
  value: unknown[],
  config?: UnparseConfig,
): string => CSVParser.unparse(value, config);

/**
 * One very common use case is that we get the JSON as response from the server than we will convert this to a string and persist
 * in the protocol. As such, we have to make sure this string is safe in PURE grammar format, i.e. it will escape single quotes
 * properly since PURE strings are wrapped in a pair of single quotes. The following pair of escape/unescape method does the simple job of
 * converting a JSON string to/from PURE grammar string
 *
 * NOTE: this is slightly different than escaping/unescaping JS string or normal JSON string, this is conversion is actually simplier since
 * the escaping is naturally handling by string conversion in Javascript, we just need to have special handling for the escaping of single-quotes
 * See https://stackoverflow.com/questions/3020094/how-should-i-escape-strings-in-json
 * See https://github.com/joliss/js-string-escape/blob/master/index.js
 */
export const fromGrammarString = (value: string): string =>
  value.replace(/\\'/gu, "'");

export const toGrammarString = (value: string): string =>
  value.replace(/'/gu, "\\'");

/**
 * These are the sets of methods that helps with lossless conversion of JSON to/from text.
 *
 * The implementation of `JSON.parse` and `JSON.stringify` in Javascript is not lossless, e.g. values like 1.0 (a double) is automatically converted to 1 (an integer).
 * This pairs of method will convert the JSON losslessly. One caveat is that numeric values are stored as LosslessNumber, a data type which stores the numeric value as a string.
 *
 * NOTE: One can perform regular operations with a LosslessNumber, and it will throw an error when this would result in losing information.
 * But use this with discretion since it it does not result in the same object as `JSON.parse`
 */
export { losslessParse as parseLosslessJSON };
export { lossIsSafeNumber as isLossSafeNumber };
export const stringifyLosslessJSON = (
  val: JavaScriptValue,
  replacer?: Replacer,
  space?: number | string,
): string => {
  const result = losslessStringify(val, replacer, space);
  assertNonNullable(result, `Can't stringify lossless JSON value`);
  return result;
};
export const tryToFormatLosslessJSONString = (
  value: string,
  tabSize = 2,
): string => {
  try {
    return stringifyLosslessJSON(losslessParse(value), undefined, tabSize);
  } catch {
    return value;
  }
};

export const tryToMinifyLosslessJSONString = (value: string): string => {
  try {
    return tryToFormatLosslessJSONString(value, 0);
  } catch {
    return value.replace(/\n\s*/g, '');
  }
};

export const indent = (value: string, indentText: string): string =>
  value
    .split('\n')
    .map((line) => `${indentText}${line}`)
    .join('\n');

export const quantify = (
  value: number,
  label: string,
  pluralForm?: string | undefined,
): string =>
  value <= 0
    ? `no ${pluralForm ?? `${label}s`}`
    : value > 1
      ? `${value} ${pluralForm ?? `${label}s`}`
      : `1 ${label}`;

export const quantifyList = (
  val: Array<unknown>,
  label: string,
  pluralForm?: string | undefined,
): string => quantify(val.length, label, pluralForm);
