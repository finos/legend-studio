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
import { Slice } from '../../nodes/transforms/Slice.js';
import { storeAccessor } from '../CubeIR.js';
import { emitSlice } from '../emitters/SliceEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const ACCESSOR = storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']);

/** ORDERS → slice101, with slice101 selected */
const ordersSliced = (
  start: number | undefined,
  stop: number | undefined,
): Query =>
  new Query(
    [
      resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
      new Slice('slice101', start, stop),
    ],
    [new Connection('relational101', 'slice101', 'tds')],
    'slice101',
  );

describe(unitTest('Slice emission'), () => {
  test('Takes the rows of the range with slice(), its bounds as they are', () => {
    const relation = new QueryEmitter(ordersSliced(10, 20)).emitRelation(
      'slice101',
    );
    // the engine's slice is [start, stop) from 0, as the node's range: no shift
    expect(printIR(relation)).toBe(`${ORDERS}->slice(10, 20)`);
    expect(listOrigins(relation)).toEqual([
      'slice@slice101:slice',
      `${ORDERS}@relational101:accessor`,
      '10@slice101:slice',
      '20@slice101:slice',
    ]);
  });

  test('Is followed by the capture limit when the Slice is the node that runs', () => {
    const lambda = new QueryEmitter(ordersSliced(0, 5)).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    });
    expect(printIR(lambda)).toBe(
      `{| ${ORDERS}->slice(0, 5)->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test.each<[string, number | undefined, number | undefined]>([
    ['a cleared start', undefined, 20],
    ['a cleared stop', 10, undefined],
    ['a negative start', -1, 20],
    ['a fractional stop', 0, 2.5],
    ['an empty range', 3, 3],
    ['a reversed range', 5, 3],
  ])(
    "Refuses to emit %s, which validation doesn't let through",
    (_, start, stop) => {
      expect(() =>
        emitSlice(new Slice('slice101', start, stop), [ACCESSOR]),
      ).toThrow(`Can't emit slice "slice101"`);
      expect(
        new QueryEmitter(ordersSliced(start, stop)).canEmit('slice101'),
      ).toBe(false);
    },
  );

  test('Refuses to emit without an input', () => {
    expect(() => emitSlice(new Slice('slice101', 0, 5), [])).toThrow(
      `Can't emit slice "slice101"`,
    );
  });
});
