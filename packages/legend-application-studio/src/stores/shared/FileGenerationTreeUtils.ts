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

import type { TreeNodeData, TreeData } from '@finos/legend-art';
import {
  isNonNullable,
  returnUndefOnError,
  addUniqueEntry,
} from '@finos/legend-shared';
import type { GenerationOutput } from '@finos/legend-graph';

export interface GenerationOutputResult {
  generationOutput: GenerationOutput;
  parentId?: string | undefined;
}
export const DIRECTORY_PATH_DELIMITER = '/';
export const GENERATION_FILE_ROOT_NAME = 'GENERATION_FILE_ROOT';

// Generation Directory Model
class GenerationFileNodeElement {
  name: string;
  directory?: GenerationDirectory | undefined;
  parentId?: string | undefined;

  constructor(name: string, fileGenerationParent?: string) {
    this.name = name;
    this.parentId = fileGenerationParent;
  }

  get path(): string {
    if (!this.directory) {
      return this.name;
    }
    const parentDirectoryName = this.directory.getDirectoryPath();
    return !parentDirectoryName
      ? this.name
      : `${parentDirectoryName}${DIRECTORY_PATH_DELIMITER}${this.name}`;
  }
}

export class GenerationDirectory extends GenerationFileNodeElement {
  children: GenerationFileNodeElement[] = [];

  setDirectory(val: GenerationDirectory): void {
    this.directory = val;
  }
  addChild(val: GenerationFileNodeElement): void {
    addUniqueEntry(this.children, val);
  }
  addElement(val: GenerationFileNodeElement): void {
    this.addChild(val);
    val.directory = this;
  }

  static createDirectoryFromParent(
    name: string,
    parent: GenerationDirectory,
    fileGenerationParent?: string,
  ): GenerationDirectory {
    const newDirectory = new GenerationDirectory(name, fileGenerationParent);
    newDirectory.setDirectory(parent);
    return newDirectory;
  }

  static getOrCreateDirectory(
    parent: GenerationDirectory,
    directoryName: string,
    insert: boolean,
  ): GenerationDirectory {
    const index = directoryName.indexOf(DIRECTORY_PATH_DELIMITER);
    const str =
      index === -1 ? directoryName : directoryName.substring(0, index);
    let node: GenerationDirectory | undefined;
    node = parent.children.find(
      (child: GenerationFileNodeElement): child is GenerationDirectory =>
        child instanceof GenerationDirectory && child.name === str,
    );
    if (!node) {
      if (!insert) {
        throw new Error(
          `Can't find file node '${str}' in directory '${directoryName}'`,
        );
      }
      // create the node if it is not in parent directory
      node = GenerationDirectory.createDirectoryFromParent(str, parent);
      parent.addChild(node);
    }
    if (index !== -1) {
      return GenerationDirectory.getOrCreateDirectory(
        node,
        directoryName.substring(index + DIRECTORY_PATH_DELIMITER.length),
        insert,
      );
    }
    return node;
  }

  getDirectoryPath(): string {
    if (!this.directory) {
      return '';
    }
    const parentDirectoryName = this.directory.getDirectoryPath();
    return !parentDirectoryName
      ? this.name
      : `${parentDirectoryName}${DIRECTORY_PATH_DELIMITER}${this.name}`;
  }
}

export class GenerationFile extends GenerationFileNodeElement {
  content!: string;
  format?: string | undefined;

  constructor(
    name: string,
    content: string,
    format?: string,
    parentId?: string,
  ) {
    super(name, parentId);
    this.content = content;
    this.format = format;
  }
}

// Generation Tree Node
export interface GenerationTreeNodeData extends TreeNodeData {
  fileNode: GenerationFileNodeElement;
}

export const getGenerationTreeNodeData = (
  fileNode: GenerationFileNodeElement,
): GenerationTreeNodeData => ({
  id: fileNode.path,
  label: fileNode.name,
  childrenIds:
    fileNode instanceof GenerationDirectory
      ? fileNode.children.map((child) => child.path)
      : undefined,
  fileNode: fileNode,
});

export const populateDirectoryTreeNodeChildren = (
  node: GenerationTreeNodeData,
  treeData: TreeData<GenerationTreeNodeData>,
): void => {
  if (node.childrenIds && node.fileNode instanceof GenerationDirectory) {
    node.childrenIds = node.fileNode.children.map((child) => child.path);
    node.fileNode.children
      .map((child) => getGenerationTreeNodeData(child))
      .forEach((childNode) => {
        const currentNode = treeData.nodes.get(childNode.id);
        if (currentNode) {
          currentNode.childrenIds = childNode.childrenIds;
          currentNode.label = childNode.label;
        } else {
          treeData.nodes.set(childNode.id, childNode);
        }
      });
  }
};

