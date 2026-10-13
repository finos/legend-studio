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
import { describeDocument } from '../../__test-utils__/CubeSpecTestUtils.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { CubeDocument } from '../../graph/CubeDocument.js';
import { Query } from '../../graph/Query.js';
import {
  createNodeRegistry,
  PIVOT_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { AggregationFunction } from '../../nodes/transforms/Aggregation.js';
import { Pivot } from '../../nodes/transforms/Pivot.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject } from '../../utils/Json.js';
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

const REGISTRY = createNodeRegistry();

/** The saved spec of one unconnected pivot, `pivot101`, with these fields of its own */
const pivotSpec = (own: JsonObject): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'pivot101',
    nodes: [{ kind: 'pivot', id: 'pivot101', inputs: [null], ...own }],
  },
});

const documentOf = (node: Pivot): CubeDocument =>
  new CubeDocument({ query: new Query([node], [], node.id) });

/** The document saves to exactly `expected`, and reads back equal, saving the same again */
const expectEncoded = (node: Pivot, expected: JsonObject): void => {
  const encoded = encodeCubeSpec(documentOf(node), REGISTRY);
  expect(encoded).toStrictEqual(expected);
  const decoded = decodeCubeSpec(encoded, { registry: REGISTRY }).document;
  expect(describeDocument(decoded)).toEqual(describeDocument(documentOf(node)));
  expect(JSON.stringify(encodeCubeSpec(decoded, REGISTRY))).toBe(
    JSON.stringify(encoded),
  );
};

const decodedNode = (json: JsonObject): unknown =>
  decodeCubeSpec(json, { registry: REGISTRY }).document.query.getNode(
    'pivot101',
  );

describe(unitTest('Saved spec: pivots'), () => {
  test('Writes a new pivot: nothing picked, counting rows', () => {
    expectEncoded(
      PIVOT_DEFINITION.create('pivot101'),
      pivotSpec({
        rows: [],
        column: '',
        values: [],
        aggregation: { function: 'CountRows' },
      }),
    );
  });

  test('Writes its rows, its column, its values as typed literals in order, and its aggregation', () => {
    expectEncoded(
      new Pivot(
        'pivot101',
        ['SHIP_COUNTRY', 'ORDER_ID'],
        'SHIP_VIA',
        [
          { kind: 'integer', value: '3' },
          { kind: 'integer', value: '1' },
        ],
        { function: AggregationFunction.SUM, column: 'FREIGHT' },
      ),
      pivotSpec({
        rows: ['SHIP_COUNTRY', 'ORDER_ID'],
        column: 'SHIP_VIA',
        values: [
          { kind: 'integer', value: '3' },
          { kind: 'integer', value: '1' },
        ],
        aggregation: { column: 'FREIGHT', function: 'Sum' },
      }),
    );
    expectEncoded(
      new Pivot(
        'pivot101',
        [],
        'ORDER_DATE',
        [
          { kind: 'strictDate', value: '1997-01-02' },
          { kind: 'boolean', value: true },
          { kind: 'string', value: "O'Brien" },
        ],
        { function: '', column: '' },
      ),
      pivotSpec({
        rows: [],
        column: 'ORDER_DATE',
        values: [
          { kind: 'strictDate', value: '1997-01-02' },
          { kind: 'boolean', value: true },
          { kind: 'string', value: "O'Brien" },
        ],
        aggregation: { column: '', function: '' },
      }),
    );
  });

  test('Keeps a pivot it can only partly read as it was saved, as an Unknown node', () => {
    const unreadable: JsonObject[] = [
      // a value that isn't a literal it reads, or has a key it doesn't know
      { values: [{ kind: 'integer', value: 1 }] },
      { values: [{ kind: 'integer', value: '1', unit: 'ms' }] },
      { values: [{ kind: 'money', value: '1' }] },
      // an aggregation key it doesn't know
      { aggregation: { function: 'Sum', column: 'FREIGHT', window: 'all' } },
    ];
    unreadable.forEach((own) => {
      const node = decodedNode(
        pivotSpec({
          rows: [],
          column: 'SHIP_VIA',
          values: [{ kind: 'integer', value: '1' }],
          aggregation: { function: 'CountRows' },
          ...own,
        }),
      );
      expect(node).toBeInstanceOf(UnknownNode);
      expect((node as UnknownNode).savedKind).toBe('pivot');
    });
  });

  test('Refuses a pivot whose fields are malformed', () => {
    const base = {
      rows: [],
      column: 'SHIP_VIA',
      values: [],
      aggregation: { function: 'CountRows' },
    };
    [
      { ...base, rows: 'SHIP_COUNTRY' },
      { ...base, column: undefined },
      { ...base, values: {} },
      { ...base, aggregation: 'CountRows' },
      { ...base, aggregation: { column: 'FREIGHT' } },
    ].forEach((own) =>
      expect(() => decodedNode(pivotSpec(own as JsonObject))).toThrow(
        CubeSpecDecodeError,
      ),
    );
  });
});
