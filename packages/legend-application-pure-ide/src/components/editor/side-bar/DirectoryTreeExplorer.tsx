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

import { forwardRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { FileEditorState } from '../../../stores/FileEditorState.js';
import { CreateNewFileCommand } from '../command-center/CreateNewFileCommand.js';
import { CreateNewDirectoryCommand } from '../command-center/CreateNewDirectoryCommand.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  type TreeNodeContainerProps,
  clsx,
  BlankPanelContent,
  ContextMenu,
  PanelLoadingIndicator,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleNotchIcon,
  RefreshIcon,
  CrosshairsIcon,
  CompressIcon,
  FileAltIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@finos/legend-art';
import { isNonNullable } from '@finos/legend-shared';
import type { DirectoryTreeNode } from '../../../server/models/DirectoryTree.js';
import { useEditorStore } from '../EditorStoreProvider.js';

const FileExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      node: DirectoryTreeNode;
    }
  >(function FileExplorerContextMenu(props, ref) {
    const { node } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();
    const isDir = node.data.isFolderNode;
    const hasChildContent = Boolean(node.data.children);
    const createNewFile = (): void =>
      editorStore.directoryTreeState.setNodeForCreateNewFile(node);
    const createNewDirectory = (): void =>
      editorStore.directoryTreeState.setNodeForCreateNewDirectory(node);
    const deleteFileOrDirectory = (): void => {
      flowResult(
        editorStore.deleteDirectoryOrFile(
          node.data.li_attr.path,
          isDir,
          hasChildContent,
        ),
      ).catch(applicationStore.alertUnhandledError);
    };
    const renameFile = (): void =>
      applicationStore.notifyUnsupportedFeature('Rename file');
    const moveFile = (): void =>
      applicationStore.notifyUnsupportedFeature('Move file');

    return (
      <div ref={ref} className="explorer__context-menu">
        {isDir && (
          <div className="explorer__context-menu__item" onClick={createNewFile}>
            New File
          </div>
        )}
        {isDir && (
          <div
            className="explorer__context-menu__item"
            onClick={createNewDirectory}
          >
            New Folder
          </div>
        )}
        {!isDir && (
          <div className="explorer__context-menu__item" onClick={renameFile}>
            Rename
          </div>
        )}
        <div
          className="explorer__context-menu__item"
          onClick={deleteFileOrDirectory}
        >
          Delete
        </div>
        {!isDir && (
          <div className="explorer__context-menu__item" onClick={moveFile}>
            Move
          </div>
        )}
      </div>
    );
  }),
);

const FileTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    DirectoryTreeNode,
    {
      onNodeOpen: (node: DirectoryTreeNode) => void;
      onNodeExpand: (node: DirectoryTreeNode) => void;
      onNodeCompress: (node: DirectoryTreeNode) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
    useState(false);
  const { onNodeOpen, onNodeExpand, onNodeCompress } = innerProps;
  const isFolder = node.data.isFolderNode;
  const nodeIcon = isFolder ? (
    node.isOpen ? (
      <div>
        <FolderOpenIcon />
      </div>
    ) : (
      <div>
        <FolderIcon />
      </div>
    )
  ) : (
    <FileAltIcon />
  );
  const selectNode: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onNodeSelect?.(node);
  };
  const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
  const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
  const toggleExpansion = (): void => {
    if (node.isLoading) {
      return;
    }
    if (node.isOpen) {
      onNodeCompress(node);
    } else {
      onNodeExpand(node);
    }
  };
  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = () => {
    if (node.isLoading) {
      return;
    }
    if (isFolder) {
      toggleExpansion();
    } else {
      onNodeOpen(node);
    }
  };

  return (
    <ContextMenu
      content={<FileExplorerContextMenu node={node} />}
      menuProps={{ elevation: 7 }}
      onOpen={onContextMenuOpen}
      onClose={onContextMenuClose}
    >
      <div
        className={clsx(
          'tree-view__node__container explorer__package-tree__node__container',
          {
            'explorer__package-tree__node__container--selected-from-context-menu':
              !node.isSelected && isSelectedFromContextMenu,
          },
          {
            'explorer__package-tree__node__container--selected':
              node.isSelected,
          },
        )}
        onClick={selectNode}
        onDoubleClick={onDoubleClick}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon explorer__package-tree__node__icon">
          {node.isLoading && (
            <div className="explorer__package-tree__node__icon__expand explorer__package-tree__node__icon__expand--is-loading">
              <CircleNotchIcon />
            </div>
          )}
          {!node.isLoading && (
            <div
              className="explorer__package-tree__node__icon__expand"
              onClick={toggleExpansion}
            >
              {!isFolder ? (
                <div />
              ) : node.isOpen ? (
                <ChevronDownIcon />
              ) : (
                <ChevronRightIcon />
              )}
            </div>
          )}
          <div className="explorer__package-tree__node__icon__type">
            {nodeIcon}
          </div>
        </div>
        <button
          className="tree-view__node__label explorer__package-tree__node__label"
          tabIndex={-1}
        >
          {node.label}
        </button>
      </div>
    </ContextMenu>
  );
};

