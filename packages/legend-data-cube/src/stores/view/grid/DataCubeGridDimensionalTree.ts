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
  guaranteeType,
  hashArray,
  type Hashable,
} from '@finos/legend-shared';

export const DIMENSIONAL_L0_COLUMN = 'ALL';

enum DimensionalNodeHashType {
  GROUP_BY_NODE = 'groupByNode',
  DIMENSIONAL_NODE = 'dimensionalNode',
  DIMENSIONAL_TREE = 'dimensionalTree',
}

export class DataCubeDimensionalTree implements Hashable {
  rootNodes: DataCubeDimensionalNode[];

  constructor(rootNodes: DataCubeDimensionalNode[]) {
    this.rootNodes = rootNodes;
  }

  // TODO: improve hashing
  get hashCode(): string {
    return hashArray([
      DimensionalNodeHashType.DIMENSIONAL_TREE,
      hashArray(this.rootNodes),
    ]);
  }
}

export class DataCubeDimensionalNode implements Hashable {
  column: string;
  dimension: string;
  childNodes: DataCubeDimensionalNode[];
  groupByNodes: DataCubeDimensionalGroupByNode[];

  constructor(
    column: string,
    dimension: string,
    childNodes: DataCubeDimensionalNode[] = [],
    groupByNodes: DataCubeDimensionalGroupByNode[] = [],
  ) {
    this.column = column;
    this.dimension = dimension;
    this.childNodes = childNodes;
    this.groupByNodes = groupByNodes;
  }

  get hashCode(): string {
    return hashArray([
      DimensionalNodeHashType.DIMENSIONAL_NODE,
      this.column,
      hashArray(this.groupByNodes),
    ]);
  }
}

export class DataCubeDimensionalGroupByNode implements Hashable {
  column: string;
  filter: string;
  dimension: string;

  constructor(column: string, filter: string, dimension: string) {
    this.column = column;
    this.filter = filter;
    this.dimension = dimension;
  }

  get hashCode(): string {
    return hashArray([
      DimensionalNodeHashType.GROUP_BY_NODE,
      this.column,
      this.filter,
      this.dimension,
    ]);
  }
}

export class DataCubeDimensionalMetadata {
  column: string;
  level: number;
  groupByNodes: DataCubeDimensionalGroupByNode[];

  constructor(
    column: string,
    level: number,
    groupByNodes: DataCubeDimensionalGroupByNode[] = [],
  ) {
    this.column = column;
    this.level = level;
    this.groupByNodes = groupByNodes;
  }
}

export function generateDimensionalPaths(
  tree: DataCubeDimensionalTree,
): DataCubeDimensionalNode[][] {
  const paths: DataCubeDimensionalNode[][] = [];

  const collectAllDescendants = (node: DataCubeDimensionalNode) => {
    const result: DataCubeDimensionalNode[] = [];
    const stack = [node];

    while (stack.length) {
      const current = stack.pop();
      if (current) {
        result.push(current);
        stack.push(...current.childNodes);
      }
    }

    return result;
  };

  const backtrack = (index: number, path: DataCubeDimensionalNode[]) => {
    if (index === tree.rootNodes.length) {
      paths.push([...path]);
      return;
    }

    const options = collectAllDescendants(
      guaranteeNonNullable(tree.rootNodes[index]),
    );

    for (const option of options) {
      path.push(option);
      backtrack(index + 1, path);
      path.pop();
    }
  };

  backtrack(0, []);
  return paths;
}

export function hydrateDataCubeDimensionalTree(
  configuration: DataCubeConfiguration,
  event?: CellDoubleClickedEvent,
  tree?: DataCubeDimensionalTree,
): DataCubeDimensionalTree | undefined {
  if (!event && !tree) {
    return new DataCubeDimensionalTree(
      configuration.dimensions.dimensions.map(
        (d) => new DataCubeDimensionalNode(DIMENSIONAL_L0_COLUMN, d.name),
      ),
    );
  }

  const safeTree = guaranteeNonNullable(tree);
  const safeEvent = guaranteeNonNullable(event);

  const metadata = guaranteeType(
    safeEvent.data.metadata,
    Map<string, DataCubeDimensionalMetadata>,
  );
  const clickedDimension = guaranteeNonNullable(safeEvent.column.getColId());

  const dimensionMetadata = metadata.get(clickedDimension);

  if (!dimensionMetadata) {
    return safeTree; // No metadata for clicked column -> return tree untouched
  }

  const safeMetadata = guaranteeType(
    dimensionMetadata,
    DataCubeDimensionalMetadata,
  );

  const { column: clickedColumn, groupByNodes } = safeMetadata;
  const dimension = guaranteeNonNullable(
    configuration.dimensions.dimensions.find(
      (d) => d.name === clickedDimension,
    ),
  );

  const nextColumn =
    clickedColumn !== DIMENSIONAL_L0_COLUMN
      ? dimension.columns[dimension.columns.indexOf(clickedColumn) + 1]
      : dimension.columns[0];

  if (!nextColumn) {
    return safeTree;
  } // No further drilldown possible

  const newNode = new DataCubeDimensionalNode(nextColumn, clickedDimension);
  newNode.groupByNodes.push(...groupByNodes);

  for (const rootNode of safeTree.rootNodes) {
    if (rootNode.dimension !== clickedDimension) {
      continue;
    }

    const targetNode = findNodeByColumnOrGroup(
      rootNode,
      clickedColumn,
      groupByNodes,
    );
    if (targetNode) {
      if (clickedColumn !== DIMENSIONAL_L0_COLUMN) {
        newNode.groupByNodes.push(
          new DataCubeDimensionalGroupByNode(
            clickedColumn,
            safeEvent.value,
            clickedDimension,
          ),
        );
      }

      const alreadyExists = targetNode.childNodes.some(
        (child) =>
          child.column === newNode.column &&
          child.hashCode === newNode.hashCode,
      );

      if (!alreadyExists) {
        targetNode.childNodes.push(newNode);
      }
    }
    break; // done
  }

  return safeTree;
}

function findNodeByColumnOrGroup(
  node: DataCubeDimensionalNode,
  targetColumn: string,
  targetGroupByNodes: DataCubeDimensionalGroupByNode[],
): DataCubeDimensionalNode | undefined {
  if (
    node.column === targetColumn &&
    hashArray(node.groupByNodes) === hashArray(targetGroupByNodes)
  ) {
    return node;
  }

  for (const child of node.childNodes) {
    const match = findNodeByColumnOrGroup(
      child,
      targetColumn,
      targetGroupByNodes,
    );
    if (match) {
      return match;
    }
  }

  return undefined;
}
