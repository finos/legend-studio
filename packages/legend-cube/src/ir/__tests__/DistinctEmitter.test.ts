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
import { Distinct } from '../../nodes/transforms/Distinct.js';
import { emitDistinct } from '../emitters/DistinctEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';

describe(unitTest('Distinct emission'), () => {
  test('Keeps one row of each set of identical rows with distinct(), over every column', () => {
    const query = new Query(
      [
        resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
        new Distinct('distinct101'),
      ],
      [new Connection('relational101', 'distinct101', 'tds')],
      'distinct101',
    );
    const relation = new QueryEmitter(query).emitRelation('distinct101');
    expect(printIR(relation)).toBe(`${ORDERS}->distinct()`);
    expect(listOrigins(relation)).toEqual([
      'distinct@distinct101:distinct',
      `${ORDERS}@relational101:accessor`,
    ]);
    expect(
      printIR(
        new QueryEmitter(query).emitExecutionLambda({
          rowLimit: 1000,
          runtime: 'test::Runtime',
        }),
      ),
    ).toBe(`{| ${ORDERS}->distinct()->limit(1001)->from(test::Runtime)}`);
  });

  test('Refuses to emit without an input', () => {
    expect(() => emitDistinct(new Distinct('distinct101'), [])).toThrow(
      `Can't emit distinct "distinct101"`,
    );
  });
});
