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

import { Fragment, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../stores/EditorStore';
import {
  FaChevronDown,
  FaChevronRight,
  FaCompress,
  FaFolder,
  FaFolderOpen,
  FaPlus,
  FaSearch,
  FaLock,
  FaExclamationTriangle,
  FaFileImport,
} from 'react-icons/fa';
import {
  clsx,
  MenuContent,
  MenuContentItem,
  MenuContentItemBlankIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  ContextMenu,
  DropdownMenu,
  PanelLoadingIndicator,
  BlankPanelContent,
  TreeView,
} from '@finos/legend-studio-components';
import type { TreeNodeContainerProps } from '@finos/legend-studio-components';
import {
  getElementIcon,
  getElementTypeIcon,
  ProjectConfigurationIcon,
} from '../../shared/Icon';
import {
  getElementTypeLabel,
  CreateNewElementModal,
} from './CreateNewElementModal';
import { useDrag } from 'react-dnd';
import { ElementDragSource } from '../../../stores/shared/DnDUtil';
import { CORE_TEST_ID } from '../../../const';
import { ACTIVITY_MODE } from '../../../stores/EditorConfig';
import { ROOT_PACKAGE_NAME } from '../../../models/MetaModelConst';
import { getTreeChildNodes } from '../../../stores/shared/PackageTreeUtil';
import type { PackageTreeNodeData } from '../../../stores/shared/TreeUtil';
import type { GenerationTreeNodeData } from '../../../stores/shared/FileGenerationTreeUtil';
import { getFileGenerationChildNodes } from '../../../stores/shared/FileGenerationTreeUtil';
import { FileGenerationTree } from '../../editor/edit-panel/element-generation-editor/FileGenerationEditor';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import { generateViewEntityRoute } from '../../../stores/Router';
import { isNonNullable, toTitleCase } from '@finos/legend-studio-shared';
import { Package } from '../../../models/metamodels/pure/model/packageableElements/domain/Package';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';

const isGeneratedPackageTreeNode = (node: PackageTreeNodeData): boolean =>
  node.packageableElement.getRoot().path === ROOT_PACKAGE_NAME.MODEL_GENERATION;
const isSystemPackageTreeNode = (node: PackageTreeNodeData): boolean =>
  node.packageableElement.getRoot().path === ROOT_PACKAGE_NAME.SYSTEM;
const isDependencyTreeNode = (node: PackageTreeNodeData): boolean =>
  node.packageableElement.getRoot().path ===
  ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT;

const ExplorerContextMenu = observer(
  (
    props: {
      node?: PackageTreeNodeData;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { node } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const extraExplorerContextMenuItems =
      editorStore.applicationStore.pluginManager
        .getEditorPlugins()
        .flatMap(
          (plugin) =>
            plugin.getExtraExplorerContextMenuItemRendererConfigurations?.() ??
            [],
        )
        .filter(isNonNullable)
        .map((config) => (
          <Fragment key={config.key}>
            {config.renderer(editorStore, node?.packageableElement)}
          </Fragment>
        ));
    const projectId = editorStore.sdlcState.currentProjectId;
    const _package = node
      ? node.packageableElement instanceof Package
        ? node.packageableElement
        : undefined
      : editorStore.graphState.graph.root;
    const deleteElement = (): void => {
      if (node) {
        editorStore
          .deleteElement(node.packageableElement)
          .catch(applicationStore.alertIllegalUnhandledError);
      }
    };
    const openElementInViewerMode = (): void => {
      if (node) {
        window.open(
          applicationStore.historyApiClient.createHref({
            pathname: generateViewEntityRoute(
              applicationStore.config.sdlcServerKey,
              projectId,
              node.packageableElement.path,
            ),
          }),
        );
      }
    };
    const getElementLinkInViewerMode = (): void => {
      if (node) {
        applicationStore
          .copyTextToClipboard(
            `${
              window.location.origin
            }${applicationStore.historyApiClient.createHref({
              pathname: generateViewEntityRoute(
                applicationStore.config.sdlcServerKey,
                projectId,
                node.packageableElement.path,
              ),
            })}`,
          )
          .then(() =>
            applicationStore.notifySuccess('Copied element link to clipboard'),
          )
          .catch(applicationStore.alertIllegalUnhandledError);
      }
    };

    const createNewElement =
      (type: string): (() => void) =>
      (): void =>
        editorStore.newElementState.openModal(type, _package);

    const elementTypes = ([PACKAGEABLE_ELEMENT_TYPE.PACKAGE] as string[])
      .concat(editorStore.getSupportedElementTypes())
      .filter(
        // NOTE: we can only create package in root
        (type) =>
          _package !== editorStore.graphState.graph.root ||
          type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
      );

    if (_package) {
      return (
        <MenuContent data-testid={CORE_TEST_ID.EXPLORER_CONTEXT_MENU}>
          {elementTypes.map((type) => (
            <MenuContentItem key={type} onClick={createNewElement(type)}>
              <MenuContentItemIcon>
                {getElementTypeIcon(editorStore, type)}
              </MenuContentItemIcon>
              <MenuContentItemLabel>
                New {toTitleCase(getElementTypeLabel(editorStore, type))}...
              </MenuContentItemLabel>
            </MenuContentItem>
          ))}
          <MenuContentItem>
            <MenuContentItemBlankIcon />
            <MenuContentItemLabel>Rename (WIP)</MenuContentItemLabel>
          </MenuContentItem>
          {node && (
            <MenuContentItem onClick={deleteElement}>
              <MenuContentItemBlankIcon />
              <MenuContentItemLabel>Delete</MenuContentItemLabel>
            </MenuContentItem>
          )}
        </MenuContent>
      );
    }
    return (
      <MenuContent data-testid={CORE_TEST_ID.EXPLORER_CONTEXT_MENU}>
        {extraExplorerContextMenuItems}
        <MenuContentItem>Rename (WIP)</MenuContentItem>
        {node && (
          <MenuContentItem onClick={deleteElement}>Delete</MenuContentItem>
        )}
        {node && (
          <MenuContentItem onClick={openElementInViewerMode}>
            View in Project
          </MenuContentItem>
        )}
        {node && (
          <MenuContentItem onClick={getElementLinkInViewerMode}>
            Copy Link
          </MenuContentItem>
        )}
      </MenuContent>
    );
  },
  { forwardRef: true },
);

const ProjectConfig = observer(() => {
  const editorStore = useEditorStore();
  const openConfigurationEditor = (): void =>
    editorStore.openSingletonEditorState(
      editorStore.projectConfigurationEditorState,
    );
  const isSelected =
    editorStore.currentEditorState ===
      editorStore.projectConfigurationEditorState &&
    // if we select non-element like packages, we need to deselect project configuration
    // so maybe a good TODO is to move this to explorer tree state
    !editorStore.explorerTreeState.selectedNode;
  return (
    <div
      className={clsx(
        'tree-view__node__container explorer__package-tree__node__container explorer__floating-item',
        { 'explorer__package-tree__node__container--selected': isSelected },
      )}
      onClick={openConfigurationEditor}
    >
      <div className="tree-view__node__icon explorer__package-tree__node__icon">
        <div className="explorer__package-tree__node__icon__type explorer__config__icon">
          <ProjectConfigurationIcon />
        </div>
      </div>
      <button
        className="tree-view__node__label explorer__package-tree__node__label"
        tabIndex={-1}
        title={'Project configuration'}
      >
        config
      </button>
    </div>
  );
});

type PackageTreeNodeContainerProps = TreeNodeContainerProps<
  PackageTreeNodeData,
  { disableContextMenu: boolean }
>;

const PackageTreeNodeContainer = observer(
  (props: PackageTreeNodeContainerProps) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const editorStore = useEditorStore();
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const { disableContextMenu } = innerProps;
    const [, dragRef] = useDrag(
      () => ({
        type: node.dndType,
        item: new ElementDragSource(node),
      }),
      [node],
    );
    const isPackage = node.packageableElement instanceof Package;
    const expandIcon = !isPackage ? (
      <div />
    ) : node.isOpen ? (
      <FaChevronDown />
    ) : (
      <FaChevronRight />
    );
    const iconPackageColor = isGeneratedPackageTreeNode(node)
      ? 'color--generated'
      : isSystemPackageTreeNode(node)
      ? 'color--system'
      : isDependencyTreeNode(node)
      ? 'color--dependency'
      : '';
    const nodeIcon = isPackage ? (
      node.isOpen ? (
        <div className={iconPackageColor}>
          <FaFolderOpen />
        </div>
      ) : (
        <div className={iconPackageColor}>
          <FaFolder />
        </div>
      )
    ) : (
      getElementIcon(editorStore, node.packageableElement)
    );
    const selectNode = (): void => onNodeSelect?.(node);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    return (
      <ContextMenu
        content={<ExplorerContextMenu node={node} />}
        disabled={disableContextMenu}
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'tree-view__node__container explorer__package-tree__node__container',
            {
              'menu__trigger--on-menu-open':
                !node.isSelected && isSelectedFromContextMenu,
            },
            {
              'explorer__package-tree__node__container--selected':
                node.isSelected,
            },
          )}
          ref={dragRef}
          onClick={selectNode}
          style={{
            paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
            display: 'flex',
          }}
        >
          <div className="tree-view__node__icon explorer__package-tree__node__icon">
            <div className="explorer__package-tree__node__icon__expand">
              {expandIcon}
            </div>
            <div className="explorer__package-tree__node__icon__type">
              {nodeIcon}
            </div>
          </div>
          <button
            className="tree-view__node__label explorer__package-tree__node__label"
            tabIndex={-1}
            title={node.packageableElement.path}
          >
            {node.label}
          </button>
        </div>
      </ContextMenu>
    );
  },
);

