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

import {
  assertType,
  addUniqueEntry,
  guaranteeNonNullable,
  deleteEntry,
} from '@finos/legend-studio-shared';
import type {
  TreeNodeData,
  TreeData,
} from '@finos/legend-application-components';
import type {
  AbstractProperty,
  GraphFetchTree,
  Type,
  RootGraphFetchTree,
} from '@finos/legend-studio';
import {
  PropertyExplicitReference,
  Class,
  PropertyGraphFetchTree,
} from '@finos/legend-studio';
import type { QueryBuilderExplorerTreeNodeData } from './QueryBuilderExplorerState';
import { QueryBuilderExplorerTreePropertyNodeData } from './QueryBuilderExplorerState';

export class QueryBuilderGraphFetchTreeNodeData implements TreeNodeData {
  isSelected?: boolean;
  isOpen?: boolean;
  id: string;
  label: string;
  childrenIds: string[] = [];
  parentId?: string;
  tree: PropertyGraphFetchTree;

  constructor(
    id: string,
    label: string,
    parentId: string | undefined,
    graphFetchTreeNode: PropertyGraphFetchTree,
  ) {
    this.id = id;
    this.label = label;
    this.parentId = parentId;
    this.tree = graphFetchTreeNode;
    // NOTE: in this tree, every node is open
    this.isOpen = true;
  }

  get type(): Type {
    return this.tree.property.value.genericType.value.rawType;
  }
}

export interface QueryBuilderGraphFetchTreeData
  extends TreeData<QueryBuilderGraphFetchTreeNodeData> {
  tree: RootGraphFetchTree;
}

const generateNodeId = (
  property: AbstractProperty,
  subType: Type | undefined,
  parentNodeId: string | undefined,
): string =>
  `${parentNodeId ? `${parentNodeId}.` : ''}${property.name}${
    subType ? subType.path : ''
  }`;

const buildGraphFetchSubTree = (
  tree: GraphFetchTree,
  parentNode: QueryBuilderGraphFetchTreeNodeData | undefined,
  nodes: Map<string, QueryBuilderGraphFetchTreeNodeData>,
): QueryBuilderGraphFetchTreeNodeData => {
  assertType(
    tree,
    PropertyGraphFetchTree,
    'Graph fetch sub-tree must be a property graph fetch tree',
  );
  const property = tree.property.value;
  const subType = tree.subType.value;
  const parentNodeId = parentNode?.id;
  const node = new QueryBuilderGraphFetchTreeNodeData(
    generateNodeId(property, subType, parentNodeId),
    property.name,
    parentNodeId,
    tree,
  );
  tree.subTrees.forEach((subTree) => {
    const subTreeNode = buildGraphFetchSubTree(subTree, node, nodes);
    addUniqueEntry(node.childrenIds, subTreeNode.id);
    nodes.set(subTreeNode.id, subTreeNode);
  });
  return node;
};

/**
 * Build graph fetch tree data from an existing graph fetch tree root
 */
export const buildGraphFetchTreeData = (
  tree: RootGraphFetchTree,
): QueryBuilderGraphFetchTreeData => {
  const rootIds: string[] = [];
  const nodes = new Map<string, QueryBuilderGraphFetchTreeNodeData>();
  tree.subTrees.forEach((subTree) => {
    const subTreeNode = buildGraphFetchSubTree(subTree, undefined, nodes);
    addUniqueEntry(rootIds, subTreeNode.id);
    nodes.set(subTreeNode.id, subTreeNode);
  });
  return { rootIds, nodes, tree };
};

export const isGraphFetchTreeDataEmpty = (
  treeData: QueryBuilderGraphFetchTreeData,
): boolean => treeData.tree.subTrees.length === 0;

const getPrunableNodes = (
  treeData: QueryBuilderGraphFetchTreeData,
): QueryBuilderGraphFetchTreeNodeData[] =>
  Array.from(treeData.nodes.values()).filter(
    (node) =>
      node.tree instanceof PropertyGraphFetchTree &&
      node.type instanceof Class &&
      node.childrenIds.length === 0,
  );

