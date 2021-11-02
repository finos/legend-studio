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
  stringify as losslessStringify,
  parse as losslessParse,
} from 'lossless-json';

export const capitalize = (value: string): string =>
  value.length >= 1
    ? `${(value[0] as string).toUpperCase()}${value.substring(1, value.length)}`
    : value;

export const toSentenceCase = (value: string | undefined): string =>
  (value ?? '').trim().replace(/^(?:\w+)\b/u, (val) => capitalize(val));

export const TITLE_CASE_EXCEPTION_WORDS = [
  // We follow AP style for simplicity
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

export const prettyCONSTName = (value: string | undefined): string =>
  toSentenceCase((value ?? '').toLowerCase())
    .replace(/_(?:\w)/gu, (val) => val.toUpperCase())
    .replace(/_/gu, ' ')
    .trim();

export const isCamelCase = (value: string | undefined): boolean =>
  value !== undefined &&
  value !== '' &&
  Boolean(value.match(/^(?:[a-z])*(?:[A-Z][a-z]+)+$/u));

export const prettyCamelCase = (value: string | undefined): string =>
  toSentenceCase(value)
    .replace(/(?:[A-Z])/gu, (val) => ` ${val}`)
    .trim();

export const tryToFormatJSONString = (value: string, tabSize = 2): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, tabSize);
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
export {
  stringify as losslessStringify,
  parse as losslessParse,
} from 'lossless-json';
export const tryToFormatLosslessJSONString = (
  value: string,
  tabSize = 2,
): string => {
  try {
    return losslessStringify(losslessParse(value), undefined, tabSize);
  } catch {
    return value;
  }
};

export const tryToMinifyLosslessJSONString = (value: string): string => {
  try {
    return losslessStringify(losslessParse(value));
  } catch {
    return value.replace(/\n\s*/g, '');
  }
};
