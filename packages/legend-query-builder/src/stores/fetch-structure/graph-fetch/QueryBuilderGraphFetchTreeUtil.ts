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
  deleteEntry,
  hashArray,
  type Hashable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { TreeNodeData, TreeData } from '@finos/legend-art';
import {
  type AbstractProperty,
  type GraphFetchTree,
  type Type,
  RootGraphFetchTree,
  PropertyExplicitReference,
  Class,
  PropertyGraphFetchTree,
  PackageableElementExplicitReference,
  TYPE_CAST_TOKEN,
} from '@finos/legend-graph';
import {
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from '../../explorer/QueryBuilderExplorerState.js';
import type { QueryBuilderState } from '../../QueryBuilderState.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';
import { computed, makeObservable } from 'mobx';
import {
  graphFetchTree_addSubTree,
  graphFetchTree_removeSubTree,
} from '../../shared/ValueSpecificationModifierHelper.js';

export class QueryBuilderGraphFetchTreeNodeData
  implements TreeNodeData, Hashable
{
  readonly id: string;
  readonly label: string;
  readonly tree: PropertyGraphFetchTree | RootGraphFetchTree;
  readonly parentId?: string | undefined;
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  childrenIds: string[] = [];

  constructor(
    id: string,
    label: string,
    parentId: string | undefined,
    graphFetchTreeNode: PropertyGraphFetchTree | RootGraphFetchTree,
  ) {
    makeObservable(this, {
      hashCode: computed,
    });

    this.id = id;
    this.label = label;
    this.parentId = parentId;
    this.tree = graphFetchTreeNode;
    // NOTE: in this tree, every node is open
    this.isOpen = true;
  }

  get type(): Type {
    if (this.tree instanceof PropertyGraphFetchTree) {
      return this.tree.property.value.genericType.value.rawType;
    }
    if (this.tree instanceof RootGraphFetchTree) {
      return this.tree.class.value;
    }
    throw new UnsupportedOperationError(
      `Can't get type of Graph Fetch Tree`,
      this.tree,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.GRAPH_FETCH_TREE_NODE_DATA,
      this.id,
      this.label,
      this.tree,
      this.parentId ?? '',
      hashArray(this.childrenIds),
    ]);
  }
}

export interface QueryBuilderGraphFetchTreeData
  extends TreeData<QueryBuilderGraphFetchTreeNodeData> {
  tree: RootGraphFetchTree;
}

export const generateGraphFetchTreeNodeID = (
  property: AbstractProperty,
  parentNodeId: string | undefined,
  subType: Type | undefined,
): string =>
  `${parentNodeId ? `${parentNodeId}.` : ''}${property.name}${
    subType ? `${TYPE_CAST_TOKEN}${subType.path}` : ''
  }`;