const removeNode = (
  treeData: QueryBuilderGraphFetchTreeData,
  node: QueryBuilderGraphFetchTreeNodeData,
): void => {
  const parentNode = node.parentId
    ? guaranteeNonNullable(treeData.nodes.get(node.parentId))
    : undefined;
  if (parentNode) {
    deleteEntry(parentNode.childrenIds, node.id);
    parentNode.tree.removeSubTree(node.tree);
  } else {
    deleteEntry(treeData.rootIds, node.id);
    treeData.tree.removeSubTree(node.tree);
  }
  treeData.nodes.delete(node.id);
};

const pruneTreeData = (treeData: QueryBuilderGraphFetchTreeData): void => {
  let prunableNodes = getPrunableNodes(treeData);
  while (prunableNodes.length) {
    prunableNodes.forEach((node) => {
      removeNode(treeData, node);
    });
    prunableNodes = getPrunableNodes(treeData);
  }
};

export const removeNodeRecursively = (
  treeData: QueryBuilderGraphFetchTreeData,
  node: QueryBuilderGraphFetchTreeNodeData,
): void => {
  removeNode(treeData, node);
  pruneTreeData(treeData);
};

// TODO: handle subtype
export const addQueryBuilderPropertyNode = (
  treeData: QueryBuilderGraphFetchTreeData,
  explorerTreeData: TreeData<QueryBuilderExplorerTreeNodeData>,
  node: QueryBuilderExplorerTreePropertyNodeData,
): void => {
  // traverse the property node all the way to the root and resolve the
  // chain of property that leads to this property node
  const propertyGraphFetchTrees: PropertyGraphFetchTree[] = [
    new PropertyGraphFetchTree(PropertyExplicitReference.create(node.property)),
  ];
  let parentExplorerTreeNode = explorerTreeData.nodes.get(node.parentId);
  while (
    parentExplorerTreeNode instanceof QueryBuilderExplorerTreePropertyNodeData
  ) {
    const propertyGraphFetchTree = new PropertyGraphFetchTree(
      PropertyExplicitReference.create(parentExplorerTreeNode.property),
    );
    propertyGraphFetchTree.subTrees.push(propertyGraphFetchTrees[0]);
    propertyGraphFetchTrees.unshift(propertyGraphFetchTree);
    parentExplorerTreeNode = explorerTreeData.nodes.get(
      parentExplorerTreeNode.parentId,
    );
  }

  // traverse the chain of property from the root class to find a node in the
  // current graph fetch tree that matches any of this property, consider
  // this the starting point
  //
  // If we found a match, use that as the starting point, otherwise, use the root
  // of the graph fetch tree as the starting point
  //
  // NOTE: here we assume that we don't allow specifying duplicated nodes.
  // perhaps we need to allow that behavior in the future so people can customize the
  // shape of the object (e.g. same field but under different aliases)
  let currentNodeId: string | undefined = undefined;
  let parentNode: QueryBuilderGraphFetchTreeNodeData | undefined = undefined;
  let newSubTree: PropertyGraphFetchTree | undefined;
  for (const propertyGraphFetchTree of propertyGraphFetchTrees) {
    currentNodeId = generateNodeId(
      propertyGraphFetchTree.property.value,
      propertyGraphFetchTree.subType.value,
      currentNodeId,
    );
    const existingGraphFetchNode = treeData.nodes.get(currentNodeId);
    if (existingGraphFetchNode) {
      parentNode = existingGraphFetchNode;
    } else {
      newSubTree = propertyGraphFetchTree;
      break;
    }
  }

  // construct the query builder graph fetch subtree from the starting point
  if (newSubTree) {
    const childNode = buildGraphFetchSubTree(
      newSubTree,
      parentNode,
      treeData.nodes,
    );
    treeData.nodes.set(childNode.id, childNode);
    if (parentNode) {
      addUniqueEntry(parentNode.childrenIds, childNode.id);
      parentNode.tree.addSubTree(childNode.tree);
    } else {
      addUniqueEntry(treeData.rootIds, childNode.id);
      treeData.tree.addSubTree(childNode.tree);
    }
  }
};
