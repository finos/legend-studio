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
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// Number column formats, saved as `meta.presentation.columnHints` (PLAN §11.10)

const withHints = (columnHints: unknown): Record<string, unknown> => ({
  formatVersion: 1,
  query: { nodes: [] },
  meta: { presentation: { columnHints } },
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

const HINTS = 'meta.presentation.columnHints';

describe(unitTest('Saved spec: column formats'), () => {
  test('Writes formats back as they were read, unknown styles and keys included, defaults left out', () => {
    const json = withHints([
      {
        column: 'NOTIONAL',
        format: {
          style: 'currency',
          decimalPlaces: 2,
          currency: 'USD',
          grouping: true,
          redIfNegative: true,
          parenthesesIfNegative: true,
          later: 1,
        },
        note: 'kept',
      },
      { format: { style: 'scientific' } },
    ]);
    const { document } = decodeCubeSpec(json);
    expect(document.meta.presentation.columnHints).toEqual([
      {
        column: 'NOTIONAL',
        format: {
          style: 'currency',
          decimalPlaces: 2,
          currency: 'USD',
          grouping: true,
          redIfNegative: true,
          parenthesesIfNegative: true,
          rest: { later: 1 },
        },
        rest: { note: 'kept' },
      },
      {
        format: {
          style: 'scientific',
          grouping: false,
          redIfNegative: false,
          parenthesesIfNegative: false,
        },
      },
    ]);
    expect(encodeCubeSpec(document)).toEqual(json);
  });

  test('Writes no formats for none', () => {
    const { document } = decodeCubeSpec(withHints([]));
    expect(encodeCubeSpec(document).meta).toBeUndefined();
  });

  test.each<[string, unknown, string, string]>([
    ['hints that are an object', { NOTIONAL: {} }, HINTS, 'must be a list'],
    [
      'a hint without its format',
      [{ column: 'A' }],
      `${HINTS}[0].format`,
      'is required',
    ],
    [
      'a format without its style',
      [{ format: {} }],
      `${HINTS}[0].format.style`,
      'is required',
    ],
    [
      'a negative number of places',
      [{ format: { style: 'number', decimalPlaces: -1 } }],
      `${HINTS}[0].format.decimalPlaces`,
      'must be a whole number from 0 to 20',
    ],
    [
      'places past 20',
      [{ format: { style: 'number', decimalPlaces: 21 } }],
      `${HINTS}[0].format.decimalPlaces`,
      'must be a whole number from 0 to 20',
    ],
    [
      'a flag that is text',
      [{ format: { style: 'number', grouping: 'yes' } }],
      `${HINTS}[0].format.grouping`,
      'must be true or false',
    ],
    [
      'a currency that is a number',
      [{ format: { style: 'currency', currency: 840 } }],
      `${HINTS}[0].format.currency`,
      'must be a string',
    ],
  ])('Refuses %s', (_, hints, path, detail) => {
    expect(failureOf(withHints(hints))).toEqual([path, detail]);
  });
});
