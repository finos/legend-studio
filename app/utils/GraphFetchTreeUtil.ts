/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IllegalStateError, assertType, addUniqueEntry, isNonNullable, uniq } from './GeneralUtil';
import { TreeData, TreeNodeData } from './TreeUtil';
import { isInstanceSetImplementation } from './GraphUtil';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { Class, CLASS_PROPERTY_TYPE, getClassPropertyType } from 'MM/model/packageableElements/domain/Class';
import { GraphFetchTree, PropertyGraphFetchTree, RootGraphFetchTree } from 'MM/model/valueSpecification/raw/graph/GraphFetchTree';
import { OptionalPackageableElementExplicitReference, PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { PropertyExplicitReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { InstanceSetImplementation } from 'MM/model/packageableElements/mapping/InstanceSetImplementation';
import { OperationSetImplementation } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';

export interface GraphFetchTreeNodeData extends TreeNodeData {
  type: Type;
  subType?: Class;
  parentId?: string;
  isChecked: boolean;
  isTraversed: () => boolean;
  graphFetchTreeNode: GraphFetchTree;
}

const GRAPH_FETCH_TREE_ROOT_ID = 'GRAPH_FETCH_TREE_ROOT_ID';

export const getPropertyGraphFetchTreeNodeData = (property: Property, subType: Class | undefined, parent: GraphFetchTreeNodeData): GraphFetchTreeNodeData => {
  assertType(parent.type, Class, `Type of parent node for class property node must be 'class'`);
  const existingPropertyGraphFetchNode = parent.graphFetchTreeNode.subTrees.find(subTree => subTree instanceof PropertyGraphFetchTree && subTree.property.value === property && subTree.subType.value === subType);
  const newPropertyGraphFetchNode = new PropertyGraphFetchTree(PropertyExplicitReference.create(property)).withSubType(OptionalPackageableElementExplicitReference.create<Class>(undefined));
  newPropertyGraphFetchNode.subType.setValue(subType);
  const propertyGraphFetchNode = existingPropertyGraphFetchNode ?? newPropertyGraphFetchNode;
  const propertyNode: GraphFetchTreeNodeData = {
    id: `${parent.id}.${property.name}${subType ? subType.path : ''}`,
    label: property.name,
    parentId: parent.id,
    type: property.genericType.value.rawType,
    subType,
    isChecked: Boolean(existingPropertyGraphFetchNode),
    isTraversed: (): boolean => Boolean(propertyGraphFetchNode.subTrees.length),
    graphFetchTreeNode: propertyGraphFetchNode
  };
  const propertyType = subType ?? property.genericType.value.rawType;
  if (propertyType instanceof Class) {
    propertyNode.childrenIds = propertyType.getAllProperties().map(p => `${propertyNode.id}.${p.name}`);
  }
  return propertyNode;
};

export interface GraphFetchTreeData extends TreeData<GraphFetchTreeNodeData> {
  root: GraphFetchTreeNodeData & {
    graphFetchTreeNode: RootGraphFetchTree;
  };
}

export const getGraphFetchTreeData = (type: Type): GraphFetchTreeData => {
  const rootIds: string[] = [];
  const nodes = new Map<string, GraphFetchTreeNodeData>();
  if (type instanceof Class) {
    const rootGraphFetchTreeNode = new RootGraphFetchTree(PackageableElementExplicitReference.create(type));
    const treeRootNode = {
      id: GRAPH_FETCH_TREE_ROOT_ID,
      label: type.name,
      type: type,
      isChecked: true,
      isTraversed: (): boolean => Boolean(rootGraphFetchTreeNode.subTrees.length),
      graphFetchTreeNode: rootGraphFetchTreeNode,
      isOpen: true,
      childrenIds: []
    };
    nodes.set(treeRootNode.id, treeRootNode);
    addUniqueEntry(rootIds, treeRootNode.id);
    // TODO: as of right now we haven't supported subtype casting for deep/graph fetch tree but if we do, we just need to
    // treat them as property nodes so for example `Account` has props `name` and subtypes `SpecialAccount`
    // the tree algorithm should show 2 children for `Account`
    type.getAllProperties()
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => (b instanceof Class ? 2 : b instanceof Enumeration ? 1 : 0) - (a instanceof Class ? 2 : a instanceof Enumeration ? 1 : 0))
      .forEach(property => {
        const propertyTreeNodeData = getPropertyGraphFetchTreeNodeData(property, undefined, treeRootNode);
        addUniqueEntry(treeRootNode.childrenIds, propertyTreeNodeData.id);
        nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
        const propertyType = property.genericType.value.rawType;
        if (propertyType instanceof Class) {
          propertyType.allSubClasses
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(subClass => {
              const nodeData = getPropertyGraphFetchTreeNodeData(property, subClass, treeRootNode);
              addUniqueEntry(treeRootNode.childrenIds, nodeData.id);
              nodes.set(nodeData.id, nodeData);
            });
        }
      });
    return { rootIds, nodes, root: treeRootNode };
  } else {
    throw new IllegalStateError(`Can't create graph fetch tree for node type other than 'Class'. Got type '${type.constructor.name}'`);
  }
};

const walkPropertySubTreeAndBuild = (property: Property, subType: Class | undefined, parent: GraphFetchTreeNodeData, nodes: Map<string, GraphFetchTreeNodeData>): GraphFetchTreeNodeData => {
  const existingPropertyGraphFetchNode = parent.graphFetchTreeNode.subTrees.find(subTree => subTree instanceof PropertyGraphFetchTree && subTree.property.value === property && subTree.subType.value === subType);
  const newPropertyGraphFetchNode = new PropertyGraphFetchTree(PropertyExplicitReference.create(property)).withSubType(OptionalPackageableElementExplicitReference.create<Class>(undefined));
  newPropertyGraphFetchNode.subType.setValue(subType);
  const propertyGraphFetchNode = existingPropertyGraphFetchNode ?? newPropertyGraphFetchNode;
  const propertyNode: GraphFetchTreeNodeData = {
    id: `${parent.id}.${property.name}${subType ? subType.path : ''}`,
    label: property.name,
    parentId: parent.id,
    type: property.genericType.value.rawType,
    subType,
    isChecked: Boolean(existingPropertyGraphFetchNode),
    isTraversed: (): boolean => Boolean(propertyGraphFetchNode.subTrees.length),
    graphFetchTreeNode: propertyGraphFetchNode
  };
  // walk and build property trees recursively
  const propertyType = subType ?? property.genericType.value.rawType;
  if (propertyType instanceof Class) {
    propertyNode.childrenIds = propertyType.getAllProperties().map(p => `${propertyNode.id}.${p.name}`);
    if (propertyNode.isTraversed()) {
      propertyType.getAllProperties()
        .sort((a, b) => a.name.localeCompare(b.name))
        .sort((a, b) => (b instanceof Class ? 2 : b instanceof Enumeration ? 1 : 0) - (a instanceof Class ? 2 : a instanceof Enumeration ? 1 : 0))
        .forEach(p => {
          const pGraphFetchNode = walkPropertySubTreeAndBuild(p, undefined, propertyNode, nodes);
          nodes.set(pGraphFetchNode.id, pGraphFetchNode);
          if (propertyNode.childrenIds) {
            addUniqueEntry(propertyNode.childrenIds, pGraphFetchNode.id);
          }
        });
    }
  }
  return propertyNode;
};

/**
 * Build graph fetch tree data from an existing graph fetch tree root
 */
export const buildGraphFetchTreeData = (rootGraphFetchTree: RootGraphFetchTree): GraphFetchTreeData => {
  const rootIds: string[] = [];
  const nodes = new Map<string, GraphFetchTreeNodeData>();
  const treeRootNode = {
    id: GRAPH_FETCH_TREE_ROOT_ID,
    label: rootGraphFetchTree.class.value.name,
    type: rootGraphFetchTree.class.value,
    isChecked: true,
    isTraversed: (): boolean => Boolean(rootGraphFetchTree.subTrees.length),
    graphFetchTreeNode: rootGraphFetchTree,
    isOpen: true,
    childrenIds: []
  };
  nodes.set(treeRootNode.id, treeRootNode);
  addUniqueEntry(rootIds, treeRootNode.id);
  rootGraphFetchTree.class.value.getAllProperties()
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort((a, b) => (b instanceof Class ? 2 : b instanceof Enumeration ? 1 : 0) - (a instanceof Class ? 2 : a instanceof Enumeration ? 1 : 0))
    .forEach(property => {
      const propertyTreeNodeData = walkPropertySubTreeAndBuild(property, undefined, treeRootNode, nodes);
      addUniqueEntry(treeRootNode.childrenIds, propertyTreeNodeData.id);
      nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
      const propertyType = property.genericType.value.rawType;
      if (propertyType instanceof Class) {
        propertyType.allSubClasses
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(subClass => {
            const nodeData = walkPropertySubTreeAndBuild(property, subClass, treeRootNode, nodes);
            addUniqueEntry(treeRootNode.childrenIds, nodeData.id);
            nodes.set(nodeData.id, nodeData);
          });
      }
    });
  return { rootIds, nodes, root: treeRootNode };
};

/**
 * Given a node, a graph fetch tree and a mapping, we select (by checking off) all the properties in the node
 * that have been mapped through the root setImplementation class
 */
export const selectMappedGraphFetchProperties = (graphFetchTree: GraphFetchTreeData, node: GraphFetchTreeNodeData, mapping: Mapping): void => {
  const childNodes = node.childrenIds?.map(nodeId => graphFetchTree.nodes.get(nodeId)).filter(isNonNullable) ?? [];
  const parentType = node.type;
  if (parentType instanceof Class) {
    const setImpl = mapping.getRootSetImplementation(parentType);
    let mappedProperties: string[] = [];
    if (setImpl instanceof InstanceSetImplementation) {
      mappedProperties = uniq(setImpl.propertyMappings.filter(p => !p.isStub).map(p => p.property.value.name));
    } else if (setImpl instanceof OperationSetImplementation) {
      mappedProperties = uniq(setImpl.leafSetImplementations.filter(isInstanceSetImplementation)
        .map(p => p.propertyMappings).flat().filter(p => !p.isStub).map(p => p.property.value.name));
    }
    childNodes.forEach(childNode => {
      const nodeClassType = childNode.type;
      const nodeProperty = childNode.graphFetchTreeNode;
      // We only check if the node is not a class and that property has been mapped
      if (getClassPropertyType(nodeClassType) !== CLASS_PROPERTY_TYPE.CLASS
        && nodeProperty instanceof PropertyGraphFetchTree &&
        mappedProperties.includes(nodeProperty.property.value.name)) {
        const isChecking = !childNode.isChecked;
        if (isChecking) {
          let currentNode = childNode;
          while (currentNode.parentId) {
            const parentNode = graphFetchTree.nodes.get(currentNode.parentId);
            if (parentNode) {
              parentNode.graphFetchTreeNode.addSubTree(currentNode.graphFetchTreeNode);
              currentNode = parentNode;
            } else {
              break;
            }
          }
        }
        childNode.isChecked = true;
      }
    });
  }
};
