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
import {
  DIRECTORY_PATH_DELIMITER,
  type GenerationOutput,
} from '@finos/legend-graph';

export const GENERATION_FILE_ROOT_NAME = 'GENERATION_FILE_ROOT';

export interface FileResult {
  value: GenerationOutput;
  parentId?: string | undefined;
}

class FileSystemElement {
  name: string;
  directory?: FileSystem_Directory | undefined;
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

export class FileSystem_Directory extends FileSystemElement {
  children: FileSystemElement[] = [];

  setDirectory(val: FileSystem_Directory): void {
    this.directory = val;
  }
  addChild(val: FileSystemElement): void {
    addUniqueEntry(this.children, val);
  }
  addElement(val: FileSystemElement): void {
    this.addChild(val);
    val.directory = this;
  }

  static createDirectoryFromParent(
    name: string,
    parent: FileSystem_Directory,
    genParent?: string,
  ): FileSystem_Directory {
    const newDirectory = new FileSystem_Directory(name, genParent);
    newDirectory.setDirectory(parent);
    return newDirectory;
  }

  static getOrCreateDirectory(
    parent: FileSystem_Directory,
    directoryName: string,
    insert: boolean,
  ): FileSystem_Directory {
    const index = directoryName.indexOf(DIRECTORY_PATH_DELIMITER);
    const str =
      index === -1 ? directoryName : directoryName.substring(0, index);
    let node: FileSystem_Directory | undefined;
    node = parent.children.find(
      (child: FileSystemElement): child is FileSystem_Directory =>
        child instanceof FileSystem_Directory && child.name === str,
    );
    if (!node) {
      if (!insert) {
        throw new Error(
          `Can't find file node '${str}' in directory '${directoryName}'`,
        );
      }
      // create the node if it is not in parent directory
      node = FileSystem_Directory.createDirectoryFromParent(str, parent);
      parent.addChild(node);
    }
    if (index !== -1) {
      return FileSystem_Directory.getOrCreateDirectory(
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

export class FileSystem_File extends FileSystemElement {
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

// Tree Node
export interface FileSystemTreeNodeData extends TreeNodeData {
  fileNode: FileSystemElement;
}

export const getFileSystemTreeNodeData = (
  fileNode: FileSystemElement,
): FileSystemTreeNodeData => ({
  id: fileNode.path,
  label: fileNode.name,
  childrenIds:
    fileNode instanceof FileSystem_Directory
      ? fileNode.children.map((child) => child.path)
      : undefined,
  fileNode: fileNode,
});

export const populateDirectoryTreeNodeChildren = (
  node: FileSystemTreeNodeData,
  treeData: TreeData<FileSystemTreeNodeData>,
): void => {
  if (node.childrenIds && node.fileNode instanceof FileSystem_Directory) {
    node.childrenIds = node.fileNode.children.map((child) => child.path);
    node.fileNode.children
      .map((child) => getFileSystemTreeNodeData(child))
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

export const getFileSystemTreeData = (
  dir: FileSystem_Directory,
  rootWrapperName?: string,
): TreeData<FileSystemTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, FileSystemTreeNodeData>();
  if (rootWrapperName) {
    const rootNode = getFileSystemTreeNodeData(dir);
    rootNode.label = rootWrapperName;
    addUniqueEntry(rootIds, rootNode.id);
    nodes.set(rootNode.id, rootNode);
  } else {
    dir.children
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .sort(
        (a, b) =>
          (b instanceof FileSystem_Directory ? 1 : 0) -
          (a instanceof FileSystem_Directory ? 1 : 0),
      )
      .forEach((childDirectory) => {
        const childTreeNodeData = getFileSystemTreeNodeData(childDirectory);
        addUniqueEntry(rootIds, childTreeNodeData.id);
        nodes.set(childTreeNodeData.id, childTreeNodeData);
      });
  }
  return { rootIds, nodes };
};

export const addNode = (
  element: FileSystemElement,
  treeData: TreeData<FileSystemTreeNodeData>,
  showRoot?: boolean,
): FileSystemTreeNodeData => {
  const newNode = getFileSystemTreeNodeData(element);
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
  element: FileSystemElement,
  treeData: TreeData<FileSystemTreeNodeData>,
  showRoot?: boolean,
): FileSystemTreeNodeData | undefined => {
  let currentElement = element;
  let openingNode: FileSystemTreeNodeData | undefined;
  while (currentElement.directory) {
    const node: FileSystemTreeNodeData =
      treeData.nodes.get(currentElement.path) ??
      addNode(currentElement, treeData, showRoot);
    node.isOpen = currentElement instanceof FileSystem_Directory;
    openingNode = !openingNode ? node : openingNode;
    currentElement = currentElement.directory;
  }
  return openingNode;
};

export const getFileSystemChildNodes = (
  node: FileSystemTreeNodeData,
  treeData: TreeData<FileSystemTreeNodeData>,
): FileSystemTreeNodeData[] => {
  if (node.childrenIds && node.fileNode instanceof FileSystem_Directory) {
    populateDirectoryTreeNodeChildren(node, treeData);
    return node.childrenIds
      .map((id) => treeData.nodes.get(id))
      .filter(isNonNullable)
      .sort((a, b) => a.label.localeCompare(b.label))
      .sort(
        (a, b) =>
          (b.fileNode instanceof FileSystem_Directory ? 1 : 0) -
          (a.fileNode instanceof FileSystem_Directory ? 1 : 0),
      );
  }
  return [];
};

export const buildFileSystemDirectory = (
  rootDirectory: FileSystem_Directory,
  filesResultIndex: Map<string, FileResult>,
  filesIndex: Map<string, FileSystem_File>,
): void => {
  Array.from(filesResultIndex.values()).forEach((fileResult) => {
    const resultValue = fileResult.value;
    const filePath = resultValue.fileName;
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
      directory = FileSystem_Directory.getOrCreateDirectory(
        rootDirectory,
        directoryName,
        true,
      );
    }
    const file = new FileSystem_File(
      fileName,
      resultValue.content,
      fileResult.value.format,
      fileResult.parentId,
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
  treeData: TreeData<FileSystemTreeNodeData>,
  filesIndex: Map<string, FileSystem_File>,
  rootDirectory: FileSystem_Directory,
  openedNodeIds: string[],
  showRoot?: boolean,
): void => {
  const openNodeElement = (
    elementPath: string,
  ): FileSystemTreeNodeData | undefined => {
    const element =
      filesIndex.get(elementPath) ??
      returnUndefOnError(() =>
        FileSystem_Directory.getOrCreateDirectory(
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
