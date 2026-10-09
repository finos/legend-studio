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
import { Limit } from '../../nodes/transforms/Limit.js';
import { storeAccessor } from '../CubeIR.js';
import { emitLimit } from '../emitters/LimitEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';

/** ORDERS → limit101, with limit101 selected */
const ordersLimited = (size: number | undefined): Query =>
  new Query(
    [
      resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
      new Limit('limit101', size),
    ],
    [new Connection('relational101', 'limit101', 'tds')],
    'limit101',
  );

describe(unitTest('Limit emission'), () => {
  test('Takes the first rows with limit(), its size an integer literal', () => {
    const emitter = new QueryEmitter(ordersLimited(5));
    const relation = emitter.emitRelation('limit101');
    expect(printIR(relation)).toBe(`${ORDERS}->limit(5)`);
    expect(listOrigins(relation)).toEqual([
      'limit@limit101:take',
      `${ORDERS}@relational101:accessor`,
      '5@limit101:take',
    ]);
  });

  test('Is told apart from the capture limit when the Limit is the node that runs', () => {
    const lambda = new QueryEmitter(ordersLimited(5)).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    });
    expect(printIR(lambda)).toBe(
      `{| ${ORDERS}->limit(5)->limit(1001)->from(${RUNTIME})}`,
    );
    expect(listOrigins(lambda)).toEqual([
      'from@limit101:from',
      'limit@limit101:limit',
      'limit@limit101:take',
      `${ORDERS}@relational101:accessor`,
      '5@limit101:take',
      '1001@limit101:limit',
    ]);
  });

  test('Writes the size as plain digits, never in exponent form', () => {
    const literalOf = (size: number): unknown => {
      const relation = emitLimit(new Limit('limit101', size), [
        storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']),
      ]);
      return relation.k === 'func' ? relation.params[1] : undefined;
    };
    // a size read from `1e3` in a saved spec is the number 1000
    expect(literalOf(1e3)).toEqual({
      k: 'literal',
      value: { kind: 'integer', value: '1000' },
      origin: { nodeId: 'limit101', role: 'take' },
    });
    expect(literalOf(Number.MAX_SAFE_INTEGER)).toMatchObject({
      value: { kind: 'integer', value: '9007199254740991' },
    });
  });

  test.each([
    ['a cleared size', undefined],
    ['size 0', 0],
    ['a fraction', 1.5],
    ['a size a double holds only roughly', 1e21],
    ['a size past safe integers', 2 ** 53],
  ])("Refuses to emit %s, which validation doesn't let through", (_, size) => {
    expect(() =>
      emitLimit(new Limit('limit101', size), [
        storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']),
      ]),
    ).toThrow(`Can't emit limit "limit101"`);
    expect(new QueryEmitter(ordersLimited(size)).canEmit('limit101')).toBe(
      false,
    );
  });

  test('Refuses to emit without an input', () => {
    expect(() => emitLimit(new Limit('limit101', 5), [])).toThrow(
      `Can't emit limit "limit101"`,
    );
  });
});
