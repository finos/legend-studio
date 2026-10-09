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
import { Sort, SortDirection } from '@finos/legend-cube';
import { CubeSortDraft } from '../CubeSortDraft.js';

const { ASC, DESC } = SortDirection;

const columnsOf = (draft: CubeSortDraft): string[] =>
  draft.rows.map(({ column }) => column);

describe('Sort draft', () => {
  test('Opens with a row per key and gives the original back until the keys change', () => {
    const sort = new Sort(
      'sort101',
      [
        { column: 'SHIP_COUNTRY', direction: DESC },
        { column: 'ORDER_ID', direction: ASC },
      ],
      { note: 'kept' },
    );
    const draft = new CubeSortDraft(sort);
    expect(
      draft.rows.map(({ column, direction }) => ({ column, direction })),
    ).toEqual(sort.sorts);
    expect(draft.build()).toBe(sort);
    // a blank row added and nothing picked: the same keys
    draft.addRow();
    expect(draft.build().sorts).toEqual(sort.sorts);
  });

  test('Opens a sort without keys with one blank ascending row', () => {
    const sort = new Sort('sort101');
    const draft = new CubeSortDraft(sort);
    expect(draft.rows).toHaveLength(1);
    expect(draft.rows[0]).toMatchObject({ column: '', direction: ASC });
    expect(draft.build()).toBe(sort);
  });

  test('Builds the picked keys in order, with the same id and saved keys, blank rows left out', () => {
    const sort = new Sort('sort101', [], { note: 'kept' });
    const draft = new CubeSortDraft(sort);
    const [first] = draft.rows;
    draft.setColumn(first?.key ?? -1, 'ORDER_ID');
    draft.setDirection(first?.key ?? -1, DESC);
    draft.addRow();
    draft.addRow();
    draft.setColumn(draft.rows[2]?.key ?? -1, 'SHIP_COUNTRY');
    const built = draft.build();
    expect(built).toBeInstanceOf(Sort);
    expect(built.id).toBe('sort101');
    expect(built.sorts).toEqual([
      { column: 'ORDER_ID', direction: DESC },
      { column: 'SHIP_COUNTRY', direction: ASC },
    ]);
    expect(built.rest).toBe(sort.rest);
  });

  test('Moves a row up or down, never past either end', () => {
    const draft = new CubeSortDraft(
      new Sort('sort101', [
        { column: 'A', direction: ASC },
        { column: 'B', direction: ASC },
        { column: 'C', direction: DESC },
      ]),
    );
    const [a, , c] = draft.rows;
    draft.moveRow(c?.key ?? -1, -1);
    expect(columnsOf(draft)).toEqual(['A', 'C', 'B']);
    draft.moveRow(a?.key ?? -1, -1);
    draft.moveRow(c?.key ?? -1, 1);
    draft.moveRow(c?.key ?? -1, 1);
    expect(columnsOf(draft)).toEqual(['A', 'B', 'C']);
    draft.moveRow(a?.key ?? -1, 1);
    expect(columnsOf(draft)).toEqual(['B', 'A', 'C']);
    expect(draft.build().sorts).toEqual([
      { column: 'B', direction: ASC },
      { column: 'A', direction: ASC },
      { column: 'C', direction: DESC },
    ]);
  });

  test('Removes rows, down to no key at all', () => {
    const draft = new CubeSortDraft(
      new Sort('sort101', [{ column: 'A', direction: ASC }]),
    );
    draft.removeRow(draft.rows[0]?.key ?? -1);
    expect(draft.rows).toEqual([]);
    expect(draft.build().sorts).toEqual([]);
  });

  test('Gives the original back once the rows are put back', () => {
    const sort = new Sort('sort101', [{ column: 'A', direction: ASC }]);
    const draft = new CubeSortDraft(sort);
    const key = draft.rows[0]?.key ?? -1;
    draft.setDirection(key, DESC);
    expect(draft.build()).not.toBe(sort);
    draft.setDirection(key, ASC);
    expect(draft.build()).toBe(sort);
  });

  test('Keeps a saved key without a column until the rows change, and removes it with its row', () => {
    // an imported spec can hold a key without a column, which a row can't build
    const sort = new Sort('sort101', [
      { column: '', direction: DESC },
      { column: 'A', direction: ASC },
    ]);
    const draft = new CubeSortDraft(sort);
    expect(columnsOf(draft)).toEqual(['', 'A']);
    expect(draft.build()).toBe(sort);
    draft.setDirection(draft.rows[1]?.key ?? -1, DESC);
    expect(draft.build().sorts).toEqual([{ column: 'A', direction: DESC }]);
    // only its row removed: the rest as saved
    const again = new CubeSortDraft(sort);
    again.removeRow(again.rows[0]?.key ?? -1);
    expect(again.build().sorts).toEqual([{ column: 'A', direction: ASC }]);
  });
});
