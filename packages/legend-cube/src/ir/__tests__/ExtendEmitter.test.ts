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

import { describe, expect, test } from '@jest/globals';
import { listOrigins } from '../../__test-utils__/CubeIRTestUtils.js';
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import {
  createNodeRegistry,
  type NodeRegistry,
} from '../../nodes/NodeRegistry.js';
import {
  Extend,
  type ExtendColumn,
  getExtendSignature,
} from '../../nodes/transforms/Extend.js';
import { Schema } from '../../schema/Schema.js';
import { PrimitiveType } from '../../types/CubeType.js';
import type { JsonObject } from '../../utils/Json.js';
import type { IR } from '../CubeIR.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const P = 'meta::pure::precisePrimitives::';
const T = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const COLUMNS = [
  column('ORDER_ID', `${P}SmallInt`),
  column('QTY', `${P}Int`, true),
];

const registry = (): NodeRegistry => createNodeRegistry();

/** `x | $x.<of> * 2` */
const doubled = (of: string): JsonObject => ({
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [
    {
      _type: 'func',
      function: 'times',
      parameters: [
        {
          _type: 'collection',
          values: [
            {
              _type: 'property',
              property: of,
              parameters: [{ _type: 'var', name: 'x' }],
            },
            { _type: 'integer', value: '2' },
          ],
        },
      ],
    },
  ],
});

const emitIR = (columns: ExtendColumn[]): IR => {
  const extend = new Extend('extend101', columns);
  const typedExtend = extend.withTyping({
    kind: 'typed',
    signature: getExtendSignature(new Schema(COLUMNS), columns),
    types: columns.map(() => PrimitiveType.get('Integer')),
  });
  return new QueryEmitter(
    new Query(
      [resolvedTable('relational101', 'ORDERS', COLUMNS), typedExtend],
      [new Connection('relational101', 'extend101', 'tds')],
      'extend101',
    ),
    registry(),
  ).emitRelation('extend101');
};

describe(unitTest('Extend emission'), () => {
  test('Writes one extend per column, in order, so a column can use the one before it', () => {
    const columns = [
      { name: 'a', code: 'x | $x.QTY * 2', lambda: doubled('QTY') },
      { name: 'b', code: 'x | $x.a * 2', lambda: doubled('a') },
    ];
    expect(printIR(emitIR(columns))).toBe(
      `${T}->extend(~[a: <lambda ${JSON.stringify(doubled('QTY'))}>])` +
        `->extend(~[b: <lambda ${JSON.stringify(doubled('a'))}>])`,
    );
  });

  test('Marks each extend and each expression with the node, so an engine error lands on it', () => {
    expect(
      listOrigins(
        emitIR([{ name: 'a', code: 'x | $x.QTY * 2', lambda: doubled('QTY') }]),
      ),
    ).toEqual([
      'extend@extend101:extend',
      `${T}@relational101:accessor`,
      'lambda@extend101:expression',
    ]);
  });
});
