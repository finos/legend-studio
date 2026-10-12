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
import type { QueryNode } from '../../graph/QueryNode.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import {
  createNodeRegistry,
  EXPRESSION_FILTER_DEFINITION,
  type NodeRegistry,
} from '../../nodes/NodeRegistry.js';
import { WindowRankFunction } from '../../nodes/transforms/Aggregation.js';
import {
  ExpressionFilter,
  getExpressionFilterSignature,
} from '../../nodes/transforms/ExpressionFilter.js';
import { Partition } from '../../nodes/transforms/Partition.js';
import { SortDirection } from '../../nodes/transforms/Sort.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const T = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const COLUMNS = [
  column('ORDER_ID'),
  column('SHIP_COUNTRY', 'String', true),
  column('ORDER_DATE', 'StrictDate', true),
];

/** Cube's registry with Filter by Expression, which `createNodeRegistry` registers once its editor exists (M6b.4) */
const registry = (): NodeRegistry => {
  const withFilter = createNodeRegistry();
  if (!withFilter.get(EXPRESSION_FILTER_DEFINITION.type)) {
    withFilter.register(EXPRESSION_FILTER_DEFINITION);
  }
  return withFilter;
};

/** `x | $x.<name> <= 1`, as the engine's JSON */
const atMostOne = (name: string): JsonObject => ({
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [
    {
      _type: 'func',
      function: 'lessThanEqual',
      parameters: [
        {
          _type: 'property',
          property: name,
          parameters: [{ _type: 'var', name: 'x' }],
        },
        { _type: 'integer', value: '1' },
      ],
    },
  ],
});

/** ORDERS, then the nodes, the last selected */
const ordersThen = (...nodes: QueryNode[]): Query => {
  const all = [resolvedTable('relational101', 'ORDERS', COLUMNS), ...nodes];
  return new Query(
    all,
    all
      .slice(1)
      .map(
        (node, index) =>
          new Connection((all[index] as QueryNode).id, node.id, 'tds'),
      ),
    all.at(-1)?.id,
  );
};

/** The filter on `<name> <= 1`, checked for the input it has in the query */
const checkedIn = (query: Query, name: string): Query => {
  const node = new ExpressionFilter(
    'expressionFilter101',
    `x | $x.${name} <= 1`,
    atMostOne(name),
  );
  const unchecked = new Query(
    [...query.nodes, node],
    [
      ...query.connections,
      new Connection(query.selected ?? '', node.id, 'tds'),
    ],
    node.id,
  );
  const [inputId] = unchecked.getInputIds(node.id);
  const input = buildSchemasAndValidity(unchecked).schemas.get(
    inputId ?? '',
  ) as Schema;
  return unchecked.replace(
    node.withCheck({
      kind: 'checked',
      signature: getExpressionFilterSignature(input, node.lambda),
    }),
  );
};

describe(unitTest('Filter by Expression emission'), () => {
  test("Writes a filter with the condition's lambda", () => {
    const emitter = new QueryEmitter(
      checkedIn(ordersThen(), 'ORDER_ID'),
      registry(),
    );
    expect(printIR(emitter.emitRelation('expressionFilter101'))).toBe(
      `${T}->filter(<lambda ${JSON.stringify(atMostOne('ORDER_ID'))}>)`,
    );
  });

  test('Marks the filter and the condition with the node, so an engine error lands on it', () => {
    expect(
      listOrigins(
        new QueryEmitter(
          checkedIn(ordersThen(), 'ORDER_ID'),
          registry(),
        ).emitRelation('expressionFilter101'),
      ),
    ).toEqual([
      'filter@expressionFilter101:filter',
      `${T}@relational101:accessor`,
      'lambda@expressionFilter101:expression',
    ]);
  });

  test("Doesn't emit a condition the engine hasn't checked, which waits", () => {
    const emitter = new QueryEmitter(
      ordersThen(
        new ExpressionFilter('expressionFilter101', 'x', atMostOne('ORDER_ID')),
      ),
      registry(),
    );
    expect(emitter.canEmit('expressionFilter101')).toBe(false);
  });

  test('Reads the let a Partition before it is bound with, so a condition on a window column runs after the window', () => {
    const ranked = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [{ column: 'ORDER_DATE', direction: SortDirection.ASC }],
      [
        {
          column: undefined,
          function: WindowRankFunction.ROW_NUMBER,
          name: 'rn',
        },
      ],
    );
    const run = printIR(
      new QueryEmitter(
        checkedIn(ordersThen(ranked), 'rn'),
        registry(),
      ).emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME }),
    );
    expect(run).toMatch(
      /^\{\| \{\| let n_partition101 = .*->extend\(.*; \$n_partition101->filter\(<lambda .*>\);\}->from\(test::Runtime\)->limit\(1001\)\}$/u,
    );
    expect(run).toContain(JSON.stringify(atMostOne('rn')));
  });
});