export const generateRootGraphFetchTreeNodeID = (
  parentNodeId: string | undefined,
  classValue: string | undefined,
): string =>
  `${parentNodeId ? `${parentNodeId}.` : ''}${
    classValue ? `${TYPE_CAST_TOKEN}${classValue}` : ''
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
  const subType = tree.subType?.value;
  const parentNodeId = parentNode?.id;
  const node = new QueryBuilderGraphFetchTreeNodeData(
    generateGraphFetchTreeNodeID(property, parentNodeId, subType),
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

const buildRootGraphFetchSubTree = (
  tree: RootGraphFetchTree,
  parentNode: QueryBuilderGraphFetchTreeNodeData | undefined,
  nodes: Map<string, QueryBuilderGraphFetchTreeNodeData>,
): QueryBuilderGraphFetchTreeNodeData => {
  const parentNodeId = parentNode?.id;
  const node = new QueryBuilderGraphFetchTreeNodeData(
    generateRootGraphFetchTreeNodeID(
      parentNodeId,
      tree.class.valueForSerialization ?? '',
    ),
    tree.class.value.name,
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
  displayRoot = false,
): QueryBuilderGraphFetchTreeData => {
  const rootIds: string[] = [];
  const nodes = new Map<string, QueryBuilderGraphFetchTreeNodeData>();
  if (displayRoot) {
    const rootNode = buildRootGraphFetchSubTree(tree, undefined, nodes);
    addUniqueEntry(rootIds, rootNode.id);
    nodes.set(rootNode.id, rootNode);
  } else {
    tree.subTrees.forEach((subTree) => {
      const subTreeNode = buildGraphFetchSubTree(subTree, undefined, nodes);
      addUniqueEntry(rootIds, subTreeNode.id);
      nodes.set(subTreeNode.id, subTreeNode);
    });
  }

  return { rootIds, nodes, tree };
};

export const buildPropertyGraphFetchTreeData = (
  propertyTree: PropertyGraphFetchTree,
): QueryBuilderGraphFetchTreeData => {
  const rootIds: string[] = [];
  const nodes = new Map<string, QueryBuilderGraphFetchTreeNodeData>();
  const propertyNode = buildGraphFetchSubTree(propertyTree, undefined, nodes);
  addUniqueEntry(rootIds, propertyNode.id);
  nodes.set(propertyNode.id, propertyNode);
  const tree = new RootGraphFetchTree(
    PackageableElementExplicitReference.create(new Class('root')),
  );
  tree.subTrees.push(propertyTree);
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
      // childless class nodes
      (node.tree instanceof PropertyGraphFetchTree &&
        node.type instanceof Class &&
        node.childrenIds.length === 0) ||
      // orphan node
      (node.tree instanceof PropertyGraphFetchTree &&
        !(node.type instanceof Class) &&
        node.parentId &&
        !treeData.nodes.has(node.parentId)),
  );

const removeNode = (
  treeData: QueryBuilderGraphFetchTreeData,
  node: QueryBuilderGraphFetchTreeNodeData,
): void => {
  const parentNode = node.parentId
    ? treeData.nodes.get(node.parentId)
    : undefined;
  if (parentNode) {
    deleteEntry(parentNode.childrenIds, node.id);
    graphFetchTree_removeSubTree(parentNode.tree, node.tree);
  } else {
    deleteEntry(treeData.rootIds, node.id);
    graphFetchTree_removeSubTree(treeData.tree, node.tree);
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

export const addQueryBuilderPropertyNode = (
  treeData: QueryBuilderGraphFetchTreeData,
  explorerTreeData: TreeData<QueryBuilderExplorerTreeNodeData>,
  node: QueryBuilderExplorerTreePropertyNodeData,
  queryBuilderState: QueryBuilderState,
): void => {
  // traverse the property node all the way to the root and resolve the
  // chain of property that leads to this property node
  const propertyGraphFetchTrees: PropertyGraphFetchTree[] = [
    new PropertyGraphFetchTree(
      PropertyExplicitReference.create(node.property),
      undefined,
    ),
  ];
  let parentExplorerTreeNode = explorerTreeData.nodes.get(node.parentId);
  while (
    parentExplorerTreeNode instanceof
      QueryBuilderExplorerTreePropertyNodeData ||
    parentExplorerTreeNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
  ) {
    let subType = undefined;
    let subtypeAssigned = false;
    while (
      parentExplorerTreeNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
    ) {
      if (!subtypeAssigned) {
        subType = PackageableElementExplicitReference.create(
          parentExplorerTreeNode.subclass,
        );
        subtypeAssigned = true;
      }
      parentExplorerTreeNode = explorerTreeData.nodes.get(
        parentExplorerTreeNode.parentId,
      );
    }
    if (
      parentExplorerTreeNode instanceof
        QueryBuilderExplorerTreePropertyNodeData &&
      parentExplorerTreeNode.mappingData.entityMappedProperty?.subType &&
      parentExplorerTreeNode.type instanceof Class
    ) {
      subType = PackageableElementExplicitReference.create(
        parentExplorerTreeNode.type,
      );
    }
    if (
      parentExplorerTreeNode instanceof QueryBuilderExplorerTreePropertyNodeData
    ) {
      const propertyGraphFetchTree = new PropertyGraphFetchTree(
        PropertyExplicitReference.create(parentExplorerTreeNode.property),
        subType,
      );
      propertyGraphFetchTree.subTrees.push(
        propertyGraphFetchTrees[0] as PropertyGraphFetchTree,
      );
      propertyGraphFetchTrees.unshift(propertyGraphFetchTree);
      parentExplorerTreeNode = explorerTreeData.nodes.get(
        parentExplorerTreeNode.parentId,
      );
    } else {
      queryBuilderState.applicationStore.notificationService.notifyError(
        `Can't cast the root class of graph fetch structure to its subtype`,
      );
      return;
    }
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
    currentNodeId = generateGraphFetchTreeNodeID(
      propertyGraphFetchTree.property.value,
      currentNodeId,
      propertyGraphFetchTree.subType?.value,
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
      graphFetchTree_addSubTree(
        parentNode.tree,
        childNode.tree,
        queryBuilderState.observerContext,
      );
    } else {
      addUniqueEntry(treeData.rootIds, childNode.id);
      graphFetchTree_addSubTree(
        treeData.tree,
        childNode.tree,
        queryBuilderState.observerContext,
      );
    }
  }
};
