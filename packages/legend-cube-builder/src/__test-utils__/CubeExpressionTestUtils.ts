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
  buildSchemasAndValidity,
  Extend,
  getExtendSignature,
  type JsonObject,
  PrimitiveType,
  type Query,
} from '@finos/legend-cube';

// Extend columns for tests (PLAN §11.7), written as the engine's JSON, as a
// column stores it: number literals as their digits

/** `x | <body>` and the pieces of a body */
export const TEST__expression = {
  lambda: (body: JsonObject): JsonObject => ({
    _type: 'lambda',
    parameters: [{ _type: 'var', name: 'x' }],
    body: [body],
  }),
  /** `$x.<name>` */
  column: (name: string): JsonObject => ({
    _type: 'property',
    property: name,
    parameters: [{ _type: 'var', name: 'x' }],
  }),
  call: (name: string, ...parameters: JsonObject[]): JsonObject => ({
    _type: 'func',
    function: name,
    parameters,
  }),
  /** The two operands of `+`, `*`, … */
  pair: (first: JsonObject, second: JsonObject): JsonObject => ({
    _type: 'collection',
    multiplicity: { lowerBound: 2, upperBound: 2 },
    values: [first, second],
  }),
  integer: (value: number): JsonObject => ({
    _type: 'integer',
    value: String(value),
  }),
};

/** A new column: its name, its lambda, and the type the engine gives it */
export type TEST__ExtendColumn = readonly [string, JsonObject, string];

/**
 * An Extend of these columns, typed as given for the input Cube infers for
 * `input`'s selected node, so it is valid without the engine; the engine
 * tests check the types are the engine's. With an invalid input, untyped.
 */
export const TEST__typedExtend = (
  id: string,
  input: Query,
  columns: readonly TEST__ExtendColumn[],
): Extend => {
  const schema = buildSchemasAndValidity(input).schemas.get(
    input.selected ?? '',
  );
  const extendColumns = columns.map(([name, lambda]) => ({
    name,
    code: name,
    lambda,
  }));
  // an invalid input, e.g. a table not resolved yet: nothing to type it for
  if (!schema) {
    return new Extend(id, extendColumns);
  }
  return new Extend(id, extendColumns, {
    kind: 'typed',
    signature: getExtendSignature(schema, extendColumns),
    types: columns.map(([, , type]) => PrimitiveType.get(type)),
  });
};

/** `a: x | $x.ORDER_ID + 1` and `b: x | $x.a * 2`, the second using the first, both Integer */
export const TEST__ORDER_ID_EXTEND_COLUMNS: readonly TEST__ExtendColumn[] = [
  [
    'a',
    TEST__expression.lambda(
      TEST__expression.call(
        'plus',
        TEST__expression.pair(
          TEST__expression.column('ORDER_ID'),
          TEST__expression.integer(1),
        ),
      ),
    ),
    'Integer',
  ],
  [
    'b',
    TEST__expression.lambda(
      TEST__expression.call(
        'times',
        TEST__expression.pair(
          TEST__expression.column('a'),
          TEST__expression.integer(2),
        ),
      ),
    ),
    'Integer',
  ],
];
