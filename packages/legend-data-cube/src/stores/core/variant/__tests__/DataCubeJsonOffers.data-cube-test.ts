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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type DataCubeJsonSample,
  DataCubeJsonShapeReader,
} from '../DataCubeJsonShape.js';
import {
  _pureColumnAccess,
  _pureStringLiteral,
  filterDataCubeJsonFields,
  getDataCubeJsonFields,
  getFreeDataCubeColumnName,
  type DataCubeJsonField,
} from '../DataCubeJsonOffers.js';
import { DataCubeColumnKind } from '../../DataCubeQueryEngine.js';

function inferDataCubeJsonShape(
  values: unknown[],
  complete = false,
): DataCubeJsonSample {
  const reader = new DataCubeJsonShapeReader();
  values.forEach((value) => reader.add(value));
  return reader.result(complete);
}

const ORDERS = [
  {
    order_id: 5000,
    customer: {
      name: 'Stark',
      tier: 'bronze',
      contact: { email: 'stark@example.com' },
      addresses: [{ kind: 'billing', city: 'Paris' }],
    },
    items: [
      { sku: 'MS-01', qty: 5, price: 39.5 },
      { sku: 'HS-01', qty: 1, price: 119 },
    ],
    tags: ['b2b', 'returning'],
  },
  {
    order_id: 5001,
    customer: {
      name: 'Wonka',
      tier: 'bronze',
      addresses: [
        { kind: 'billing', city: 'New York' },
        { kind: 'shipping', city: 'Tokyo' },
      ],
    },
    items: [{ sku: 'HS-01', qty: 4, price: 119 }],
    tags: [],
  },
  {
    order_id: 5002,
    customer: {
      name: 'Initech',
      tier: 'silver',
      addresses: [{ kind: 'billing', city: 'Berlin' }],
    },
    items: [],
    tags: ['promo'],
  },
].map((order) => JSON.stringify(order));

const nameOf = (field: DataCubeJsonField) => field.path[field.path.length - 1];

const fieldAt = (field: DataCubeJsonField, path: string[]): DataCubeJsonField =>
  path.reduce(
    (current, key) =>
      guaranteeNonNullable(
        current.children.find((child) => nameOf(child) === key),
        `Can't find field '${key}'`,
      ),
    field,
  );

const offerOf = (field: DataCubeJsonField, key: string) =>
  guaranteeNonNullable(
    field.offers.find((offer) => offer.key === key),
    `Can't find offer '${key}'`,
  );

