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
  buildSchemasAndValidity,
  Connection,
  Join,
  JoinType,
  Query,
} from '@finos/legend-cube';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { FAKE_NORTHWIND_OUTLINE } from '../../../__test-utils__/FakeCubeEngine.js';
import type { CubeModelOutline } from '../../../graph-manager/CubeEngine.js';
import {
  CubeJoinDraft,
  findColumnSources,
  isUntypedColumn,
} from '../CubeJoinDraft.js';

const join = (): Join =>
  new Join('join101', {
    leftColumns: ['CUSTOMER_ID'],
    rightColumns: ['CUSTOMER_ID'],
    joinType: JoinType.INNER,
  });

describe('Join draft', () => {
  test('Builds the original join until something changes', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    expect(draft.joinType).toBe(JoinType.INNER);
    expect(draft.pairs.map(({ left, right }) => [left, right])).toEqual([
      ['CUSTOMER_ID', 'CUSTOMER_ID'],
    ]);
    expect(draft.build()).toBe(original);
  });

  test('Builds a join of the same id with the edited type and key pairs', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    draft.setJoinType(JoinType.FULL_OUTER);
    draft.addPair();
    const [, added] = draft.pairs;
    draft.setLeftColumn(added?.key ?? 0, 'SHIP_CITY');
    draft.setRightColumn(added?.key ?? 0, 'CITY');
    const built = draft.build();
    expect(built.id).toBe('join101');
    expect(built.key).not.toBe(original.key);
    expect(built.joinType).toBe(JoinType.FULL_OUTER);
    expect(built.leftColumns).toEqual(['CUSTOMER_ID', 'SHIP_CITY']);
    expect(built.rightColumns).toEqual(['CUSTOMER_ID', 'CITY']);
    // the original is left as it was
    expect(original.leftColumns).toEqual(['CUSTOMER_ID']);
  });

  test('Leaves out a pair with no column picked, and builds the original when only such pairs were added', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    draft.addPair();
    draft.addPair();
    expect(draft.pairs).toHaveLength(3);
    expect(draft.build()).toBe(original);
    // a half-picked pair stays, to be reported
    draft.setLeftColumn(draft.pairs[1]?.key ?? 0, 'SHIP_CITY');
    expect(draft.build().leftColumns).toEqual(['CUSTOMER_ID', 'SHIP_CITY']);
    expect(draft.build().rightColumns).toEqual(['CUSTOMER_ID', '']);
  });

  test('Builds the original when the edits are undone by hand', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    draft.setJoinType(JoinType.LEFT_OUTER);
    draft.setJoinType(JoinType.INNER);
    const [pair] = draft.pairs;
    draft.removePair(pair?.key ?? 0);
    expect(draft.build().leftColumns).toEqual([]);
    draft.addPair();
    const [added] = draft.pairs;
    draft.setLeftColumn(added?.key ?? 0, 'CUSTOMER_ID');
    draft.setRightColumn(added?.key ?? 0, 'CUSTOMER_ID');
    expect(draft.build()).toBe(original);
  });

  test('Builds the original when edits to a join saved with uneven or blank keys are undone by hand', () => {
    const uneven = new Join('join101', {
      leftColumns: ['A', 'B'],
      rightColumns: ['A'],
      joinType: JoinType.INNER,
    });
    const draft = new CubeJoinDraft(uneven);
    draft.setJoinType(JoinType.LEFT_OUTER);
    draft.setJoinType(JoinType.INNER);
    expect(draft.build()).toBe(uneven);
    const blankPair = new Join('join101', {
      leftColumns: ['A', ''],
      rightColumns: ['A', ''],
      joinType: JoinType.INNER,
    });
    const blankDraft = new CubeJoinDraft(blankPair);
    blankDraft.setJoinType(JoinType.LEFT_OUTER);
    blankDraft.setJoinType(JoinType.INNER);
    // a real edit drops the blank pair, but nothing was edited
    expect(blankDraft.build()).toBe(blankPair);
    blankDraft.setJoinType(JoinType.FULL_OUTER);
    expect(blankDraft.build().leftColumns).toEqual(['A']);
  });

  test('Pairs uneven saved key lists by position, the missing side blank', () => {
    const original = new Join('join101', {
      leftColumns: ['A', 'B'],
      rightColumns: ['A'],
    });
    const draft = new CubeJoinDraft(original);
    expect(draft.pairs.map(({ left, right }) => [left, right])).toEqual([
      ['A', 'A'],
      ['B', ''],
    ]);
    expect(draft.build()).toBe(original);
    // each row keeps its own key
    expect(new Set(draft.pairs.map((pair) => pair.key)).size).toBe(2);
  });
});

