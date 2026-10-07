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
import { column } from '../../__test-utils__/CubeTestNodes.js';
import { Schema } from '../Schema.js';
import { diffSchemas } from '../SchemaDiff.js';

const P = 'meta::pure::precisePrimitives::';
const ID = column('ID', `${P}Int`);
const NAME = column('NAME', `${P}Varchar`, true, [10]);
const CITY = column('CITY', `${P}Varchar`, true, [15]);

const names = (columns: readonly { name: string }[]): string[] =>
  columns.map((entry) => entry.name);

describe(unitTest('Schema diff'), () => {
  test('Finds no difference between identical schemas', () => {
    const schema = new Schema([ID, NAME]);
    const diff = diffSchemas(schema, new Schema([ID, NAME]));
    expect(diff).toEqual({
      added: [],
      removed: [],
      changed: [],
      reordered: false,
    });
  });

  test('Lists added and removed columns, each in the order of its schema', () => {
    const diff = diffSchemas(
      new Schema([ID, NAME, column('OLD_A'), column('OLD_B')]),
      new Schema([column('NEW_B'), ID, column('NEW_A'), NAME]),
    );
    expect(names(diff.added)).toEqual(['NEW_B', 'NEW_A']);
    expect(names(diff.removed)).toEqual(['OLD_A', 'OLD_B']);
    expect(diff.changed).toEqual([]);
    expect(diff.reordered).toBe(false);
  });

  test('Lists a column whose type, type parameters or nullability changed, with both versions', () => {
    const diff = diffSchemas(
      new Schema([ID, NAME, CITY]),
      new Schema([
        column('ID', `${P}BigInt`),
        column('NAME', `${P}Varchar`, true, [40]),
        column('CITY', `${P}Varchar`, false, [15]),
      ]),
    );
    expect(diff.changed.map((change) => change.after.name)).toEqual([
      'ID',
      'NAME',
      'CITY',
    ]);
    expect(diff.changed[0]?.before).toBe(ID);
    expect(diff.changed[2]?.before.nullable).toBe(true);
    expect(diff.changed[2]?.after.nullable).toBe(false);
  });

  test('Says when the columns both schemas have come in another order', () => {
    expect(
      diffSchemas(new Schema([ID, NAME, CITY]), new Schema([NAME, ID, CITY]))
        .reordered,
    ).toBe(true);
    // a column added or removed between them is no reordering
    expect(
      diffSchemas(new Schema([ID, CITY]), new Schema([ID, NAME, CITY]))
        .reordered,
    ).toBe(false);
  });

  test('Has a difference exactly when the schemas are not identical', () => {
    const variants = [
      new Schema([ID, NAME]),
      new Schema([NAME, ID]),
      new Schema([ID]),
      new Schema([ID, column('NAME', `${P}Varchar`, false, [10])]),
    ];
    variants.forEach((before) =>
      variants.forEach((after) => {
        const diff = diffSchemas(before, after);
        const hasDifference =
          diff.added.length > 0 ||
          diff.removed.length > 0 ||
          diff.changed.length > 0 ||
          diff.reordered;
        expect(hasDifference).toBe(!before.isIdenticalTo(after));
      }),
    );
  });
});
