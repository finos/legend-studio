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
import { column } from '../../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import {
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_EXPLODE_COLUMN_NOT_VARIANT,
  MESSAGE_NEW_COLUMN_NAME_EMPTY,
  MESSAGE_NEW_COLUMN_NAME_INVALID,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../../messages/CubeMessages.js';
import { Schema } from '../../../schema/Schema.js';
import { PRIMITIVE_TYPE_PATH } from '../../../types/PrimitiveTypeRegistry.js';
import { Explode } from '../Explode.js';

const EVENTS = new Schema([
  column('ID', 'meta::pure::precisePrimitives::Int'),
  column('PAYLOAD', PRIMITIVE_TYPE_PATH.VARIANT, true),
  column('NOTE', 'String', true),
]);

const errorsOf = (explode: Explode): string[] => {
  const errors: string[] = [];
  explode.validate([EVENTS], errors);
  return errors;
};

describe(unitTest('Explode Array (PLAN §11.20)'), () => {
  test("Keeps the input's columns and adds the element, a Variant that can be empty", () => {
    const explode = new Explode('explode101', 'PAYLOAD', ['items'], 'item');
    expect(explode.type).toBe('explode');
    expect(explode.ports).toEqual(['tds']);
    expect(errorsOf(explode)).toEqual([]);
    const schema = explode.schematize([EVENTS]);
    expect(schema?.names()).toEqual(['ID', 'PAYLOAD', 'NOTE', 'item']);
    expect(schema?.columns[0] === EVENTS.columns[0]).toBe(true);
    const element = schema?.lookup('item');
    expect(element?.type.fullName).toBe(PRIMITIVE_TYPE_PATH.VARIANT);
    expect(element?.nullable).toBe(true);
    // the column may be the array itself
    expect(errorsOf(new Explode('explode101', 'PAYLOAD', [], 'e'))).toEqual([]);
  });

  test('Is unset until a column is picked, and edits keep the id and rest', () => {
    expect(new Explode('explode101').isUnset()).toBe(true);
    const explode = new Explode('explode101', 'PAYLOAD', ['a'], 'x', {
      later: 1,
    });
    expect(explode.isUnset()).toBe(false);
    const edited = explode.with({ path: ['a', 'b'] });
    expect(edited.id).toBe('explode101');
    expect(edited.rest).toEqual({ later: 1 });
    expect([edited.column, edited.path, edited.name]).toEqual([
      'PAYLOAD',
      ['a', 'b'],
      'x',
    ]);
  });

  test('Describes the column, its keys and the new name; redacted, the column only', () => {
    const explode = new Explode(
      'explode101',
      'PAYLOAD',
      ['order', 'items'],
      'item',
    );
    expect(explode.describe()).toBe(
      'Explode Array "PAYLOAD" › "order" › "items" into "item"',
    );
    expect(explode.describeRedacted()).toBe('Explode Array "PAYLOAD"');
    expect(new Explode('explode101').describe()).toBe('Explode Array (blank)');
    expect(new Explode('explode101').describeRedacted()).toBe(
      'Explode Array (blank)',
    );
  });

  test.each<[string, Explode, string[]]>([
    [
      'nothing picked: the column and the name, each reported',
      new Explode('explode101'),
      [
        MESSAGE_DOES_NOT_HAVE_A_NAME('Explode column'),
        MESSAGE_NEW_COLUMN_NAME_EMPTY,
      ],
    ],
    [
      'a column the input does not have',
      new Explode('explode101', 'DOC', [], 'e'),
      [MESSAGE_NOT_IN_INPUT_SCHEMA('Explode column', 'DOC')],
    ],
    [
      'a column that is not a Variant',
      new Explode('explode101', 'NOTE', [], 'e'),
      [MESSAGE_EXPLODE_COLUMN_NOT_VARIANT('NOTE', 'String')],
    ],
    [
      'an empty key',
      new Explode('explode101', 'PAYLOAD', ['items', ''], 'e'),
      [MESSAGE_CANNOT_BE_EMPTY('Path key')],
    ],
    [
      'a name that is not a column name',
      new Explode('explode101', 'PAYLOAD', [], ' e'),
      [MESSAGE_NEW_COLUMN_NAME_INVALID],
    ],
    [
      "an input column's name, in another case",
      new Explode('explode101', 'PAYLOAD', [], 'note'),
      [MESSAGE_ALREADY_IN_INPUT_SCHEMA('Column', 'note')],
    ],
  ])('Refuses %s', (_name, explode, errors) => {
    expect(errorsOf(explode)).toEqual(errors);
    expect(explode.schematize([EVENTS])).toBeUndefined();
  });

  test('Says why a column is not one to explode', () => {
    expect(MESSAGE_EXPLODE_COLUMN_NOT_VARIANT('NOTE', 'String')).toBe(
      'Explode column "NOTE" of type String is not a Variant (JSON) column.',
    );
  });

  test('Refuses settings of the wrong shape', () => {
    expect(() => new Explode('explode101', 1 as never)).toThrow(
      `An explode's column must be a column name`,
    );
    expect(() => new Explode('explode101', 'PAYLOAD', [1] as never)).toThrow(
      `An explode's path must be a list of keys`,
    );
    expect(
      () => new Explode('explode101', 'PAYLOAD', [], null as never),
    ).toThrow(`An explode's name must be a column name`);
  });
});
