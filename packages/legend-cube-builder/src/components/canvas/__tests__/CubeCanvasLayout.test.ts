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
  Connection,
  Filter,
  Join,
  Query,
  type QueryNode,
  UnknownNode,
} from '@finos/legend-cube';
import {
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasPosition,
  layoutCubeQuery,
} from '../CubeCanvasLayout.js';

const centre = (position: CubeCanvasPosition | undefined): number[] => [
  (position?.x ?? NaN) + CUBE_CANVAS_NODE_WIDTH / 2,
  (position?.y ?? NaN) + CUBE_CANVAS_NODE_HEIGHT / 2,
];

/** Two nodes overlap when their boxes intersect */
const overlap = (a: CubeCanvasPosition, b: CubeCanvasPosition): boolean =>
  Math.abs(a.x - b.x) < CUBE_CANVAS_NODE_WIDTH &&
  Math.abs(a.y - b.y) < CUBE_CANVAS_NODE_HEIGHT;

describe('layoutCubeQuery', () => {
  test('gives a lone node its top-left corner, not its centre', () => {
    const query = new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    );
    expect(layoutCubeQuery(query).get('relational101')).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('lays out left to right, one rank per step, with no overlaps', () => {
    const positions = layoutCubeQuery(sliceQuery());
    const [ordersX] = centre(positions.get('relational101'));
    const [customersX] = centre(positions.get('relational102'));
    const [joinX] = centre(positions.get('join101'));
    const [filterX] = centre(positions.get('filter101'));
    expect(ordersX).toBe(customersX);
    expect(joinX).toBeGreaterThan(ordersX as number);
    expect(filterX).toBeGreaterThan(joinX as number);
    const all = [...positions.values()];
    all.forEach((a, i) =>
      all.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)),
    );
  });

  test('keeps both edges when two sources of the same table feed one join', () => {
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'ORDERS', ORDERS_COLUMNS),
        new Join('join101'),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const positions = layoutCubeQuery(query);
    const [, leftY] = centre(positions.get('relational101'));
    const [, rightY] = centre(positions.get('relational102'));
    const [joinX, joinY] = centre(positions.get('join101'));
    const [sourceX] = centre(positions.get('relational101'));
    expect(joinX).toBeGreaterThan(sourceX as number);
    // the join sits between its two inputs only if both edges reached the layout
    expect(leftY).not.toBe(rightY);
    expect(joinY).toBeGreaterThan(Math.min(leftY as number, rightY as number));
    expect(joinY).toBeLessThan(Math.max(leftY as number, rightY as number));
  });

  test('gives the same positions whatever order the nodes and connections come in', () => {
    const shuffle = <T>(items: readonly T[], order: number[]): T[] =>
      order.map((index) => items[index] as T);
    const slice = sliceQuery();
    expect(
      layoutCubeQuery(
        new Query(
          shuffle<QueryNode>(slice.nodes, [3, 1, 0, 2]),
          shuffle(slice.connections, [2, 0, 1]),
          slice.selected,
        ),
      ),
    ).toEqual(layoutCubeQuery(slice));
    // nodes that nothing connects are stacked in the order they go in
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational103', 'ORDERS', ORDERS_COLUMNS),
        new Filter('filter101'),
        new Filter('filter102'),
      ],
      [
        new Connection('relational101', 'filter101', 'tds'),
        new Connection('relational102', 'filter102', 'tds'),
      ],
      'filter101',
    );
    const reordered = new Query(
      shuffle<QueryNode>(query.nodes, [4, 2, 0, 3, 1]),
      shuffle(query.connections, [1, 0]),
      query.selected,
    );
    expect(layoutCubeQuery(reordered)).toEqual(layoutCubeQuery(query));
    // the map follows the query's node order; the positions don't
    expect([...layoutCubeQuery(reordered).keys()]).toEqual([
      'filter102',
      'relational103',
      'relational101',
      'filter101',
      'relational102',
    ]);
  });

  test('places an Unknown node and the edges into its ports', () => {
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new UnknownNode('pivot101', 1, { kind: 'pivot' }),
        new Filter('filter101'),
      ],
      [
        new Connection('relational101', 'pivot101', 'in0'),
        new Connection('pivot101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    const positions = layoutCubeQuery(query);
    const [sourceX] = centre(positions.get('relational101'));
    const [unknownX] = centre(positions.get('pivot101'));
    const [filterX] = centre(positions.get('filter101'));
    expect(unknownX).toBeGreaterThan(sourceX as number);
    expect(filterX).toBeGreaterThan(unknownX as number);
  });

  test('lays out an empty query as nothing', () => {
    expect(layoutCubeQuery(new Query()).size).toBe(0);
  });
});
