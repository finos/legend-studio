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

import { ROOT_PACKAGE_NAME } from '../../models/MetaModelConst';
import { isNonNullable, addUniqueEntry } from '@finos/legend-studio-shared';
import type { PackageTreeNodeData } from './TreeUtil';
import type { TreeNodeData, TreeData } from '@finos/legend-studio-components';
import { Package } from '../../models/metamodels/pure/model/packageableElements/domain/Package';
import { Class } from '../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Profile } from '../../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Association } from '../../models/metamodels/pure/model/packageableElements/domain/Association';
import { ConcreteFunctionDefinition } from '../../models/metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import {
  Measure,
  Unit,
} from '../../models/metamodels/pure/model/packageableElements/domain/Measure';
import { Database } from '../../models/metamodels/pure/model/packageableElements/store/relational/model/Database';
import { ServiceStore } from '../../models/metamodels/pure/model/packageableElements/store/relational/model/ServiceStore';
import { FlatData } from '../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { Mapping } from '../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Diagram } from '../../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { Service } from '../../models/metamodels/pure/model/packageableElements/service/Service';
import { PackageableRuntime } from '../../models/metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from '../../models/metamodels/pure/model/packageableElements/connection/PackageableConnection';
import { FileGenerationSpecification } from '../../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { GenerationSpecification } from '../../models/metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import type { PackageableElement } from '../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { EditorStore } from '../EditorStore';
import { CORE_DND_TYPE } from './DnDUtil';
import type { DSL_EditorPlugin_Extension } from '../EditorPlugin';

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
const getElementProjectExplorerDnDType = (
  editorStore: EditorStore,
  element: PackageableElement,
): string => {
  if (element instanceof Package) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_PACKAGE;
  } else if (element instanceof Class) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_CLASS;
  } else if (element instanceof Association) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_ASSOCIATION;
  } else if (element instanceof Enumeration) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION;
  } else if (element instanceof Profile) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE;
  } else if (element instanceof ConcreteFunctionDefinition) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_FUNCTION;
  } else if (element instanceof Measure) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_MEASURE;
  } else if (element instanceof FlatData) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_FLAT_DATA;
  } else if (element instanceof Database) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_DATABASE;
  } else if (element instanceof ServiceStore) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_SERVICE_STORE;
  } else if (element instanceof Diagram) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_DIAGRAM;
  } else if (element instanceof Mapping) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING;
  } else if (element instanceof PackageableRuntime) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_RUNTIME;
  } else if (element instanceof PackageableConnection) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_CONNECTION;
  } else if (element instanceof Service) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_SERVICE;
  } else if (element instanceof GenerationSpecification) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_GENERATION_TREE;
  } else if (element instanceof FileGenerationSpecification) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_FILE_GENERATION;
  }
  const extraElementProjectExplorerDnDTypeGetters =
    editorStore.applicationStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_EditorPlugin_Extension
          ).getExtraElementProjectExplorerDnDTypeGetters?.() ?? [],
      );
  for (const dndTypeGetter of extraElementProjectExplorerDnDTypeGetters) {
    const dndType = dndTypeGetter(element);
    if (dndType) {
      return dndType;
    }
  }
  return CORE_DND_TYPE.NONE;
};

export const getSelectedPackageTreeNodePackage = (
  node: PackageTreeNodeData | undefined,
): Package | undefined =>
  node
    ? node.packageableElement instanceof Package
      ? node.packageableElement
      : node.packageableElement.package
    : undefined;

export const getPackableElementTreeNodeData = (
  editorStore: EditorStore,
  element: PackageableElement,
  childFilter?: (childElement: PackageableElement) => boolean,
): PackageTreeNodeData => ({
  id: element.path,
  dndType: getElementProjectExplorerDnDType(editorStore, element),
  label: element.name,
  childrenIds:
    element instanceof Package
      ? element.children
          .filter((child) => !(child instanceof Unit)) // remove unit from package tree
          .filter(
            (child) =>
              child instanceof Package || !childFilter || childFilter(child),
          )
          .map((child) => child.path)
      : undefined,
  packageableElement: element,
});

export const getPackableElementTreeData = (
  editorStore: EditorStore,
  _package: Package,
  rootWrapperName: string,
  childFilter?: (childElement: PackageableElement) => boolean,
): TreeData<PackageTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, PackageTreeNodeData>();
  if (rootWrapperName === '') {
    _package.children
      .slice()
      .filter((child) => !(child instanceof Unit)) // remove unit from package tree
      // packages comes first, within each group, sort by name
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort(
        (a, b) =>
          (b instanceof Package ? 1 : 0) - (a instanceof Package ? 1 : 0),
      )
      .forEach((childPackage) => {
        const childTreeNodeData = getPackableElementTreeNodeData(
          editorStore,
          childPackage,
          childFilter,
        );
        addUniqueEntry(rootIds, childTreeNodeData.id);
        nodes.set(childTreeNodeData.id, childTreeNodeData);
      });
  } else {
    const rootNode = getPackableElementTreeNodeData(
      editorStore,
      _package,
      childFilter,
    );
    rootNode.label = rootWrapperName;
    addUniqueEntry(rootIds, rootNode.id);
    nodes.set(rootNode.id, rootNode);
  }
  return { rootIds, nodes };
};

