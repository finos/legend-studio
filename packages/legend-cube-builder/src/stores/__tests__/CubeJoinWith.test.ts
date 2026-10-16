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
import {
  Connection,
  CubeDocument,
  Distinct,
  Filter,
  Join,
  JoinType,
  Query,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { FAKE_NORTHWIND_OUTLINE } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { CubeModelOutline } from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeJoinSuggestionReason } from '../editors/CubeJoinSuggestions.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const [DATABASE] = FAKE_NORTHWIND_OUTLINE.databases;

/** Northwind's outline with a join of ORDERS and CUSTOMERS on CUSTOMER_ID */
const WITH_JOIN: CubeModelOutline = {
  ...FAKE_NORTHWIND_OUTLINE,
  databases: [
    {
      ...(DATABASE as NonNullable<typeof DATABASE>),
      joins: [
        {
          name: 'Orders_Customers',
          pairs: [
            [
              { schema: 'NORTHWIND', table: 'ORDERS', column: 'CUSTOMER_ID' },
              {
                schema: 'NORTHWIND',
                table: 'CUSTOMERS',
                column: 'CUSTOMER_ID',
              },
            ],
          ],
        },
      ],
    },
  ],
};

/** ORDERS alone, and CUSTOMERS' distinct rows: two chains, the second ending at the Distinct */
const twoChains = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Distinct('distinct101'),
      ],
      [new Connection('relational102', 'distinct101', 'tds')],
      'relational101',
    ),
  });

const setUp = (
  outline?: CubeModelOutline,
  document = twoChains(),
): CubeEditorState =>
  new CubeEditorState(
    TEST__createCubeHost(outline ? { outline } : {}).host,
    document,
  );

const joinOf = (state: CubeEditorState, id: string): Join =>
  state.document.query.getNode(id) as Join;

describe('A Join with the node it joins', () => {
  test("Offers the end of each other chain as the Join's other input, never one that would close a loop", () => {
    const state = setUp();
    // CUSTOMERS feeds the Distinct already: the Distinct ends its chain
    expect(
      state.getJoinInputCandidates('relational101').map((node) => node.id),
    ).toEqual(['distinct101']);
    expect(
      state.getJoinInputCandidates('distinct101').map((node) => node.id),
    ).toEqual(['relational101']);
    // the Distinct's own input is upstream of it
    expect(
      state.getJoinInputCandidates('relational102').map((node) => node.id),
    ).toEqual(['relational101']);
  });

  test("Adds the Join with its other input as one step to undo, taking the database's join, and opens its editor", async () => {
    const state = setUp(WITH_JOIN);
    const before = state.document.query;
    const id = await flowResult(
      state.addJoinWith('relational101', 'distinct101'),
    );
    expect(id).toBe('join101');
    expect(state.document.query.getInputIds('join101')).toEqual([
      'relational101',
      'distinct101',
    ]);
    const join = joinOf(state, 'join101');
    expect([join.leftColumns, join.rightColumns, join.joinType]).toEqual([
      ['CUSTOMER_ID'],
      ['CUSTOMER_ID'],
      // a new Join's own
      JoinType.LEFT_OUTER,
    ]);
    expect(state.nodeEditor.nodeId).toBe('join101');
    expect(
      state.getJoinKeySuggestions('relational101', 'distinct101')[0],
    ).toMatchObject({
      reason: CubeJoinSuggestionReason.DATABASE_JOIN,
      detail: 'Orders_Customers',
    });
    state.nodeEditor.close();
    // one step: the Join and its other input go together
    state.undo();
    const nodeIds = (query: typeof before): string[] =>
      query.nodes.map((node) => node.id);
    expect(nodeIds(state.document.query)).toEqual(nodeIds(before));
    expect(
      state.document.query.getOutputConnection('distinct101'),
    ).toBeUndefined();
  });

  test('Takes the one key-like column both sides name alike without the database knowing a join', async () => {
    const state = setUp();
    await flowResult(state.addJoinWith('relational101', 'distinct101'));
    expect(joinOf(state, 'join101').leftColumns).toEqual(['CUSTOMER_ID']);
  });

  test('Fills the join columns of a Join that gets its second input later, never over its own', () => {
    const state = setUp(WITH_JOIN);
    state.addNode(Join.TYPE, 'relational101');
    expect(joinOf(state, 'join101').leftColumns).toEqual([]);
    state.connect('distinct101', 'join101');
    expect(joinOf(state, 'join101').rightColumns).toEqual(['CUSTOMER_ID']);

    // a Join whose columns are set keeps them
    const other = setUp(
      WITH_JOIN,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
            new Join('join101', {
              leftColumns: ['SHIP_CITY'],
              rightColumns: ['CITY'],
              joinType: JoinType.LEFT_OUTER,
            }),
          ],
          [new Connection('relational101', 'join101', 'leftTds')],
          'join101',
        ),
      }),
    );
    other.dropNode('relational102', 'join101');
    expect(joinOf(other, 'join101').rightColumns).toEqual(['CITY']);
  });

  test("Adds nothing on a read-only cube, or once the other input can't be joined", async () => {
    const readOnly = setUp(WITH_JOIN);
    readOnly.importDocument(twoChains(), true);
    expect(readOnly.getJoinInputCandidates('relational101')).toEqual([]);
    expect(
      await flowResult(readOnly.addJoinWith('relational101', 'distinct101')),
    ).toBeUndefined();
    const state = setUp(WITH_JOIN);
    // the Distinct no longer ends its chain
    state.addNode(Filter.TYPE, 'distinct101');
    expect(
      await flowResult(state.addJoinWith('relational101', 'distinct101')),
    ).toBeUndefined();
  });
});
