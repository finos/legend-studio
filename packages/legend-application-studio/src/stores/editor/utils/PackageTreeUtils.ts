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
  isNonNullable,
  addUniqueEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { PackageTreeNodeData } from './TreeUtils.js';
import type { TreeNodeData, TreeData } from '@finos/legend-art';
import type { EditorStore } from '../EditorStore.js';
import { CORE_DND_TYPE } from './DnDUtils.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../../LegendStudioApplicationPlugin.js';
import {
  type PackageableElement,
  ROOT_PACKAGE_NAME,
  Package,
  Class,
  Enumeration,
  Profile,
  Association,
  ConcreteFunctionDefinition,
  Measure,
  Unit,
  Database,
  FlatData,
  Mapping,
  Service,
  PackageableRuntime,
  PackageableConnection,
  FileGenerationSpecification,
  GenerationSpecification,
  DataElement,
  generateFunctionPrettyName,
  getElementRootPackage,
  extractDependencyGACoordinateFromRootPackageName,
  generateDependencyRootPackageName,
} from '@finos/legend-graph';
import { ExplorerTreeRootPackageLabel } from '../ExplorerTreeState.js';

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
  } else if (element instanceof DataElement) {
    return CORE_DND_TYPE.PROJECT_EXPLORER_DATA;
  }
  const extraDragElementClassifiers = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_LegendStudioApplicationPlugin_Extension
        ).getExtraDragElementClassifiers?.() ?? [],
    );
  for (const classifier of extraDragElementClassifiers) {
    const dragType = classifier(element);
    if (dragType) {
      return dragType;
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

export const generatePackageableElementTreeNodeDataLabel = (
  element: PackageableElement,
): string =>
  element instanceof ConcreteFunctionDefinition
    ? generateFunctionPrettyName(element)
    : element.name;

export const getPackableElementTreeNodeData = (
  editorStore: EditorStore,
  element: PackageableElement,
  childFilter?: (childElement: PackageableElement) => boolean,
): PackageTreeNodeData => ({
  id: element.path,
  dndType: getElementProjectExplorerDnDType(editorStore, element),
  label: generatePackageableElementTreeNodeDataLabel(element),
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

export const getDependencyPackableElementTreeNodeData = (
  editorStore: EditorStore,
  element: PackageableElement,
  rootName: string,
  isDependencyRoot: boolean,
  childFilter?: (childElement: PackageableElement) => boolean,
): PackageTreeNodeData => ({
  id: isDependencyRoot ? element.path : `${rootName}::${element.path}`,
  dndType: getElementProjectExplorerDnDType(editorStore, element),
  label: generatePackageableElementTreeNodeDataLabel(element),
  childrenIds:
    element instanceof Package
      ? element.children
          .filter((child) => !(child instanceof Unit)) // remove unit from package tree
          .filter(
            (child) =>
              child instanceof Package || !childFilter || childFilter(child),
          )
          .map((child) => `${rootName}::${child.path}`)
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

export const getDependenciesPackableElementTreeData = (
  editorStore: EditorStore,
  _packages: Package[],
  rootWrapperName: string,
  childFilter?: (childElement: PackageableElement) => boolean,
): TreeData<PackageTreeNodeData> => {
  const rootIds: string[] = [];
  // Here we warp all the dependency roots with an new root node 'dependencies'
  // We push all the dependency roots as children nodes of this new node so that
  // we can show the tree structure of dependencies wrapped with the label 'dependencies'.
  // In future we would want to support a new tree node type to accomodate these
  // excpetions to the existing structure.
  const root = new Package(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  const nodes = new Map<string, PackageTreeNodeData>();
  _packages.forEach((_package) => {
    const childRootNode = getDependencyPackableElementTreeNodeData(
      editorStore,
      _package,
      _package.name,
      true,
      childFilter,
    );
    const dependencyGACoordinates =
      extractDependencyGACoordinateFromRootPackageName(_package.name) ??
      _package.name;
    childRootNode.label = generateDependencyRootPackageName(
      dependencyGACoordinates,
    );
    childRootNode.id = generateDependencyRootPackageName(
      dependencyGACoordinates,
    );
    addUniqueEntry(rootIds, childRootNode.id);
    nodes.set(childRootNode.id, childRootNode);
    root.children.push(_package);
  });
  const rootNode = {
    id: rootWrapperName,
    dndType: getElementProjectExplorerDnDType(editorStore, root),
    label: rootWrapperName,
    childrenIds: rootIds,
    packageableElement: root,
  };
  rootNode.label = rootWrapperName;
  nodes.set(rootNode.id, rootNode);
  const ids: string[] = [];
  ids.push(rootNode.id);
  return { rootIds: ids, nodes };
};

/**
 * Resolve all children of a node
 */
export const populatePackageTreeNodeChildren = (
  editorStore: EditorStore,
  node: PackageTreeNodeData,
  treeData: TreeData<PackageTreeNodeData>,
  isDependencyTree?: boolean | undefined,
): void => {
  if (
    node.childrenIds &&
    node.packageableElement instanceof Package &&
    node.id === ExplorerTreeRootPackageLabel.PROJECT_DEPENDENCY
  ) {
    // do nothing
  } else if (
    node.childrenIds &&
    node.packageableElement instanceof Package &&
    isDependencyTree
  ) {
    const rootNodeName = node.id.split('::')[0] ?? node.id;
    node.childrenIds = node.packageableElement.children
      .filter((child) => !(child instanceof Unit)) // remove unit from package tree
      .map((child) => `${rootNodeName}::${child.path}`);
    node.packageableElement.children
      .filter((child) => !(child instanceof Unit)) // remove unit from package tree
      .map((child) =>
        getDependencyPackableElementTreeNodeData(
          editorStore,
          child,
          rootNodeName,
          false,
        ),
      )
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
  } else if (node.childrenIds && node.packageableElement instanceof Package) {
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
  isDependencyTreeNode?: boolean | undefined,
): PackageTreeNodeData => {
  const rootNodeName = getElementRootPackage(element).name;
  const newNode = isDependencyTreeNode
    ? getDependencyPackableElementTreeNodeData(
        editorStore,
        element,
        rootNodeName,
        false,
        childFilter,
      )
    : getPackableElementTreeNodeData(editorStore, element, childFilter);
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
  isDependencyElement?: boolean,
): PackageTreeNodeData | undefined => {
  let currentElement: PackageableElement | undefined = element;
  let openingNode: PackageTreeNodeData | undefined;
  while (currentElement.package) {
    const currentNode: PackageTreeNodeData =
      treeData.nodes.get(currentElement.path) ??
      addNode(
        editorStore,
        currentElement,
        treeData,
        childFilter,
        isDependencyElement,
      );
    currentNode.isOpen = currentElement instanceof Package;
    openingNode = !openingNode ? currentNode : openingNode;
    currentElement = currentElement.package;
  }
  // Open the dependency root
  const node = treeData.nodes.get(currentElement.name);
  if (node) {
    node.isOpen = currentElement instanceof Package;
    if (node.isOpen && treeData.rootIds.length) {
      const rootNode = treeData.nodes.get(
        guaranteeNonNullable(treeData.rootIds[0]),
      );
      if (rootNode) {
        rootNode.isOpen = true;
      }
    }
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
  isDependencyTree?: boolean | undefined,
): PackageTreeNodeData[] => {
  if (node.childrenIds && node.packageableElement instanceof Package) {
    populatePackageTreeNodeChildren(
      editorStore,
      node,
      treeData,
      isDependencyTree,
    );
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
