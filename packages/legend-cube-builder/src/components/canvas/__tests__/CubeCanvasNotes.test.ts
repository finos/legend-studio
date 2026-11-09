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
  Query,
  type StepContainer,
} from '@finos/legend-cube';
import {
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  buildCubeCanvasNodes,
  CUBE_OUTPUT_HANDLE_ID,
  getCubeCanvasHandles,
} from '../CubeCanvasElements.js';
import {
  CUBE_CANVAS_FRAME_PADDING,
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NOTE_HEIGHT,
  type CubeCanvasPosition,
  layoutCubeCanvas,
  layoutCubeQuery,
} from '../CubeCanvasLayout.js';

// Notes on the canvas (PLAN §11.31): a noted step has room for its note
// under it, and its lines stay straight

/** ORDERS → filter101 → filter102 */
const chainQuery = (): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Filter('filter101'),
      new Filter('filter102'),
    ],
    [
      new Connection('relational101', 'filter101', 'tds'),
      new Connection('filter101', 'filter102', 'tds'),
    ],
    'filter102',
  );

/** The space between two steps of a column, the upper's bottom to the lower's top */
const getGap = (
  positions: ReadonlyMap<string, CubeCanvasPosition>,
  ids: readonly string[],
): number => {
  const [upper, lower] = ids
    .map((id) => positions.get(id)?.y ?? NaN)
    .sort((a, b) => a - b);
  return (lower ?? NaN) - ((upper ?? NaN) + CUBE_CANVAS_NODE_HEIGHT);
};

describe('Notes on the canvas: the layout', () => {
  test('Lays a cube with no note out as before', () => {
    const query = sliceQuery();
    expect(layoutCubeQuery(query, new Set())).toEqual(layoutCubeQuery(query));
    expect(layoutCubeCanvas(query, undefined, new Set())).toEqual(
      layoutCubeCanvas(query, undefined),
    );
  });

  test("Keeps a noted step's lines straight: a chain stays in one row", () => {
    const { positions } = layoutCubeQuery(chainQuery(), new Set(['filter101']));
    expect(new Set([...positions.values()].map(({ y }) => y)).size).toBe(1);
  });

  test('Leaves room under a noted step for its note, keeping the usual space below it', () => {
    const query = sliceQuery();
    const sources = ['relational101', 'relational102'];
    const without = getGap(layoutCubeQuery(query).positions, sources);
    const withNotes = getGap(
      layoutCubeQuery(query, new Set(sources)).positions,
      sources,
    );
    expect(withNotes - without).toBeGreaterThanOrEqual(CUBE_CANVAS_NOTE_HEIGHT);
  });

  test('Frames an open container round the notes of its steps', () => {
    const query = sliceQuery();
    const noted = new Set(['relational101', 'relational102']);
    const container: StepContainer = {
      id: 'container1',
      title: 'Orders with customers',
      steps: ['relational101', 'relational102', 'join101'],
      folded: false,
    };
    const layout = layoutCubeCanvas(query, [container], noted);
    const [frame] = layout.containers;
    const lowestNote = Math.max(
      ...container.steps.map(
        (id) =>
          (layout.positions.get(id)?.y ?? NaN) +
          CUBE_CANVAS_NODE_HEIGHT +
          (noted.has(id) ? CUBE_CANVAS_NOTE_HEIGHT : 0),
      ),
    );
    expect((frame?.y ?? NaN) + (frame?.height ?? NaN)).toBe(
      lowestNote + CUBE_CANVAS_FRAME_PADDING,
    );
  });

  test("Gives a folded container's box no room for its steps' notes", () => {
    const folded: StepContainer = {
      id: 'container1',
      title: 'Orders with customers',
      steps: ['relational101', 'relational102', 'join101'],
      folded: true,
    };
    const query = sliceQuery();
    expect(layoutCubeCanvas(query, [folded], new Set(['join101']))).toEqual(
      layoutCubeCanvas(query, [folded]),
    );
  });
});

describe('Notes on the canvas: the nodes', () => {
  test("Makes a noted step's node taller by its note's line, its handles where they were", () => {
    const query = chainQuery();
    const { positions } = layoutCubeQuery(query, new Set(['filter101']));
    const nodes = buildCubeCanvasNodes(query, positions, (id) =>
      id === 'filter101' ? 'Why' : undefined,
    );
    const noted = nodes.find(({ id }) => id === 'filter101');
    const plain = nodes.find(({ id }) => id === 'filter102');
    expect(noted?.height).toBe(
      CUBE_CANVAS_NODE_HEIGHT + CUBE_CANVAS_NOTE_HEIGHT,
    );
    expect(noted?.data).toEqual({
      node: query.getNode('filter101'),
      note: 'Why',
    });
    expect(plain?.height).toBe(CUBE_CANVAS_NODE_HEIGHT);
    expect(plain?.data).toEqual({ node: query.getNode('filter102') });
    // the output in the middle of the step, not of the note under it
    expect(
      noted?.handles?.find(({ id }) => id === CUBE_OUTPUT_HANDLE_ID)?.y,
    ).toBe(CUBE_CANVAS_NODE_HEIGHT / 2);
    expect(noted?.handles).toEqual(
      getCubeCanvasHandles(query.getNode('filter101') as Filter),
    );
  });
});
