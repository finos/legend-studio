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

import { type TreeData, type TreeNodeData } from '@finos/legend-art';
import {
  type Hashable,
  addUniqueEntry,
  assertErrorThrown,
  assertType,
  deleteEntry,
  hashArray,
  LogEvent,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  type AbstractProperty,
  type Type,
  type Constraint,
  type GraphFetchTree,
  type RawLambda,
  Class,
  GRAPH_MANAGER_EVENT,
  PackageableElementExplicitReference,
  PropertyExplicitReference,
  getAllClassConstraints,
  isStubbed_RawLambda,
  TYPE_CAST_TOKEN,
} from '@finos/legend-graph';
import {
  type QueryBuilderExplorerTreeNodeData,
  graphFetchTree_addSubTree,
  graphFetchTree_removeSubTree,
  type QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from '@finos/legend-query-builder';
import type { DataQualityState } from '../states/DataQualityState.js';
import {
  DataQualityPropertyGraphFetchTree,
  DataQualityRootGraphFetchTree,
} from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import { ConstraintState } from '../states/ConstraintState.js';
import type { EditorStore } from '@finos/legend-application-studio';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../graph/metamodel/DSL_DataQuality_HashUtils.js';
import {
  dataQualityGraphFetchTree_removeConstraints,
  graphFetchTree_removeAllSubTrees,
} from '../../graph-manager/DSL_DataQuality_GraphModifierHelper.js';

export class DataQualityGraphFetchTreeNodeData
  implements TreeNodeData, Hashable
{
  readonly id: string;
  readonly label: string;
  readonly tree:
    | DataQualityPropertyGraphFetchTree
    | DataQualityRootGraphFetchTree;
  readonly parentId?: string | undefined;
  readonly editorStore: EditorStore;
  isOpen?: boolean | undefined;
  isReadOnly?: boolean;
  childrenIds: string[] = [];
  constraints: ConstraintState[] = [];

  constructor(
    editorStore: EditorStore,
    id: string,
    label: string,
    parentId: string | undefined,
    graphFetchTreeNode:
      | DataQualityPropertyGraphFetchTree
      | DataQualityRootGraphFetchTree,
  ) {
    makeObservable(this, {
      hashCode: computed,
      constraints: observable,
      isReadOnly: observable,
      setConstraintsForClass: action,
      setConstraints: action,
      setIsReadOnly: action,
    });

    this.id = id;
    this.label = label;
    this.parentId = parentId;
    this.tree = graphFetchTreeNode;
    // NOTE: in this tree, every node is open
    this.isOpen = true;
    this.editorStore = editorStore;
  }

  setIsReadOnly(isReadOnly: boolean) {
    this.isReadOnly = isReadOnly;
  }

  setConstraintsForClass(_class: Class, constraintsToSelect: string[]) {
    const constraints = getAllClassConstraints(_class).map(
      (constraint) => new ConstraintState(constraint),
    );
    const lambdas = new Map<string, RawLambda>();
    const index = new Map<string, ConstraintState>();
    constraints.forEach((constraintState) => {
      if (!isStubbed_RawLambda(constraintState.constraint.functionDefinition)) {
        lambdas.set(
          constraintState.lambdaId,
          constraintState.constraint.functionDefinition,
        );
        index.set(constraintState.lambdaId, constraintState);
        if (
          constraintsToSelect.find(
            (constraintName) =>
              constraintState.constraint.name === constraintName,
          )
        ) {
          constraintState.isSelected = true;
        }
      }
    });
    if (lambdas.size) {
      this.editorStore.graphManagerState.graphManager
        .lambdasToPureCode(lambdas)
        .then((res: Map<string, string>) => {
          res.forEach((grammarText: string, key: string) => {
            const constraintState = index.get(key);
            constraintState?.setLambdaString(
              constraintState.extractLambdaString(grammarText),
            );
          });
          this.setConstraints(constraints);
        })
        .catch((error) => {
          assertErrorThrown(error);
          this.editorStore.applicationStore.logService.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
            error,
          );
        });
    }
  }

  setConstraints(constraints: ConstraintState[]) {
    this.constraints = constraints;
  }

  get type(): Type {
    if (this.tree instanceof DataQualityPropertyGraphFetchTree) {
      return this.tree.property.value.genericType.value.rawType;
    }
    if (this.tree instanceof DataQualityRootGraphFetchTree) {
      return this.tree.class.value;
    }
    throw new UnsupportedOperationError(
      `Can't get type of Graph Fetch Tree`,
      this.tree,
    );
  }

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_GRAPH_FETCH_TREE_NODE_DATA,
      this.id,
      this.label,
      this.tree,
      this.parentId ?? '',
      hashArray(this.childrenIds),
    ]);
  }
}