describe('Where a column comes from', () => {
  // ORDERS and CUSTOMERS joined on CUSTOMER_ID, then filtered
  const valid = sliceQuery();
  const analysis = buildSchemasAndValidity(valid);

  /** ORDERS joined with CUSTOMERS on CUSTOMER_ID, with this join type */
  const joined = (joinType: JoinType): Query =>
    new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
          joinType,
        }),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );

  const sourcesOf = (query: Query, nodeId: string, column: string): string[] =>
    findColumnSources(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((source) => source.id);

  test('Follows a column back through the nodes whose output has it', () => {
    expect(sourcesOf(valid, 'filter101', 'SHIP_CITY')).toEqual([
      'relational101',
    ]);
    expect(sourcesOf(valid, 'filter101', 'COMPANY_NAME')).toEqual([
      'relational102',
    ]);
    expect(sourcesOf(valid, 'join101', 'NOPE')).toEqual([]);
    expect(findColumnSources(valid, analysis, 'nothing101', 'X')).toEqual([]);
  });

  test('Takes a same-named join key from the side the join keeps, and from both when it merges them', () => {
    expect(sourcesOf(joined(JoinType.INNER), 'join101', 'CUSTOMER_ID')).toEqual(
      ['relational101'],
    );
    expect(
      sourcesOf(joined(JoinType.LEFT_OUTER), 'join101', 'CUSTOMER_ID'),
    ).toEqual(['relational101']);
    expect(
      sourcesOf(joined(JoinType.RIGHT_OUTER), 'join101', 'CUSTOMER_ID'),
    ).toEqual(['relational102']);
    expect(
      sourcesOf(joined(JoinType.FULL_OUTER), 'join101', 'CUSTOMER_ID'),
    ).toEqual(['relational101', 'relational102']);
  });

  test("Tells a column Cube typed as a bare String from its own table's entry in the model's outline", () => {
    const table = (name: string, untypedColumns: string[]) => ({
      name,
      isView: false,
      columnCount: 1,
      flags: [],
      untypedColumns,
    });
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        // a same-named schema and table in another database, listed first
        {
          path: 'other::Database',
          schemas: [
            {
              name: 'NORTHWIND',
              tables: [table('CUSTOMERS', ['COMPANY_NAME'])],
            },
          ],
        },
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            // a same-named table in another schema, listed first
            { name: 'OTHER', tables: [table('CUSTOMERS', ['CITY'])] },
            {
              name: 'NORTHWIND',
              tables: [
                table('ORDERS', ['SHIP_REGION', 'CUSTOMER_ID']),
                table('CUSTOMERS', ['REGION']),
              ],
            },
          ],
        },
      ],
    };
    const untyped = (nodeId: string, column: string): boolean =>
      isUntypedColumn(outline, valid, analysis, nodeId, column);
    expect(untyped('join101', 'SHIP_REGION')).toBe(true);
    expect(untyped('join101', 'SHIP_CITY')).toBe(false);
    // CUSTOMERS' own list, though ORDERS comes first
    expect(untyped('join101', 'REGION')).toBe(true);
    // ORDERS' CUSTOMER_ID is untyped, CUSTOMERS' is not
    expect(untyped('relational102', 'CUSTOMER_ID')).toBe(false);
    expect(untyped('join101', 'COMPANY_NAME')).toBe(false);
    expect(untyped('join101', 'CITY')).toBe(false);
    // no outline yet: no warning
    expect(
      isUntypedColumn(undefined, valid, analysis, 'join101', 'SHIP_REGION'),
    ).toBe(false);
  });
});
