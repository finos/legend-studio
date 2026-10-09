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
  column,
  resolvedTable,
} from '../../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../../graph/Connection.js';
import { Query } from '../../../graph/Query.js';
import { buildSchemasAndValidity } from '../../../inference/SchemaInference.js';
import { Schema, type SchemaColumn } from '../../../schema/Schema.js';
import { Filter } from '../Filter.js';
import { Join, JoinType } from '../Join.js';
import {
  canFixJoinDuplicates,
  fixJoinDuplicates,
  planJoinDuplicateFix,
} from '../JoinAutofix.js';
import { Rename } from '../Rename.js';

const P = 'meta::pure::precisePrimitives::';
const int = (name: string): SchemaColumn => column(name, `${P}Int`);
const text = (name: string): SchemaColumn =>
  column(name, `${P}Varchar`, true, [20]);

// ORDER_DETAILS ⋈ PRODUCTS on PRODUCT_ID shares UNIT_PRICE (PLAN §11.2 A.7)
const ORDER_DETAILS = [int('ORDER_ID'), int('PRODUCT_ID'), int('UNIT_PRICE')];
const PRODUCTS = [int('PRODUCT_ID'), text('PRODUCT_NAME'), int('UNIT_PRICE')];

/** relational101 (left) and relational102 (right) joined as join101, selected */
const joined = (
  left: SchemaColumn[],
  right: SchemaColumn[],
  leftColumns: string[],
  rightColumns: string[],
  selected = 'join101',
): Query =>
  new Query(
    [
      resolvedTable('relational101', 'L', left),
      resolvedTable('relational102', 'R', right),
      new Join('join101', {
        leftColumns,
        rightColumns,
        joinType: JoinType.INNER,
      }),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
    ],
    selected,
  );

/** The query fixed with its inputs' schemas */
const fix = (query: Query): Query => {
  const [left, right] = query
    .getInputIds('join101')
    .map((id) => buildSchemasAndValidity(query).schemas.get(id ?? ''));
  return fixJoinDuplicates(query, 'join101', left, right);
};

const canFix = (query: Query): boolean => {
  const { schemas } = buildSchemasAndValidity(query);
  const [left, right] = query
    .getInputIds('join101')
    .map((id) => schemas.get(id ?? ''));
  return canFixJoinDuplicates(query, 'join101', left, right);
};

const mappingsOf = (query: Query, id: string): string[] =>
  (query.getNode(id) as Rename).mappings.map(
    ({ from, to }) => `${from}->${to}`,
  );

