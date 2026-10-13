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

import { hasLikeWildcard } from '../../filter/FilterOperator.js';
import { isJsonObject, type JsonObject } from '../../utils/Json.js';

// The rules for `startsWith`, `endsWith` and `contains` in the lambdas Cube
// is given (a Filter by Expression's condition, an Extend's columns), which
// the engine writes as a `LIKE` (PLAN §11.11, §11.14)

/** The functions the engine writes as a `LIKE`, whose pattern it escapes with `\` but doesn't escape `\` in */
const LIKE_FUNCTIONS = new Set(['startsWith', 'endsWith', 'contains']);

/** A string literal's text, from the engine's JSON for it */
const stringLiteralText = (json: JsonObject): string | undefined => {
  if (json._type !== 'string') {
    return undefined;
  }
  const { value, values } = json;
  return typeof value === 'string'
    ? value
    : Array.isArray(values)
      ? values.filter((item) => typeof item === 'string').join('')
      : undefined;
};

/**
 * Whether a call is a `LIKE` one: `startsWith`, `endsWith`, or `contains` on
 * a text; `contains` on a list (`['FR', 'DE']->contains($x.C)`) is an `IN`,
 * which the engine writes right (PLAN §11.14)
 */
const isLikeCall = (name: string, parameters: readonly unknown[]): boolean => {
  if (!LIKE_FUNCTIONS.has(name)) {
    return false;
  }
  const [receiver] = parameters;
  return !(
    name === 'contains' &&
    isJsonObject(receiver) &&
    receiver._type === 'collection'
  );
};

/**
 * The first `startsWith`, `endsWith` or `contains` on a text in a lambda's
 * JSON whose pattern (the parameter after the text it looks in) matches;
 * `undefined` when there is none
 */
const findLikeFunction = (
  json: unknown,
  matches: (pattern: unknown) => boolean,
): string | undefined => {
  if (Array.isArray(json)) {
    return json.reduce<string | undefined>(
      (found, item) => found ?? findLikeFunction(item, matches),
      undefined,
    );
  }
  if (!isJsonObject(json)) {
    return undefined;
  }
  const { function: name, parameters } = json;
  if (
    json._type === 'func' &&
    typeof name === 'string' &&
    Array.isArray(parameters) &&
    isLikeCall(name, parameters) &&
    parameters.slice(1).some(matches)
  ) {
    return name;
  }
  return Object.values(json).reduce<string | undefined>(
    (found, value) => found ?? findLikeFunction(value, matches),
    undefined,
  );
};

/** A pattern's text when it is a string literal, else `undefined` */
const literalText = (pattern: unknown): string | undefined =>
  isJsonObject(pattern) ? stringLiteralText(pattern) : undefined;

/**
 * The first `startsWith`, `endsWith` or `contains` in a lambda's JSON given a
 * string literal holding a backslash, which the engine doesn't escape in its
 * `LIKE` pattern, so the rows would be wrong (PLAN §11.11, §8.2); `undefined`
 * when there is none. Only literals are read: a pattern that isn't one is
 * refused on its own (`findLikeFunctionWithNonLiteralPattern`).
 */
export const findLikeFunctionWithBackslash = (
  json: unknown,
): string | undefined =>
  findLikeFunction(json, (pattern) =>
    Boolean(literalText(pattern)?.includes('\\')),
  );

/**
 * The first `startsWith`, `endsWith` or `contains` in a lambda's JSON given a
 * string literal holding `%` or `_`, which a database with no default `LIKE`
 * escape character matches as wildcards (`hasNoLikeEscape`, PLAN §11.11);
 * `undefined` when there is none. Only literals are read.
 */
export const findLikeFunctionWithWildcard = (
  json: unknown,
): string | undefined =>
  findLikeFunction(json, (pattern) => {
    const text = literalText(pattern);
    return text !== undefined && hasLikeWildcard(text);
  });

/**
 * The first `startsWith`, `endsWith` or `contains` in a lambda's JSON given a
 * pattern that isn't a string literal, such as a column or texts joined with
 * `+`: the engine writes the pattern's own SQL as the text to match on all but
 * Snowflake, or fails, so the rows would be wrong (PLAN §11.14); `undefined`
 * when there is none
 */
export const findLikeFunctionWithNonLiteralPattern = (
  json: unknown,
): string | undefined =>
  findLikeFunction(json, (pattern) => literalText(pattern) === undefined);
