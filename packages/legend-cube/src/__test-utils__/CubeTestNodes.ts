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

import { BinaryNode, type QueryNode, UnaryNode } from '../graph/QueryNode.js';
import { ensureSchemas, validate } from '../inference/ValidationUtils.js';
import {
  type DataSpaceCoordinates,
  DataSpaceSource,
} from '../nodes/sources/DataSpaceSource.js';
import { RelationalTableSource } from '../nodes/sources/RelationalTableSource.js';
import { Schema, SchemaColumn } from '../schema/Schema.js';
import type { NodeSpecCodec } from '../spec/NodeSpecCodec.js';
import { EnumType, PrimitiveType } from '../types/CubeType.js';

/** A column of a primitive type, e.g. `column('ORDER_ID', 'Int')` or `column('NAME', 'Varchar', true, [40])` */
export const column = (
  name: string,
  path = 'Integer',
  nullable = false,
  params: number[] = [],
): SchemaColumn =>
  new SchemaColumn(name, PrimitiveType.get(path, params), nullable);

/** A column of an enumeration, e.g. `enumColumn('region', 'trading::Region', ['EMEA', 'APAC'])` */
export const enumColumn = (
  name: string,
  path: string,
  values: string[],
  nullable = false,
): SchemaColumn => new SchemaColumn(name, new EnumType(path, values), nullable);

export const TEST_DATABASE = 'test::Northwind';

/** A relational source resolved to a schema with the given columns */
export const resolvedTable = (
  id: string,
  table: string,
  columns: SchemaColumn[],
  database = TEST_DATABASE,
): RelationalTableSource =>
  new RelationalTableSource(
    id,
    { database, schema: 'NORTHWIND', table },
    { kind: 'resolved', schema: new Schema(columns) },
  );

const property = (name: string): Record<string, unknown> => ({
  _type: 'property',
  property: name,
  parameters: [{ _type: 'var', name: 'x' }],
});

const columnLambda = (name: string): Record<string, unknown> => ({
  _type: 'lambda',
  body: [property(name)],
  parameters: [{ _type: 'var', name: 'x' }],
});

/** `trading::Trade.all()->filter(x|$x.quantity > 100)`, as the query builder writes it */
const FILTERED_TRADES = {
  _type: 'func',
  function: 'filter',
  parameters: [
    {
      _type: 'func',
      function: 'getAll',
      parameters: [
        { _type: 'packageableElementPtr', fullPath: 'trading::Trade' },
      ],
    },
    {
      _type: 'lambda',
      body: [
        {
          _type: 'func',
          function: 'greaterThan',
          parameters: [property('quantity'), { _type: 'integer', value: 100 }],
        },
      ],
      parameters: [{ _type: 'var', name: 'x' }],
    },
  ],
};

/**
 * A data space source's coordinates, as the host's editor writes them (PLAN
 * §11.25): the query builder's TDS query of trades and its relation,
 * `…->project(~[id: x|$x.id, quantity: x|$x.quantity])`
 */
export const TRADES_DATA_SPACE: DataSpaceCoordinates = {
  dataSpace: 'trading::TradesDataSpace',
  executionContext: 'production',
  entity: 'trading::Trade',
  query: {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          FILTERED_TRADES,
          {
            _type: 'collection',
            multiplicity: { lowerBound: 2, upperBound: 2 },
            values: [columnLambda('id'), columnLambda('quantity')],
          },
          {
            _type: 'collection',
            multiplicity: { lowerBound: 2, upperBound: 2 },
            values: [
              { _type: 'string', value: 'id' },
              { _type: 'string', value: 'quantity' },
            ],
          },
        ],
      },
    ],
    parameters: [],
  },
  relation: {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          FILTERED_TRADES,
          {
            _type: 'classInstance',
            type: 'colSpecArray',
            value: {
              colSpecs: [
                { name: 'id', function1: columnLambda('id') },
                { name: 'quantity', function1: columnLambda('quantity') },
              ],
            },
          },
        ],
      },
    ],
    parameters: [],
  },
} as unknown as DataSpaceCoordinates;

/** A data space source on trades, resolved to a schema with the given columns */
export const resolvedDataSpace = (
  id: string,
  columns: SchemaColumn[],
  coordinates: DataSpaceCoordinates = TRADES_DATA_SPACE,
): DataSpaceSource =>
  new DataSpaceSource(id, coordinates, {
    kind: 'resolved',
    schema: new Schema(columns),
  });

/** A test-only unary transform: passes its input schema through, valid unless given an error */
export class TestUnaryNode extends UnaryNode {
  static readonly TYPE = 'testUnary';

  readonly error: string | undefined;

  constructor(id: string, error?: string) {
    super(id);
    this.error = error;
  }

  get type(): string {
    return TestUnaryNode.TYPE;
  }

  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    return validate(this.error === undefined, this.error ?? '', errors);
  }

  describe(): string {
    return `Test unary "${this.id}"`;
  }
}

/**
 * A test-only binary transform: outputs its left input's columns, then the
 * columns of its right input that the left one doesn't have.
 */
export class TestBinaryNode extends BinaryNode {
  static readonly TYPE = 'testBinary';

  get type(): string {
    return TestBinaryNode.TYPE;
  }

  validate(inputSchemas: readonly Schema[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    return true;
  }

  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    const [left, right] = ensureSchemas(inputSchemas, this.ports);
    return left && right
      ? new Schema([
          ...left.columns,
          ...right.columns.filter((c) => !left.lookup(c.name)),
        ])
      : undefined;
  }

  describe(): string {
    return `Test binary "${this.id}"`;
  }
}

/** A saved-spec codec for a test node, which has no fields of its own */
export const testSpecCodec = <N extends QueryNode>(
  create: (id: string) => N,
): NodeSpecCodec<N> => ({
  keys: [],
  encode: () => ({}),
  decode: (id) => create(id),
});
