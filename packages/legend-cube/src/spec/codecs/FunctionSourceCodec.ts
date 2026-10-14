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

import { UNRESOLVED } from '../../graph/QueryNode.js';
import {
  type FunctionParameter,
  FunctionSource,
} from '../../nodes/sources/FunctionSource.js';
import type { JsonObject, JsonValue } from '../../utils/Json.js';
import type { EnteredValue, LiteralKind } from '../../values/LiteralValue.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  fail,
  hasOnlyKeys,
  pathTo,
  readArray,
  readBoolean,
  readObject,
  readString,
} from '../SpecReader.js';
import {
  decodeSavedType,
  decodeSchemaSnapshot,
  encodeSavedType,
  encodeSchemaSnapshot,
} from './SchemaSnapshotCodec.js';

const PARAMETER_KEYS = ['name', 'type', 'optional'];

const LITERAL_KINDS: readonly LiteralKind[] = [
  'string',
  'boolean',
  'integer',
  'float',
  'decimal',
  'strictDate',
  'dateTime',
  'enum',
];

/** A value as saved: `{kind, value}`, `{kind: 'invalid', text}`, or `null` when none is entered */
const encodeValue = (value: EnteredValue): JsonValue =>
  value === undefined
    ? null
    : value.kind === 'invalid'
      ? { kind: 'invalid', text: value.text }
      : { kind: value.kind, value: value.value };

const decodeValue = (json: unknown, path: string): EnteredValue => {
  if (json === null) {
    return undefined;
  }
  const value = readObject(json, path);
  const { kind } = value;
  if (kind === 'invalid') {
    return hasOnlyKeys(value, ['kind', 'text']) &&
      typeof value.text === 'string'
      ? { kind: 'invalid', text: value.text }
      : fail(path, 'must be {kind: "invalid", text}');
  }
  if (
    !hasOnlyKeys(value, ['kind', 'value']) ||
    !LITERAL_KINDS.includes(kind as LiteralKind)
  ) {
    return fail(path, 'must be a value {kind, value}, or null');
  }
  if (kind === 'boolean') {
    return typeof value.value === 'boolean'
      ? { kind, value: value.value }
      : fail(pathTo(path, 'value'), 'must be a boolean');
  }
  // values are checked by validation, not here
  return typeof value.value === 'string'
    ? ({ kind, value: value.value } as EnteredValue)
    : fail(pathTo(path, 'value'), 'must be a string');
};

const encodeParameter = (parameter: FunctionParameter): JsonObject => ({
  name: parameter.name,
  type: encodeSavedType(parameter.type),
  optional: parameter.optional,
});

const decodeParameter = (json: unknown, path: string): FunctionParameter => {
  const parameter = readObject(json, path);
  if (!hasOnlyKeys(parameter, PARAMETER_KEYS)) {
    return fail(path, `must have only ${PARAMETER_KEYS.join(', ')}`);
  }
  return {
    name: readString(parameter, 'name', path),
    type: decodeSavedType(parameter.type, pathTo(path, 'type')),
    optional: readBoolean(parameter, 'optional', path),
  };
};

/**
 * A function (PLAN §6.5): the path it is called by, its full name, its
 * parameters as declared and a value for each, and once resolved its schema
 * snapshot, so inference works offline. Unresolved and failed sources have
 * no snapshot and load unresolved: the host resolves them again.
 */
export const FUNCTION_SOURCE_CODEC: NodeSpecCodec<FunctionSource> = {
  keys: ['function', 'signature', 'parameters', 'values', 'schemaSnapshot'],
  encode: (node) => ({
    function: node.function,
    signature: node.signature,
    parameters: node.parameters.map(encodeParameter),
    values: node.values.map(encodeValue),
    ...(node.resolution.kind === 'resolved'
      ? {
          schemaSnapshot: encodeSchemaSnapshot(
            node.resolution.schema,
            node.columnRest,
          ),
        }
      : {}),
  }),
  decode: (id, json, path, rest) => {
    const parametersPath = pathTo(path, 'parameters');
    const parameters = readArray(json.parameters, parametersPath).map(
      (item, index) => decodeParameter(item, pathTo(parametersPath, index)),
    );
    const valuesPath = pathTo(path, 'values');
    const values = readArray(json.values, valuesPath).map((item, index) =>
      decodeValue(item, pathTo(valuesPath, index)),
    );
    if (values.length !== parameters.length) {
      return fail(valuesPath, 'must have a value, or null, per parameter');
    }
    const coordinates = {
      function: readString(json, 'function', path),
      signature: readString(json, 'signature', path),
      parameters,
    };
    if (json.schemaSnapshot === undefined) {
      return new FunctionSource(id, coordinates, values, UNRESOLVED, rest);
    }
    const { schema, columnRest } = decodeSchemaSnapshot(
      json.schemaSnapshot,
      pathTo(path, 'schemaSnapshot'),
    );
    return new FunctionSource(
      id,
      coordinates,
      values,
      { kind: 'resolved', schema },
      rest,
      columnRest,
    );
  },
};
