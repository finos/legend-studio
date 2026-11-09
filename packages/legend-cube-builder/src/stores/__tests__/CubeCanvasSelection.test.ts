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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  Connection,
  CubeDocument,
  DEFAULT_META,
  Filter,
  Query,
  type StepContainer,
} from '@finos/legend-cube';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

// The steps picked on the canvas, put in a container (PLAN §11.29): the
// page's, never the cube's

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const container = (
  id: string,
  steps: string[],
  folded = false,
): StepContainer => ({ id, title: id, steps, folded });

const document = (query: Query, containers?: StepContainer[]): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query,
    meta: { ...DEFAULT_META, containers },
  });

/** ORDERS ⋈ CUSTOMERS, then a filter */
const slice = (containers?: StepContainer[]): CubeDocument =>
  document(sliceQuery(), containers);

/** ORDERS → filter101 → filter102 → filter103 → filter104 */
const chain = (containers?: StepContainer[]): CubeDocument =>
  document(
    new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Filter('filter101'),
        new Filter('filter102'),
        new Filter('filter103'),
        new Filter('filter104'),
      ],
      [
        new Connection('relational101', 'filter101', 'tds'),
        new Connection('filter101', 'filter102', 'tds'),
        new Connection('filter102', 'filter103', 'tds'),
        new Connection('filter103', 'filter104', 'tds'),
      ],
      'filter104',
    ),
    containers,
  );

/** Two trees: ORDERS → filter101, and CUSTOMERS alone */
const twoTrees = (): CubeDocument =>
  document(
    new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Filter('filter101'),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      ],
      [new Connection('relational101', 'filter101', 'tds')],
      'filter101',
    ),
  );

const createState = (cube: CubeDocument): CubeEditorState =>
  new CubeEditorState(TEST__createCubeHost().host, cube);

const pick = (state: CubeEditorState, ...stepIds: string[]): void =>
  stepIds.forEach((id) => state.canvasSelection.toggle(id));

beforeEach(() => {
  localStorage.clear();
});

describe('Picking steps on the canvas', () => {
  test('Picks a step and unpicks it, never changing the cube or taking an undo step', () => {
    const state = createState(slice());
    const before = state.document;
    pick(state, 'filter101', 'relational101');
    // in the query's order
    expect(state.canvasSelection.stepIds).toEqual([
      'relational101',
      'filter101',
    ]);
    expect(state.canvasSelection.isPicked('relational101')).toBe(true);
    pick(state, 'relational101');
    expect(state.canvasSelection.stepIds).toEqual(['filter101']);
    expect(state.document).toBe(before);
    expect(state.canUndo).toBe(false);
    state.canvasSelection.clear();
    expect(state.canvasSelection.stepIds).toEqual([]);
    // a step the query hasn't
    pick(state, 'gone');
    expect(state.canvasSelection.stepIds).toEqual([]);
  });

  test('A box adds the steps inside it to those picked, as it is drawn', () => {
    const state = createState(chain());
    const selection = state.canvasSelection;
    pick(state, 'filter104');
    selection.startBox();
    selection.setBoxSteps(['filter101']);
    selection.setBoxSteps(['filter101', 'filter102']);
    expect(selection.stepIds).toEqual(['filter101', 'filter102', 'filter104']);
    // a step the box no longer holds goes, unless it was picked before
    selection.setBoxSteps(['filter102', 'filter104']);
    expect(selection.stepIds).toEqual(['filter102', 'filter104']);
    selection.endBox();
    // the box is over
    selection.setBoxSteps(['filter103']);
    expect(selection.stepIds).toEqual(['filter102', 'filter104']);
  });

  test('Leaves out the steps of a folded container, which the canvas does not draw', () => {
    const state = createState(
      chain([container('container1', ['filter101', 'filter102'])]),
    );
    pick(state, 'filter101', 'filter103');
    state.setContainerFolded('container1', true);
    expect(state.canvasSelection.stepIds).toEqual(['filter103']);
    // a step out of sight can't be picked
    pick(state, 'filter102');
    expect(state.canvasSelection.stepIds).toEqual(['filter103']);
    state.setContainerFolded('container1', false);
    expect(state.canvasSelection.stepIds).toEqual(['filter101', 'filter103']);
  });

  test('Unpicks a step removed, so it is not picked when it comes back', () => {
    const state = createState(chain());
    pick(state, 'filter103', 'filter104');
    state.removeNode('filter104');
    expect(state.canvasSelection.stepIds).toEqual(['filter103']);
    expect(state.canvasSelection.pickedIds.has('filter104')).toBe(false);
    state.undo();
    expect(state.document.query.getNode('filter104')).toBeDefined();
    expect(state.canvasSelection.stepIds).toEqual(['filter103']);
  });

  test('Picks no step of another cube, and none while the cube is read-only', () => {
    const state = createState(chain());
    pick(state, 'filter101');
    // the other cube has a filter101 too
    state.importDocument(chain(), false);
    expect(state.canvasSelection.stepIds).toEqual([]);
    pick(state, 'filter101');
    state.undo();
    expect(state.canvasSelection.stepIds).toEqual([]);
    state.importDocument(chain(), true);
    pick(state, 'filter101');
    expect(state.canvasSelection.stepIds).toEqual([]);
    expect(state.canvasSelection.container).toEqual({ kind: 'none' });
  });
});