const ExplorerDropdownMenu = observer(
  (props: {}, ref: React.Ref<HTMLDivElement>) => {
    const editorStore = useEditorStore();
    const _package = editorStore.explorerTreeState.getSelectedNodePackage();
    const createNewElement =
      (type: string): (() => void) =>
      (): void =>
        editorStore.newElementState.openModal(type, _package);

    const elementTypes = ([PACKAGEABLE_ELEMENT_TYPE.PACKAGE] as string[])
      .concat(editorStore.getSupportedElementTypes())
      .filter(
        // NOTE: we can only create package in root
        (type) =>
          _package !== editorStore.graphState.graph.root ||
          type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
      );

    return (
      <MenuContent data-testid={CORE_TEST_ID.EXPLORER_CONTEXT_MENU}>
        {elementTypes.map((type) => (
          <MenuContentItem key={type} onClick={createNewElement(type)}>
            <MenuContentItemIcon>
              {getElementTypeIcon(editorStore, type)}
            </MenuContentItemIcon>
            <MenuContentItemLabel>
              New {toTitleCase(getElementTypeLabel(editorStore, type))}...
            </MenuContentItemLabel>
          </MenuContentItem>
        ))}
      </MenuContent>
    );
  },
  { forwardRef: true },
);

const ExplorerTrees = observer(() => {
  const editorStore = useEditorStore();
  const config = editorStore.applicationStore.config;
  const isInGrammarMode = editorStore.isInGrammarTextMode;
  const openModelLoader = (): void =>
    editorStore.openSingletonEditorState(editorStore.modelLoaderState);
  const graph = editorStore.graphState.graph;
  // Explorer tree
  const treeData = editorStore.explorerTreeState.getTreeData();
  const selectedTreeNode = editorStore.explorerTreeState.selectedNode;
  const onNodeSelect = (node: PackageTreeNodeData): void =>
    editorStore.explorerTreeState.onTreeNodeSelect(node, treeData);
  const getChildNodes = (node: PackageTreeNodeData): PackageTreeNodeData[] =>
    getTreeChildNodes(editorStore, node, treeData);
  const deselectTreeNode = (): void => {
    if (selectedTreeNode) {
      selectedTreeNode.isSelected = false;
      editorStore.explorerTreeState.setTreeData({ ...treeData });
    }
    editorStore.explorerTreeState.setSelectedNode(undefined);
  };
  // Generated Tree
  const generationTreeData = editorStore.explorerTreeState.getTreeData(
    ROOT_PACKAGE_NAME.MODEL_GENERATION,
  );
  const onGenerationTreeNodeSelect = (node: PackageTreeNodeData): void =>
    editorStore.explorerTreeState.onTreeNodeSelect(
      node,
      generationTreeData,
      ROOT_PACKAGE_NAME.MODEL_GENERATION,
    );
  const getGenerationTreeChildNodes = (
    node: PackageTreeNodeData,
  ): PackageTreeNodeData[] =>
    getTreeChildNodes(editorStore, node, generationTreeData);

  // Generated Files Tree
  const generationFileTreeData =
    editorStore.explorerTreeState.getFileGenerationTreeData();
  const onGenerationFileTreeNodeSelect = (node: GenerationTreeNodeData): void =>
    editorStore.graphState.graphGenerationState.onTreeNodeSelect(
      node,
      generationFileTreeData,
    );
  const getGenerationFileTreeChildNodes = (
    node: GenerationTreeNodeData,
  ): GenerationTreeNodeData[] =>
    getFileGenerationChildNodes(node, generationFileTreeData);

  // System Tree
  const systemTreeData = editorStore.explorerTreeState.getTreeData(
    ROOT_PACKAGE_NAME.SYSTEM,
  );
  const onSystemTreeNodeSelect = (node: PackageTreeNodeData): void =>
    editorStore.explorerTreeState.onTreeNodeSelect(
      node,
      systemTreeData,
      ROOT_PACKAGE_NAME.SYSTEM,
    );
  const getSystemTreeChildNodes = (
    node: PackageTreeNodeData,
  ): PackageTreeNodeData[] =>
    getTreeChildNodes(editorStore, node, systemTreeData);

  // Dependency Tree
  const dependencyTreeData = editorStore.explorerTreeState.getTreeData(
    ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
  );
  const onDependencyTreeSelect = (node: PackageTreeNodeData): void =>
    editorStore.explorerTreeState.onTreeNodeSelect(
      node,
      dependencyTreeData,
      ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
    );
  const getDependencyTreeChildNodes = (
    node: PackageTreeNodeData,
  ): PackageTreeNodeData[] =>
    getTreeChildNodes(editorStore, node, dependencyTreeData);
  const showPackageTrees =
    treeData.nodes.size || graph.dependencyManager.hasDependencies;

  return (
    <ContextMenu
      className="explorer__content"
      disabled={isInGrammarMode || editorStore.isInViewerMode}
      content={<ExplorerContextMenu />}
      menuProps={{ elevation: 7 }}
    >
      <div data-testid={CORE_TEST_ID.EXPLORER_TREES}>
        {editorStore.explorerTreeState.isBuilt && showPackageTrees && (
          <>
            {/* MAIN PROJECT TREE */}
            <TreeView
              components={{
                TreeNodeContainer: PackageTreeNodeContainer,
              }}
              treeData={treeData}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={{
                disableContextMenu:
                  isInGrammarMode || editorStore.isInViewerMode,
              }}
            />
            {!config.options.TEMPORARY__disableSDLCProjectStructureSupport && (
              <ProjectConfig />
            )}
            {/* SYSTEM TREE */}
            {Boolean(editorStore.graphState.systemModel.allElements.length) && (
              <TreeView
                components={{
                  TreeNodeContainer: PackageTreeNodeContainer,
                }}
                treeData={systemTreeData}
                onNodeSelect={onSystemTreeNodeSelect}
                getChildNodes={getSystemTreeChildNodes}
                innerProps={{
                  disableContextMenu: true,
                }}
              />
            )}
            {/* DEPENDENCY TREE */}
            {graph.dependencyManager.hasDependencies &&
              !config.options.TEMPORARY__disableSDLCProjectStructureSupport && (
                <TreeView
                  components={{
                    TreeNodeContainer: PackageTreeNodeContainer,
                  }}
                  treeData={dependencyTreeData}
                  onNodeSelect={onDependencyTreeSelect}
                  getChildNodes={getDependencyTreeChildNodes}
                  innerProps={{
                    disableContextMenu: true,
                  }}
                />
              )}
            {/* GENERATION SPECIFICATION */}
            {Boolean(graph.generationModel.allElements.length) && (
              <TreeView
                components={{
                  TreeNodeContainer: PackageTreeNodeContainer,
                }}
                treeData={generationTreeData}
                onNodeSelect={onGenerationTreeNodeSelect}
                getChildNodes={getGenerationTreeChildNodes}
                innerProps={{
                  disableContextMenu: true,
                }}
              />
            )}
            <div />
            {/* FILE GENERATION SPECIFICATION */}
            {Boolean(
              editorStore.graphState.graphGenerationState.rootFileDirectory
                .children.length,
            ) && (
              <>
                <div className="explorer__content__separator" />
                <FileGenerationTree
                  selectedNode={editorStore.explorerTreeState.selectedNode}
                  directoryTreeData={generationFileTreeData}
                  onNodeSelect={onGenerationFileTreeNodeSelect}
                  getFileElementTreeChildNodes={getGenerationFileTreeChildNodes}
                />
              </>
            )}
          </>
        )}
        {editorStore.explorerTreeState.isBuilt && !showPackageTrees && (
          <div className="explorer__content--empty">
            <div className="explorer__content--empty__text">
              Your workspace is empty, you can add elements or load existing
              model/entites for quick adding
            </div>
            <button
              className="btn--dark explorer__content--empty__btn"
              onClick={openModelLoader}
            >
              Open Model Loader
            </button>
          </div>
        )}
      </div>
      <div className="explorer__deselector" onClick={deselectTreeNode} />
    </ContextMenu>
  );
});

