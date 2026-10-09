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
import { Rename } from '@finos/legend-cube';
import { CubeRenameDraft } from '../CubeRenameDraft.js';

describe('Rename draft', () => {
  test('Starts from the mappings and gives the original back until something is edited', () => {
    const rename = new Rename(
      'rename101',
      [{ from: 'SHIP_COUNTRY', to: 'Ship Country' }],
      { note: 'kept' },
    );
    const draft = new CubeRenameDraft(rename);
    expect(draft.rows.map(({ from, to }) => [from, to])).toEqual([
      ['SHIP_COUNTRY', 'Ship Country'],
    ]);
    expect(draft.build()).toBe(rename);
  });

  test('Starts a rename with no mapping with one blank row, which builds nothing', () => {
    const rename = new Rename('rename101');
    const draft = new CubeRenameDraft(rename);
    expect(draft.rows).toHaveLength(1);
    expect(draft.mappings).toEqual([]);
    expect(draft.build()).toBe(rename);
  });

  test('Builds the rows that have a name, in order, keeping the new name exactly as typed', () => {
    const draft = new CubeRenameDraft(new Rename('rename101'));
    const [first] = draft.rows;
    draft.setFrom(first?.key as number, 'SHIP_COUNTRY');
    draft.setTo(first?.key as number, ' Ship Country ');
    draft.addRow();
    draft.addRow();
    const third = draft.rows[2]?.key as number;
    draft.setFrom(third, 'ORDER_ID');
    const built = draft.build();
    expect(built.id).toBe('rename101');
    // the untouched middle row is left out; the half-filled one is kept for validation
    expect(built.mappings).toEqual([
      { from: 'SHIP_COUNTRY', to: ' Ship Country ' },
      { from: 'ORDER_ID', to: '' },
    ]);
  });

  test('Gives the original back once the edits are undone by hand', () => {
    const rename = new Rename('rename101', [{ from: 'ORDER_ID', to: 'ID' }]);
    const draft = new CubeRenameDraft(rename);
    const key = draft.rows[0]?.key as number;
    draft.setTo(key, 'Id');
    expect(draft.build().mappings).toEqual([{ from: 'ORDER_ID', to: 'Id' }]);
    draft.setTo(key, 'ID');
    draft.addRow();
    expect(draft.build()).toBe(rename);
    draft.removeRow(key);
    expect(draft.build().mappings).toEqual([]);
  });

  test('Gives each row its own key', () => {
    const draft = new CubeRenameDraft(new Rename('rename101'));
    draft.addRow();
    draft.addRow();
    expect(new Set(draft.rows.map((row) => row.key)).size).toBe(3);
  });
});