/**
 * Resolve all children of a node
 */
export const populatePackageTreeNodeChildren = (
  editorStore: EditorStore,
  node: PackageTreeNodeData,
  treeData: TreeData<PackageTreeNodeData>,
): void => {
  if (node.childrenIds && node.packageableElement instanceof Package) {
    node.childrenIds = node.packageableElement.children
      .filter((child) => !(child instanceof Unit)) // remove unit from package tree
      .map((child) => child.path);
    node.packageableElement.children
      .filter((child) => !(child instanceof Unit)) // remove unit from package tree
      .map((child) => getPackableElementTreeNodeData(editorStore, child))
      .forEach((childNode) => {
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

export const addNode = (
  editorStore: EditorStore,
  element: PackageableElement,
  treeData: TreeData<PackageTreeNodeData>,
  childFilter?: (childElement: PackageableElement) => boolean,
): PackageTreeNodeData => {
  const newNode = getPackableElementTreeNodeData(
    editorStore,
    element,
    childFilter,
  );
  treeData.nodes.set(newNode.id, newNode);
  if (!element.package || element.package.path === ROOT_PACKAGE_NAME.MAIN) {
    treeData.rootIds = Array.from(new Set(treeData.rootIds).add(newNode.id));
  } else if (
    element.package.path === ROOT_PACKAGE_NAME.SYSTEM ||
    element.package.path === ROOT_PACKAGE_NAME.MODEL_GENERATION
  ) {
    const baseNode = treeData.nodes.get(element.package.path);
    if (baseNode) {
      baseNode.isOpen = true;
    }
  } else {
    const parentNode = treeData.nodes.get(element.package.path);
    if (parentNode) {
      parentNode.childrenIds = parentNode.childrenIds
        ? Array.from(new Set(parentNode.childrenIds).add(newNode.id))
        : [newNode.id];
    }
  }
  return newNode;
};

export const openNode = (
  editorStore: EditorStore,
  element: PackageableElement,
  treeData: TreeData<PackageTreeNodeData>,
  childFilter?: (childElement: PackageableElement) => boolean,
): PackageTreeNodeData | undefined => {
  let currentElement: PackageableElement | undefined = element;
  let openingNode: PackageTreeNodeData | undefined;
  while (currentElement.package) {
    const node: PackageTreeNodeData =
      treeData.nodes.get(currentElement.path) ??
      addNode(editorStore, currentElement, treeData, childFilter);
    node.isOpen = currentElement instanceof Package;
    openingNode = !openingNode ? node : openingNode;
    currentElement = currentElement.package;
  }
  return openingNode;
};

export const openNodes = (
  editorStore: EditorStore,
  parent: Package,
  activeElements: Set<PackageableElement>,
  treeData: TreeData<PackageTreeNodeData>,
): void => {
  if (
    !parent.children.filter((child) => !(child instanceof Unit)).length || // remove unit from package tree
    !activeElements.size
  ) {
    return;
  }
  parent.children
    .filter((child) => !(child instanceof Unit)) // remove unit from package tree
    .forEach((child) => {
      if (activeElements.has(child)) {
        openNode(editorStore, child, treeData);
        activeElements.delete(child);
        if (!activeElements.size) {
          return;
        }
      }
      if (child instanceof Package) {
        openNodes(editorStore, child, activeElements, treeData);
      }
    });
};

export const openNodeById = (
  id: string,
  treeData: TreeData<TreeNodeData> | undefined,
): void => {
  if (treeData) {
    const node = treeData.nodes.get(id);
    if (node) {
      node.isOpen = true;
    }
  }
};

export const getTreeChildNodes = (
  editorStore: EditorStore,
  node: PackageTreeNodeData,
  treeData: TreeData<PackageTreeNodeData>,
): PackageTreeNodeData[] => {
  if (node.childrenIds && node.packageableElement instanceof Package) {
    populatePackageTreeNodeChildren(editorStore, node, treeData);
    return (
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable)
        // packages comes first, within each group, sort by name
        .sort((a, b) => a.label.localeCompare(b.label))
        .sort(
          (a, b) =>
            (b.packageableElement instanceof Package ? 1 : 0) -
            (a.packageableElement instanceof Package ? 1 : 0),
        )
    );
  }
  return [];
};
