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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  column,
  TestBinaryNode,
  TestUnaryNode,
  testSpecCodec,
} from '../../__test-utils__/CubeTestNodes.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import { ColumnComparisonFilter } from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { keepInputOrder, type RowOrder } from '../../inference/RowOrder.js';
import {
  createNodeRegistry,
  type NodeRegistry,
  type TransformDefinition,
} from '../../nodes/NodeRegistry.js';
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { Schema } from '../../schema/Schema.js';
import { func } from '../CubeIR.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const DATABASE = 'showcase::northwind::store::NorthwindDatabase';
const RUNTIME = 'showcase::northwind::mapping::StoreRuntime';
const ORDERS = `#>{${DATABASE}.NORTHWIND.ORDERS}#`;

/** A test-only window: keeps its input's columns and, as a Partition will, its order */
class TestWindowNode extends TestUnaryNode {
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    return keepInputOrder(inputOrders);
  }
}

/** Emits `<input>->window()`, bound when it isn't captured */
const WINDOW_DEFINITION: TransformDefinition<TestWindowNode> = {
  kind: 'transform',
  type: TestUnaryNode.TYPE,
  label: 'Test window',
  icon: 'window',
  beta: false,
  create: (id) => new TestWindowNode(id),
  emit: (node, [input]) => func('window', input ? [input] : []),
  spec: testSpecCodec((id) => new TestWindowNode(id)),
  isolationBoundary: true,
};

/** Emits `<first>->pair(<second>)`, never bound */
const PAIR_DEFINITION: TransformDefinition<TestBinaryNode> = {
  kind: 'transform',
  type: TestBinaryNode.TYPE,
  label: 'Test pair',
  icon: 'pair',
  beta: false,
  create: (id) => new TestBinaryNode(id),
  emit: (node, inputs) => func('pair', [...inputs]),
  spec: testSpecCodec((id) => new TestBinaryNode(id)),
};

const registry = (): NodeRegistry => {
  const result = createNodeRegistry();
  result.register(WINDOW_DEFINITION);
  result.register(PAIR_DEFINITION);
  return result;
};

const orders = (): RelationalTableSource =>
  new RelationalTableSource(
    'relational101',
    { database: DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
    {
      kind: 'resolved',
      schema: new Schema([
        column('ORDER_ID', 'meta::pure::precisePrimitives::Int'),
        column('SHIP_COUNTRY', 'meta::pure::precisePrimitives::Varchar', true, [
          15,
        ]),
      ]),
    },
  );

const france = (id: string): Filter =>
  new Filter(
    id,
    new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'France',
    }),
  );
const FRANCE = `->filter({row | $row.SHIP_COUNTRY == 'France'})`;

/** ORDERS, then the nodes, each reading the one before it; the last is captured */
const chain = (...nodes: QueryNode[]): Query => {
  const all = [orders(), ...nodes];
  return new Query(
    all,
    all
      .slice(1)
      .map(
        (node, index) => new Connection(all[index]?.id ?? '', node.id, 'tds'),
      ),
    all[all.length - 1]?.id,
  );
};

const run = (query: Query): string =>
  printIR(
    new QueryEmitter(query, registry()).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    }),
  );