describe(
  unitTest(`Variant: fields of JSON documents and the columns they can become`),
  () => {
    const fields = getDataCubeJsonFields('doc', inferDataCubeJsonShape(ORDERS));

    test(`lists the fields of the documents, sorted by name, with what they held and how often`, () => {
      expect(fields.description).toBe('object');
      expect(fields.children.map(nameOf)).toEqual([
        'customer',
        'items',
        'order_id',
        'tags',
      ]);
      const customer = fieldAt(fields, ['customer']);
      expect(customer.children.map(nameOf)).toEqual([
        'addresses',
        'contact',
        'name',
        'tier',
      ]);
      expect(fieldAt(fields, ['customer', 'contact']).presence).toBeCloseTo(
        1 / 3,
      );
      expect(fieldAt(fields, ['customer', 'tier']).topValues).toEqual([
        'bronze',
        'silver',
      ]);
      expect(fieldAt(fields, ['customer', 'addresses']).children).toEqual([]);
      expect(fieldAt(fields, ['items']).description).toBe('array of object');
    });

    test(`offers the value of a field, typed`, () => {
      expect(offerOf(fieldAt(fields, ['customer', 'tier']), 'value')).toEqual({
        key: 'value',
        label: 'as String',
        name: 'doc_customer_tier',
        type: 'String',
        kind: DataCubeColumnKind.DIMENSION,
        code: `x|$x.doc->get('customer')->get('tier')->to(@String)`,
      });
      expect(offerOf(fieldAt(fields, ['order_id']), 'value')).toMatchObject({
        name: 'doc_order_id',
        type: 'Integer',
        kind: DataCubeColumnKind.DIMENSION,
        code: `x|$x.doc->get('order_id')->to(@Integer)`,
      });
      expect(
        offerOf(fieldAt(fields, ['customer', 'contact', 'email']), 'value')
          .code,
      ).toBe(
        `x|$x.doc->get('customer')->get('contact')->get('email')->to(@String)`,
      );
    });

    test(`offers a nested object or array as JSON, and the keys of an object, but not the column itself as JSON`, () => {
      expect(offerOf(fieldAt(fields, ['customer']), 'json')).toMatchObject({
        name: 'doc_customer',
        type: 'Variant',
        code: `x|$x.doc->get('customer')`,
      });
      expect(offerOf(fieldAt(fields, ['customer']), 'keys')).toMatchObject({
        name: 'doc_customer_keys',
        type: 'String',
        code: `x|$x.doc->get('customer')->to(@Map<String, Variant>)->toOne()->keys()->joinStrings(', ')`,
      });
      expect(fields.offers.map((offer) => offer.key)).toEqual(['keys']);
    });

    test(`offers the number of elements of an array, but not to explode it`, () => {
      const addresses = fieldAt(fields, ['customer', 'addresses']);
      expect(offerOf(addresses, 'count')).toMatchObject({
        name: 'doc_customer_addresses_count',
        type: 'Integer',
        kind: DataCubeColumnKind.MEASURE,
        code: `x|$x.doc->get('customer')->get('addresses')->toMany(@Variant)->size()`,
      });
      expect(addresses.offers.some((offer) => offer.key === 'explode')).toBe(
        false,
      );
    });

    test(`offers the first element of an array of objects, the fields of its first element, and the totals of its numeric fields`, () => {
      const items = fieldAt(fields, ['items']);
      expect(offerOf(items, 'first').code).toBe(
        `x|$x.doc->get('items')->get(0)`,
      );
      expect(offerOf(items, 'first:sku')).toMatchObject({
        name: 'doc_items_first_sku',
        type: 'String',
        code: `x|$x.doc->get('items')->get(0)->get('sku')->to(@String)`,
      });
      expect(offerOf(items, 'first:price')).toMatchObject({
        type: 'Float',
        kind: DataCubeColumnKind.MEASURE,
      });
      expect(offerOf(items, 'total:qty')).toMatchObject({
        name: 'doc_items_qty_total',
        type: 'Integer',
        kind: DataCubeColumnKind.MEASURE,
        code: `x|$x.doc->get('items')->toMany(@Variant)->map(e|$e->get('qty')->to(@Integer))->sum()`,
      });
      expect(offerOf(items, 'total:price').code).toBe(
        `x|$x.doc->get('items')->toMany(@Variant)->map(e|$e->get('price')->to(@Float))->sum()`,
      );
      expect(items.offers.some((offer) => offer.key === 'total:sku')).toBe(
        false,
      );
    });

    test(`offers all the values of an array of scalars as text, and whether it contains one of its most frequent values`, () => {
      const tags = fieldAt(fields, ['tags']);
      expect(offerOf(tags, 'list')).toMatchObject({
        name: 'doc_tags_list',
        type: 'String',
        code: `x|$x.doc->get('tags')->toMany(@Variant)->map(e|$e->to(@String))->joinStrings(', ')`,
      });
      expect(
        tags.offers
          .filter((offer) => offer.key.startsWith('contains:'))
          .map((offer) => offer.code),
      ).toEqual([
        `x|$x.doc->get('tags')->toMany(@Variant)->map(e|$e->to(@String))->contains('b2b')`,
        `x|$x.doc->get('tags')->toMany(@Variant)->map(e|$e->to(@String))->contains('promo')`,
        `x|$x.doc->get('tags')->toMany(@Variant)->map(e|$e->to(@String))->contains('returning')`,
      ]);
      expect(offerOf(tags, 'contains:b2b')).toMatchObject({
        name: 'doc_tags_has_b2b',
        type: 'Boolean',
      });
    });

    test(`writes the literals compared by "contains" as the kind of value they are read as`, () => {
      const numbers = getDataCubeJsonFields(
        'values',
        inferDataCubeJsonShape(['[1.5, 2, 1e3]']),
      );
      expect(
        numbers.offers
          .filter((offer) => offer.key.startsWith('contains:'))
          .map((offer) => offer.code),
      ).toEqual([
        `x|$x.values->toMany(@Variant)->map(e|$e->to(@Float))->contains(1.5)`,
        `x|$x.values->toMany(@Variant)->map(e|$e->to(@Float))->contains(2.0)`,
      ]);
    });

    test(`names the value of a column holding a scalar`, () => {
      expect(
        offerOf(
          getDataCubeJsonFields('n', inferDataCubeJsonShape(['1', '2'])),
          'value',
        ),
      ).toMatchObject({ name: 'n_value', code: `x|$x.n->to(@Integer)` });
    });

    test(`offers the value of a field holding both booleans and text as text`, () => {
      expect(
        offerOf(
          fieldAt(
            getDataCubeJsonFields(
              'doc',
              inferDataCubeJsonShape(['{"flag":true}', '{"flag":"n/a"}']),
            ),
            ['flag'],
          ),
          'value',
        ),
      ).toMatchObject({
        label: 'as String',
        type: 'String',
        code: `x|$x.doc->get('flag')->to(@String)`,
      });
    });

    test(`quotes keys and column names in the code`, () => {
      expect(_pureStringLiteral(`it's a \\ test`)).toBe(`'it\\'s a \\\\ test'`);
      expect(_pureColumnAccess('payload')).toBe('$x.payload');
      expect(_pureColumnAccess('my col')).toBe(`$x.'my col'`);
      const field = getDataCubeJsonFields(
        'my col',
        inferDataCubeJsonShape(['{"it\'s":"a"}']),
      );
      expect(offerOf(fieldAt(field, [`it's`]), 'value')).toMatchObject({
        name: 'my_col_it_s',
        code: `x|$x.'my col'->get('it\\'s')->to(@String)`,
      });
    });

    test(`filters the fields by the search, keeping the fields they are in`, () => {
      const filtered = guaranteeNonNullable(
        filterDataCubeJsonFields(fields, 'TIER'),
      );
      expect(filtered.children.map((child) => child.path)).toEqual([
        ['customer'],
      ]);
      expect(
        guaranteeNonNullable(filtered.children[0]).children.map(
          (child) => child.path,
        ),
      ).toEqual([['customer', 'tier']]);
      expect(filterDataCubeJsonFields(fields, 'nothing')).toBeUndefined();
      expect(filterDataCubeJsonFields(fields, ' ')).toBe(fields);
    });

    test(`picks a name no other column has`, () => {
      expect(getFreeDataCubeColumnName('tier', ['a'])).toBe('tier');
      expect(getFreeDataCubeColumnName('tier', ['tier', 'tier_2'])).toBe(
        'tier_3',
      );
    });
  },
);