export interface DataQualityGraphFetchTreeData
  extends TreeData<DataQualityGraphFetchTreeNodeData> {
  tree: DataQualityRootGraphFetchTree;
}

export const generateRootGraphFetchTreeNodeID = (
  parentNodeId: string | undefined,
  classValue: string | undefined,
): string =>
  `${parentNodeId ? `${parentNodeId}.` : ''}${
    classValue ? `${TYPE_CAST_TOKEN}${classValue}` : ''
  }`;

const getPrunableNodes = (
  treeData: DataQualityGraphFetchTreeData,
): DataQualityGraphFetchTreeNodeData[] =>
  Array.from(treeData.nodes.values()).filter(
    (node) =>
      (node.type instanceof Class &&
        node.childrenIds.length === 0 &&
        node.constraints.length === 0) ||
      // orphan node
      (node.tree instanceof DataQualityPropertyGraphFetchTree &&
        node.parentId &&
        !treeData.nodes.has(node.parentId)),
  );

const removeNode = (
  treeData: DataQualityGraphFetchTreeData,
  node: DataQualityGraphFetchTreeNodeData,
): void => {
  const parentNode = node.parentId
    ? treeData.nodes.get(node.parentId)
    : undefined;
  if (parentNode) {
    deleteEntry(parentNode.childrenIds, node.id);
    graphFetchTree_removeSubTree(parentNode.tree, node.tree);
  } else {
    if (node.tree instanceof DataQualityRootGraphFetchTree) {
      deleteEntry(treeData.rootIds, node.id);
      dataQualityGraphFetchTree_removeConstraints(node.tree);
      graphFetchTree_removeAllSubTrees(node.tree);
    }
    graphFetchTree_removeSubTree(treeData.tree, node.tree);
  }
  treeData.nodes.delete(node.id);
};
const pruneTreeData = (treeData: DataQualityGraphFetchTreeData): void => {
  let prunableNodes = getPrunableNodes(treeData);
  while (prunableNodes.length) {
    prunableNodes.forEach((node) => {
      removeNode(treeData, node);
    });
    prunableNodes = getPrunableNodes(treeData);
  }
};
export const removeNodeRecursively = (
  treeData: DataQualityGraphFetchTreeData,
  node: DataQualityGraphFetchTreeNodeData,
): void => {
  removeNode(treeData, node);
  pruneTreeData(treeData);
};

export const generateGraphFetchTreeNodeID = (
  property: AbstractProperty,
  parentNodeId: string | undefined,
  subType: Type | undefined,
): string =>
  `${parentNodeId ? `${parentNodeId}.` : ''}${property.name}${
    subType ? `${TYPE_CAST_TOKEN}${subType.path}` : ''
  }`;

const buildGraphFetchSubTree = (
  editorStore: EditorStore,
  tree: GraphFetchTree,
  parentNode: DataQualityGraphFetchTreeNodeData | undefined,
  nodes: Map<string, DataQualityGraphFetchTreeNodeData>,
  fetchConstraints: boolean,
  isReadOnly: boolean,
): DataQualityGraphFetchTreeNodeData => {
  assertType(
    tree,
    DataQualityPropertyGraphFetchTree,
    'Graph fetch sub-tree must be a property graph fetch tree',
  );
  const property = tree.property.value;
  const subType = tree.subType?.value;
  const parentNodeId = parentNode?.id;
  const node = new DataQualityGraphFetchTreeNodeData(
    editorStore,
    generateGraphFetchTreeNodeID(property, parentNodeId, subType),
    property.name,
    parentNodeId,
    tree,
  );
  node.setIsReadOnly(isReadOnly);
  if (subType) {
    node.setConstraintsForClass(subType, tree.constraints);
  } else if (node.type instanceof Class && fetchConstraints && !isReadOnly) {
    node.setConstraintsForClass(node.type, tree.constraints);
  }
  tree.subTrees.forEach((subTree) => {
    const subTreeNode = buildGraphFetchSubTree(
      editorStore,
      subTree,
      node,
      nodes,
      fetchConstraints,
      isReadOnly,
    );
    addUniqueEntry(node.childrenIds, subTreeNode.id);
    nodes.set(subTreeNode.id, subTreeNode);
  });
  return node;
};

