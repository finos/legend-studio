/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { it, expect, describe } from '@jest/globals';
import {
  DataCubeDimensionalNode,
  DIMENSIONAL_L0_COLUMN,
  DataCubeDimensionalTree,
  generateDimensionalPaths,
  DataCubeDimensionalGroupByNode,
  DataCubeDimensionalMetadata,
  hydrateDataCubeDimensionalTree,
  removeSubtreeNode,
} from '../../view/grid/DataCubeGridDimensionalTree.js';
import type { CellDoubleClickedEvent } from 'ag-grid-community';
import type { DataCubeConfiguration } from '../model/DataCubeConfiguration.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

describe('generateDimensionalPaths – children and groupByNodes handling', () => {
  it('returns empty array when tree has no root nodes', () => {
    const tree = new DataCubeDimensionalTree([]);
    const paths = generateDimensionalPaths(tree);
    expect(paths).toEqual([[]]);
  });

  it('generates paths from a tree with no child nodes or groupByNodes', () => {
    const root1 = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
    );
    const root2 = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'organization',
    );
    const tree = new DataCubeDimensionalTree([root1, root2]);

    const paths = generateDimensionalPaths(tree);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toEqual([root1, root2]);
  });

  it('generates paths with child nodes only (no groupByNodes)', () => {
    const child2 = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [],
      [new DataCubeDimensionalGroupByNode('location_l1', 'UK', 'location')],
    );
    const child1 = new DataCubeDimensionalNode('location_l1', 'location', [
      child2,
    ]);
    const root1 = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [child1],
    );
    const root2 = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'organization',
    );
    const tree = new DataCubeDimensionalTree([root1, root2]);

    const paths = generateDimensionalPaths(tree);
    expect(paths).toHaveLength(3);
    expect(paths).toEqual([
      [root1, root2],
      [child1, root2],
      [child2, root2],
    ]);
  });

  it('generates paths from deeper trees with children and groupByNodes mixed', () => {
    const groupByNode = [
      new DataCubeDimensionalGroupByNode('location_l1', 'UK', 'location'),
    ];
    const child3 = new DataCubeDimensionalNode(
      'location_l3',
      'location',
      [],
      [
        new DataCubeDimensionalGroupByNode('location_l2', 'London', 'location'),
        ...groupByNode,
      ],
    );
    const child2 = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [child3],
      groupByNode,
    );
    const child1 = new DataCubeDimensionalNode('location_l1', 'location', [
      child2,
    ]);
    const root1 = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [child1],
    );

    const orgChild = new DataCubeDimensionalNode('org_l1', 'organization');
    const root2 = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'organization',
      [orgChild],
    );

    const tree = new DataCubeDimensionalTree([root1, root2]);

    const paths = generateDimensionalPaths(tree);
    expect(paths).toHaveLength(8);
    expect(paths).toEqual([
      [root1, root2],
      [root1, orgChild],
      [child1, root2],
      [child1, orgChild],
      [child2, root2],
      [child2, orgChild],
      [child3, root2],
      [child3, orgChild],
    ]);
  });
});

