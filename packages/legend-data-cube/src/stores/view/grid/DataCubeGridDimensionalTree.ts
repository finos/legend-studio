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

import type { CellDoubleClickedEvent } from 'ag-grid-community';
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import {
  guaranteeNonNullable,
  hashArray,
  type Hashable,
} from '@finos/legend-shared';

enum DIMENSIONAL_TREE_HASH {
  GROUP_BY_NODE = 'groupByNode',
  DIMENSIONAL_NODE = 'dimensionalNode',
}

export class DataCubeDimensionalTree {
  rootNodes: DataCubeDimensionalNode[] = [];

  constructor(childNodes: DataCubeDimensionalNode[]) {
    this.rootNodes = childNodes;
  }

  generateDimensionalPaths(): DataCubeDimensionalNode[][] {
    const allPaths: DataCubeDimensionalNode[][] = [];

    // Helper to get all nodes in the subtree: self + descendants (DFS)
    const collectAllDescendants = (
      node: DataCubeDimensionalNode,
    ): DataCubeDimensionalNode[] => {
      const result: DataCubeDimensionalNode[] = [];
      const stack: DataCubeDimensionalNode[] = [node];

      while (stack.length) {
        const current = stack.pop()!;
        result.push(current);
        stack.push(...current.childNodes);
      }

      return result;
    };

    const backtrack = (index: number, path: DataCubeDimensionalNode[]) => {
      if (index === this.rootNodes.length) {
        allPaths.push([...path]);
        return;
      }

      const node = this.rootNodes[index];
      const options = collectAllDescendants(node!);

      for (const option of options) {
        path.push(option);
        backtrack(index + 1, path);
        path.pop();
      }
    };

    backtrack(0, []);
    return allPaths;
  }
}

export class DataCubeDimensionalNode implements Hashable {
  column!: string;
  dimension!: string;
  childNodes: DataCubeDimensionalNode[] = [];
  groupByNodes: DataCubeDimensionalGroupByNode[] = [];

  constructor(
    column: string,
    dimension: string,
    childNodes: DataCubeDimensionalNode[],
  ) {
    this.column = column;
    this.dimension = dimension;
    this.childNodes = childNodes;
  }

  get hashCode(): string {
    return hashArray([
      DIMENSIONAL_TREE_HASH.DIMENSIONAL_NODE,
      this.column.toString(),
      hashArray(this.groupByNodes),
    ]);
  }
}

export class DataCubeDimensionalGroupByNode implements Hashable {
  column!: string;
  // with each new filter its a different query
  filter!: string;
  dimension!: string;

  constructor(column: string, filter: string, dimension: string) {
    this.column = column;
    this.filter = filter;
    this.dimension = dimension;
  }

  get hashCode(): string {
    return hashArray([
      DIMENSIONAL_TREE_HASH.GROUP_BY_NODE,
      this.column.toString(),
      this.filter.toString(),
      this.dimension.toString(),
    ]);
  }
}

export class DataCubeDimensionalMetadata {
  column!: string;
  groupByNodes: DataCubeDimensionalGroupByNode[] = [];
  constructor(column: string, groupByNodes?: DataCubeDimensionalGroupByNode[]) {
    this.column = column;
    this.groupByNodes = groupByNodes ? groupByNodes : [];
  }
}

export function hydrateDataCubeDimensionalTree(
  configuration: DataCubeConfiguration,
  event?: CellDoubleClickedEvent,
  tree?: DataCubeDimensionalTree,
): DataCubeDimensionalTree | undefined {
  if (!event && !tree) {
    const nodes = configuration.dimensions.dimensions.map(
      (dimension) => new DataCubeDimensionalNode('ALL', dimension.name, []),
    );
    return new DataCubeDimensionalTree(nodes);
  }

  guaranteeNonNullable(tree);
  guaranteeNonNullable(event);

  const metadata = event!.data['metadata'];
  const clickedDimension = event!.column.getColId();
  const dimensionMetadata = metadata.get(
    clickedDimension,
  ) as DataCubeDimensionalMetadata;
  const clickedColumn = dimensionMetadata.column;
  const groupByNodes = dimensionMetadata.groupByNodes;

  const dimension = guaranteeNonNullable(
    configuration.dimensions.dimensions.find(
      (d) => d.name === clickedDimension,
    ),
  );

  const nextColumn =
    clickedColumn !== 'ALL'
      ? dimension.columns[dimension.columns.indexOf(clickedColumn) + 1]
      : dimension.columns[0];

  if (!nextColumn) {
    // No further drilldown possible
    return tree;
  }

  // Construct the new child node
  const newNode = new DataCubeDimensionalNode(nextColumn, clickedDimension, []);
  newNode.groupByNodes.push(...groupByNodes);

  // Recursively find where to insert
  for (const rootNode of tree!.rootNodes) {
    if (rootNode.dimension === clickedDimension) {
      const targetNode = findNodeByColumnOrGroup(
        rootNode,
        clickedColumn,
        groupByNodes,
      );

      if (targetNode) {
        if (clickedColumn !== 'ALL')
          newNode.groupByNodes.push(
            new DataCubeDimensionalGroupByNode(
              clickedColumn,
              event?.value,
              clickedDimension,
            ),
          );
        const alreadyExists = targetNode.childNodes.some(
          (child) =>
            child.column === newNode.column &&
            child.hashCode === newNode.hashCode,
        );

        if (!alreadyExists) {
          targetNode.childNodes.push(newNode);
        }
      }

      return tree;
    }
  }

  return tree;
}

function findNodeByColumnOrGroup(
  node: DataCubeDimensionalNode,
  targetColumn: string,
  targetGroupByNodes: DataCubeDimensionalGroupByNode[],
): DataCubeDimensionalNode | undefined {
  const isSameGroup =
    hashArray(targetGroupByNodes) === hashArray(node.groupByNodes);

  if (node.column === targetColumn && isSameGroup) {
    return node;
  }

  for (const child of node.childNodes) {
    const match = findNodeByColumnOrGroup(
      child,
      targetColumn,
      targetGroupByNodes,
    );
    if (match) return match;
  }

  return undefined;
}