const buildRootGraphFetchSubTree = (
  editorStore: EditorStore,
  tree: DataQualityRootGraphFetchTree,
  parentNode: DataQualityGraphFetchTreeNodeData | undefined,
  nodes: Map<string, DataQualityGraphFetchTreeNodeData>,
  fetchConstraints: boolean,
  isReadonly: boolean,
): DataQualityGraphFetchTreeNodeData => {
  const parentNodeId = parentNode?.id;
  const node = new DataQualityGraphFetchTreeNodeData(
    editorStore,
    generateRootGraphFetchTreeNodeID(
      parentNodeId,
      tree.class.valueForSerialization ?? '',
    ),
    tree.class.value.name,
    parentNodeId,
    tree,
  );
  node.setIsReadOnly(isReadonly);
  if (node.type instanceof Class && fetchConstraints && !isReadonly) {
    node.setConstraintsForClass(node.type, tree.constraints);
  }
  tree.subTrees.forEach((subTree) => {
    const subTreeNode = buildGraphFetchSubTree(
      editorStore,
      subTree,
      node,
      nodes,
      fetchConstraints,
      isReadonly,
    );
    addUniqueEntry(node.childrenIds, subTreeNode.id);
    nodes.set(subTreeNode.id, subTreeNode);
  });
  return node;
};

export const buildGraphFetchTreeData = (
  editorStore: EditorStore,
  tree: DataQualityRootGraphFetchTree,
  displayRoot: boolean = false,
  fetchConstraints: boolean,
  isReadOnly: boolean,
): DataQualityGraphFetchTreeData => {
  const rootIds: string[] = [];
  const nodes = new Map<string, DataQualityGraphFetchTreeNodeData>();
  if (displayRoot) {
    const rootNode = buildRootGraphFetchSubTree(
      editorStore,
      tree,
      undefined,
      nodes,
      fetchConstraints,
      isReadOnly,
    );
    addUniqueEntry(rootIds, rootNode.id);
    nodes.set(rootNode.id, rootNode);
  } else {
    tree.subTrees.forEach((subTree) => {
      const subTreeNode = buildGraphFetchSubTree(
        editorStore,
        subTree,
        undefined,
        nodes,
        fetchConstraints,
        isReadOnly,
      );
      addUniqueEntry(rootIds, subTreeNode.id);
      nodes.set(subTreeNode.id, subTreeNode);
    });
  }

  return { rootIds, nodes, tree };
};

export const isGraphFetchTreeDataEmpty = (
  treeData: DataQualityGraphFetchTreeData,
): boolean => treeData.tree.subTrees.length === 0;

export const isConstraintsClassesTreeEmpty = (
  treeData: DataQualityGraphFetchTreeData,
): boolean => treeData.rootIds.length === 0;

export const updateNodeConstraints = action(
  (
    treeData: DataQualityGraphFetchTreeData,
    node: DataQualityGraphFetchTreeNodeData,
    constraints: Constraint[],
    addConstraint: boolean,
  ): void => {
    //update the node of graph fetch tree present
    const updatedTreeNode = node.tree;
    if (addConstraint) {
      constraints.forEach((constraint) => {
        updatedTreeNode.constraints.push(constraint.name);
      });
    } else {
      updatedTreeNode.constraints = updatedTreeNode.constraints.filter(
        (constraintName) =>
          !constraints.find((constraint) => constraint.name === constraintName),
      );
    }
  },
);

