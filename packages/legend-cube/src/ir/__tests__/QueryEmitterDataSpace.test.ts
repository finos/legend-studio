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
import {
  column,
  resolvedDataSpace,
  TestUnaryNode,
  testSpecCodec,
  TRADES_DATA_SPACE,
} from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import { ColumnComparisonFilter } from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import {
  createNodeRegistry,
  DATA_SPACE_SOURCE_DEFINITION,
  FILTER_DEFINITION,
  NodeRegistry,
  type TransformDefinition,
} from '../../nodes/NodeRegistry.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { func } from '../CubeIR.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

// A data space source (PLAN §11.25) is the query builder's relation, passed
// through as the engine's JSON; the steps after it emit as they do over
// tables, and the run ends in `from(mapping, runtime)`

const MAPPING = 'trading::TradeMapping';
const RUNTIME = 'trading::TradeRuntime';

const RELATION_EXPRESSION = (TRADES_DATA_SPACE.relation.body as unknown[])[0];

const RAW = `<raw ${JSON.stringify(RELATION_EXPRESSION)}>`;

const tradesThenFilter = (): Query =>
  new Query(
    [
      resolvedDataSpace('dataSpace101', [
        column('id'),
        column('quantity', 'Float'),
      ]),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('quantity', FilterOperator.GREATER_THAN, {
          kind: 'float',
          value: '500',
        }),
      ),
    ],
    [new Connection('dataSpace101', 'filter101', 'tds')],
    'filter101',
  );

/** A test-only window, bound with a let when it isn't captured */
const WINDOW_DEFINITION: TransformDefinition<TestUnaryNode> = {
  kind: 'transform',
  type: TestUnaryNode.TYPE,
  label: 'Test window',
  icon: 'window',
  beta: false,
  create: (id) => new TestUnaryNode(id),
  emit: (node, [input]) => func('window', input ? [input] : []),
  spec: testSpecCodec((id) => new TestUnaryNode(id)),
  isolationBoundary: true,
};

describe(unitTest('Query emitter over a data space'), () => {
  test("Emits the source as its relation's expression, passed through with the node's origin", () => {
    const emitter = new QueryEmitter(tradesThenFilter(), createNodeRegistry());
    expect(emitter.emitRelation('dataSpace101')).toStrictEqual({
      k: 'raw',
      json: RELATION_EXPRESSION,
      origin: { nodeId: 'dataSpace101', role: 'accessor' },
    });
  });

  test('Runs the steps after it, then from the mapping and the runtime', () => {
    const lambda = new QueryEmitter(
      tradesThenFilter(),
      createNodeRegistry(),
    ).emitExecutionLambda({ rowLimit: 10, runtime: RUNTIME, mapping: MAPPING });
    expect(printIR(lambda)).toBe(
      `{| ${RAW}->filter({row | $row.quantity > 500.0})->limit(11)->from(trading::TradeMapping, trading::TradeRuntime)}`,
    );
    expect(listOrigins(lambda)).toEqual([
      'from@filter101:from',
      'limit@filter101:limit',
      'filter@filter101:filter',
      'raw@dataSpace101:accessor',
      'greaterThan@filter101:predicate',
      '.quantity@filter101:column',
      '500.0@filter101:value',
      '11@filter101:limit',
    ]);
  });

  test('Writes from(runtime) alone without a mapping, as for every other source', () => {
    const lambda = new QueryEmitter(
      tradesThenFilter(),
      createNodeRegistry(),
    ).emitExecutionLambda({ rowLimit: 10, runtime: RUNTIME });
    expect(printIR(lambda)).toBe(
      `{| ${RAW}->filter({row | $row.quantity > 500.0})->limit(11)->from(trading::TradeRuntime)}`,
    );
  });

  test('Puts the mapping in the from() after the lets of a window it binds', () => {
    const query = new Query(
      [
        resolvedDataSpace('dataSpace101', [column('id')]),
        new TestUnaryNode('window101'),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('id', FilterOperator.EQUAL, {
            kind: 'integer',
            value: '7',
          }),
        ),
      ],
      [
        new Connection('dataSpace101', 'window101', 'tds'),
        new Connection('window101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    const registry = new NodeRegistry([
      DATA_SPACE_SOURCE_DEFINITION,
      WINDOW_DEFINITION,
      FILTER_DEFINITION,
    ]);
    expect(
      printIR(
        new QueryEmitter(query, registry).emitExecutionLambda({
          rowLimit: 10,
          runtime: RUNTIME,
          mapping: MAPPING,
        }),
      ),
    ).toBe(
      `{| {| let n_window101 = ${RAW}->window(); $n_window101->filter({row | $row.id == 7});}->from(trading::TradeMapping, trading::TradeRuntime)->limit(11)}`,
    );
  });
});
