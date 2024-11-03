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
import { FileEditorState } from '../../stores/FileEditorState.js';
import { CreateNewFilePrompt } from './CreateNewFilePrompt.js';
import { CreateNewDirectoryPrompt } from './CreateNewDirectoryPrompt.js';
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
  WrenchIcon,
  MenuContent,
  MenuContentItem,
  MenuContentDivider,
} from '@finos/legend-art';
import { isNonNullable } from '@finos/legend-shared';
import {
  DirectoryNode,
  type DirectoryTreeNode,
} from '../../server/models/DirectoryTree.js';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { RenameFilePrompt } from './RenameFilePrompt.js';

const FileExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      node: DirectoryTreeNode;
    }
  >(function FileExplorerContextMenu(props, ref) {
    const { node } = props;
    const applicationStore = useApplicationStore();
    const ideStore = usePureIDEStore();
    const isDir = node.data.isFolderNode;
    const hasChildContent = Boolean(node.data.children);
    const createNewFile = (): void =>
      ideStore.directoryTreeState.setNodeForCreateNewFile(node);
    const createNewDirectory = (): void =>
      ideStore.directoryTreeState.setNodeForCreateNewDirectory(node);
    const deleteFileOrDirectory = (): void => {
      flowResult(
        ideStore.deleteDirectoryOrFile(
          node.data.li_attr.path,
          isDir,
          hasChildContent,
        ),
      ).catch(applicationStore.alertUnhandledError);
    };
    const renameFile = (): void =>
      ideStore.directoryTreeState.setNodeForRenameFile(node);
    const copyPath = (): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(node.data.li_attr.path)
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={copyPath}>Copy Path</MenuContentItem>
        {!node.data.li_attr.RO && (
          <>
            <MenuContentDivider />
            {isDir && (
              <MenuContentItem onClick={createNewFile}>
                New File
              </MenuContentItem>
            )}
            {isDir && (
              <MenuContentItem onClick={createNewDirectory}>
                New Directory
              </MenuContentItem>
            )}
            {!isDir && (
              <MenuContentItem onClick={renameFile}>Rename</MenuContentItem>
            )}
            <MenuContentItem
              disabled={Boolean(
                node.data instanceof DirectoryNode && node.data.children,
              )}
              onClick={deleteFileOrDirectory}
            >
              Delete
            </MenuContentItem>
          </>
        )}
      </MenuContent>
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
  const isPlatformDirectory =
    node.data instanceof DirectoryNode &&
    node.data.isRepoNode &&
    node.data.li_attr.path === '/platform';
  const isReadOnly = node.data.li_attr.RO;
  const isDirectory = node.data.isFolderNode;
  const isChildlessDirectory =
    node.data instanceof DirectoryNode && !node.data.children;
  const nodeIcon =
    isPlatformDirectory ||
    (node.data.isRepoNode &&
      node.data.li_attr.path.startsWith('/platform_')) ? (
      <WrenchIcon className="explorer__icon--readonly" />
    ) : isDirectory ? (
      isChildlessDirectory ? (
        <FolderIcon
          className={clsx('explorer__icon--folder', {
            'explorer__icon--readonly': isReadOnly,
          })}
        />
      ) : node.isOpen ? (
        <FolderOpenIcon
          className={clsx('explorer__icon--folder', {
            'explorer__icon--readonly': isReadOnly,
          })}
        />
      ) : (
        <FolderIcon
          className={clsx('explorer__icon--folder', {
            'explorer__icon--readonly': isReadOnly,
          })}
        />
      )
    ) : (
      <FileAltIcon
        className={clsx('explorer__icon--file', {
          'explorer__icon--readonly': isReadOnly,
        })}
      />
    );
  const selectNode: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onNodeSelect?.(node);
  };
  const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
  const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
  const toggleExpansion = (): void => {
    if (isChildlessDirectory) {
      return;
    }
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
    if (isDirectory) {
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
        id={node.id}
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
              {!isDirectory || isChildlessDirectory ? (
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
          {isPlatformDirectory ? 'platform' : node.label}
        </button>
      </div>
    </ContextMenu>
  );
};

const FileExplorerTree = observer(() => {
  const ideStore = usePureIDEStore();
  const applicationStore = useApplicationStore();
  const treeState = ideStore.directoryTreeState;
  const treeData = ideStore.directoryTreeState.getTreeData();
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
      {treeState.nodeForCreateNewFile && (
        <CreateNewFilePrompt node={treeState.nodeForCreateNewFile} />
      )}
      {treeState.nodeForCreateNewDirectory && (
        <CreateNewDirectoryPrompt node={treeState.nodeForCreateNewDirectory} />
      )}
      {treeState.nodeForRenameFile && (
        <RenameFilePrompt node={treeState.nodeForRenameFile} />
      )}
    </div>
  );
});

export const DirectoryTreeExplorer = observer(() => {
  const ideStore = usePureIDEStore();
  const applicationStore = useApplicationStore();
  const treeState = ideStore.directoryTreeState;
  const refreshTree = (): void => {
    flowResult(treeState.refreshTreeData()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const focus = (): void => {
    const currentTab = ideStore.tabManagerState.currentTab;
    if (currentTab instanceof FileEditorState) {
      flowResult(treeState.revealPath(currentTab.filePath)).catch(
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