const ProjectExplorerActionPanel = observer((props: { disabled: boolean }) => {
  const { disabled } = props;
  const editorStore = useEditorStore();
  const isInGrammarMode = editorStore.isInGrammarTextMode;
  const showSearchModal = (): void =>
    editorStore.searchElementCommandState.open();
  // Explorer tree
  const selectedTreeNode = editorStore.explorerTreeState.selectedNode;
  const collapseTree = (): void => {
    const treeData = editorStore.explorerTreeState.getTreeData();
    treeData.nodes.forEach((node) => {
      node.isOpen = false;
    });
    editorStore.explorerTreeState.setTreeData({ ...treeData });
  };
  const isImmutablePackageTreeNode = (node: PackageTreeNodeData): boolean =>
    isGeneratedPackageTreeNode(node) ||
    isSystemPackageTreeNode(node) ||
    isDependencyTreeNode(node);
  const showModelLoader = (): void =>
    editorStore.openState(editorStore.modelLoaderState);

  return (
    <div className="panel__header__actions">
      {!editorStore.isInViewerMode && (
        <button
          className="panel__header__action"
          disabled={disabled}
          title="Open Model Loader (F2)"
          onClick={showModelLoader}
        >
          <FaFileImport />
        </button>
      )}
      <DropdownMenu
        disabled={
          disabled ||
          isInGrammarMode ||
          (selectedTreeNode && isImmutablePackageTreeNode(selectedTreeNode))
        }
        content={<ExplorerDropdownMenu />}
        menuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
          transformOrigin: { vertical: 'top', horizontal: 'left' },
          elevation: 7,
        }}
      >
        {!editorStore.isInViewerMode && (
          <button
            disabled={
              disabled ||
              isInGrammarMode ||
              (selectedTreeNode && isImmutablePackageTreeNode(selectedTreeNode))
            }
            className="panel__header__action"
            tabIndex={-1}
            title="New Element... (Ctrl + Shift + N)"
          >
            <FaPlus />
          </button>
        )}
      </DropdownMenu>
      <button
        className="panel__header__action"
        disabled={disabled}
        onClick={collapseTree}
        tabIndex={-1}
        title="Collapse All"
      >
        <FaCompress />
      </button>
      <button
        className="panel__header__action"
        disabled={disabled}
        tabIndex={-1}
        onClick={showSearchModal}
        title="Open Element... (Ctrl + P)"
      >
        <FaSearch />
      </button>
    </div>
  );
});

