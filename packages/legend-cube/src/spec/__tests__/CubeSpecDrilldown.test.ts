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
import { CubeDocument, DEFAULT_META } from '../../graph/CubeDocument.js';
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// The grid's drill-down, saved as `meta.drilldown` (PLAN §11.10)

const withDrilldown = (drilldown: unknown): Record<string, unknown> => ({
  formatVersion: 1,
  query: { nodes: [] },
  meta: { drilldown },
});

const failureOf = (json: unknown): [string, string] => {
  try {
    decodeCubeSpec(json);
  } catch (error) {
    if (error instanceof CubeSpecDecodeError) {
      return [error.path, error.detail];
    }
    throw error;
  }
  throw new Error('Expected a decode error');
};

describe(unitTest('Saved spec: drill-down'), () => {
  test('Writes a drill-down back as it was read, a saved null and unknown keys included', () => {
    const json = withDrilldown({
      columns: ['SHIP_COUNTRY', 'SHIP_CITY'],
      aggregations: [
        { column: 'FREIGHT', function: 'Average', later: [1] },
        { column: 'ORDER_ID', function: null },
        // kept as saved: the check reports it
        { column: 'PRICE', function: 'Median' },
      ],
      later: { kept: true },
    });
    const { document } = decodeCubeSpec(json);
    expect(document.meta.drilldown).toEqual({
      columns: ['SHIP_COUNTRY', 'SHIP_CITY'],
      aggregations: [
        { column: 'FREIGHT', function: 'Average', rest: { later: [1] } },
        { column: 'ORDER_ID', function: null },
        { column: 'PRICE', function: 'Median' },
      ],
      rest: { later: { kept: true } },
    });
    expect(encodeCubeSpec(document)).toEqual(json);
  });

  test('Writes the levels alone when no aggregation is saved, and reads them back', () => {
    const json = withDrilldown({ columns: ['SHIP_COUNTRY'] });
    const { document } = decodeCubeSpec(json);
    expect(document.meta.drilldown).toEqual({
      columns: ['SHIP_COUNTRY'],
      aggregations: [],
    });
    expect(encodeCubeSpec(document)).toEqual(json);
  });

  test('Writes no drill-down for a cube without one, or with an empty one', () => {
    expect(encodeCubeSpec(new CubeDocument()).meta).toBeUndefined();
    const empty = new CubeDocument({
      meta: { ...DEFAULT_META, drilldown: { columns: [], aggregations: [] } },
    });
    expect(encodeCubeSpec(empty).meta).toBeUndefined();
    expect(
      decodeCubeSpec({ formatVersion: 1, query: { nodes: [] } }).document.meta
        .drilldown,
    ).toBeUndefined();
  });

  test('Keeps a drill-down with only aggregations, which can be given levels later', () => {
    const json = withDrilldown({
      columns: [],
      aggregations: [{ column: 'FREIGHT', function: 'Max' }],
    });
    expect(encodeCubeSpec(decodeCubeSpec(json).document)).toEqual(json);
  });

  test.each<[string, unknown, string, string]>([
    ['a drill-down that is a list', [], 'meta.drilldown', 'must be an object'],
    ['a drill-down set to null', null, 'meta.drilldown', 'must be an object'],
    [
      'a drill-down without its columns',
      { aggregations: [] },
      'meta.drilldown.columns',
      'is required',
    ],
    [
      'columns that are a string',
      { columns: 'SHIP_COUNTRY' },
      'meta.drilldown.columns',
      'must be a list',
    ],
    [
      'a column that is a number',
      { columns: ['SHIP_COUNTRY', 1] },
      'meta.drilldown.columns[1]',
      'must be a string',
    ],
    [
      'aggregations keyed by column',
      { columns: [], aggregations: { FREIGHT: 'Sum' } },
      'meta.drilldown.aggregations',
      'must be a list',
    ],
    [
      'an aggregation that is a string',
      { columns: [], aggregations: ['FREIGHT'] },
      'meta.drilldown.aggregations[0]',
      'must be an object',
    ],
    [
      'an aggregation without its column',
      { columns: [], aggregations: [{ function: 'Sum' }] },
      'meta.drilldown.aggregations[0].column',
      'is required',
    ],
    [
      'an aggregation with an empty column',
      { columns: [], aggregations: [{ column: '', function: 'Sum' }] },
      'meta.drilldown.aggregations[0].column',
      'must not be empty',
    ],
    [
      'an aggregation without its function',
      { columns: [], aggregations: [{ column: 'FREIGHT' }] },
      'meta.drilldown.aggregations[0].function',
      'is required',
    ],
    [
      'an aggregation whose function is a number',
      { columns: [], aggregations: [{ column: 'FREIGHT', function: 1 }] },
      'meta.drilldown.aggregations[0].function',
      'must be a string or null',
    ],
  ])('Refuses %s', (_, drilldown, path, detail) => {
    expect(failureOf(withDrilldown(drilldown))).toEqual([path, detail]);
  });
});