export const addQueryBuilderPropertyNode = (
  treeData: DataQualityGraphFetchTreeData,
  explorerTreeData: TreeData<QueryBuilderExplorerTreeNodeData>,
  node:
    | QueryBuilderExplorerTreePropertyNodeData
    | QueryBuilderExplorerTreeRootNodeData
    | QueryBuilderExplorerTreeSubTypeNodeData,
  dataQualityState: DataQualityState,
): void => {
  const editorStore = dataQualityState.editorStore;
  const rootNodeId = generateRootGraphFetchTreeNodeID(
    undefined,
    treeData.tree.class.valueForSerialization ?? '',
  );
  //root node and property node handled differently
  //handling property node
  if (
    node instanceof QueryBuilderExplorerTreePropertyNodeData ||
    node instanceof QueryBuilderExplorerTreeSubTypeNodeData
  ) {
    // traverse the property node all the way to the root and resolve the
    // chain of property that leads to this property node
    const propertyGraphFetchTrees: DataQualityPropertyGraphFetchTree[] = [];
    if (node instanceof QueryBuilderExplorerTreePropertyNodeData) {
      propertyGraphFetchTrees.push(
        new DataQualityPropertyGraphFetchTree(
          PropertyExplicitReference.create(node.property),
          undefined,
        ),
      );
    }
    let parentExplorerTreeNode = explorerTreeData.nodes.get(node.parentId);
    while (
      parentExplorerTreeNode instanceof
        QueryBuilderExplorerTreePropertyNodeData ||
      parentExplorerTreeNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
    ) {
      let subType =
        node instanceof QueryBuilderExplorerTreeSubTypeNodeData
          ? PackageableElementExplicitReference.create(node.subclass)
          : undefined;
      let subtypeAssigned =
        node instanceof QueryBuilderExplorerTreeSubTypeNodeData;
      while (
        parentExplorerTreeNode instanceof
        QueryBuilderExplorerTreeSubTypeNodeData
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
        parentExplorerTreeNode instanceof
        QueryBuilderExplorerTreePropertyNodeData
      ) {
        const propertyGraphFetchTree = new DataQualityPropertyGraphFetchTree(
          PropertyExplicitReference.create(parentExplorerTreeNode.property),
          subType,
        );
        if (propertyGraphFetchTrees.length > 0) {
          propertyGraphFetchTree.subTrees.push(
            propertyGraphFetchTrees[0] as DataQualityPropertyGraphFetchTree,
          );
        }
        propertyGraphFetchTrees.unshift(propertyGraphFetchTree);
        parentExplorerTreeNode = explorerTreeData.nodes.get(
          parentExplorerTreeNode.parentId,
        );
      } else {
        dataQualityState.applicationStore.notificationService.notifyError(
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

    //current node id will be pointing root node id
    let currentNodeId: string | undefined = rootNodeId;
    let parentNode: DataQualityGraphFetchTreeNodeData | undefined =
      treeData.nodes.get(rootNodeId);
    let newSubTree: DataQualityPropertyGraphFetchTree | undefined;
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
      if (!parentNode) {
        let rootNode = treeData.nodes.get(rootNodeId);
        if (!rootNode) {
          rootNode = buildRootGraphFetchSubTree(
            editorStore,
            treeData.tree,
            undefined,
            treeData.nodes,
            true,
            false,
          );
          addUniqueEntry(treeData.rootIds, rootNode.id);
          treeData.nodes.set(rootNode.id, rootNode);
        }
        parentNode = rootNode;
      }

      const childNode = buildGraphFetchSubTree(
        editorStore,
        newSubTree,
        parentNode,
        treeData.nodes,
        true,
        false,
      );
      treeData.nodes.set(childNode.id, childNode);
      addUniqueEntry(parentNode.childrenIds, childNode.id);
      graphFetchTree_addSubTree(
        parentNode.tree,
        childNode.tree,
        dataQualityState.dataQualityQueryBuilderState.observerContext,
      );
    }
  } else {
    //this case arises when root node is dragged
    let rootNodeFromTree = treeData.nodes.get(rootNodeId);
    //check if root node already exists in data quality root graph fetch tree
    if (!rootNodeFromTree) {
      rootNodeFromTree = buildRootGraphFetchSubTree(
        editorStore,
        treeData.tree,
        undefined,
        treeData.nodes,
        true,
        false,
      );
      addUniqueEntry(treeData.rootIds, rootNodeFromTree.id);
    }
    treeData.nodes.set(rootNodeFromTree.id, rootNodeFromTree);
  }
};

export const buildDefaultDataQualityRootGraphFetchTree = action(
  (selectedClass: Class): DataQualityRootGraphFetchTree => {
    const dataQualityRootGraphFetchTree = new DataQualityRootGraphFetchTree(
      PackageableElementExplicitReference.create(selectedClass),
    );
    dataQualityRootGraphFetchTree.constraints = selectedClass.constraints.map(
      (constraint) => constraint.name,
    );
    dataQualityRootGraphFetchTree.subTrees = selectedClass.properties
      .filter((property) => property.multiplicity.lowerBound > 0)
      .map(
        (property) =>
          new DataQualityPropertyGraphFetchTree(
            PropertyExplicitReference.create(property),
            undefined,
          ),
      );
    return dataQualityRootGraphFetchTree;
  },
);
