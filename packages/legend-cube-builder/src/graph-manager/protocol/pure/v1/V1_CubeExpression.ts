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
} from '@finos/legend-cube';
import type { CubeParsedExpression } from '../../../CubeEngine.js';

// An Extend column's expression (PLAN §11.7) as the engine parses it, read
// losslessly: number literals keep their digits as strings, as Cube keeps
// literal values (PLAN §4.9), and the serializer writes them back as numbers.

const NUMBER_LITERAL_TYPES: readonly unknown[] = [
  'integer',
  'float',
  'decimal',
];

const isLosslessNumber = (
  value: unknown,
): value is { isLosslessNumber: true; value: string } =>
  typeof value === 'object' &&
  value !== null &&
  (value as { isLosslessNumber?: unknown }).isLosslessNumber === true;

/** The JSON with every lossless number a JS number, but a number literal's value its digit string */
const read = (json: unknown, inLiteral: boolean): JsonValue => {
  if (isLosslessNumber(json)) {
    return inLiteral ? json.value : Number(json.value);
  }
  if (Array.isArray(json)) {
    return json.map((item) => read(item, false));
  }
  if (typeof json === 'object' && json !== null) {
    const literal = NUMBER_LITERAL_TYPES.includes(
      (json as { _type?: unknown })._type,
    );
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [
        key,
        read(value, literal && key === 'value'),
      ]),
    );
  }
  return json as JsonValue;
};

/** The JSON without any source information, at every depth */
const withoutSourceInformation = (json: JsonValue): JsonValue =>
  Array.isArray(json)
    ? json.map(withoutSourceInformation)
    : isJsonObject(json)
      ? Object.fromEntries(
          Object.entries(json)
            .filter(([key]) => key !== 'sourceInformation')
            .map(([key, value]) => [key, withoutSourceInformation(value)]),
        )
      : json;

/**
 * An expression as the engine's lossless JSON gives it: located, as parsed,
 * and as a column stores it, without source information. Anything but an
 * object is the engine's mistake.
 */
export const V1_readCubeExpression = (json: unknown): CubeParsedExpression => {
  const located = read(json, false);
  if (!isJsonObject(located)) {
    throw new Error(`The engine parsed the expression as no object`);
  }
  return {
    located,
    lambda: withoutSourceInformation(located) as JsonObject,
  };
};
