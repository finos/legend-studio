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
import { ServiceDetail } from '@finos/legend-graph';
import { mockServices } from '../../../components/__test-utils__/TEST_DATA__DataAPIs.js';
import { LegendServiceCardState } from '../LegendMarketplaceDataAPIsStore.js';
import { LegendServiceTree, toPatternSegments } from '../LegendServiceTree.js';

const card = (pattern: string): LegendServiceCardState =>
  new LegendServiceCardState(
    ServiceDetail.fromJson({ ...mockServices[0], pattern }),
  );

describe('LegendServiceTree', () => {
  test('groups services by pattern segments, groups before leaves', () => {
    const tree = new LegendServiceTree([
      card('/a/b/svc2'),
      card('/a/b/svc1'),
      card('/a/leaf'),
      card('/z'),
    ]);
    expect(tree.roots.map((n) => n.path)).toEqual(['a', 'z']);
    const a = tree.roots[0];
    expect(a?.children.map((n) => n.path)).toEqual(['a/b', 'a/leaf']);
    expect(a?.children[0]?.children.map((n) => n.label)).toEqual([
      'svc1',
      'svc2',
    ]);
    expect(a?.serviceCount).toBe(3);
  });

  test('collects group paths only, never leaves', () => {
    const tree = new LegendServiceTree([card('/a/b/svc'), card('/a/leaf')]);
    expect([...tree.groupPaths].sort()).toEqual(['a', 'a/b']);
  });

  test('a service that is also a parent becomes a leaf under a pure group', () => {
    const tree = new LegendServiceTree([card('/a/b'), card('/a/b/c')]);
    expect(
      tree.flat.map((n) => [n.key, n.label, n.isGroup, n.services.length]),
    ).toEqual([
      ['a/b', 'a/b', true, 0],
      ['a/b#own', 'b', false, 1],
      ['a/b/c', 'c', false, 1],
    ]);
    expect(tree.roots[0]?.serviceCount).toBe(2);
    expect(tree.groupPaths).toEqual(['a/b']);
  });

  test('only leaves carry services', () => {
    const tree = new LegendServiceTree([
      card('/p'),
      card('/p/q'),
      card('/p/q/r'),
      card('/p/s'),
    ]);
    const groups = tree.flat.filter((n) => n.isGroup);
    expect(groups.every((n) => n.services.length === 0)).toBe(true);
    expect(
      tree.flat.filter((n) => n.services.length > 0).map((n) => n.key),
    ).toEqual(['p/q#own', 'p/q/r', 'p#own', 'p/s']);
    expect(new Set(tree.flat.map((n) => n.key)).size).toBe(tree.flat.length);
  });

  test('keeps every service when patterns normalise to the same path', () => {
    const tree = new LegendServiceTree([
      card('/a/b'),
      card('/a//b'),
      card('/c'),
    ]);
    const b = tree.roots[0]?.children[0];
    expect(b?.services).toHaveLength(2);
    expect(tree.roots[0]?.serviceCount).toBe(2);
  });

  test('records depth, subtree end and sibling position for the flat list', () => {
    const tree = new LegendServiceTree([
      card('/a/b/x'),
      card('/a/b/y'),
      card('/a/z'),
    ]);
    expect(tree.flat.map((n) => [n.path, n.depth, n.subtreeEnd])).toEqual([
      ['a', 0, 5],
      ['a/b', 1, 4],
      ['a/b/x', 2, 3],
      ['a/b/y', 2, 4],
      ['a/z', 1, 5],
    ]);
    const z = tree.flat[4];
    expect([z?.siblingIndex, z?.siblingCount]).toEqual([1, 2]);
  });

  test('scoped tree holds only the group and what is below it', () => {
    const tree = new LegendServiceTree(
      [card('/a/b/x'), card('/a/b/c/y'), card('/a/other'), card('/ab/b/z')],
      '/a/b/',
    );
    expect(tree.roots.map((n) => n.path)).toEqual(['a/b']);
    expect(tree.flat.map((n) => n.path)).toEqual([
      'a/b',
      'a/b/c',
      'a/b/c/y',
      'a/b/x',
    ]);
    expect(tree.roots[0]?.label).toBe('b');
    expect(tree.roots[0]?.serviceCount).toBe(2);
    expect(tree.groupPaths).toEqual(['a/b/c', 'a/b']);
  });

  test('scoping to a single service pattern yields just that leaf', () => {
    const tree = new LegendServiceTree([card('/a/b'), card('/a/c')], 'a/b');
    expect(tree.flat.map((n) => n.path)).toEqual(['a/b']);
    expect(tree.roots[0]?.serviceCount).toBe(1);
  });

  test('scoping to an unknown group yields no roots', () => {
    const tree = new LegendServiceTree([card('/a/b')], 'zzz');
    expect(tree.roots).toEqual([]);
    expect(tree.flat).toEqual([]);
  });

  test('splits patterns and group paths the same way', () => {
    expect(toPatternSegments('/a//b/')).toEqual(['a', 'b']);
    expect(toPatternSegments('')).toEqual([]);
  });

  test('merges a single-child chain into one parent above the leaf', () => {
    const tree = new LegendServiceTree([
      card('/team/area/dataset/entity/{id}'),
    ]);
    expect(tree.flat.map((n) => [n.label, n.path, n.depth])).toEqual([
      ['team/area/dataset/entity', 'team/area/dataset/entity', 0],
      ['{id}', 'team/area/dataset/entity/{id}', 1],
    ]);
    expect(tree.groupPaths).toEqual(['team/area/dataset/entity']);
    expect(tree.flat[1]?.isGroup).toBe(false);
  });

  test('only merges where a group has a single group child and no service', () => {
    const tree = new LegendServiceTree([
      card('/a/b/c/x'),
      card('/a/b/d/y'),
      card('/a/e/z'),
    ]);
    // `a` has two children so stays; `a/b` has two; `e` > `z` is group > leaf
    expect(tree.flat.map((n) => n.label)).toEqual([
      'a',
      'b',
      'c',
      'x',
      'd',
      'y',
      'e',
      'z',
    ]);
    const chained = new LegendServiceTree([
      card('/p/q/r/s'),
      card('/p/q/r/t'),
      card('/p/q/own'),
    ]);
    // p > q merge (p has one child); q has two children so the chain stops
    expect(chained.flat.map((n) => n.label)).toEqual([
      'p/q',
      'r',
      's',
      't',
      'own',
    ]);
  });

  test('a scope root keeps its own path while the chain below it merges', () => {
    const tree = new LegendServiceTree(
      [card('/a/b/c/d/x'), card('/a/b/c/d/y')],
      'a/b',
    );
    expect(tree.roots.map((n) => [n.label, n.path])).toEqual([['b', 'a/b']]);
    expect(tree.roots[0]?.children.map((n) => n.label)).toEqual(['c/d']);
    expect(tree.roots[0]?.children[0]?.path).toBe('a/b/c/d');
  });
});