export const getGenerationTreeData = (
  dir: GenerationDirectory,
  rootWrapperName?: string,
): TreeData<GenerationTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, GenerationTreeNodeData>();
  if (rootWrapperName) {
    const rootNode = getGenerationTreeNodeData(dir);
    rootNode.label = rootWrapperName;
    addUniqueEntry(rootIds, rootNode.id);
    nodes.set(rootNode.id, rootNode);
  } else {
    dir.children
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort(
        (a, b) =>
          (b instanceof GenerationDirectory ? 1 : 0) -
          (a instanceof GenerationDirectory ? 1 : 0),
      )
      .forEach((childDirectory) => {
        const childTreeNodeData = getGenerationTreeNodeData(childDirectory);
        addUniqueEntry(rootIds, childTreeNodeData.id);
        nodes.set(childTreeNodeData.id, childTreeNodeData);
      });
  }
  return { rootIds, nodes };
};

export const addNode = (
  element: GenerationFileNodeElement,
  treeData: TreeData<GenerationTreeNodeData>,
  showRoot?: boolean,
): GenerationTreeNodeData => {
  const newNode = getGenerationTreeNodeData(element);
  treeData.nodes.set(newNode.id, newNode);
  if (
    !element.directory ||
    (element.directory.path === GENERATION_FILE_ROOT_NAME && !showRoot)
  ) {
    treeData.rootIds = Array.from(new Set(treeData.rootIds).add(newNode.id));
  } else {
    const parentNode = treeData.nodes.get(element.directory.path);
    if (parentNode) {
      parentNode.childrenIds = parentNode.childrenIds
        ? Array.from(new Set(parentNode.childrenIds).add(newNode.id))
        : [newNode.id];
    }
  }
  return newNode;
};

export const openNode = (
  element: GenerationFileNodeElement,
  treeData: TreeData<GenerationTreeNodeData>,
  showRoot?: boolean,
): GenerationTreeNodeData | undefined => {
  let currentElement = element;
  let openingNode: GenerationTreeNodeData | undefined;
  while (currentElement.directory) {
    const node: GenerationTreeNodeData =
      treeData.nodes.get(currentElement.path) ??
      addNode(currentElement, treeData, showRoot);
    node.isOpen = currentElement instanceof GenerationDirectory;
    openingNode = !openingNode ? node : openingNode;
    currentElement = currentElement.directory;
  }
  return openingNode;
};

export const getFileGenerationChildNodes = (
  node: GenerationTreeNodeData,
  treeData: TreeData<GenerationTreeNodeData>,
): GenerationTreeNodeData[] => {
  if (node.childrenIds && node.fileNode instanceof GenerationDirectory) {
    populateDirectoryTreeNodeChildren(node, treeData);
    return node.childrenIds
      .map((id) => treeData.nodes.get(id))
      .filter(isNonNullable)
      .sort((a, b) => a.label.localeCompare(b.label))
      .sort(
        (a, b) =>
          (b.fileNode instanceof GenerationDirectory ? 1 : 0) -
          (a.fileNode instanceof GenerationDirectory ? 1 : 0),
      );
  }
  return [];
};

export const buildGenerationDirectory = (
  rootDirectory: GenerationDirectory,
  generationResultIndex: Map<string, GenerationOutputResult>,
  filesIndex: Map<string, GenerationFile>,
): void => {
  Array.from(generationResultIndex.values()).forEach((generationFileInfo) => {
    const generationOutput = generationFileInfo.generationOutput;
    const filePath = generationOutput.fileName;
    const index = filePath.lastIndexOf(DIRECTORY_PATH_DELIMITER);
    const fileName =
      index === -1
        ? filePath
        : filePath.substring(
            index + DIRECTORY_PATH_DELIMITER.length,
            filePath.length,
          );
    const directoryName =
      index === -1 ? undefined : filePath.substring(0, index);
    let directory = rootDirectory;
    if (directoryName) {
      directory = GenerationDirectory.getOrCreateDirectory(
        rootDirectory,
        directoryName,
        true,
      );
    }
    const file = new GenerationFile(
      fileName,
      generationOutput.content,
      generationFileInfo.generationOutput.format,
      generationFileInfo.parentId,
    );
    directory.addElement(file);
    filesIndex.set(filePath, file);
  });
};
const openNodeById = (
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

export const reprocessOpenNodes = (
  treeData: TreeData<GenerationTreeNodeData>,
  filesIndex: Map<string, GenerationFile>,
  rootDirectory: GenerationDirectory,
  openedNodeIds: string[],
  showRoot?: boolean,
): void => {
  const openNodeElement = (
    elementPath: string,
  ): GenerationTreeNodeData | undefined => {
    const element =
      filesIndex.get(elementPath) ??
      returnUndefOnError(() =>
        GenerationDirectory.getOrCreateDirectory(
          rootDirectory,
          elementPath,
          false,
        ),
      );
    if (element) {
      return openNode(element, treeData, showRoot);
    }
    return undefined;
  };
  openedNodeIds.forEach(openNodeElement);
  if (openedNodeIds.includes(rootDirectory.path)) {
    openNodeById(rootDirectory.path, treeData);
  }
};
