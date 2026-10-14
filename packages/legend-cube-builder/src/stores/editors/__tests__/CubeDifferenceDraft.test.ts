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
  Difference,
  PrimitiveType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  CubeDifferenceDraft,
  getDifferenceColumnUnpickableReason,
} from '../CubeDifferenceDraft.js';

const P = 'meta::pure::precisePrimitives::';
const column = (name: string, path: string, params: number[] = []) =>
  new SchemaColumn(name, PrimitiveType.get(path, params), true);
const LEFT = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('SHIP_VIA', `${P}SmallInt`),
  column('FREIGHT', `${P}Double`),
  column('SHIP_CITY', `${P}Varchar`, [15]),
  column('DISCOUNT', `${P}Double`),
  column('QTY', `${P}Int`),
]);
const RIGHT = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('SHIP_VIA', `${P}SmallInt`),
  column('FREIGHT', `${P}Double`),
  column('QTY', `${P}BigInt`),
]);

const difference = (): Difference =>
  new Difference('difference101', {
    leftColumns: ['ORDER_ID'],
    rightColumns: ['ORDER_ID'],
    differenceColumns: ['FREIGHT', 'SHIP_VIA'],
  });

describe('Difference draft', () => {
  test('Builds the original difference until something changes, or when the edits are undone by hand', () => {
    const original = difference();
    const draft = new CubeDifferenceDraft(original);
    expect(draft.build() === original).toBe(true);
    expect(draft.pairs.map(({ left, right }) => [left, right])).toEqual([
      ['ORDER_ID', 'ORDER_ID'],
    ]);
    // a saved order is kept until the picks change
    expect(draft.differenceColumns).toEqual(['FREIGHT', 'SHIP_VIA']);
    draft.addPair();
    expect(draft.build() === original).toBe(true);
    draft.toggleDifferenceColumn('SHIP_VIA', LEFT);
    expect(draft.build().differenceColumns).toEqual(['FREIGHT']);
    draft.toggleDifferenceColumn('SHIP_VIA', LEFT);
    // the picks follow the Left input's order once they change
    expect(draft.differenceColumns).toEqual(['SHIP_VIA', 'FREIGHT']);
    expect(draft.build() === original).toBe(false);
  });

  test('Builds a difference of the same id with the edited key pairs and difference columns', () => {
    const draft = new CubeDifferenceDraft(difference());
    const [pair] = draft.pairs;
    draft.setRightColumn(pair?.key ?? 0, 'ORDER_REF');
    draft.addPair();
    const added = draft.pairs[1];
    draft.setLeftColumn(added?.key ?? 0, 'SHIP_CITY');
    draft.clearDifferenceColumns();
    draft.toggleDifferenceColumn('QTY', LEFT);
    const built = draft.build();
    expect(built.id).toBe('difference101');
    expect(built.leftColumns).toEqual(['ORDER_ID', 'SHIP_CITY']);
    expect(built.rightColumns).toEqual(['ORDER_REF', '']);
    expect(built.differenceColumns).toEqual(['QTY']);
    draft.removePair(added?.key ?? 0);
    expect(draft.build().leftColumns).toEqual(['ORDER_ID']);
  });

  test("Says why a Left column can't be a difference column: a join column, not a number, or not in the Right input with its type", () => {
    const reasonOf = (name: string): string | undefined =>
      getDifferenceColumnUnpickableReason(
        LEFT.lookup(name) as SchemaColumn,
        RIGHT,
        ['ORDER_ID', 'ORDER_REF'],
      );
    expect(reasonOf('ORDER_ID')).toBe('a join column');
    expect(reasonOf('SHIP_VIA')).toBe(undefined);
    expect(reasonOf('FREIGHT')).toBe(undefined);
    expect(reasonOf('SHIP_CITY')).toBe('not a number');
    expect(reasonOf('DISCOUNT')).toBe('not in the Right input');
    expect(reasonOf('QTY')).toBe('BigInt in the Right input');
  });
});
