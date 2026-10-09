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
  isJsonObject,
  type JsonObject,
  type JsonValue,
} from '../utils/Json.js';

/**
 * A saved spec that can't be read: malformed JSON, a missing or wrongly typed
 * required field, or a graph that breaks its rules. `path` says where, e.g.
 * `query.nodes[2].database` (empty for the document itself).
 */
export class CubeSpecDecodeError extends Error {
  readonly path: string;
  /** The problem, without the path */
  readonly detail: string;

  constructor(path: string, detail: string) {
    super(path ? `${path}: ${detail}` : detail);
    this.name = 'CubeSpecDecodeError';
    this.path = path;
    this.detail = detail;
  }
}

/**
 * Content this version of Cube can't read, e.g. a join type added since. The
 * codec keeps it as an Unknown node or an unsupported filter rule instead of
 * failing the document (PLAN §10.3, Settled in M1.6).
 */
export class UnreadableContent extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnreadableContent';
  }
}

/** The path of a key or an index under `path` */
export const pathTo = (path: string, key: string | number): string =>
  typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key;

export const fail = (path: string, message: string): never => {
  throw new CubeSpecDecodeError(path, message);
};

export const readObject = (value: unknown, path: string): JsonObject =>
  isJsonObject(value) ? value : fail(path, 'must be an object');

export const readArray = (
  value: unknown,
  path: string,
): readonly JsonValue[] =>
  Array.isArray(value) ? (value as JsonValue[]) : fail(path, 'must be a list');

/** A string the object must have; non-empty unless `allowEmpty` */
export const readString = (
  object: JsonObject,
  key: string,
  path: string,
  allowEmpty = false,
): string => {
  const value = object[key];
  const at = pathTo(path, key);
  if (value === undefined) {
    return fail(at, 'is required');
  }
  if (typeof value !== 'string') {
    return fail(at, 'must be a string');
  }
  return value || allowEmpty ? value : fail(at, 'must not be empty');
};

/** A string the object may leave out; non-empty unless `allowEmpty` */
export const readOptionalString = (
  object: JsonObject,
  key: string,
  path: string,
  allowEmpty = false,
): string | undefined =>
  object[key] === undefined
    ? undefined
    : readString(object, key, path, allowEmpty);

export const readBoolean = (
  object: JsonObject,
  key: string,
  path: string,
): boolean => {
  const value = object[key];
  const at = pathTo(path, key);
  if (value === undefined) {
    return fail(at, 'is required');
  }
  return typeof value === 'boolean' ? value : fail(at, 'must be true or false');
};

/**
 * A number setting the object may leave out, e.g. a size the user cleared.
 * Any finite number is read, and validation reports one out of range; `-0`
 * reads as 0. A number past the double range reads as Infinity in
 * `JSON.parse`, and is refused like any other non-number.
 */
export const readOptionalFiniteNumber = (
  object: JsonObject,
  key: string,
  path: string,
): number | undefined => {
  const value = object[key];
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' && Number.isFinite(value)
    ? value === 0
      ? 0
      : value
    : fail(pathTo(path, key), 'must be a finite number');
};

/** A list of objects the object must have, e.g. a rename's mappings */
export const readItems = (
  object: JsonObject,
  key: string,
  path: string,
): JsonObject[] => {
  const at = pathTo(path, key);
  if (object[key] === undefined) {
    return fail(at, 'is required');
  }
  return readArray(object[key], at).map((item, index) =>
    readObject(item, pathTo(at, index)),
  );
};

/** Whether the object has no key but these */
export const hasOnlyKeys = (
  json: JsonObject,
  keys: readonly string[],
): boolean => Object.keys(json).every((key) => keys.includes(key));

export const readStringList = (
  object: JsonObject,
  key: string,
  path: string,
): string[] => {
  const at = pathTo(path, key);
  if (object[key] === undefined) {
    return fail(at, 'is required');
  }
  return readArray(object[key], at).map((item, index) =>
    typeof item === 'string'
      ? item
      : fail(pathTo(at, index), 'must be a string'),
  );
};
