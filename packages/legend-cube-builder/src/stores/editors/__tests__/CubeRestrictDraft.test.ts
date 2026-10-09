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
  PrimitiveType,
  Restrict,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { CubeRestrictDraft } from '../CubeRestrictDraft.js';

const ORDERS = new Schema(
  ['ORDER_ID', 'CUSTOMER_ID', 'SHIP_COUNTRY'].map(
    (name) => new SchemaColumn(name, PrimitiveType.get('String'), true),
  ),
);

describe('Restrict draft', () => {
  test('Starts from the columns and gives the original back until something is ticked', () => {
    const restrict = new Restrict('restrict101', ['SHIP_COUNTRY'], {
      note: 'kept',
    });
    const draft = new CubeRestrictDraft(restrict);
    expect(draft.columns).toEqual(['SHIP_COUNTRY']);
    expect(draft.build()).toBe(restrict);
  });

  test("Keeps the picks in the input's order, whatever the order they are ticked in", () => {
    const draft = new CubeRestrictDraft(new Restrict('restrict101'));
    draft.toggleColumn('SHIP_COUNTRY', ORDERS);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    const built = draft.build();
    expect(built.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    expect(built.id).toBe('restrict101');
  });

  test('Unticks a column, and gives the original back once the same set is picked again', () => {
    const restrict = new Restrict('restrict101', ['ORDER_ID', 'SHIP_COUNTRY']);
    const draft = new CubeRestrictDraft(restrict);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.build().columns).toEqual(['SHIP_COUNTRY']);
    draft.toggleColumn('ORDER_ID', ORDERS);
    expect(draft.build()).toBe(restrict);
  });

  test('Gives the original back for the same set held in another order', () => {
    const restrict = new Restrict('restrict101', ['SHIP_COUNTRY', 'ORDER_ID']);
    const draft = new CubeRestrictDraft(restrict);
    draft.toggleColumn('CUSTOMER_ID', ORDERS);
    draft.toggleColumn('CUSTOMER_ID', ORDERS);
    expect(draft.build()).toBe(restrict);
  });

  test('Picks every column, and none', () => {
    const draft = new CubeRestrictDraft(
      new Restrict('restrict101', ['SHIPPER']),
    );
    draft.selectAll(ORDERS);
    // a saved column the input lost stays, last, until it is unticked
    expect(draft.columns).toEqual([
      'ORDER_ID',
      'CUSTOMER_ID',
      'SHIP_COUNTRY',
      'SHIPPER',
    ]);
    draft.toggleColumn('SHIPPER', ORDERS);
    expect(draft.columns).toEqual(['ORDER_ID', 'CUSTOMER_ID', 'SHIP_COUNTRY']);
    draft.clear();
    expect(draft.columns).toEqual([]);
    expect(draft.build().columns).toEqual([]);
  });
});
