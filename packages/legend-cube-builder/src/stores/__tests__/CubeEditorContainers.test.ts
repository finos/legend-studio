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
  Limit,
  Query,
  Sort,
  type StepContainer,
} from '@finos/legend-cube';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

// Containers of steps (PLAN §11.29): made, changed and followed as the
// query changes, each change one undo step

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const container = (
  id: string,
  steps: string[],
  folded = false,
): StepContainer => ({ id, title: id, steps, folded });

/** ORDERS ⋈ CUSTOMERS, then a filter, with these containers */
const slice = (containers?: StepContainer[]): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: sliceQuery(),
    meta: { ...DEFAULT_META, containers },
  });

/** ORDERS → filter101 → filter102 → filter103 → filter104, with these containers */
const chain = (containers?: StepContainer[]): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
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
    meta: { ...DEFAULT_META, containers },
  });

const createState = (document: CubeDocument): CubeEditorState =>
  new CubeEditorState(TEST__createCubeHost().host, document);

/** Each container's id and steps, its steps sorted */
const containersOf = (state: CubeEditorState): [string, string[]][] =>
  (state.document.meta.containers ?? []).map(({ id, steps }) => [
    id,
    [...steps].sort(),
  ]);

beforeEach(() => {
  localStorage.clear();
});

describe('Making containers', () => {
  test('Makes a container of a step and the steps before it, or of the step alone, one undo step each', () => {
    const state = createState(slice());
    const { query } = state.document;
    state.addContainer('join101', true);
    expect(state.document.meta.containers).toEqual([
      {
        id: 'container1',
        title: 'Container 1',
        steps: ['join101', 'relational101', 'relational102'],
        folded: false,
      },
    ]);
    // only the meta changed, so the rows stay current
    expect(state.document.query).toBe(query);
    // a step in a container can't start another
    expect(state.canAddContainer('relational101')).toBe(false);
    state.addContainer('filter101', false);
    expect(containersOf(state)).toEqual([
      ['container1', ['join101', 'relational101', 'relational102']],
      ['container2', ['filter101']],
    ]);
    state.undo();
    state.undo();
    expect(state.document.meta.containers).toBeUndefined();
  });

  test('Puts a step in a container beside it, and takes a step at its edge out', () => {
    const state = createState(slice([container('container1', ['join101'])]));
    expect(
      state
        .getContainersBesideStep('relational102')
        .map((each) => each.container.id),
    ).toEqual(['container1']);
    state.addToContainer('container1', 'relational102');
    expect(containersOf(state)).toEqual([
      ['container1', ['join101', 'relational102']],
    ]);
    // the join is between its two sources: taking it out would split them
    state.addToContainer('container1', 'relational101');
    expect(state.canTakeOutOfContainer('join101')).toBe(false);
    state.takeOutOfContainer('join101');
    expect(containersOf(state)).toEqual([
      ['container1', ['join101', 'relational101', 'relational102']],
    ]);
    state.takeOutOfContainer('relational101');
    expect(containersOf(state)).toEqual([
      ['container1', ['join101', 'relational102']],
    ]);
  });

  test("Takes a container's last step out with the container", () => {
    const state = createState(slice([container('container1', ['filter101'])]));
    state.takeOutOfContainer('filter101');
    expect(state.document.meta.containers).toEqual([]);
  });
});

describe('Steps follow the flow', () => {
  test('Puts a step added between two steps of a container in it, and one added after its last step out', () => {
    const state = createState(
      chain([container('container1', ['filter101', 'filter102'])]),
    );
    const between = state.addNode(Sort.TYPE, 'filter101');
    const after = state.addNode(Limit.TYPE, 'filter102');
    expect(containersOf(state)).toEqual([
      ['container1', ['filter101', 'filter102', between ?? '']],
    ]);
    expect(after).toBeDefined();
    // undoing the step brings the container back as it was
    state.undo();
    state.undo();
    expect(containersOf(state)).toEqual([
      ['container1', ['filter101', 'filter102']],
    ]);
  });

  test('Takes a removed step out, so a new step of the same id joins only by where it goes', () => {
    const state = createState(
      chain([container('container1', ['filter103', 'filter104'])]),
    );
    state.removeNode('filter104');
    expect(containersOf(state)).toEqual([['container1', ['filter103']]]);
    // filter104 again, after the container's last step: outside it
    expect(state.addNode(Filter.TYPE, 'filter103')).toBe('filter104');
    expect(containersOf(state)).toEqual([['container1', ['filter103']]]);
  });

  test('Takes a moved step out of its container, into the one it lands inside', () => {
    const state = createState(
      chain([
        container('container1', ['filter101', 'filter102']),
        container('container2', ['filter103', 'filter104']),
      ]),
    );
    // filter102 feeds a step already, so the drop moves it after filter103
    state.dropNode('filter102', 'filter103');
    expect(state.document.query.getInputIds('filter102')).toEqual([
      'filter103',
    ]);
    expect(containersOf(state)).toEqual([
      ['container1', ['filter101']],
      ['container2', ['filter102', 'filter103', 'filter104']],
    ]);
  });
});

describe('Changing a container', () => {
  test('Folds, renames and takes a container away, one undo step each, its steps staying', () => {
    const state = createState(
      slice([container('container1', ['relational101', 'join101'])]),
    );
    state.setContainerFolded('container1', true);
    state.renameContainer('container1', 'Orders with customers');
    expect(state.document.meta.containers).toEqual([
      {
        id: 'container1',
        title: 'Orders with customers',
        steps: ['relational101', 'join101'],
        folded: true,
      },
    ]);
    // a change to nothing takes no undo step
    const document = state.document;
    state.setContainerFolded('container1', true);
    expect(state.document).toBe(document);
    state.removeContainer('container1');
    expect(state.document.meta.containers).toEqual([]);
    expect(state.document.query.nodes).toHaveLength(4);
    state.undo();
    state.undo();
    state.undo();
    expect(state.document.meta.containers).toEqual([
      container('container1', ['relational101', 'join101']),
    ]);
  });

  test('Opens a title for renaming, unless the cube is read-only', () => {
    const state = createState(slice([container('container1', ['join101'])]));
    state.startRenamingContainer('container1');
    expect(state.renamingContainerId).toBe('container1');
    state.stopRenamingContainer();
    expect(state.renamingContainerId).toBeUndefined();
  });

  test('Changes no container of a read-only cube', () => {
    const state = createState(new CubeDocument());
    state.importDocument(slice([container('container1', ['join101'])]), true);
    const { document } = state;
    state.addContainer('filter101', true);
    state.setContainerFolded('container1', true);
    state.renameContainer('container1', 'Renamed');
    state.removeContainer('container1');
    state.startRenamingContainer('container1');
    expect(state.document).toBe(document);
    expect(state.renamingContainerId).toBeUndefined();
  });
});
