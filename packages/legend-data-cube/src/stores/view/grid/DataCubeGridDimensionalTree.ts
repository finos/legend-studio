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
  customList,
  guaranteeNonNullable,
  guaranteeType,
  hashArray,
  SerializationFactory,
  usingModelSchema,
  type Hashable,
  type PlainObject,
  type Writable,
} from '@finos/legend-shared';
import {
  createModelSchema,
  deserialize,
  list,
  primitive,
  serialize,
} from 'serializr';

export const DIMENSIONAL_L0_COLUMN = 'ALL';

enum DimensionalNodeHashType {
  GROUP_BY_NODE = 'groupByNode',
  DIMENSIONAL_NODE = 'dimensionalNode',
  DIMENSIONAL_TREE = 'dimensionalTree',
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

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeDimensionalGroupByNode, {
      column: primitive(),
      filter: primitive(),
      dimension: primitive(),
    }),
  );
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

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeDimensionalNode, {
      column: primitive(),
      dimension: primitive(),
      childNodes: customList(
        serializeDataCubeDimensionalNode,
        deSerializeDataCubeDimensionalNode,
      ),
      groupByNodes: list(
        usingModelSchema(DataCubeDimensionalGroupByNode.serialization.schema),
      ),
    }),
  );
}

const dataCubeDimensionalNodeModelSchema = createModelSchema(
  DataCubeDimensionalNode,
  {
    column: primitive(),
    dimension: primitive(),
    childNodes: customList(
      serializeDataCubeDimensionalNode,
      deSerializeDataCubeDimensionalNode,
    ),
    groupByNodes: list(
      usingModelSchema(DataCubeDimensionalGroupByNode.serialization.schema),
    ),
  },
);

function serializeDataCubeDimensionalNode(
  protocol: DataCubeDimensionalNode,
): PlainObject<DataCubeDimensionalNode> {
  return serialize(dataCubeDimensionalNodeModelSchema, protocol);
}

function deSerializeDataCubeDimensionalNode(
  plainObject: PlainObject<DataCubeDimensionalNode>,
): DataCubeDimensionalNode {
  return deserialize(dataCubeDimensionalNodeModelSchema, plainObject);
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

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeDimensionalTree, {
      rootNodes: list(
        usingModelSchema(DataCubeDimensionalNode.serialization.schema),
      ),
    }),
  );
}

export function cloneDimensionalTree(tree: DataCubeDimensionalTree) {
  let clone = new DataCubeDimensionalTree([]);
  (clone as Writable<DataCubeDimensionalTree>) = JSON.parse(
    JSON.stringify(tree),
  ) as DataCubeDimensionalTree;
  return clone;
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

export function removeSubtreeNode(
  tree: DataCubeDimensionalTree,
  targetDimension: string,
  targetColumn: string,
  targetGroupByNodes: DataCubeDimensionalGroupByNode[],
): boolean {
  // Iterate only the roots of the matching dimension
  for (const root of tree.rootNodes) {
    if (root.dimension !== targetDimension) {
      continue;
    }

    const found = findNodeWithParent(
      root,
      targetColumn,
      targetGroupByNodes,
      null,
    );
    if (!found) {
      continue;
    }

    const { parent, index } = found;
    if (parent) {
      // remove from its parent’s childNodes
      parent.childNodes.splice(index, 1);
    } else {
      // remove a root‐level node
      // TODO: do nothing
    }
    return true; // removed successfully
  }

  return false; // no matching node found
}

function findNodeWithParent(
  current: DataCubeDimensionalNode,
  targetColumn: string,
  targetGroupByNodes: DataCubeDimensionalGroupByNode[],
  parent: DataCubeDimensionalNode | null = null,
): { parent: DataCubeDimensionalNode | null; index: number } | null {
  if (
    current.column === targetColumn &&
    findNodeByColumnOrGroup(current, targetColumn, targetGroupByNodes)
  ) {
    if (parent) {
      const idx = parent.childNodes.findIndex((c) => c === current);
      return { parent, index: idx };
    } else {
      // matched a root node
      return { parent: null, index: -1 };
    }
  }
  for (const child of current.childNodes) {
    const found = findNodeWithParent(
      child,
      targetColumn,
      targetGroupByNodes,
      current,
    );
    if (found) {
      return found;
    }
  }
  return null;
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

function pathSignature(path: DataCubeDimensionalNode[]): string {
  return path
    .map((node) => {
      const base = `${node.dimension}:${node.column}`;
      if (node.groupByNodes.length > 0) {
        const filters = node.groupByNodes
          .map((g) => `${g.dimension}:${g.column}:${g.filter}`)
          .join(',');
        return `${base}->[${filters}]`;
      } else {
        return `${base}->[NO_FILTER]`;
      }
    })
    .join('|');
}

//TODO: we can add oldPath signature directly in the snapshot
export function findExtraPaths(
  oldPaths: DataCubeDimensionalNode[][],
  newPaths: DataCubeDimensionalNode[][],
): DataCubeDimensionalNode[][] {
  const oldSignatures = new Set(oldPaths.map(pathSignature));
  return newPaths.filter((path) => !oldSignatures.has(pathSignature(path)));
}