describe(unitTest('Query emission: window isolation'), () => {
  test('Binds nothing when no window is upstream of the capture, or the window is captured', () => {
    expect(run(chain(france('filter101')))).toBe(
      `{| ${ORDERS}${FRANCE}->limit(1001)->from(${RUNTIME})}`,
    );
    expect(run(chain(new TestWindowNode('window101')))).toBe(
      `{| ${ORDERS}->window()->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test('Binds a window that something follows, then runs the block from the runtime and limits it', () => {
    expect(
      run(chain(new TestWindowNode('window101'), france('filter101'))),
    ).toBe(
      `{| {| let n_window101 = ${ORDERS}->window(); $n_window101${FRANCE};}->from(${RUNTIME})->limit(1001)}`,
    );
  });

  test('Never binds a window to type a node', () => {
    const query = chain(new TestWindowNode('window101'), france('filter101'));
    expect(
      printIR(
        new QueryEmitter(query, registry()).emitTypingLambda('filter101'),
      ),
    ).toBe(`{| ${ORDERS}->window()${FRANCE}}`);
  });

  test("Sorts by the capture's order after the runtime, outside the block", () => {
    // a Sort after the window, and one before it, whose order the window keeps
    const after = new Sort('sort101', [
      { column: 'ORDER_ID', direction: SortDirection.DESC },
    ]);
    expect(
      run(chain(new TestWindowNode('window101'), after, france('filter101'))),
    ).toBe(
      `{| {| let n_window101 = ${ORDERS}->window(); $n_window101${FRANCE};}->from(${RUNTIME})->sort(~ORDER_ID->descending())->limit(1001)}`,
    );
    expect(
      run(chain(after, new TestWindowNode('window101'), france('filter101'))),
    ).toBe(
      `{| {| let n_window101 = ${ORDERS}->window(); $n_window101${FRANCE};}->from(${RUNTIME})->sort(~ORDER_ID->descending())->limit(1001)}`,
    );
  });

  test("Keeps a Limit's sort inside the let of the window that follows it", () => {
    expect(
      run(
        chain(
          new Sort('sort101', [
            { column: 'ORDER_ID', direction: SortDirection.DESC },
          ]),
          new Limit('limit101', 5),
          new TestWindowNode('window101'),
          france('filter101'),
        ),
      ),
    ).toBe(
      `{| {| let n_window101 = ${ORDERS}->sort(~ORDER_ID->descending())->limit(5)->window(); $n_window101${FRANCE};}->from(${RUNTIME})->sort(~ORDER_ID->descending())->limit(1001)}`,
    );
  });

  test('Binds a window of a window after the window it reads', () => {
    expect(
      run(
        chain(
          new TestWindowNode('window101'),
          new TestWindowNode('window102'),
          france('filter101'),
        ),
      ),
    ).toBe(
      `{| {| let n_window101 = ${ORDERS}->window(); let n_window102 = $n_window101->window(); $n_window102${FRANCE};}->from(${RUNTIME})->limit(1001)}`,
    );
  });

  test('Binds a window in either input of a node with two', () => {
    const query = new Query(
      [
        orders(),
        new TestWindowNode('window101'),
        new RelationalTableSource(
          'relational102',
          { database: DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
          orders().resolution,
        ),
        new TestWindowNode('window102'),
        new TestBinaryNode('pair101'),
      ],
      [
        new Connection('relational101', 'window101', 'tds'),
        new Connection('relational102', 'window102', 'tds'),
        new Connection('window101', 'pair101', 'tds1'),
        new Connection('window102', 'pair101', 'tds2'),
      ],
      'pair101',
    );
    expect(run(query)).toBe(
      `{| {| let n_window101 = ${ORDERS}->window(); let n_window102 = ${ORDERS}->window(); $n_window101->pair($n_window102);}->from(${RUNTIME})->limit(1001)}`,
    );
  });

  test('Names a let after its node when its id is a short identifier no other let has in any case', () => {
    const lets = (...ids: string[]): string[] =>
      [
        ...run(
          chain(...ids.map((id) => new TestWindowNode(id)), france('f')),
        ).matchAll(/let (?<name>\w+) =/gu),
      ].map((match) => match.groups?.name ?? '');
    expect(lets('Window_1')).toEqual(['n_window_1']);
    // not identifiers, or too long for every database
    expect(lets('a-b', 'order 1', 'w'.repeat(29), 'w'.repeat(28))).toEqual([
      'n_1',
      'n_2',
      'n_3',
      `n_${'w'.repeat(28)}`,
    ]);
    // the same in any case, or an id that is another let's number
    expect(lets('X', 'x', '1', '2')).toEqual(['n_x', 'n_1', 'n_2', 'n_3']);
  });

  test('Marks a let with the window it binds, and the block with the capture', () => {
    const query = chain(new TestWindowNode('window101'), france('filter101'));
    const origins = listOrigins(
      new QueryEmitter(query, registry()).emitExecutionLambda({
        rowLimit: 1000,
        runtime: RUNTIME,
      }),
    );
    expect(origins.slice(0, 4)).toEqual([
      'limit@filter101:limit',
      'from@filter101:from',
      'let n_window101@window101:let',
      'window@-',
    ]);
    expect(origins).toContain('filter@filter101:filter');
    expect(origins).toContain('1001@filter101:limit');
  });

  test('Emits the same lets every time', () => {
    const emitter = new QueryEmitter(
      chain(
        new TestWindowNode('a-b'),
        new TestWindowNode('window101'),
        france('filter101'),
      ),
      registry(),
    );
    const options = { rowLimit: 10, runtime: RUNTIME };
    expect(emitter.emitExecutionLambda(options)).toEqual(
      emitter.emitExecutionLambda(options),
    );
  });
});