const FileExplorerTree = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const treeState = editorStore.directoryTreeState;
  const treeData = editorStore.directoryTreeState.getTreeData();
  const onNodeSelect = (node: DirectoryTreeNode): void =>
    treeState.setSelectedNode(node);
  const onNodeOpen = (node: DirectoryTreeNode): void => {
    flowResult(treeState.openNode(node)).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const onNodeExpand = (node: DirectoryTreeNode): void => {
    flowResult(treeState.expandNode(node)).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const onNodeCompress = (node: DirectoryTreeNode): void => {
    node.isOpen = false;
    treeState.refreshTree();
  };
  const getChildNodes = (node: DirectoryTreeNode): DirectoryTreeNode[] => {
    if (node.isLoading || !node.childrenIds) {
      return [];
    }
    return node.childrenIds
      .map((childId) => treeData.nodes.get(childId))
      .filter(isNonNullable);
  };
  const deselectTreeNode = (): void => treeState.setSelectedNode(undefined);

  return (
    <div className="explorer__content" onClick={deselectTreeNode}>
      <TreeView
        components={{
          TreeNodeContainer: FileTreeNodeContainer,
        }}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
        innerProps={{
          onNodeOpen,
          onNodeExpand,
          onNodeCompress,
        }}
      />
      <CreateNewFileCommand />
      <CreateNewDirectoryCommand />
    </div>
  );
});

export const DirectoryTreeExplorer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const treeState = editorStore.directoryTreeState;
  const refreshTree = (): void => {
    flowResult(treeState.refreshTreeData()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const focus = (): void => {
    const currentTab = editorStore.tabManagerState.currentTab;
    if (currentTab instanceof FileEditorState) {
      flowResult(treeState.revealPath(currentTab.filePath, false)).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };
  const collapseTree = (): void => {
    const treeData = treeState.getTreeData();
    treeData.nodes.forEach((node) => {
      node.isOpen = false;
    });
    treeState.setSelectedNode(undefined);
    treeState.refreshTree();
  };

  return (
    <div className="panel explorer">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            FILES
          </div>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <div className="panel explorer">
          <div className="panel__header explorer__header">
            <div className="panel__header__title" />
            <div className="panel__header__actions">
              <button
                className="panel__header__action explorer__btn__refresh"
                onClick={refreshTree}
                title="Refresh Tree"
              >
                <RefreshIcon />
              </button>
              <button
                className="panel__header__action"
                onClick={focus}
                title="Focus"
              >
                <CrosshairsIcon />
              </button>
              <button
                className="panel__header__action"
                onClick={collapseTree}
                title="Collapse All"
              >
                <CompressIcon />
              </button>
            </div>
          </div>
          <div className="panel__content explorer__content__container">
            <PanelLoadingIndicator
              isLoading={treeState.loadInitialDataState.isInProgress}
            />
            {treeState.loadInitialDataState.hasSucceeded && (
              <FileExplorerTree />
            )}
            {treeState.loadInitialDataState.hasFailed && (
              <BlankPanelContent>
                Failed to build directory tree
              </BlankPanelContent>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
