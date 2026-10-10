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
import { createNodeRegistry } from '@finos/legend-cube';
import { toEditorTitle } from '../LegendCubeLabels.js';

/** Every registered node type's editor title */
const TITLES: Record<string, string> = {
  relational: 'Relational Database Table',
  dataProductAccessPoint: 'Data Product',
  sort: 'Sort By Column',
  group: 'Group By Column',
  filter: 'Filter By Column',
  restrict: 'Restrict Columns',
  rename: 'Rename Columns',
  distinct: 'Distinct Values',
  drop: 'Drop First <x> Rows',
  limit: 'Take First <x> Rows',
  slice: 'Take Rows <x> To <y>',
  concat: 'Concatenate Another Input',
  join: 'Join Another Input',
};

describe("A node editor's title", () => {
  test('Capitalises each word of every registered node label', () => {
    const registry = createNodeRegistry();
    const definitions = [...registry.sources, ...registry.transforms];
    expect(definitions.map((definition) => definition.type).sort()).toEqual(
      Object.keys(TITLES).sort(),
    );
    definitions.forEach((definition) =>
      expect(toEditorTitle(definition.label)).toBe(TITLES[definition.type]),
    );
  });

  test('Capitalises a leading lowercase word', () => {
    expect(toEditorTitle('take rows')).toBe('Take Rows');
    expect(toEditorTitle('x')).toBe('X');
  });

  test('Keeps the spacing between words as it is', () => {
    expect(toEditorTitle('Sort  by   column')).toBe('Sort  By   Column');
    expect(toEditorTitle(' sort\tby')).toBe(' Sort\tBy');
  });

  test('Leaves capitals and letters inside a word as they are', () => {
    expect(toEditorTitle('Sort BY cOLUMN')).toBe('Sort BY COLUMN');
    expect(toEditorTitle('Unknown')).toBe('Unknown');
  });

  test('Leaves a word that starts with something other than a letter as it is', () => {
    expect(toEditorTitle('rows <x> (first) 2nd')).toBe('Rows <x> (first) 2nd');
  });

  test('Leaves an empty label empty', () => {
    expect(toEditorTitle('')).toBe('');
  });
});