describe('hydrateDataCubeDimensionalTree', () => {
  const locationDim = {
    name: 'location',
    columns: ['location_l1', 'location_l2', 'location_l3'],
  };

  const orgDim = {
    name: 'organization',
    columns: ['organization_l1'],
  };

  const config = {
    dimensions: {
      dimensions: [locationDim, orgDim],
    },
  } as unknown as DataCubeConfiguration;

  // const baseTree = new DataCubeDimensionalTree([
  //   new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'location'),
  //   new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization'),
  // ]);

  const buildEvent = (
    colId: string,
    value: string,
    column: string,
    groupByNodes: DataCubeDimensionalGroupByNode[] = [],
    level: number,
  ) => {
    return {
      value: value,
      column: { getColId: () => colId },
      data: {
        metadata: new Map<string, DataCubeDimensionalMetadata>([
          [colId, new DataCubeDimensionalMetadata(column, level, groupByNodes)],
        ]),
      },
    } as unknown as CellDoubleClickedEvent;
  };

  it('adds new child node correctly when clicked on a root node', () => {
    const tree = new DataCubeDimensionalTree([
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'location'),
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization'),
    ]);

    const event = buildEvent(
      'location',
      DIMENSIONAL_L0_COLUMN,
      DIMENSIONAL_L0_COLUMN,
      [],
      0,
    );

    const hydrated = guaranteeNonNullable(
      hydrateDataCubeDimensionalTree(config, event, tree),
    );
    const paths = generateDimensionalPaths(hydrated);

    expect(paths).toHaveLength(2);
    expect(paths.map((p) => p.map((n) => n.column))).toEqual([
      [DIMENSIONAL_L0_COLUMN, DIMENSIONAL_L0_COLUMN],
      ['location_l1', DIMENSIONAL_L0_COLUMN],
    ]);
  });

  it('does not add duplicate node if already exists', () => {
    const l1Node = new DataCubeDimensionalNode('location_l1', 'location');
    const tree = new DataCubeDimensionalTree([
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'location', [l1Node]),
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization'),
    ]);

    const originalPaths = generateDimensionalPaths(tree);
    expect(originalPaths).toHaveLength(2);

    const event = buildEvent(
      'location',
      DIMENSIONAL_L0_COLUMN,
      DIMENSIONAL_L0_COLUMN,
      [],
      0,
    );

    const hydrated = guaranteeNonNullable(
      hydrateDataCubeDimensionalTree(config, event, tree),
    );
    const paths = generateDimensionalPaths(hydrated);
    expect(paths).toHaveLength(2);
  });

  it('adds child with groupByNode context when clicking on non-root column', () => {
    const root = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [new DataCubeDimensionalNode('location_l1', 'location')],
    );
    const tree = new DataCubeDimensionalTree([
      root,
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization'),
    ]);

    const groupBy = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'UK',
      'location',
    );
    const event = buildEvent('location', 'UK', 'location_l1', [], 1);

    const hydrated = guaranteeNonNullable(
      hydrateDataCubeDimensionalTree(config, event, tree),
    );
    const paths = generateDimensionalPaths(hydrated);

    // should now include location_l2
    expect(paths).toHaveLength(3);
    expect(paths.some((p) => p.find((n) => n.column === 'location_l2'))).toBe(
      true,
    );
    expect(
      paths.some((path) =>
        path.some((node) =>
          node.groupByNodes.some((g) => g.hashCode === groupBy.hashCode),
        ),
      ),
    ).toBe(true);
  });

  it('returns original tree if no next column available', () => {
    const groupBy = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'UK',
      'location',
    );
    const l2Node = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [],
      [groupBy],
    );
    const l1Node = new DataCubeDimensionalNode('location_l1', 'location', [
      l2Node,
    ]);
    const root = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [l1Node],
    );
    const o1Node = new DataCubeDimensionalNode(
      'orgarnization_l1',
      'organization',
    );
    const tree = new DataCubeDimensionalTree([
      root,
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization', [
        o1Node,
      ]),
    ]);

    expect(generateDimensionalPaths(tree)).toHaveLength(6);

    const event = buildEvent('organization', 'Org1', 'organization_l1', [], 1); // already last column
    const hydrated = guaranteeNonNullable(
      hydrateDataCubeDimensionalTree(config, event, tree),
    );
    expect(generateDimensionalPaths(hydrated)).toHaveLength(6); // no new paths
  });

  it('adds child with already existing groupByNode context when clicking on non-root column', () => {
    const groupBy = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'UK',
      'location',
    );
    const l2Node = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [],
      [groupBy],
    );
    const l1Node = new DataCubeDimensionalNode('location_l1', 'location', [
      l2Node,
    ]);
    const root = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [l1Node],
    );
    const tree = new DataCubeDimensionalTree([
      root,
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization'),
    ]);

    const event = buildEvent('location', 'LDN', 'location_l2', [groupBy], 2); // already last column
    const hydrated = guaranteeNonNullable(
      hydrateDataCubeDimensionalTree(config, event, tree),
    );
    const paths = generateDimensionalPaths(hydrated); // no new paths
    const newGroupBy = new DataCubeDimensionalGroupByNode(
      'location_l2',
      'LDN',
      'location',
    );

    expect(paths).toHaveLength(4);
    expect(
      paths.some((path) =>
        path.some((node) => {
          const groupHashes = node.groupByNodes.map((g) => g.hashCode);
          return (
            groupHashes.includes(groupBy.hashCode) &&
            groupHashes.includes(newGroupBy.hashCode)
          );
        }),
      ),
    ).toBe(true);
  });
});

