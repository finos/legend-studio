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
import {
  column,
  resolvedTable,
  TestBinaryNode,
  TestUnaryNode,
} from '../../__test-utils__/CubeTestNodes.js';
import { decodeCubeSpec, encodeCubeSpec } from '../../spec/CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../../spec/SpecReader.js';
import { Connection } from '../Connection.js';
import { CubeDocument, DEFAULT_META } from '../CubeDocument.js';
import { Query } from '../Query.js';
import {
  generateStepContainerId,
  getShownContainers,
  getStepsForNewContainer,
  isConnectedStepSet,
  pruneStepContainers,
  type StepContainer,
} from '../StepContainer.js';

/**
 * The manager's example (2026-10-29), and a step after it:
 * s1 → join (left), s2 → f → join (right), join → sort
 */
const managerQuery = (): Query =>
  new Query(
    [
      resolvedTable('s1', 'ORDERS', [column('ID')]),
      resolvedTable('s2', 'CUSTOMERS', [column('ID')]),
      new TestUnaryNode('f'),
      new TestBinaryNode('join'),
      new TestUnaryNode('sort'),
    ],
    [
      new Connection('s1', 'join', 'tds1'),
      new Connection('s2', 'f', 'tds'),
      new Connection('f', 'join', 'tds2'),
      new Connection('join', 'sort', 'tds'),
    ],
    'sort',
  );

const container = (
  id: string,
  steps: string[],
  folded = false,
): StepContainer => ({ id, title: id, steps, folded });

describe(unitTest('Step containers'), () => {
  test('Steps are one block when each is linked to another of them', () => {
    const query = managerQuery();
    expect(isConnectedStepSet(query, new Set(['s2', 'f']))).toBe(true);
    expect(isConnectedStepSet(query, new Set(['s1', 'join', 'sort']))).toBe(
      true,
    );
    expect(isConnectedStepSet(query, new Set(['f']))).toBe(true);
    // f is between s2 and join
    expect(isConnectedStepSet(query, new Set(['s2', 'join']))).toBe(false);
    // two sources, linked to no step of the set
    expect(isConnectedStepSet(query, new Set(['s1', 's2']))).toBe(false);
    expect(isConnectedStepSet(query, new Set())).toBe(false);
  });

  test('Draws each container with the steps of it the query has, a step two list in the first', () => {
    const shown = getShownContainers(managerQuery(), [
      container('container1', ['f', 's2', 'gone']),
      container('container2', ['f', 'join', 'sort']),
      container('container3', ['gone']),
    ]);
    expect(shown.map((each) => [each.container.id, [...each.steps]])).toEqual([
      ['container1', ['f', 's2']],
      ['container2', ['join', 'sort']],
    ]);
  });

  test("Doesn't draw a container whose steps aren't one block", () => {
    const shown = getShownContainers(managerQuery(), [
      container('container1', ['s2', 'join']),
      // free to take f, as the first isn't drawn
      container('container2', ['f']),
    ]);
    expect(shown.map((each) => each.container.id)).toEqual(['container2']);
  });

  test("Doesn't draw two containers that, folded, would feed each other", () => {
    // a1 → b1 → join (left) and b2 → a2 → join (right)
    const query = new Query(
      [
        resolvedTable('a1', 'ORDERS', [column('ID')]),
        new TestUnaryNode('b1'),
        resolvedTable('b2', 'CUSTOMERS', [column('ID')]),
        new TestUnaryNode('a2'),
        new TestBinaryNode('join'),
      ],
      [
        new Connection('a1', 'b1', 'tds'),
        new Connection('b1', 'join', 'tds1'),
        new Connection('b2', 'a2', 'tds'),
        new Connection('a2', 'join', 'tds2'),
      ],
      'join',
    );
    expect(
      getShownContainers(query, [
        container('container1', ['a1', 'a2'], true),
        container('container2', ['b1', 'b2'], true),
      ]),
    ).toEqual([]);
  });

  test('A new container takes the step and the steps before it, up to one in a container', () => {
    const query = managerQuery();
    expect(getStepsForNewContainer(query, [], 'f')).toEqual(['f', 's2']);
    expect(getStepsForNewContainer(query, [], 'sort')).toEqual([
      'f',
      'join',
      's1',
      's2',
      'sort',
    ]);
    const shown = getShownContainers(query, [container('container1', ['f'])]);
    expect(getStepsForNewContainer(query, shown, 'sort')).toEqual([
      'join',
      's1',
      'sort',
    ]);
    // a step in a container already
    expect(getStepsForNewContainer(query, shown, 'f')).toEqual([]);
    expect(getStepsForNewContainer(query, shown, 'gone')).toEqual([]);
  });

  test('Numbers new containers after the highest number used', () => {
    expect(generateStepContainerId([])).toBe('container1');
    expect(
      generateStepContainerId([
        container('container3', ['f']),
        container('mine', ['s1']),
      ]),
    ).toBe('container4');
  });

  test('Prunes the steps the query no longer has, and the containers left empty', () => {
    const query = managerQuery();
    const kept = [container('container1', ['s2', 'f'])];
    expect(pruneStepContainers(kept, query)).toBe(kept);
    expect(
      pruneStepContainers(
        [
          container('container1', ['s2', 'gone']),
          container('container2', ['gone']),
        ],
        query,
      ),
    ).toEqual([container('container1', ['s2'])]);
    expect(pruneStepContainers(undefined, query)).toBeUndefined();
  });
});

describe(unitTest('Saved spec: step containers'), () => {
  const withContainers = (containers: unknown): Record<string, unknown> => ({
    formatVersion: 1,
    query: { nodes: [] },
    meta: { containers },
  });

  test('Writes containers back as they were read, unknown keys and steps the query lacks included', () => {
    const json = withContainers([
      { id: 'container1', title: 'Prepare orders', steps: ['s2', 'f'] },
      {
        id: 'container2',
        title: '',
        steps: ['join'],
        folded: true,
        later: { kept: true },
      },
    ]);
    const { document } = decodeCubeSpec(json);
    expect(document.meta.containers).toEqual([
      {
        id: 'container1',
        title: 'Prepare orders',
        steps: ['s2', 'f'],
        folded: false,
      },
      {
        id: 'container2',
        title: '',
        steps: ['join'],
        folded: true,
        rest: { later: { kept: true } },
      },
    ]);
    expect(encodeCubeSpec(document)).toEqual(json);
  });

  test('Writes no containers for a cube without any', () => {
    expect(encodeCubeSpec(new CubeDocument()).meta).toBeUndefined();
    expect(
      encodeCubeSpec(
        new CubeDocument({ meta: { ...DEFAULT_META, containers: [] } }),
      ).meta,
    ).toBeUndefined();
  });

  test.each<[string, unknown, string, string]>([
    [
      'a container with no id',
      [{ title: 'x', steps: [] }],
      'meta.containers[0].id',
      'is required',
    ],
    [
      'a repeated id',
      [
        { id: 'container1', title: 'a', steps: [] },
        { id: 'container1', title: 'b', steps: [] },
      ],
      'meta.containers[1].id',
      'repeats the id "container1"',
    ],
    [
      'a step that is not an id',
      [{ id: 'container1', title: 'a', steps: [1] }],
      'meta.containers[0].steps[0]',
      'must be a string',
    ],
  ])('Refuses %s', (_, containers, path, detail) => {
    expect(() => decodeCubeSpec(withContainers(containers))).toThrow(
      new CubeSpecDecodeError(path, detail),
    );
  });
});