export const Explorer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const sdlcState = editorStore.sdlcState;
  const isLoading =
    ((!editorStore.explorerTreeState.isBuilt &&
      !editorStore.isInGrammarTextMode) ||
      editorStore.graphState.isUpdatingGraph) &&
    !editorStore.graphState.graph.failedToBuild;
  const showExplorerTrees =
    sdlcState.currentProject &&
    sdlcState.currentWorkspace &&
    editorStore.graphState.graph.isBuilt &&
    editorStore.explorerTreeState.isBuilt;
  // conflict resolution
  const showConflictResolutionContent =
    editorStore.isInConflictResolutionMode &&
    !editorStore.conflictResolutionState.hasResolvedAllConflicts;
  const goToConflictResolutionTab = (): void =>
    editorStore.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
  const buildGrapnInConflictResolutionMode = (): void => {
    editorStore.conflictResolutionState.confirmHasResolvedAllConflicts();
    editorStore.conflictResolutionState
      .buildGraphInConflictResolutionMode()
      .catch(applicationStore.alertIllegalUnhandledError);
  };

  return (
    <div className="panel explorer">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            EXPLORER
          </div>
        </div>
        {editorStore.isInViewerMode && (
          <div className="panel__header__title side-bar__header__title__viewer-mode-badge">
            <FaLock />
            READ-ONLY
          </div>
        )}
      </div>
      <div className="panel__content side-bar__content">
        <div className="panel explorer">
          <div className="panel__header explorer__header">
            <div className="panel__header__title">
              <div className="panel__header__title__label">
                {sdlcState.currentWorkspace && !editorStore.isInViewerMode
                  ? 'workspace'
                  : 'project'}
              </div>
              <div className="panel__header__title__content">
                {editorStore.isInViewerMode &&
                  (sdlcState.currentProject?.name ?? '(unknown) ')}
                {!editorStore.isInViewerMode &&
                  (sdlcState.currentWorkspace?.workspaceId ?? '(unknown) ')}
              </div>
            </div>
            <ProjectExplorerActionPanel
              disabled={!editorStore.explorerTreeState.isBuilt}
            />
          </div>
          {editorStore.explorerTreeState.isBuilt && <CreateNewElementModal />}
          <div className="panel__content explorer__content__container">
            {showConflictResolutionContent && (
              <>
                {!editorStore.conflictResolutionState.conflicts.length && (
                  <div className="explorer__content--empty">
                    <div className="explorer__content--empty__text">
                      All conflicts have been resolved, you can build the graph
                      now to start testing your changes
                    </div>
                    <button
                      className="btn--dark btn--conflict btn--important explorer__content--empty__btn"
                      onClick={buildGrapnInConflictResolutionMode}
                    >
                      Build Graph
                    </button>
                  </div>
                )}
                {Boolean(
                  editorStore.conflictResolutionState.conflicts.length,
                ) && (
                  <div className="explorer__content--empty">
                    <div className="explorer__content--empty__text">
                      Can&apos;t build graph as workspace contains merge
                      conflicts, please resolve them before trying to build the
                      graph again
                    </div>
                    <button
                      className="btn--dark btn--conflict btn--important explorer__content--empty__btn"
                      onClick={goToConflictResolutionTab}
                    >
                      Resolve Merge Conflicts
                    </button>
                  </div>
                )}
              </>
            )}
            {!showConflictResolutionContent && (
              <>
                <PanelLoadingIndicator isLoading={isLoading} />
                {showExplorerTrees && <ExplorerTrees />}
                {!showExplorerTrees &&
                  editorStore.graphState.graph.failedToBuild && (
                    <BlankPanelContent>
                      <div className="explorer__content__failure-notice">
                        <div className="explorer__content__failure-notice__icon">
                          <FaExclamationTriangle />
                        </div>
                        <div className="explorer__content__failure-notice__text">
                          Failed to build graph
                        </div>
                      </div>
                    </BlankPanelContent>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