describe('removeSubtreeNode', () => {
  it('removes a child node matching column and groupByNodes', () => {
    // Setup: Root -> Child (to be removed)
    const groupBy = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'UK',
      'location',
    );
    const l2Node = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [],
      [groupBy],
    );
    const l1Node = new DataCubeDimensionalNode('location_l1', 'location', [
      l2Node,
    ]);
    const root = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [l1Node],
    );
    const tree = new DataCubeDimensionalTree([
      root,
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization'),
    ]);

    const beforePaths = generateDimensionalPaths(tree);
    expect(beforePaths).toHaveLength(3);

    const removed = removeSubtreeNode(tree, 'location', 'location_l1', []);
    expect(removed).toEqual(true);

    const afterPaths = generateDimensionalPaths(tree);
    expect(afterPaths).toHaveLength(1);
  });

  it('does not remove root-level node (TODO case)', () => {
    const root = new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'location');
    const tree = new DataCubeDimensionalTree([
      root,
      new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, 'organization'),
    ]);

    expect(generateDimensionalPaths(tree)).toHaveLength(1);
    removeSubtreeNode(tree, 'location', DIMENSIONAL_L0_COLUMN, []);
    expect(generateDimensionalPaths(tree)).toHaveLength(1);
    expect(tree.rootNodes).toHaveLength(2);
  });

  it('removes a deep node with specific groupByNodes in a complex tree', () => {
    const groupByUK = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'UK',
      'location',
    );
    const groupByUSA = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'USA',
      'location',
    );

    const groupByNY = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'NY',
      'location',
    );

    //Level 3 nodes (final children)
    const childNY = new DataCubeDimensionalNode(
      'location_l3',
      'location',
      [],
      [groupByNY, groupByUSA],
    );

    // Level 2 nodes
    const childUK = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [],
      [groupByUK],
    );
    const childUSA = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [childNY],
      [groupByUSA],
    );

    // Level 1 nodes
    const l1UK = new DataCubeDimensionalNode(
      'location_l1',
      'location',
      [childUK, childUSA],
      [],
    );

    // Root
    const root = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [l1UK],
    );

    const tree = new DataCubeDimensionalTree([root]);

    const beforePaths = generateDimensionalPaths(tree);
    expect(beforePaths).toHaveLength(5);

    // Attempt to remove only the LDN leaf node
    const removed = removeSubtreeNode(tree, 'location', 'location_l3', [
      groupByNY,
      groupByUSA,
    ]);
    expect(removed).toBe(true);

    const afterPaths = generateDimensionalPaths(tree);
    expect(afterPaths).toHaveLength(4);
  });

  it('removes a deep node with specific groupByNodes in a complex tree', () => {
    const groupByUK = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'UK',
      'location',
    );
    const groupByUSA = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'USA',
      'location',
    );

    const groupByNY = new DataCubeDimensionalGroupByNode(
      'location_l1',
      'NY',
      'location',
    );

    //Level 3 nodes (final children)
    const childNY = new DataCubeDimensionalNode(
      'location_l3',
      'location',
      [],
      [groupByNY, groupByUSA],
    );

    // Level 2 nodes
    const childUK = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [],
      [groupByUK],
    );
    const childUSA = new DataCubeDimensionalNode(
      'location_l2',
      'location',
      [childNY],
      [groupByUSA],
    );

    // Level 1 nodes
    const l1UK = new DataCubeDimensionalNode(
      'location_l1',
      'location',
      [childUK, childUSA],
      [],
    );

    // Root
    const root = new DataCubeDimensionalNode(
      DIMENSIONAL_L0_COLUMN,
      'location',
      [l1UK],
    );

    const tree = new DataCubeDimensionalTree([root]);

    const beforePaths = generateDimensionalPaths(tree);
    expect(beforePaths).toHaveLength(5);

    // Attempt to remove only the LDN leaf node
    const removed = removeSubtreeNode(tree, 'location', 'location_l1', []);
    expect(removed).toBe(true);

    const afterPaths = generateDimensionalPaths(tree);
    expect(afterPaths).toHaveLength(1);
  });
});
