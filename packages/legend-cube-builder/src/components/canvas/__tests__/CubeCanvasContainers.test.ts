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
  Sort,
  type StepContainer,
} from '@finos/legend-cube';
import {
  CUSTOMERS_COLUMNS,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasContainerPlace,
  type CubeCanvasPosition,
  getCubeCanvasStepPlace,
  layoutCubeCanvas,
  layoutCubeQuery,
} from '../CubeCanvasLayout.js';

/**
 * The manager's example (2026-10-29), and a step after it: ORDERS → Join
 * (left), CUSTOMERS → Filter → Join (right), Join → Sort
 */
const managerQuery = (): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      new Filter('filter101'),
      new Join('join101'),
      new Sort('sort101'),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'filter101', 'tds'),
      new Connection('filter101', 'join101', 'rightTds'),
      new Connection('join101', 'sort101', 'tds'),
    ],
    'sort101',
  );

const container = (
  id: string,
  steps: string[],
  folded = false,
): StepContainer => ({ id, title: id, steps, folded });

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const stepBox = (position: CubeCanvasPosition): Box => ({
  ...position,
  width: CUBE_CANVAS_NODE_WIDTH,
  height: CUBE_CANVAS_NODE_HEIGHT,
});

const intersects = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

const contains = (outer: Box, inner: Box): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

const placeOf = (
  places: readonly CubeCanvasContainerPlace[],
  id: string,
): CubeCanvasContainerPlace => {
  const place = places.find((each) => each.container.id === id);
  if (!place) {
    throw new Error(`container ${id} isn't drawn`);
  }
  return place;
};

/** Each frame holds its own steps, and no other step or frame */
const expectFramesHoldTheirStepsAlone = (
  query: Query,
  containers: readonly StepContainer[],
): void => {
  const { positions, containers: places } = layoutCubeCanvas(query, containers);
  places.forEach((place) => {
    positions.forEach((position, id) =>
      place.steps.includes(id)
        ? expect(contains(place, stepBox(position))).toBe(true)
        : expect([id, intersects(place, stepBox(position))]).toEqual([
            id,
            false,
          ]),
    );
    places
      .filter((other) => other !== place)
      .forEach((other) => expect(intersects(place, other)).toBe(false));
  });
};

describe('layoutCubeCanvas', () => {
  test('Lays a cube without containers out as before', () => {
    const query = managerQuery();
    expect(layoutCubeCanvas(query, undefined)).toEqual({
      positions: layoutCubeQuery(query),
      containers: [],
    });
    // a container left with no step of the query is none
    expect(
      layoutCubeCanvas(query, [container('container1', ['gone'])]),
    ).toEqual({ positions: layoutCubeQuery(query), containers: [] });
  });

  test('Frames an open container round its steps alone, the sources still in the first column', () => {
    const query = managerQuery();
    const containers = [
      container('container1', ['relational102', 'filter101']),
    ];
    const { positions, containers: places } = layoutCubeCanvas(
      query,
      containers,
    );
    expect(placeOf(places, 'container1').steps).toEqual([
      'filter101',
      'relational102',
    ]);
    expectFramesHoldTheirStepsAlone(query, containers);
    expect(positions.get('relational101')?.x).toBe(
      positions.get('relational102')?.x,
    );
    // the columns keep their gap
    const before = layoutCubeQuery(query);
    const gap = (layout: ReadonlyMap<string, CubeCanvasPosition>): number =>
      (layout.get('filter101')?.x ?? NaN) -
      (layout.get('relational102')?.x ?? NaN);
    expect(Math.abs(gap(positions) - gap(before))).toBeLessThan(2);
  });

  test('Frames two open containers apart, a step of neither outside both', () => {
    const query = managerQuery();
    expectFramesHoldTheirStepsAlone(query, [
      container('container1', ['relational102', 'filter101']),
      container('container2', ['join101', 'sort101']),
    ]);
    expectFramesHoldTheirStepsAlone(query, [
      container('container1', ['relational101', 'join101']),
    ]);
  });

  test("Draws a folded container as one box in its steps' place, the lines in and out going to it", () => {
    const query = managerQuery();
    const { positions, containers: places } = layoutCubeCanvas(query, [
      container('container1', ['relational102', 'filter101'], true),
    ]);
    const box = placeOf(places, 'container1');
    expect(positions.has('relational102')).toBe(false);
    expect(positions.has('filter101')).toBe(false);
    expect([box.width, box.height]).toEqual([
      CUBE_CANVAS_NODE_WIDTH,
      CUBE_CANVAS_NODE_HEIGHT,
    ]);
    // a box fed by nothing is a source's: in the first column
    expect(box.x).toBe(positions.get('relational101')?.x);
    expect(positions.get('join101')?.x).toBeGreaterThan(box.x);
    [...positions.values()].forEach((position) =>
      expect(intersects(box, stepBox(position))).toBe(false),
    );
    // its steps' node editor goes on it
    expect(
      getCubeCanvasStepPlace(
        layoutCubeCanvas(query, [
          container('container1', ['relational102', 'filter101'], true),
        ]),
        'filter101',
      ),
    ).toEqual(box);
  });

  test('Places a folded container after every step that feeds it', () => {
    const query = managerQuery();
    const { positions, containers: places } = layoutCubeCanvas(query, [
      container('container1', ['filter101', 'join101'], true),
      container('container2', ['relational102']),
    ]);
    const box = placeOf(places, 'container1');
    expect(box.x).toBeGreaterThan(positions.get('relational101')?.x ?? NaN);
    expect(box.x).toBeGreaterThan(positions.get('relational102')?.x ?? NaN);
    expect(positions.get('sort101')?.x).toBeGreaterThan(box.x);
    const frame = placeOf(places, 'container2');
    expect(intersects(frame, box)).toBe(false);
  });

  test('Gives the same layout whatever order the containers and their steps come in', () => {
    const query = managerQuery();
    expect(
      layoutCubeCanvas(query, [
        container('container2', ['sort101', 'join101']),
        container('container1', ['filter101', 'relational102'], true),
      ]).positions,
    ).toEqual(
      layoutCubeCanvas(query, [
        container('container1', ['relational102', 'filter101'], true),
        container('container2', ['join101', 'sort101']),
      ]).positions,
    );
  });
});
