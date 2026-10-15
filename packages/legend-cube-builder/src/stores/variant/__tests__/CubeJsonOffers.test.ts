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
  type CubeJsonField,
  getCubeJsonFields,
  getFreeCubeColumnName,
} from '../CubeJsonOffers.js';
import { inferCubeJsonShape } from '../CubeJsonShape.js';

const DOCUMENTS = [
  '{"user":{"name":"ann","tier":"gold"},"amount":12.5,"tags":["a","b"],"items":[{"sku":"x","qty":2},{"sku":"y","qty":1}]}',
  '{"user":{"name":"bob","tier":"silver"},"amount":7,"tags":["a"],"items":[{"sku":"z","qty":5}]}',
  '{"user":{"name":"cy"},"amount":3,"tags":[],"items":[]}',
  null,
];

const fieldAt = (
  root: CubeJsonField,
  ...path: string[]
): CubeJsonField | undefined =>
  path.reduce<CubeJsonField | undefined>(
    (field, key) => field?.children.find((child) => child.path.at(-1) === key),
    root,
  );

/** A field's offers, as `key: code` */
const offersOf = (field: CubeJsonField | undefined): Record<string, string> =>
  Object.fromEntries(
    (field?.offers ?? []).map((offer) => [
      offer.key,
      offer.code ??
        `explode ${offer.explode?.column}.${offer.explode?.path.join('.')}`,
    ]),
  );

describe('Explore JSON’s fields and offers (PLAN §11.20)', () => {
  const root = getCubeJsonFields('payload', inferCubeJsonShape(DOCUMENTS));

  test('Lists the fields in order, each with what it held and its share of the places it could be', () => {
    expect(root.path).toEqual([]);
    expect(root.description).toBe('object');
    // three documents of the four rows: one is empty
    expect(root.presence).toBe(0.75);
    expect(root.children.map((child) => child.path.join('.'))).toEqual([
      'amount',
      'items',
      'tags',
      'user',
    ]);
    expect(fieldAt(root, 'user', 'tier')).toMatchObject({
      description: 'text',
      // in two of the three user objects
      presence: 2 / 3,
      topValues: ['gold', 'silver'],
    });
    expect(fieldAt(root, 'amount')?.description).toBe('number');
    expect(fieldAt(root, 'items')?.description).toBe('list of object');
    // an array's elements' fields are offers of the array, not fields
    expect(fieldAt(root, 'items')?.children).toEqual([]);
  });

  test("Offers a scalar's value with the type the sample shows, and an object's keys", () => {
    expect(offersOf(fieldAt(root, 'user', 'name'))).toEqual({
      value: "x | $x.payload->get('user')->get('name')->to(@String)",
    });
    expect(offersOf(fieldAt(root, 'amount'))).toEqual({
      value: "x | $x.payload->get('amount')->to(@Float)",
    });
    expect(offersOf(fieldAt(root, 'user'))).toEqual({
      json: "x | $x.payload->get('user')",
      keys: "x | $x.payload->get('user')->to(@Map<String, Variant>)->toOne()->keys()->joinStrings(', ')",
    });
    // the column itself: its keys, never itself as JSON
    expect(offersOf(root)).toEqual({
      keys: "x | $x.payload->to(@Map<String, Variant>)->toOne()->keys()->joinStrings(', ')",
    });
  });

  test("Offers an array's count, its elements as rows, its values as text, and whether it contains each frequent value", () => {
    expect(offersOf(fieldAt(root, 'tags'))).toEqual({
      json: "x | $x.payload->get('tags')",
      explode: 'explode payload.tags',
      count: "x | $x.payload->get('tags')->toMany(@Variant)->size()",
      list: "x | $x.payload->get('tags')->toMany(@Variant)->map(e | $e->to(@String))->joinStrings(', ')",
      'contains:a':
        "x | $x.payload->get('tags')->toMany(@Variant)->map(e | $e->to(@String))->contains('a')",
      'contains:b':
        "x | $x.payload->get('tags')->toMany(@Variant)->map(e | $e->to(@String))->contains('b')",
    });
  });

  test("Offers an array of objects' first element, and each scalar field's first value and, for numbers, total", () => {
    expect(offersOf(fieldAt(root, 'items'))).toEqual({
      json: "x | $x.payload->get('items')",
      explode: 'explode payload.items',
      count: "x | $x.payload->get('items')->toMany(@Variant)->size()",
      first: "x | $x.payload->get('items')->get(0)",
      'first:qty':
        "x | $x.payload->get('items')->get(0)->get('qty')->to(@Integer)",
      'total:qty':
        "x | $x.payload->get('items')->toMany(@Variant)->map(e | $e->get('qty')->to(@Integer))->sum()",
      'first:sku':
        "x | $x.payload->get('items')->get(0)->get('sku')->to(@String)",
    });
    const items = fieldAt(root, 'items');
    expect(
      items?.offers.find((offer) => offer.key === 'total:qty'),
    ).toMatchObject({
      name: 'payload_items_qty_total',
      type: 'Integer',
      label: 'total of qty',
    });
  });

  test("Names a column from its path, and writes names and keys that aren't identifiers quoted", () => {
    const quoted = getCubeJsonFields(
      'my col',
      inferCubeJsonShape(['{"it\'s": {"a-b": 1}}']),
    );
    const field = fieldAt(quoted, "it's", 'a-b');
    expect(field?.offers[0]).toMatchObject({
      name: 'my_col_it_s_a_b',
      type: 'Integer',
      code: "x | $x.'my col'->get('it\\'s')->get('a-b')->to(@Integer)",
    });
  });

  test("Writes a Float list's contains with a point, and offers none for a number Pure can't write", () => {
    const numbers = getCubeJsonFields(
      'p',
      inferCubeJsonShape(['{"v": [2, 2.5, 1e3]}']),
    );
    expect(offersOf(fieldAt(numbers, 'v'))).toMatchObject({
      'contains:2':
        "x | $x.p->get('v')->toMany(@Variant)->map(e | $e->to(@Float))->contains(2.0)",
      'contains:2.5':
        "x | $x.p->get('v')->toMany(@Variant)->map(e | $e->to(@Float))->contains(2.5)",
    });
    expect(offersOf(fieldAt(numbers, 'v'))['contains:1e3']).toBeUndefined();
  });

  test('Offers the value of a column of scalars, as after an explode', () => {
    const scalars = getCubeJsonFields(
      'item',
      inferCubeJsonShape(['"a"', '"b"', null]),
    );
    expect(scalars.offers).toEqual([
      {
        key: 'value',
        label: 'the value, as String',
        name: 'item_value',
        type: 'String',
        code: 'x | $x.item->to(@String)',
      },
    ]);
  });

  test('Finds a free name, compared folded', () => {
    expect(getFreeCubeColumnName('a', ['b'])).toBe('a');
    expect(getFreeCubeColumnName('a', ['A', 'a_2'])).toBe('a_3');
  });
});
