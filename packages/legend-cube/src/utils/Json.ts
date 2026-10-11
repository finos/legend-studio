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

/** A JSON value, as `JSON.parse` returns it */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | JsonObject;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export const EMPTY_JSON_OBJECT: JsonObject = Object.freeze({});

/** Whether the value is a JSON object: not `null` and not an array */
export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

/**
 * A deep, frozen copy of a JSON value, so content kept as is (unknown keys,
 * unreadable rules) can't change after it is read.
 */
export const copyJson = <T extends JsonValue>(value: T): T =>
  deepFreeze(JSON.parse(JSON.stringify(value)) as T);

/** A frozen copy of the object's entries whose keys are not `known`, in their order */
export const pickUnknownKeys = (
  object: JsonObject,
  known: readonly string[],
): JsonObject => {
  // `fromEntries` defines own keys, so a key named `__proto__` is kept too
  const rest: JsonObject = Object.fromEntries(
    Object.entries(object).filter(([key]) => !known.includes(key)),
  );
  return Object.keys(rest).length ? copyJson(rest) : EMPTY_JSON_OBJECT;
};

/**
 * A JSON value's text with every object's keys sorted, so two equal values
 * give the same text whatever the order their keys were written in
 */
export const stableJsonText = (value: JsonValue): string =>
  JSON.stringify(value, (_, inner: unknown) =>
    isJsonObject(inner)
      ? Object.fromEntries(
          Object.keys(inner)
            .sort()
            .map((key) => [key, inner[key]]),
        )
      : inner,
  );

/**
 * A short, stable digest of some text, 13 or 14 hex digits: cyrb53, two
 * 32-bit hashes combined into 53 bits. For telling texts apart as a cache key
 * would, never for security.
 */
export const hashText = (text: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};
