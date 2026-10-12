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
import { TEST__registryWithPivot } from '../../__test-utils__/CubeTestRegistry.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { AggregationFunction } from '../../nodes/transforms/Aggregation.js';
import {
  DEFAULT_PIVOT_AGGREGATION,
  Pivot,
  type PivotAggregation,
} from '../../nodes/transforms/Pivot.js';
import { Schema } from '../../schema/Schema.js';
import type { LiteralValue } from '../../values/LiteralValue.js';
import { storeAccessor } from '../CubeIR.js';
import {
  emitPivot,
  getEnginePivotColumnName,
} from '../emitters/PivotEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const P = 'meta::pure::precisePrimitives::';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const COLUMNS = [
  column('ORDER_ID'),
  column('SHIP_COUNTRY', `${P}Varchar`, true, [15]),
  column('SHIP_VIA', `${P}Int`, true),
  column('FREIGHT', 'Float', true),
  column('ORDER_DATE', 'StrictDate', true),
];
const integer = (value: string): LiteralValue => ({ kind: 'integer', value });
const SUM_OF_FREIGHT: PivotAggregation = {
  function: AggregationFunction.SUM,
  column: 'FREIGHT',
};

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

const emitterOf = (query: Query): QueryEmitter =>
  new QueryEmitter(query, TEST__registryWithPivot());

const pivoted = (node: Pivot): string =>
  printIR(emitterOf(ordersThen(node)).emitRelation(node.id));

describe(unitTest('Pivot emission'), () => {
  test('Selects the rows, the pivot and the aggregated columns, pivots on the values, casts each column, then renames each value column', () => {
    expect(
      pivoted(
        new Pivot(
          'pivot101',
          ['SHIP_COUNTRY'],
          'SHIP_VIA',
          [integer('1'), integer('2')],
          SUM_OF_FREIGHT,
        ),
      ),
    ).toBe(
      `${ORDERS}->select(~[SHIP_COUNTRY, SHIP_VIA, FREIGHT])` +
        `->pivot(~SHIP_VIA, [1, 2], ~cube_pivot: x | $x.FREIGHT : y | $y->sum())` +
        `->cast(@Relation<(SHIP_COUNTRY:${P}Varchar(15), '\\'1__|__cube_pivot\\'':Float, '\\'2__|__cube_pivot\\'':Float)>)` +
        `->rename(~'\\'1__|__cube_pivot\\'', ~'1')->rename(~'\\'2__|__cube_pivot\\'', ~'2')`,
    );
  });

  test('Counts rows with no aggregated column, and pivots with no row column', () => {
    expect(
      pivoted(
        new Pivot(
          'pivot101',
          [],
          'ORDER_DATE',
          [{ kind: 'strictDate', value: '1997-01-02' }],
          DEFAULT_PIVOT_AGGREGATION,
        ),
      ),
    ).toBe(
      `${ORDERS}->select(~[ORDER_DATE])` +
        `->pivot(~ORDER_DATE, [%1997-01-02], ~cube_pivot: x | 1 : y | $y->count())` +
        `->cast(@Relation<('\\'1997-01-02__|__cube_pivot\\'':Integer)>)` +
        `->rename(~'\\'1997-01-02__|__cube_pivot\\'', ~'1997-01-02')`,
    );
  });

  test('Renames a value to the name the schema gives it, suffixed when a row column has it', () => {
    expect(getEnginePivotColumnName({ kind: 'string', value: "O'Brien" })).toBe(
      "'O'Brien__|__cube_pivot'",
    );
    expect(
      pivoted(
        new Pivot(
          'pivot101',
          ['ORDER_ID'],
          'SHIP_COUNTRY',
          [{ kind: 'string', value: 'order_id' }],
          DEFAULT_PIVOT_AGGREGATION,
        ),
      ),
    ).toContain(`->rename(~'\\'order_id__|__cube_pivot\\'', ~order_id_2)`);
  });

  test('Marks the pivot, its values, its aggregation, the select, the cast and each rename with the node', () => {
    const origins = listOrigins(
      emitterOf(
        ordersThen(
          new Pivot(
            'pivot101',
            ['SHIP_COUNTRY'],
            'SHIP_VIA',
            [integer('1')],
            SUM_OF_FREIGHT,
          ),
        ),
      ).emitRelation('pivot101'),
    );
    expect(origins).toEqual([
      'rename@pivot101:rename',
      'cast@pivot101:cast',
      'pivot@pivot101:pivot',
      'select@pivot101:select',
      expect.stringContaining('#>{test::Northwind.NORTHWIND.ORDERS}#'),
      '1@pivot101:value',
      '.FREIGHT@pivot101:aggregation',
      'sum@pivot101:aggregation',
    ]);
  });

  test('Refuses to emit with no input, or when its columns differ from its schema', () => {
    const node = new Pivot(
      'pivot101',
      ['SHIP_COUNTRY'],
      'SHIP_VIA',
      [integer('1')],
      SUM_OF_FREIGHT,
    );
    const accessor = storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']);
    expect(() =>
      emitPivot(node, [], { inputSchemas: [], schema: new Schema([]) }),
    ).toThrow(`Can't emit pivot "pivot101": it needs one input`);
    expect(() =>
      emitPivot(node, [accessor], {
        inputSchemas: [new Schema(COLUMNS)],
        schema: new Schema([column('SHIP_COUNTRY')]),
      }),
    ).toThrow(
      `Pivot "pivot101" would produce SHIP_COUNTRY, 1, but its schema is SHIP_COUNTRY`,
    );
  });
});
