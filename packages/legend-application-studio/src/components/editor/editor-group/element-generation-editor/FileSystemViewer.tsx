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

import { Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type TreeNodeContainerProps,
  type TreeData,
  type TreeNodeData,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  clsx,
  TreeView,
  BlankPanelContent,
  PanelLoadingIndicator,
  RefreshIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  FolderIcon,
  FileCodeIcon,
  PanelContent,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  Panel,
} from '@finos/legend-art';
import type { GeneratedFileStructureState } from '../../../../stores/editor/editor-state/FileGenerationState.js';
import {
  type FileSystemTreeNodeData,
  FileSystem_Directory,
  FileSystem_File,
  getFileSystemChildNodes,
} from '../../../../stores/editor/utils/FileSystemTreeUtils.js';
import { useApplicationStore } from '@finos/legend-application';
import type { DSL_Generation_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Generation_LegendStudioApplicationPlugin_Extension.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  getEditorLanguageForFormat,
  getTextContent,
} from '../../../../stores/editor/editor-state/ArtifactGenerationViewerState.js';

export const FileSystemTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    FileSystemTreeNodeData,
    {
      selectedNode?: TreeNodeData | undefined;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { selectedNode } = innerProps;
  const isSelected = selectedNode === node;
  const isDirectory = node.fileNode instanceof FileSystem_Directory;
  const expandIcon = !isDirectory ? (
    <div />
  ) : node.isOpen ? (
    <ChevronDownIcon />
  ) : (
    <ChevronRightIcon />
  );
  const iconPackageColor = 'color--generated';
  const nodeIcon = isDirectory ? (
    node.isOpen ? (
      <div className={iconPackageColor}>
        <FolderOpenIcon />
      </div>
    ) : (
      <div className={iconPackageColor}>
        <FolderIcon />
      </div>
    )
  ) : (
    <div className="icon">
      <FileCodeIcon />
    </div>
  );
  const selectNode: React.MouseEventHandler = (event) => onNodeSelect?.(node);

  return (
    <div
      className={clsx(
        'tree-view__node__container generation-result-viewer__explorer__package-tree__node__container',
        {
          'generation-result-viewer__explorer__package-tree__node__container--selected':
            isSelected,
        },
      )}
      onClick={selectNode}
      style={{
        paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon generation-result-viewer__explorer__package-tree__node__icon">
        <div className="generation-result-viewer__explorer__package-tree__node__icon__expand">
          {expandIcon}
        </div>
        <div className="generation-result-viewer__explorer__package-tree__node__icon__type">
          {nodeIcon}
        </div>
      </div>
      <button
        className="tree-view__node__label generation-result-viewer__explorer__package-tree__node__label"
        tabIndex={-1}
        title={node.fileNode.path}
      >
        {node.label}
      </button>
    </div>
  );
};

export const FileSystemTree = observer(
  (props: {
    selectedNode?: TreeNodeData | undefined;
    directoryTreeData: TreeData<FileSystemTreeNodeData>;
    onNodeSelect: (node: FileSystemTreeNodeData) => void;
    getFileElementTreeChildNodes: (
      node: FileSystemTreeNodeData,
    ) => FileSystemTreeNodeData[];
  }) => {
    const {
      directoryTreeData,
      onNodeSelect,
      getFileElementTreeChildNodes,
      selectedNode,
    } = props;

    return (
      <TreeView
        components={{
          TreeNodeContainer: FileSystemTreeNodeContainer,
        }}
        treeData={directoryTreeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getFileElementTreeChildNodes}
        innerProps={{
          selectedNode: selectedNode,
        }}
      />
    );
  },
);

export const FileSystemExplorer = observer(
  (props: { generatedFileState: GeneratedFileStructureState }) => {
    const { generatedFileState } = props;
    const fileSystemState = generatedFileState.fileSystemState;
    const treeData = guaranteeNonNullable(fileSystemState.directoryTreeData);
    const onNodeSelect = (node: FileSystemTreeNodeData): void =>
      fileSystemState.onTreeNodeSelect(node, treeData);
    const getMappingElementTreeChildNodes = (
      node: FileSystemTreeNodeData,
    ): FileSystemTreeNodeData[] => getFileSystemChildNodes(node, treeData);

    if (!treeData.nodes.size) {
      return <BlankPanelContent>No content</BlankPanelContent>;
    }
    return (
      <div className="generation-result-viewer__explorer__content">
        <FileSystemTree
          selectedNode={fileSystemState.selectedNode}
          directoryTreeData={treeData}
          onNodeSelect={onNodeSelect}
          getFileElementTreeChildNodes={getMappingElementTreeChildNodes}
        />
      </div>
    );
  },
);

export const FileSystemViewer = observer(
  (props: { generatedFileState: GeneratedFileStructureState }) => {
    const { generatedFileState } = props;
    const applicationStore = useApplicationStore();
    const selectedNode = generatedFileState.fileSystemState.selectedNode;
    const fileNode = selectedNode?.fileNode;
    const regenerate = applicationStore.guardUnhandledError(() =>
      flowResult(generatedFileState.generate()),
    );
    const extraFileGenerationResultViewerActions =
      fileNode instanceof FileSystem_File
        ? generatedFileState.editorStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_Generation_LegendStudioApplicationPlugin_Extension
                ).getExtraFileGenerationResultViewerActionConfigurations?.() ??
                [],
            )
            .map((config) => (
              <Fragment key={config.key}>
                {config.renderer(generatedFileState)}
              </Fragment>
            ))
        : null;
    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={250} minSize={250}>
          <div className="generation-result-viewer__side-bar">
            <Panel className="generation-result-viewer__explorer">
              <PanelHeader title="result">
                <PanelHeaderActions>
                  <PanelHeaderActionItem
                    className={clsx(
                      'generation-result-viewer__regenerate-btn',
                      {
                        'generation-result-viewer__regenerate-btn--loading':
                          generatedFileState.generatingAction.isInProgress,
                      },
                    )}
                    disabled={generatedFileState.generatingAction.isInProgress}
                    onClick={regenerate}
                    title="Regenerate"
                  >
                    <RefreshIcon />
                  </PanelHeaderActionItem>
                </PanelHeaderActions>
              </PanelHeader>
              <PanelContent>
                <PanelLoadingIndicator
                  isLoading={generatedFileState.generatingAction.isInProgress}
                />
                {Boolean(
                  generatedFileState.fileSystemState.directoryTreeData,
                ) && (
                  <FileSystemExplorer generatedFileState={generatedFileState} />
                )}
                {Boolean(
                  !generatedFileState.fileSystemState.directoryTreeData,
                ) && (
                  <BlankPanelContent>
                    Generation result not available
                  </BlankPanelContent>
                )}
              </PanelContent>
            </Panel>
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          <div className="panel generation-result-viewer__file">
            <div className="panel__header">
              {fileNode && !(fileNode instanceof FileSystem_Directory) && (
                <div className="panel__header__title">
                  <div className="panel__header__title__label">file</div>
                  <div className="panel__header__title__content generation-result-viewer__file__header__name">
                    {fileNode.name}
                  </div>
                </div>
              )}
              <div className="panel__header__actions">
                {extraFileGenerationResultViewerActions}
              </div>
            </div>
            <PanelContent>
              {fileNode instanceof FileSystem_File && (
                <CodeEditor
                  inputValue={getTextContent(fileNode.content, fileNode.format)}
                  isReadOnly={true}
                  language={getEditorLanguageForFormat(fileNode.format)}
                />
              )}
              {!(fileNode instanceof FileSystem_File) && (
                <BlankPanelContent>No file selected</BlankPanelContent>
              )}
            </PanelContent>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
