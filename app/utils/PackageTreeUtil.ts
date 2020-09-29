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

import { getPackageableElementType } from 'Utilities/GraphUtil';
import { DND_TYPE } from 'Utilities/DnDUtil';
import { ROOT_PACKAGE_NAME } from 'MetaModelConst';
import { isNonNullable, UnsupportedOperationError, addUniqueEntry } from './GeneralUtil';
import { TreeNodeData, TreeData, PackageTreeNodeData } from './TreeUtil';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { PackageableElement, PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';
import { Unit } from 'MM/model/packageableElements/domain/Measure';

// FIXME: this should be dismissed and the logic here should moved to PackageTreeState/PackageTreeComponent

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
const getElementDnDType = (element: PackageableElement): DND_TYPE => {
  const type = getPackageableElementType(element);
  switch (type) {
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE: return DND_TYPE.PROJECT_EXPLORER_PACKAGE;
    case PACKAGEABLE_ELEMENT_TYPE.CLASS: return DND_TYPE.PROJECT_EXPLORER_CLASS;
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION: return DND_TYPE.PROJECT_EXPLORER_ASSOCIATION;
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE: return DND_TYPE.PROJECT_EXPLORER_MEASURE;
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION: return DND_TYPE.PROJECT_EXPLORER_ENUMERATION;
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE: return DND_TYPE.PROJECT_EXPLORER_PROFILE;
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION: return DND_TYPE.PROJECT_EXPLORER_FUNCTION;
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING: return DND_TYPE.PROJECT_EXPLORER_MAPPING;
    case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM: return DND_TYPE.PROJECT_EXPLORER_DIAGRAM;
    case PACKAGEABLE_ELEMENT_TYPE.TEXT: return DND_TYPE.PROJECT_EXPLORER_TEXT;
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: return DND_TYPE.PROJECT_EXPLORER_RUNTIME;
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: return DND_TYPE.PROJECT_EXPLORER_CONNECTION;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: return DND_TYPE.PROJECT_EXPLORER_FILE_GENERATION;
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION: return DND_TYPE.PROJECT_EXPLORER_GENERATION_TREE;
    default: throw new UnsupportedOperationError(`Unsupported drag and drop element of type '${type}'`);
  }
};

export const getSelectedPackageTreeNodePackage = (node: PackageTreeNodeData | undefined): Package | undefined => node
  ? node.packageableElement instanceof Package ? node.packageableElement : node.packageableElement.package
  : undefined;

export const getPackableElementTreeNodeData = (pack: PackageableElement, childFilter?: (childElement: PackageableElement) => boolean): PackageTreeNodeData => ({
  id: pack.path,
  dndType: getElementDnDType(pack),
  label: pack.name,
  childrenIds: pack instanceof Package
    ? pack.children
      .filter(child => !(child instanceof Unit)) // remove unit from package tree
      .filter(child => child instanceof Package || (!childFilter || childFilter(child)))
      .map(child => child.path)
    : undefined,
  packageableElement: pack
});

export const getPackableElementTreeData = (pack: Package, rootWrapperName: string, childFilter?: (childElement: PackageableElement) => boolean): TreeData<PackageTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, PackageTreeNodeData>();
  if (rootWrapperName === '') {
    pack.children
      .slice()
      .filter(child => !(child instanceof Unit)) // remove unit from package tree
      // packages comes first, within each group, sort by name
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => (b instanceof Package ? 1 : 0) - (a instanceof Package ? 1 : 0))
      .forEach(childPackage => {
        const childTreeNodeData = getPackableElementTreeNodeData(childPackage, childFilter);
        addUniqueEntry(rootIds, childTreeNodeData.id);
        nodes.set(childTreeNodeData.id, childTreeNodeData);
      });
  } else {
    const rootNode = getPackableElementTreeNodeData(pack, childFilter);
    rootNode.label = rootWrapperName;
    addUniqueEntry(rootIds, rootNode.id);
    nodes.set(rootNode.id, rootNode);
  }
  return { rootIds, nodes };
};

/**
 * Resolve all children of a node
 */