describe(unitTest('Join autofix'), () => {
  test('Renames each shared column on both sides, c_1 and c_2, never a key spelled the same', () => {
    const query = joined(
      ORDER_DETAILS,
      PRODUCTS,
      ['PRODUCT_ID'],
      ['PRODUCT_ID'],
    );
    expect(canFix(query)).toBe(true);
    const fixed = fix(query);
    expect(mappingsOf(fixed, 'rename101')).toEqual([
      'UNIT_PRICE->UNIT_PRICE_1',
    ]);
    expect(mappingsOf(fixed, 'rename102')).toEqual([
      'UNIT_PRICE->UNIT_PRICE_2',
    ]);
    const join = fixed.getNode('join101') as Join;
    expect(join.leftColumns).toEqual(['PRODUCT_ID']);
    expect(join.rightColumns).toEqual(['PRODUCT_ID']);
    const { validity, schemas } = buildSchemasAndValidity(fixed);
    expect(validity.get('join101')).toEqual([]);
    expect(schemas.get('join101')?.names()).toEqual([
      'PRODUCT_ID',
      'ORDER_ID',
      'UNIT_PRICE_1',
      'PRODUCT_NAME',
      'UNIT_PRICE_2',
    ]);
  });

  test('Splices each Rename before its input, on the same port, as one query', () => {
    const fixed = fix(
      joined(ORDER_DETAILS, PRODUCTS, ['PRODUCT_ID'], ['PRODUCT_ID']),
    );
    expect(fixed.getInputIds('join101')).toEqual(['rename101', 'rename102']);
    expect(fixed.getInputIds('rename101')).toEqual(['relational101']);
    expect(fixed.getInputIds('rename102')).toEqual(['relational102']);
  });

  test('Takes the next free name when c_1 or c_2 is taken in either input', () => {
    // CITY_1 is the right input's, CITY_2 the left's
    const left = [int('ID'), int('CITY'), int('CITY_2')];
    const right = [int('ID'), int('CITY'), int('CITY_1')];
    const fixed = fix(joined(left, right, ['ID'], ['ID']));
    expect(mappingsOf(fixed, 'rename101')).toEqual(['CITY->CITY_1_2']);
    expect(mappingsOf(fixed, 'rename102')).toEqual(['CITY->CITY_2_2']);
    expect(buildSchemasAndValidity(fixed).validity.get('join101')).toEqual([]);
  });

  test('Never gives two shared columns the same name', () => {
    // A_1 is free in both inputs but would be given twice: to A, and to A_1's own rename
    const left = [int('ID'), int('A'), int('A_1')];
    const right = [int('ID'), int('A'), int('A_1')];
    const fixed = fix(joined(left, right, ['ID'], ['ID']));
    expect(mappingsOf(fixed, 'rename101')).toEqual(['A->A_1_2', 'A_1->A_1_1']);
    expect(mappingsOf(fixed, 'rename102')).toEqual(['A->A_2', 'A_1->A_1_2_2']);
    expect(buildSchemasAndValidity(fixed).validity.get('join101')).toEqual([]);
  });

  test('Rewrites a key it renames, so a key at another position or crossed keys still join', () => {
    // A ⋈ B: both inputs have A and B, neither spelled the same at its position
    const left = [int('A'), int('B'), int('L')];
    const right = [int('A'), int('B'), int('R')];
    const fixed = fix(joined(left, right, ['A'], ['B']));
    const join = fixed.getNode('join101') as Join;
    expect(join.leftColumns).toEqual(['A_1']);
    expect(join.rightColumns).toEqual(['B_2']);
    expect(buildSchemasAndValidity(fixed).validity.get('join101')).toEqual([]);
    // crossed keys
    const crossed = fix(joined(left, right, ['A', 'B'], ['B', 'A']));
    const crossedJoin = crossed.getNode('join101') as Join;
    expect(crossedJoin.leftColumns).toEqual(['A_1', 'B_1']);
    expect(crossedJoin.rightColumns).toEqual(['B_2', 'A_2']);
    expect(buildSchemasAndValidity(crossed).validity.get('join101')).toEqual(
      [],
    );
  });

  test('Keeps the selection where it was, on an input or after the join', () => {
    const onInput = fix(
      joined(
        ORDER_DETAILS,
        PRODUCTS,
        ['PRODUCT_ID'],
        ['PRODUCT_ID'],
        'relational101',
      ),
    );
    expect(onInput.selected).toBe('relational101');
    const onJoin = fix(
      joined(ORDER_DETAILS, PRODUCTS, ['PRODUCT_ID'], ['PRODUCT_ID']),
    );
    expect(onJoin.selected).toBe('join101');
  });

  test('Gives the Renames ids no node has, the second from the query that holds the first', () => {
    const query = joined(
      ORDER_DETAILS,
      PRODUCTS,
      ['PRODUCT_ID'],
      ['PRODUCT_ID'],
    );
    const withRename = new Query(
      [...query.nodes, new Rename('rename101')],
      query.connections,
      query.selected,
    );
    const fixed = fix(withRename);
    expect(fixed.getInputIds('join101')).toEqual(['rename102', 'rename103']);
  });

  test('Takes the next free name when c_1 is taken in another case', () => {
    // a database that compares names without case takes ID_1 for id_1
    const fixed = fix(
      joined(
        [int('ID'), int('id_1'), int('X')],
        [int('ID'), int('X')],
        ['X'],
        ['X'],
      ),
    );
    expect(mappingsOf(fixed, 'rename101')).toEqual(['ID->ID_1_2']);
    expect(mappingsOf(fixed, 'rename102')).toEqual(['ID->ID_2']);
  });

  test('Gives all Left names before any Right name', () => {
    const fixed = fix(
      joined(
        [int('ID'), int('A_1'), int('A')],
        [int('ID'), int('A'), int('A_1')],
        ['ID'],
        ['ID'],
      ),
    );
    expect(mappingsOf(fixed, 'rename101')).toEqual(['A_1->A_1_1', 'A->A_1_2']);
    expect(mappingsOf(fixed, 'rename102')).toEqual(['A_1->A_1_2_2', 'A->A_2']);
    expect(buildSchemasAndValidity(fixed).validity.get('join101')).toEqual([]);
  });

  test('Cuts a long name by code points, never through a surrogate pair', () => {
    const smiles = '\u{1F600}'.repeat(128);
    const fixed = fix(
      joined(
        [int('ID'), int(smiles)],
        [int('ID'), int(smiles)],
        ['ID'],
        ['ID'],
      ),
    );
    expect(mappingsOf(fixed, 'rename101')).toEqual([
      `${smiles}->${'\u{1F600}'.repeat(126)}_1`,
    ]);
    expect(mappingsOf(fixed, 'rename102')).toEqual([
      `${smiles}->${'\u{1F600}'.repeat(126)}_2`,
    ]);
    const mixed = `a${'\u{1F600}'.repeat(127)}`;
    const cut = fix(
      joined([int('ID'), int(mixed)], [int('ID'), int(mixed)], ['ID'], ['ID']),
    );
    expect(mappingsOf(cut, 'rename101')).toEqual([
      `${mixed}->a${'\u{1F600}'.repeat(125)}_1`,
    ]);
  });

  test('Cuts a long name to 128 code points', () => {
    const long = 'x'.repeat(128);
    const fixed = fix(
      joined([int('ID'), int(long)], [int('ID'), int(long)], ['ID'], ['ID']),
    );
    const [mapping] = (fixed.getNode('rename101') as Rename).mappings;
    expect(mapping?.to).toBe(`${'x'.repeat(126)}_1`);
    expect(Array.from(mapping?.to ?? '')).toHaveLength(128);
  });

  test('Plans nothing when the inputs share no column the join is not on', () => {
    expect(
      planJoinDuplicateFix(
        new Join('join101', { leftColumns: ['ID'], rightColumns: ['ID'] }),
        new Schema([int('ID'), int('A')]),
        new Schema([int('ID'), int('B')]),
      ),
    ).toBeUndefined();
  });

  test.each<[string, () => Query]>([
    [
      'a join that is fine',
      () =>
        joined([int('ID'), int('A')], [int('ID'), int('B')], ['ID'], ['ID']),
    ],
    ['a join with no keys yet', () => joined(ORDER_DETAILS, PRODUCTS, [], [])],
    [
      'a join whose key is missing',
      () => joined(ORDER_DETAILS, PRODUCTS, ['NOPE'], ['PRODUCT_ID']),
    ],
    [
      'a join with one input',
      () =>
        new Query(
          [
            resolvedTable('relational101', 'L', ORDER_DETAILS),
            new Join('join101', {
              leftColumns: ['PRODUCT_ID'],
              rightColumns: ['PRODUCT_ID'],
            }),
          ],
          [new Connection('relational101', 'join101', 'leftTds')],
          'join101',
        ),
    ],
    [
      'a shared column whose new name would not be valid',
      () =>
        joined(
          [int('ID'), int('say "hi"')],
          [int('ID'), int('say "hi"')],
          ['ID'],
          ['ID'],
        ),
    ],
  ])('Refuses %s', (_, query) => {
    expect(canFix(query())).toBe(false);
    expect(() => fix(query())).toThrow(
      `Can't fix the duplicate columns of join`,
    );
  });

  test('Refuses a node that is not a join, and missing schemas', () => {
    const query = new Query(
      [
        resolvedTable('relational101', 'L', ORDER_DETAILS),
        new Filter('filter101'),
      ],
      [new Connection('relational101', 'filter101', 'tds')],
      'filter101',
    );
    expect(
      canFixJoinDuplicates(query, 'filter101', new Schema([]), new Schema([])),
    ).toBe(false);
    const join = joined(
      ORDER_DETAILS,
      PRODUCTS,
      ['PRODUCT_ID'],
      ['PRODUCT_ID'],
    );
    expect(
      canFixJoinDuplicates(join, 'join101', undefined, new Schema(PRODUCTS)),
    ).toBe(false);
  });
});
