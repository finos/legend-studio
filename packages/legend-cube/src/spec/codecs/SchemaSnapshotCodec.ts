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

import type { SnapshotColumnRest } from '../../nodes/sources/RelationalTableSource.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import {
  type CubeType,
  EnumType,
  isEnumType,
  type OpaqueType,
  type PrimitiveType,
  resolveCubeType,
} from '../../types/CubeType.js';
import {
  EMPTY_JSON_OBJECT,
  type JsonObject,
  type JsonValue,
  pickUnknownKeys,
} from '../../utils/Json.js';
import {
  fail,
  pathTo,
  readArray,
  readBoolean,
  readObject,
  readString,
} from '../SpecReader.js';

const COLUMN_KEYS = ['name', 'type', 'nullable'];
const TYPE_KEYS = ['path', 'params', 'values'];

/**
 * A type as saved: `{path, params?}`, or `{path, values}` for an enumeration.
 * Paths are canonical (precise types in full, base types bare).
 */
const encodeType = (type: CubeType, rest: JsonObject): JsonObject => {
  if (isEnumType(type)) {
    return { path: type.path, values: [...type.values], ...rest };
  }
  const { path, params } = type as PrimitiveType | OpaqueType;
  return params.length
    ? { path, params: [...params], ...rest }
    : { path, ...rest };
};

const decodeType = (value: unknown, path: string): CubeType => {
  const json = readObject(value, path);
  const typePath = readString(json, 'path', path);
  if (json.values !== undefined) {
    if (json.params !== undefined) {
      return fail(path, 'an enumeration has values, not parameters');
    }
    const at = pathTo(path, 'values');
    const values = readArray(json.values, at).map((item, index) =>
      typeof item === 'string' && item
        ? item
        : fail(pathTo(at, index), 'must be a non-empty string'),
    );
    if (!values.length) {
      return fail(at, 'must not be empty');
    }
    if (new Set(values).size !== values.length) {
      return fail(at, 'must not repeat a value');
    }
    return new EnumType(typePath, values);
  }
  const params =
    json.params === undefined
      ? []
      : readArray(json.params, pathTo(path, 'params')).map((item, index) =>
          typeof item === 'number'
            ? item
            : fail(pathTo(pathTo(path, 'params'), index), 'must be a number'),
        );
  // a path Cube doesn't know, or parameters that don't fit, give an opaque
  // type that is saved back as it was
  return resolveCubeType(typePath, params);
};

/** A resolved source's schema, as its saved snapshot: one `{name, type, nullable}` per column, in order */
export const encodeSchemaSnapshot = (
  schema: Schema,
  columnRest: ReadonlyMap<string, SnapshotColumnRest>,
): JsonValue[] =>
  schema.columns.map((column) => {
    const rest = columnRest.get(column.name);
    return {
      name: column.name,
      type: encodeType(column.type, rest?.type ?? EMPTY_JSON_OBJECT),
      nullable: column.nullable,
      ...(rest?.column ?? EMPTY_JSON_OBJECT),
    };
  });

export const decodeSchemaSnapshot = (
  value: unknown,
  path: string,
): {
  schema: Schema;
  columnRest: ReadonlyMap<string, SnapshotColumnRest>;
} => {
  const columnRest = new Map<string, SnapshotColumnRest>();
  const names = new Set<string>();
  const columns = readArray(value, path).map((item, index) => {
    const at = pathTo(path, index);
    const json = readObject(item, at);
    const name = readString(json, 'name', at);
    if (names.has(name)) {
      return fail(pathTo(at, 'name'), `repeats the column "${name}"`);
    }
    names.add(name);
    const typePath = pathTo(at, 'type');
    const column = new SchemaColumn(
      name,
      decodeType(json.type ?? fail(typePath, 'is required'), typePath),
      readBoolean(json, 'nullable', at),
    );
    const rest: SnapshotColumnRest = {
      column: pickUnknownKeys(json, COLUMN_KEYS),
      type: pickUnknownKeys(readObject(json.type, typePath), TYPE_KEYS),
    };
    if (Object.keys(rest.column).length || Object.keys(rest.type).length) {
      columnRest.set(name, rest);
    }
    return column;
  });
  return { schema: new Schema(columns), columnRest };
};