export const populatePackageTreeNodeChildren = (node: PackageTreeNodeData, treeData: TreeData<PackageTreeNodeData>): void => {
  if (node.childrenIds && node.packageableElement instanceof Package) {
    node.childrenIds = node.packageableElement.children
      .filter(child => !(child instanceof Unit)) // remove unit from package tree
      .map(child => child.path);
    node.packageableElement.children
      .filter(child => !(child instanceof Unit)) // remove unit from package tree
      .map(child => getPackableElementTreeNodeData(child))
      .forEach(childNode => {
        const currentNode = treeData.nodes.get(childNode.id);
        if (currentNode) {
          // Note here that we keep track of isSelected status using reference, we cannot swap out the currentNode to use new childNode
          currentNode.childrenIds = childNode.childrenIds;
          currentNode.label = childNode.label;
        } else {
          treeData.nodes.set(childNode.id, childNode);
        }
      });
  }
};

export const addNode = (element: PackageableElement, treeData: TreeData<PackageTreeNodeData>, childFilter?: (childElement: PackageableElement) => boolean): PackageTreeNodeData => {
  const newNode = getPackableElementTreeNodeData(element, childFilter);
  treeData.nodes.set(newNode.id, newNode);
  if (!element.package || element.package.path === ROOT_PACKAGE_NAME.MAIN) {
    treeData.rootIds = Array.from((new Set(treeData.rootIds)).add(newNode.id));
  } else if (element.package.path === ROOT_PACKAGE_NAME.SYSTEM || element.package.path === ROOT_PACKAGE_NAME.MODEL_GENERATION) {
    const baseNode = treeData.nodes.get(element.package.path);
    if (baseNode) {
      baseNode.isOpen = true;
    }
  } else {
    const parentNode = treeData.nodes.get(element.package.path);
    if (parentNode) {
      parentNode.childrenIds = parentNode.childrenIds ? Array.from((new Set(parentNode.childrenIds)).add(newNode.id)) : [newNode.id];
    }
  }
  return newNode;
};

export const openNode = (element: PackageableElement, treeData: TreeData<PackageTreeNodeData>, childFilter?: (childElement: PackageableElement) => boolean): PackageTreeNodeData | undefined => {
  let currentElement: PackageableElement | undefined = element;
  let openingNode: PackageTreeNodeData | undefined;
  while (currentElement.package) {
    const node: PackageTreeNodeData = treeData.nodes.get(currentElement.path) ?? addNode(currentElement, treeData, childFilter);
    node.isOpen = currentElement instanceof Package;
    openingNode = !openingNode ? node : openingNode;
    currentElement = currentElement.package;
  }
  return openingNode;
};

export const openNodes = (parent: Package, activeElements: Set<PackageableElement>, treeData: TreeData<PackageTreeNodeData>): void => {
  if (!parent.children
    .filter(child => !(child instanceof Unit)) // remove unit from package tree
    .length || !activeElements.size
  ) {
    return;
  }
  parent.children
    .filter(child => !(child instanceof Unit)) // remove unit from package tree
    .forEach(child => {
      if (activeElements.has(child)) {
        openNode(child, treeData);
        activeElements.delete(child);
        if (!activeElements.size) {
          return;
        }
      }
      if (child instanceof Package) {
        openNodes(child, activeElements, treeData);
      }
    });
};

export const openNodeById = (id: string, treeData: TreeData<TreeNodeData> | undefined): void => {
  if (treeData) {
    const node = treeData.nodes.get(id);
    if (node) {
      node.isOpen = true;
    }
  }
};

export const getTreeChildNodes = (node: PackageTreeNodeData, treeData: TreeData<PackageTreeNodeData>): PackageTreeNodeData[] => {
  if (node.childrenIds && node.packageableElement instanceof Package) {
    populatePackageTreeNodeChildren(node, treeData);
    return node.childrenIds
      .map(id => treeData.nodes.get(id))
      .filter(isNonNullable)
      // packages comes first, within each group, sort by name
      .sort((a, b) => a.label.localeCompare(b.label))
      .sort((a, b) => (b.packageableElement instanceof Package ? 1 : 0) - (a.packageableElement instanceof Package ? 1 : 0));
  }
  return [];
};
