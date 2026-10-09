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
import { Schema } from '../../../schema/Schema.js';
import { Distinct } from '../Distinct.js';

const ORDERS = new Schema([column('ORDER_ID'), column('SHIP_COUNTRY')]);

describe(unitTest('Distinct'), () => {
  test('Has one input, nothing to set, and keeps the input schema', () => {
    const distinct = new Distinct('distinct101');
    expect(distinct.type).toBe('distinct');
    expect(Distinct.TYPE).toBe('distinct');
    expect(distinct.ports).toEqual(['tds']);
    const errors: string[] = [];
    expect(distinct.validate([ORDERS], errors)).toBe(true);
    expect(errors).toEqual([]);
    expect(distinct.schematize([ORDERS]) === ORDERS).toBe(true);
  });

  test('Describes itself as the spec does', () => {
    expect(new Distinct('distinct101').describe()).toBe('Distinct Values');
    expect(new Distinct('distinct101').describeRedacted()).toBe(
      'Distinct Values',
    );
  });

  test('Keeps its saved keys', () => {
    const rest = { note: 'kept' };
    expect(new Distinct('distinct101', rest).rest).toBe(rest);
  });

  test('Needs exactly one input schema', () => {
    expect(() => new Distinct('distinct101').validate([])).toThrow();
    expect(() =>
      new Distinct('distinct101').schematize([ORDERS, ORDERS]),
    ).toThrow();
  });
});
