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
  CUSTOMERS_COLUMNS,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasLayout,
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

const expectNoOverlaps = (
  positions: ReadonlyMap<string, CubeCanvasPosition>,
): void => {
  const all = [...positions.values()];
  all.forEach((a, i) =>
    all.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)),
  );
};

/** The ids of the nodes in the first column, sorted */
const getFirstColumn = (
  positions: ReadonlyMap<string, CubeCanvasPosition>,
): string[] =>
  [...positions]
    .filter(([, { x }]) => x === 0)
    .map(([id]) => id)
    .sort();

/** How far a lane stays from the nodes of the column it crosses, at least */
const LANE_MARGIN = 16;

/**
 * What is wrong with the lanes: each connection needs one for each column
 * between its ends, left to right, at a height clear of that column's nodes
 */
const getLaneProblems = (query: Query, layout: CubeCanvasLayout): string[] => {
  const { positions, lanes } = layout;
  const columns = [...new Set([...positions.values()].map(({ x }) => x))].sort(
    (a, b) => a - b,
  );
  return query.connections.flatMap((connection) => {
    const from = positions.get(connection.source)?.x ?? NaN;
    const to = positions.get(connection.target)?.x ?? NaN;
    const lane = lanes.get(connection.toString()) ?? [];
    const skipped = columns.filter((x) => x > from && x < to);
    if (lane.map(({ x }) => x).join() !== skipped.join()) {
      return [
        `${connection.toString()} has ${lane.length} lanes for ${skipped.length} columns`,
      ];
    }
    return lane.flatMap(({ x, y }) =>
      [...positions]
        .filter(
          ([, node]) =>
            node.x === x &&
            y > node.y - LANE_MARGIN &&
            y < node.y + CUBE_CANVAS_NODE_HEIGHT + LANE_MARGIN,
        )
        .map(([id]) => `${connection.toString()} passes ${id}`),
    );
  });
};

describe('layoutCubeQuery', () => {
  test('gives a lone node its top-left corner, not its centre', () => {
    const query = new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    );
    expect(layoutCubeQuery(query).positions.get('relational101')).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('lays out left to right, one rank per step, with no overlaps', () => {
    const { positions } = layoutCubeQuery(sliceQuery());
    const [ordersX] = centre(positions.get('relational101'));
    const [customersX] = centre(positions.get('relational102'));
    const [joinX] = centre(positions.get('join101'));
    const [filterX] = centre(positions.get('filter101'));
    expect(ordersX).toBe(customersX);
    expect(joinX).toBeGreaterThan(ordersX as number);
    expect(filterX).toBeGreaterThan(joinX as number);
    expectNoOverlaps(positions);
  });

  test('puts every source in the first column, however short its branch (feedback, 2026-10-29)', () => {
    // ORDERS → Join (Left), CUSTOMERS → Filter → Join (Right): dagre alone
    // puts ORDERS next to the join, in the filter's column
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Filter('filter101'),
        new Join('join101'),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'filter101', 'tds'),
        new Connection('filter101', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const layout = layoutCubeQuery(query);
    const { positions, lanes } = layout;
    expect(getFirstColumn(positions)).toEqual([
      'relational101',
      'relational102',
    ]);
    const [filterX] = centre(positions.get('filter101'));
    const [joinX] = centre(positions.get('join101'));
    expect(filterX).toBeGreaterThan(0);
    expect(joinX).toBeGreaterThan(filterX as number);
    expectNoOverlaps(positions);
    // ORDERS's edge crosses the filter's column in a lane clear of the filter
    expect([...lanes].map(([id, lane]) => [id, lane.length])).toEqual([
      [new Connection('relational101', 'join101', 'leftTds').toString(), 1],
    ]);
    expect(getLaneProblems(query, layout)).toEqual([]);
  });

  test('puts sources at different depths all in the first column, their long edges in lanes', () => {
    // ORDERS → Join 1 (Left), CUSTOMERS → Filter → Filter → Join 1 (Right),
    // Join 1 → Join 2 (Left), EMPLOYEES → Join 2 (Right)
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        northwindTable('relational103', 'EMPLOYEES', ORDERS_COLUMNS),
        new Filter('filter101'),
        new Filter('filter102'),
        new Join('join101'),
        new Join('join102'),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'filter101', 'tds'),
        new Connection('filter101', 'filter102', 'tds'),
        new Connection('filter102', 'join101', 'rightTds'),
        new Connection('join101', 'join102', 'leftTds'),
        new Connection('relational103', 'join102', 'rightTds'),
      ],
      'join102',
    );
    const layout = layoutCubeQuery(query);
    const { positions, lanes } = layout;
    expect(getFirstColumn(positions)).toEqual([
      'relational101',
      'relational102',
      'relational103',
    ]);
    // each step one column after the one before
    const stepXs = ['filter101', 'filter102', 'join101', 'join102'].map(
      (id) => positions.get(id)?.x,
    );
    expect(stepXs).toEqual([...stepXs].sort((a = NaN, b = NaN) => a - b));
    expect(new Set(stepXs).size).toBe(4);
    expectNoOverlaps(positions);
    // ORDERS's edge skips two columns, EMPLOYEES's three, the others none
    expect([...lanes].map(([id, lane]) => [id, lane.length])).toEqual([
      [new Connection('relational101', 'join101', 'leftTds').toString(), 2],
      [new Connection('relational103', 'join102', 'rightTds').toString(), 3],
    ]);
    expect(getLaneProblems(query, layout)).toEqual([]);
    expect(
      layoutCubeQuery(
        new Query(
          [...query.nodes].reverse(),
          [...query.connections].reverse(),
          query.selected,
        ),
      ),
    ).toEqual(layout);
  });

  test('starts each separate tree in the first column, as a step with no input yet', () => {
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Filter('filter101'),
        new Filter('filter102'),
        northwindTable('relational102', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational103', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Filter('filter103'),
        new Join('join101'),
        new Filter('filter104'),
      ],
      [
        new Connection('relational101', 'filter101', 'tds'),
        new Connection('filter101', 'filter102', 'tds'),
        new Connection('relational102', 'join101', 'leftTds'),
        new Connection('relational103', 'filter103', 'tds'),
        new Connection('filter103', 'join101', 'rightTds'),
      ],
      'filter102',
    );
    const layout = layoutCubeQuery(query);
    expect(getFirstColumn(layout.positions)).toEqual([
      'filter104',
      'relational101',
      'relational102',
      'relational103',
    ]);
    expectNoOverlaps(layout.positions);
    expect(getLaneProblems(query, layout)).toEqual([]);
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
    const { positions } = layoutCubeQuery(query);
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
    expect([...layoutCubeQuery(reordered).positions.keys()]).toEqual([
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
        new UnknownNode('future101', 1, { kind: 'future' }),
        new Filter('filter101'),
      ],
      [
        new Connection('relational101', 'future101', 'in0'),
        new Connection('future101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    const { positions } = layoutCubeQuery(query);
    const [sourceX] = centre(positions.get('relational101'));
    const [unknownX] = centre(positions.get('future101'));
    const [filterX] = centre(positions.get('filter101'));
    expect(unknownX).toBeGreaterThan(sourceX as number);
    expect(filterX).toBeGreaterThan(unknownX as number);
  });

  test('lays out an empty query as nothing', () => {
    expect(layoutCubeQuery(new Query())).toEqual({
      positions: new Map(),
      lanes: new Map(),
    });
  });
});
