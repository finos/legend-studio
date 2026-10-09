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
import { Drop } from '../../nodes/transforms/Drop.js';
import { storeAccessor } from '../CubeIR.js';
import { emitDrop } from '../emitters/DropEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';

/** ORDERS → drop101, with drop101 selected */
const ordersDropped = (size: number | undefined): Query =>
  new Query(
    [
      resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
      new Drop('drop101', size),
    ],
    [new Connection('relational101', 'drop101', 'tds')],
    'drop101',
  );

describe(unitTest('Drop emission'), () => {
  test('Drops the first rows with drop(), its size an integer literal', () => {
    const emitter = new QueryEmitter(ordersDropped(5));
    const relation = emitter.emitRelation('drop101');
    expect(printIR(relation)).toBe(`${ORDERS}->drop(5)`);
    expect(listOrigins(relation)).toEqual([
      'drop@drop101:drop',
      `${ORDERS}@relational101:accessor`,
      '5@drop101:drop',
    ]);
  });

  test('Is followed by the capture limit when the Drop is the node that runs', () => {
    const lambda = new QueryEmitter(ordersDropped(5)).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    });
    expect(printIR(lambda)).toBe(
      `{| ${ORDERS}->drop(5)->limit(1001)->from(${RUNTIME})}`,
    );
    expect(listOrigins(lambda)).toEqual([
      'from@drop101:from',
      'limit@drop101:limit',
      'drop@drop101:drop',
      `${ORDERS}@relational101:accessor`,
      '5@drop101:drop',
      '1001@drop101:limit',
    ]);
  });

  test('Writes the size as plain digits, never in exponent form', () => {
    const literalOf = (size: number): unknown => {
      const relation = emitDrop(new Drop('drop101', size), [
        storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']),
      ]);
      return relation.k === 'func' ? relation.params[1] : undefined;
    };
    // a size read from `1e3` in a saved spec is the number 1000
    expect(literalOf(1e3)).toEqual({
      k: 'literal',
      value: { kind: 'integer', value: '1000' },
      origin: { nodeId: 'drop101', role: 'drop' },
    });
    expect(literalOf(Number.MAX_SAFE_INTEGER)).toMatchObject({
      value: { kind: 'integer', value: '9007199254740991' },
    });
  });

  test.each([
    ['a cleared size', undefined],
    ['size 0', 0],
    ['a fraction', 1.5],
  ])("Refuses to emit %s, which validation doesn't let through", (_, size) => {
    expect(() =>
      emitDrop(new Drop('drop101', size), [
        storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']),
      ]),
    ).toThrow(`Can't emit drop "drop101"`);
    expect(new QueryEmitter(ordersDropped(size)).canEmit('drop101')).toBe(
      false,
    );
  });

  test('Refuses to emit without an input', () => {
    expect(() => emitDrop(new Drop('drop101', 5), [])).toThrow(
      `Can't emit drop "drop101"`,
    );
  });
});
