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

import { deserialize } from 'serializr';
import { TreeState } from './TreeState.js';
import {
  type DirectoryTreeNode,
  DirectoryNode,
} from '../server/models/DirectoryTree.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { PureIDEStore } from './PureIDEStore.js';
import type { FileCoordinate } from '../server/models/File.js';
import { ACTIVITY_MODE } from './PureIDEConfig.js';
import {
  type GeneratorFn,
  assertTrue,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { TreeData } from '@finos/legend-art';
import { DIRECTORY_PATH_DELIMITER } from '@finos/legend-graph';

const getParentPath = (path: string): string | undefined => {
  const trimmedPath = path.trim();
  const idx = trimmedPath.lastIndexOf(DIRECTORY_PATH_DELIMITER);
  if (idx <= 0) {
    return undefined;
  }
  return trimmedPath.substring(0, idx);
};

const pathToId = (path: string): string => `file_${path}`;

export class DirectoryTreeState extends TreeState<
  DirectoryTreeNode,
  DirectoryNode
> {
  nodeForCreateNewFile?: DirectoryTreeNode | undefined;
  nodeForCreateNewDirectory?: DirectoryTreeNode | undefined;
  nodeForRenameFile?: DirectoryTreeNode | undefined;

  constructor(ideStore: PureIDEStore) {
    super(ideStore);
    makeObservable(this, {
      nodeForCreateNewFile: observable,
      nodeForCreateNewDirectory: observable,
      nodeForRenameFile: observable,
      setNodeForCreateNewFile: action,
      setNodeForCreateNewDirectory: action,
      setNodeForRenameFile: action,
      revealPath: flow,
    });
  }

  setNodeForCreateNewFile = (value: DirectoryTreeNode | undefined): void => {
    assertTrue(
      !value || value.data.isFolderNode,
      'Node selected for creating a new file from must be a directory',
    );
    this.nodeForCreateNewFile = value;
  };

  setNodeForCreateNewDirectory = (
    value: DirectoryTreeNode | undefined,
  ): void => {
    assertTrue(
      !value || value.data.isFolderNode,
      'Node selected for creating a new directory from must be a directory',
    );
    this.nodeForCreateNewDirectory = value;
  };

  setNodeForRenameFile = (value: DirectoryTreeNode | undefined): void => {
    assertTrue(
      !value || value.data.isFileNode,
      'Node selected for renaming must be a file',
    );
    this.nodeForRenameFile = value;
  };

  async getRootNodes(): Promise<DirectoryNode[]> {
    return (await this.ideStore.client.getDirectoryChildren()).map((node) =>
      deserialize(DirectoryNode, node),
    );
  }

  buildTreeData(rootNodes: DirectoryNode[]): TreeData<DirectoryTreeNode> {
    const rootIds: string[] = [];
    const nodes = new Map<string, DirectoryTreeNode>();
    rootNodes.forEach((node) => {
      const id = node.li_attr.id;
      rootIds.push(id);
      nodes.set(id, {
        data: node,
        id,
        label: node.text,
        isLoading: false,
      });
    });
    return { rootIds, nodes };
  }

  async getChildNodes(node: DirectoryTreeNode): Promise<DirectoryNode[]> {
    return (
      await this.ideStore.client.getDirectoryChildren(node.data.li_attr.path)
    ).map((child) => deserialize(DirectoryNode, child));
  }

  processChildNodes(
    node: DirectoryTreeNode,
    childNodes: DirectoryNode[],
  ): void {
    const treeData = this.getTreeData();
    const childrenIds: string[] = [];
    childNodes.forEach((childNode) => {
      const id = childNode.li_attr.id;
      childrenIds.push(id);
      treeData.nodes.set(id, {
        data: childNode,
        id,
        label: childNode.text,
        isLoading: false,
      });
    });
    node.childrenIds = childrenIds;
  }

  *openNode(node: DirectoryTreeNode): GeneratorFn<void> {
    if (node.data.isFileNode) {
      yield flowResult(this.ideStore.loadFile(node.data.li_attr.path));
    }
  }

  *revealPath(
    path: string,
    options?: {
      /**
       * Only reveal directories, will skip opening file
       * if the provided path belongs to a file
       */
      directoryOnly?: boolean | undefined;
      forceOpenExplorerPanel?: boolean | undefined;
      coordinate?: FileCoordinate | undefined;
    },
  ): GeneratorFn<void> {
    if (options?.forceOpenExplorerPanel) {
      this.ideStore.setActiveActivity(ACTIVITY_MODE.FILE_EXPLORER, {
        keepShowingIfMatchedCurrent: true,
      });
    }

    const paths: string[] = [];
    let currentPath: string | undefined = path;
    while (currentPath) {
      paths.unshift(currentPath);
      currentPath = getParentPath(currentPath);
    }
    for (const _path of paths) {
      const node = guaranteeNonNullable(
        this.getTreeData().nodes.get(pathToId(_path)),
        `Can't find node with path '${_path}'`,
      );
      if (node.data.isFolderNode) {
        yield flowResult(this.expandNode(node));
      } else {
        if (options?.directoryOnly) {
          throw new Error(`Can't reveal non-directory path`);
        } else {
          yield flowResult(this.ideStore.loadFile(_path, options?.coordinate));
        }
      }
    }

    const currentNode = guaranteeNonNullable(
      this.getTreeData().nodes.get(pathToId(path)),
      `Can't find node with path '${path}'`,
    );

    this.setSelectedNode(currentNode);
    document.getElementById(currentNode.id)?.scrollIntoView({
      behavior: 'instant',
      block: 'center',
    });
  }
}
