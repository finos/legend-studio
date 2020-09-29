/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const capitalizeFirstChar = (value: string | undefined): string => !value ? '' : `${value[0].toUpperCase()}${value.substring(1, value.length)}`;
export const prettyCONSTName = (value: string | undefined): string => !value ? '' : capitalizeFirstChar(value.toLowerCase()).replace(/_(?:\w)/ug, val => val.toUpperCase()).replace(/_/ug, ' ');

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
export const fromGrammarString = (value: string): string => value.replace(/\\'/ug, '\'');
export const toGrammarString = (value: string): string => value.replace(/'/ug, '\\\'');
