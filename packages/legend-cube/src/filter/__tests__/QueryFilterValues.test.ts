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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { FilterOperator } from '../FilterOperator.js';
import { ColumnComparisonFilter, type FilterValue } from '../FilterTree.js';
import { rereadQueryFilterValues } from '../QueryFilterValues.js';

const P = 'meta::pure::precisePrimitives::';

const invalid = (text: string): FilterValue => ({ kind: 'invalid', text });

/** LINES (QTY: a TinyInt or a SmallInt) ⋈ ITEMS on ID, then QTY = '300' */
const joinedQuery = (qtyType: string): Query =>
  new Query(
    [
      resolvedTable('relational101', 'LINES', [
        column('ID', `${P}Int`),
        column('QTY', `${P}${qtyType}`, true),
      ]),
      resolvedTable('relational102', 'ITEMS', [
        column('ID', `${P}Int`),
        column('NAME', `${P}Varchar`, true, [10]),
      ]),
      new Join('join101', {
        leftColumns: ['ID'],
        rightColumns: ['ID'],
        joinType: JoinType.INNER,
      }),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('QTY', FilterOperator.EQUAL, invalid('300')),
      ),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
      new Connection('join101', 'filter101', 'tds'),
    ],
    'filter101',
  );

const filterValue = (query: Query): FilterValue | undefined =>
  ((query.getNode('filter101') as Filter).filter as ColumnComparisonFilter)
    .value;

const reread = (query: Query): Query =>
  rereadQueryFilterValues(query, buildSchemasAndValidity(query).schemas);

describe(unitTest("Reading a query's filter values again"), () => {
  test("Reads a Filter's invalid value against its input, behind a Join", () => {
    const query = joinedQuery('SmallInt');
    expect(
      buildSchemasAndValidity(query).validity.get('filter101'),
    ).not.toEqual([]);
    const result = reread(query);
    expect(filterValue(result)).toEqual({ kind: 'integer', value: '300' });
    expect(buildSchemasAndValidity(result).validity.get('filter101')).toEqual(
      [],
    );
    // only the Filter is new
    expect(result.getNode('join101')).toBe(query.getNode('join101'));
    expect(result.selected).toBe('filter101');
  });

  test('Keeps text that still is not a value of the input column, and gives back the query itself', () => {
    const query = joinedQuery('TinyInt');
    expect(reread(query)).toBe(query);
  });

  test('Passes over a Filter with no filter or no input', () => {
    const query = new Query(
      [new Filter('filter101'), new Filter('filter102')],
      [],
      'filter101',
    );
    expect(reread(query)).toBe(query);
  });
});
