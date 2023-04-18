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

import type { TreeData } from '@finos/legend-art';
import { action, makeObservable, observable } from 'mobx';
import {
  type FileResult,
  type FileSystemTreeNodeData,
  type FileSystem_File,
  FileSystem_Directory,
  openNode,
  populateDirectoryTreeNodeChildren,
  reprocessOpenNodes,
} from '../utils/FileSystemTreeUtils.js';

export class FileSystemState {
  root: FileSystem_Directory;
  directoryTreeData?: TreeData<FileSystemTreeNodeData> | undefined;
  selectedNode?: FileSystemTreeNodeData | undefined;
  filesIndex = new Map<string, FileSystem_File>();

  constructor(root: string) {
    this.root = new FileSystem_Directory(root);
    makeObservable(this, {
      root: observable,
      directoryTreeData: observable.ref,
      selectedNode: observable.ref,
      reprocessNodeTree: action,
      setDirectoryTreeData: action,
      onTreeNodeSelect: action,
      setSelectedNode: action,
    });
  }

  getOrCreateDirectory(directoryName: string): FileSystem_Directory {
    return FileSystem_Directory.getOrCreateDirectory(
      this.root,
      directoryName,
      true,
    );
  }

  setDirectoryTreeData(
    directoryTreeData: TreeData<FileSystemTreeNodeData>,
  ): void {
    this.directoryTreeData = directoryTreeData;
  }

  reprocessNodeTree(
    generationResult: FileResult[],
    treeData: TreeData<FileSystemTreeNodeData>,
    openedNodeIds: string[],
  ): void {
    reprocessOpenNodes(treeData, this.filesIndex, this.root, openedNodeIds);
    // select the current file node if available, else select the first output
    const selectedFileNodePath =
      generationResult.length === 1 ||
      (this.selectedNode === undefined && generationResult.length !== 0)
        ? (generationResult[0] as FileResult).value.fileName
        : this.selectedNode?.fileNode.path;
    if (selectedFileNodePath) {
      const file = this.filesIndex.get(selectedFileNodePath);
      if (file) {
        const node = openNode(file, treeData);
        if (node) {
          this.onTreeNodeSelect(node, treeData);
        }
      } else {
        this.selectedNode = undefined;
      }
    }
    this.setDirectoryTreeData({ ...treeData });
  }

  onTreeNodeSelect(
    node: FileSystemTreeNodeData,
    treeData: TreeData<FileSystemTreeNodeData>,
  ): void {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.fileNode instanceof FileSystem_Directory) {
        populateDirectoryTreeNodeChildren(node, treeData);
      }
    }
    this.setSelectedNode(node);
    this.setDirectoryTreeData({ ...treeData });
  }

  setSelectedNode(node?: FileSystemTreeNodeData): void {
    if (this.selectedNode) {
      this.selectedNode.isSelected = false;
    }
    if (node) {
      node.isSelected = true;
    }
    this.selectedNode = node;
  }
}