describe('Putting the steps picked in a container', () => {
  test('Makes a container of the steps picked and the steps between them, one undo step', () => {
    const state = createState(chain());
    const { query } = state.document;
    pick(state, 'filter103', 'filter101');
    expect(state.canvasSelection.container).toEqual({
      kind: 'steps',
      steps: ['filter101', 'filter102', 'filter103'],
      between: ['filter102'],
    });
    state.canvasSelection.putInContainer();
    expect(state.document.meta.containers).toEqual([
      {
        id: 'container1',
        title: 'Container 1',
        steps: ['filter101', 'filter102', 'filter103'],
        folded: false,
      },
    ]);
    // only the meta changed, so the rows stay current; no step is picked now
    expect(state.document.query).toBe(query);
    expect(state.canvasSelection.stepIds).toEqual([]);
    expect(state.history).toHaveLength(1);
    state.undo();
    expect(state.document.meta.containers).toBeUndefined();
  });

  test("Links a Join's two inputs through the Join", () => {
    const state = createState(slice());
    pick(state, 'relational101', 'relational102');
    expect(state.canvasSelection.container).toEqual({
      kind: 'steps',
      steps: ['join101', 'relational101', 'relational102'],
      between: ['join101'],
    });
    // one step makes a container of itself
    state.canvasSelection.clear();
    pick(state, 'filter101');
    state.canvasSelection.putInContainer();
    expect(state.document.meta.containers?.[0]?.steps).toEqual(['filter101']);
  });

  test("Refuses steps of two trees, which no block links, and does nothing when there's no step", () => {
    const state = createState(twoTrees());
    expect(state.canvasSelection.container).toEqual({ kind: 'none' });
    pick(state, 'filter101', 'relational102');
    expect(state.canvasSelection.container).toEqual({ kind: 'apart' });
    state.canvasSelection.putInContainer();
    expect(state.document.meta.containers).toBeUndefined();
    expect(state.canvasSelection.stepIds).toEqual([
      'filter101',
      'relational102',
    ]);
  });

  test('Refuses a step in a container already, picked or between two steps picked, the picked one first', () => {
    const state = createState(
      slice([
        container('container1', ['join101']),
        container('container2', ['relational102']),
      ]),
    );
    pick(state, 'relational101', 'filter101');
    const between = state.canvasSelection.container;
    expect(between.kind).toBe('contained');
    expect(between.kind === 'contained' && between.stepId).toBe('join101');
    expect(between.kind === 'contained' && between.isPicked).toBe(false);
    expect(between.kind === 'contained' && between.container.container.id).toBe(
      'container1',
    );
    pick(state, 'relational102');
    const picked = state.canvasSelection.container;
    expect(picked.kind === 'contained' && picked.stepId).toBe('relational102');
    expect(picked.kind === 'contained' && picked.isPicked).toBe(true);
    state.canvasSelection.putInContainer();
    expect(state.document.meta.containers).toHaveLength(2);
  });

  test("Makes no container of steps that aren't one block in no container", () => {
    const state = createState(slice([container('container1', ['join101'])]));
    state.addContainerOf(['relational101', 'filter101']);
    state.addContainerOf(['join101', 'filter101']);
    state.addContainerOf([]);
    state.addContainerOf(['gone']);
    expect(state.document.meta.containers).toHaveLength(1);
    state.addContainerOf(['filter101']);
    expect(state.document.meta.containers?.[1]).toEqual({
      id: 'container2',
      title: 'Container 2',
      steps: ['filter101'],
      folded: false,
    });
  });
});
