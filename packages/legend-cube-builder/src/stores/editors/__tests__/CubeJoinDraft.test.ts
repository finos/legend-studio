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
  Filter,
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
  const query = new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      new Filter('filter101'),
      new Join('join101', {
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
        joinType: JoinType.FULL_OUTER,
      }),
    ],
    [
      new Connection('relational101', 'filter101', 'tds'),
      new Connection('filter101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
    ],
    'join101',
  );
  // the Filter has no rule, so build the analysis from a valid one
  const valid = sliceQuery();
  const analysis = buildSchemasAndValidity(valid);

  test('Follows a column back through the nodes whose output has it', () => {
    expect(
      findColumnSources(valid, analysis, 'filter101', 'SHIP_CITY').map(
        (source) => source.id,
      ),
    ).toEqual(['relational101']);
    expect(
      findColumnSources(valid, analysis, 'join101', 'COMPANY_NAME').map(
        (source) => source.id,
      ),
    ).toEqual(['relational102']);
    expect(findColumnSources(valid, analysis, 'join101', 'NOPE')).toEqual([]);
    expect(findColumnSources(valid, analysis, 'nothing101', 'X')).toEqual([]);
  });

  test("Finds both sides of a join's merged key", () => {
    const fullAnalysis = buildSchemasAndValidity(
      new Query(
        query.nodes.filter((node) => node.id !== 'filter101'),
        [
          new Connection('relational101', 'join101', 'leftTds'),
          new Connection('relational102', 'join101', 'rightTds'),
        ],
        'join101',
      ),
    );
    const full = new Query(
      query.nodes.filter((node) => node.id !== 'filter101'),
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    expect(
      findColumnSources(full, fullAnalysis, 'join101', 'CUSTOMER_ID').map(
        (source) => source.id,
      ),
    ).toEqual(['relational101', 'relational102']);
  });

  test("Tells a column Cube typed as a bare String from the model's outline", () => {
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            {
              name: 'NORTHWIND',
              tables: [
                {
                  name: 'ORDERS',
                  isView: false,
                  columnCount: ORDERS_COLUMNS.length,
                  flags: [],
                  untypedColumns: ['SHIP_REGION'],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(
      isUntypedColumn(outline, valid, analysis, 'join101', 'SHIP_REGION'),
    ).toBe(true);
    expect(
      isUntypedColumn(outline, valid, analysis, 'join101', 'SHIP_CITY'),
    ).toBe(false);
    // CUSTOMERS is not in this outline
    expect(isUntypedColumn(outline, valid, analysis, 'join101', 'REGION')).toBe(
      false,
    );
    // no outline yet: no warning
    expect(
      isUntypedColumn(undefined, valid, analysis, 'join101', 'SHIP_REGION'),
    ).toBe(false);
  });
});
