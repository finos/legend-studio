/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { config } from 'ApplicationConfig';
import { useEditorStore } from 'Stores/EditorStore';
import { FaChevronDown, FaChevronRight, FaCompress, FaFolder, FaFolderOpen, FaPlus, FaSearch, FaLock, FaExclamationTriangle, FaFileImport } from 'react-icons/fa';
import { ContextMenu } from 'Components/shared/ContextMenu';
import { DropdownMenu } from 'Components/shared/DropdownMenu';
import { ElementIcon, ProjectConfigurationIcon } from 'Components/shared/Icon';
import clsx from 'clsx';
import { getElementTypeLabel, CreateNewElementModal } from './CreateNewElementModal';
import { PanelLoadingIndicator } from 'Components/shared/PanelLoadingIndicator';
import { useDrag } from 'react-dnd';
import { ElementDragSource } from 'Utilities/DnDUtil';
import { isElementTypeSupported } from 'Utilities/DemoUtil';
import { TEST_ID } from 'Const';
import { ACTIVITY_MODE } from 'Stores/EditorConfig';
import { ROOT_PACKAGE_NAME } from 'MetaModelConst';
import { getTreeChildNodes } from 'Utilities/PackageTreeUtil';
import { TreeNodeContainerProps, TreeView } from 'Components/shared/TreeView';
import { PackageTreeNodeData } from 'Utilities/TreeUtil';
import { BlankPanelContent } from 'Components/shared/BlankPanelContent';
import { GenerationTreeNodeData, getFileGenerationChildNodes } from 'Utilities/FileGenerationTreeUtil';
import { FileGenerationTree } from 'Components/editor/edit-panel/element-generation-editor/FileGenerationEditor';
import { useApplicationStore } from 'Stores/ApplicationStore';
import { getElementViewerRoute } from 'Stores/RouterConfig';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';

const isGeneratedPackageTreeNode = (node: PackageTreeNodeData): boolean => node.packageableElement.getRoot().path === ROOT_PACKAGE_NAME.MODEL_GENERATION;
const isSystemPackageTreeNode = (node: PackageTreeNodeData): boolean => node.packageableElement.getRoot().path === ROOT_PACKAGE_NAME.SYSTEM;
const isLegalPackageTreeNode = (node: PackageTreeNodeData): boolean => node.packageableElement.getRoot().path === ROOT_PACKAGE_NAME.LEGAL;
const isDependencyTreeNode = (node: PackageTreeNodeData): boolean => node.packageableElement.getRoot().path === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT;

const ProjectConfig = observer(() => {
  const editorStore = useEditorStore();
  const openConfigurationEditor = (): void => editorStore.openSingletonEditorState(editorStore.projectConfigurationEditorState);
  const isSelected = editorStore.currentEditorState === editorStore.projectConfigurationEditorState
    // if we select non-element like packages, we need to deselect project configuration
    // so maybe a good TODO is to move this to explorer tree state
    && !editorStore.explorerTreeState.selectedNode;
  return (
    <div className={clsx('tree-view__node__container explorer__package-tree__node__container explorer__floating-item',
      { 'explorer__package-tree__node__container--selected': isSelected }
    )}
      onClick={openConfigurationEditor}
    >
      <div className="tree-view__node__icon explorer__package-tree__node__icon">
        <div className="explorer__package-tree__node__icon__type explorer__config__icon"><ProjectConfigurationIcon /></div>
      </div>
      <button
        className="tree-view__node__label explorer__package-tree__node__label"
        tabIndex={-1}
        title={'Project configuration'}
      >config</button>
    </div>
  );
});

const PackageTreeNodeContainer: React.FC<TreeNodeContainerProps<PackageTreeNodeData, {
  disableContextMenu: boolean;
}>> = props => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] = useState(false);
  const { disableContextMenu } = innerProps;
  const dragItem = new ElementDragSource(node.dndType, node);
  const [, dragRef] = useDrag({ item: dragItem });
  const isPackage = node.packageableElement instanceof Package;
  const expandIcon = !isPackage ? <div /> : node.isOpen ? <FaChevronDown /> : <FaChevronRight />;
  const iconPackageColor = isGeneratedPackageTreeNode(node)
    ? 'color--generated'
    : isSystemPackageTreeNode(node) || isLegalPackageTreeNode(node)
      ? 'color--system'
      : isDependencyTreeNode(node)
        ? 'color--dependency'
        : '';
  const nodeIcon = isPackage
    ? node.isOpen ? <div className={iconPackageColor}><FaFolderOpen /></div> :
      <div className={iconPackageColor}><FaFolder /></div>
    : <ElementIcon element={node.packageableElement} />;
  const selectNode: React.MouseEventHandler = event => {
    event.stopPropagation();
    event.preventDefault();
    onNodeSelect?.(node);
  };
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
      <div className={clsx('tree-view__node__container explorer__package-tree__node__container',
        { 'explorer__package-tree__node__container--selected-from-context-menu': !node.isSelected && isSelectedFromContextMenu },
        { 'explorer__package-tree__node__container--selected': node.isSelected }
      )}
        ref={dragRef}
        onClick={selectNode}
        style={{ paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`, display: 'flex' }}
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
        >{node.label}</button>
      </div>
    </ContextMenu>
  );
};

const ExplorerContextMenu = observer((props: {
  node?: PackageTreeNodeData;
}, ref: React.Ref<HTMLDivElement>) => {
  const { node } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const projectId = editorStore.sdlcState.currentProjectId;
  const _package = node
    ? node.packageableElement instanceof Package
      ? node.packageableElement
      : undefined
    : editorStore.graphState.graph.root;
  const deleteElement = (): void => { if (node) { editorStore.deleteElement(node.packageableElement).catch(applicationStore.alertIllegalUnhandledError) } };
  const openElementInViewerMode = (): void => { if (node) { window.open(applicationStore.historyApiClient.createHref({ pathname: getElementViewerRoute(projectId, node.packageableElement.path) })) } };
  const createNewElement = (type: PACKAGEABLE_ELEMENT_TYPE): () => void => (): void => editorStore.newElementState.openModal(type, _package);
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  const elementTypes = [
    PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
    PACKAGEABLE_ELEMENT_TYPE.CLASS,
    PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
    PACKAGEABLE_ELEMENT_TYPE.PROFILE,
    PACKAGEABLE_ELEMENT_TYPE.FUNCTION,
    PACKAGEABLE_ELEMENT_TYPE.MAPPING,
    PACKAGEABLE_ELEMENT_TYPE.CONNECTION,
    PACKAGEABLE_ELEMENT_TYPE.RUNTIME,
    PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION,
    PACKAGEABLE_ELEMENT_TYPE.DIAGRAM,
    PACKAGEABLE_ELEMENT_TYPE.TEXT,
    PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION,
    // NOTE: we can only create package in root
  ]
    .filter(type => (_package !== editorStore.graphState.graph.root) || type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE)
    .filter(type => isElementTypeSupported(type, config.features.BETA__demoMode));

  return (
    <div ref={ref} className="explorer__context-menu" data-testid={TEST_ID.EXPLORER_CONTEXT_MENU}>
      {_package && elementTypes.map(type => (
        <div key={type} className="explorer__context-menu__item" onClick={createNewElement(type)}>
          <div className="explorer__context-menu__item__icon"><ElementIcon type={type} /></div>
          <div className="explorer__context-menu__item__label">Add a new {getElementTypeLabel(type)}</div>
        </div>
      ))}
      {!config.features.BETA__demoMode && node && <div className="explorer__context-menu__item">Rename (WIP)</div>}
      {node && <div className="explorer__context-menu__item" onClick={deleteElement}>Delete</div>}
      {node && !(node.packageableElement instanceof Package) && <div className="explorer__context-menu__item" onClick={openElementInViewerMode}>Open Viewer</div>}
    </div>
  );
}, { forwardRef: true });

const ExplorerDropdownMenu = observer((props: {
}, ref: React.Ref<HTMLDivElement>) => {
  const editorStore = useEditorStore();
  const _package = editorStore.explorerTreeState.getSelectedNodePackage();
  const createNewElement = (type: PACKAGEABLE_ELEMENT_TYPE): () => void => (): void => editorStore.newElementState.openModal(
    type,
    _package
  );
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  const elementTypes = [
    PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
    PACKAGEABLE_ELEMENT_TYPE.CLASS,
    PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
    PACKAGEABLE_ELEMENT_TYPE.PROFILE,
    PACKAGEABLE_ELEMENT_TYPE.FUNCTION,
    PACKAGEABLE_ELEMENT_TYPE.MAPPING,
    PACKAGEABLE_ELEMENT_TYPE.CONNECTION,
    PACKAGEABLE_ELEMENT_TYPE.RUNTIME,
    PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION,
    PACKAGEABLE_ELEMENT_TYPE.DIAGRAM,
    PACKAGEABLE_ELEMENT_TYPE.TEXT,
    PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION,
    // NOTE: we can only create package in root
  ]
    .filter(type => (_package !== editorStore.graphState.graph.root) || type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE)
    .filter(type => isElementTypeSupported(type, config.features.BETA__demoMode));

  return (
    <div ref={ref} className="explorer__context-menu" data-testid={TEST_ID.EXPLORER_CONTEXT_MENU}>
      {elementTypes.map(type => (
        <div key={type} className="explorer__context-menu__item" onClick={createNewElement(type)}>
          <div className="explorer__context-menu__item__icon"><ElementIcon type={type} /></div>
          <div className="explorer__context-menu__item__label">Add a new {getElementTypeLabel(type)}</div>
        </div>
      ))}
    </div>
  );
}, { forwardRef: true });

const LegalExplorerTree = observer(() => {
  const editorStore = useEditorStore();
  const legalTreeData = editorStore.explorerTreeState.getTreeData(ROOT_PACKAGE_NAME.LEGAL);
  const onLegalTreeNodeSelect = (node: PackageTreeNodeData): void => editorStore.explorerTreeState.onTreeNodeSelect(node, legalTreeData, ROOT_PACKAGE_NAME.LEGAL);
  const getLegalTreeChildNodes = (node: PackageTreeNodeData): PackageTreeNodeData[] => getTreeChildNodes(node, legalTreeData);

  return (
    <TreeView
      components={{
        TreeNodeContainer: PackageTreeNodeContainer
      }}
      treeData={legalTreeData}
      onNodeSelect={onLegalTreeNodeSelect}
      getChildNodes={getLegalTreeChildNodes}
      innerProps={{
        disableContextMenu: true
      }}
    />
  );
});

const ExplorerTrees = observer(() => {
  const editorStore = useEditorStore();
  const isInGrammarMode = editorStore.isInGrammarTextMode;
  const openModelLoader = (): void => editorStore.openSingletonEditorState(editorStore.modelLoaderState);
  const graph = editorStore.graphState.graph;
  // Explorer tree
  const treeData = editorStore.explorerTreeState.getTreeData();
  const selectedTreeNode = editorStore.explorerTreeState.selectedNode;
  const onNodeSelect = (node: PackageTreeNodeData): void => editorStore.explorerTreeState.onTreeNodeSelect(node, treeData);
  const getChildNodes = (node: PackageTreeNodeData): PackageTreeNodeData[] => getTreeChildNodes(node, treeData);
  const deselectTreeNode = (): void => {
    if (selectedTreeNode) {
      selectedTreeNode.isSelected = false;
      editorStore.explorerTreeState.setTreeData({ ...treeData });
    }
    editorStore.explorerTreeState.setSelectedNode(undefined);
  };
  // Generated Tree
  const generationTreeData = editorStore.explorerTreeState.getTreeData(ROOT_PACKAGE_NAME.MODEL_GENERATION);
  const onGenerationTreeNodeSelect = (node: PackageTreeNodeData): void => editorStore.explorerTreeState.onTreeNodeSelect(node, generationTreeData, ROOT_PACKAGE_NAME.MODEL_GENERATION);
  const getGenerationTreeChildNodes = (node: PackageTreeNodeData): PackageTreeNodeData[] => getTreeChildNodes(node, generationTreeData);

  // Generated Files Tree
  const generationFileTreeData = editorStore.explorerTreeState.getFileGenerationTreeData();
  const onGenerationFileTreeNodeSelect = (node: GenerationTreeNodeData): void => editorStore.graphState.graphGenerationState.onTreeNodeSelect(node, generationFileTreeData);
  const getGenerationFileTreeChildNodes = (node: GenerationTreeNodeData): GenerationTreeNodeData[] => getFileGenerationChildNodes(node, generationFileTreeData);

  // System Tree
  const systemTreeData = editorStore.explorerTreeState.getTreeData(ROOT_PACKAGE_NAME.SYSTEM);
  const onSystemTreeNodeSelect = (node: PackageTreeNodeData): void => editorStore.explorerTreeState.onTreeNodeSelect(node, systemTreeData, ROOT_PACKAGE_NAME.SYSTEM);
  const getSystemTreeChildNodes = (node: PackageTreeNodeData): PackageTreeNodeData[] => getTreeChildNodes(node, systemTreeData);

  // Dependency Tree
  const dependencyTreeData = editorStore.explorerTreeState.getTreeData(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  const onDependencyTreeSelect = (node: PackageTreeNodeData): void => editorStore.explorerTreeState.onTreeNodeSelect(node, dependencyTreeData, ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  const getDependencyTreeChildNodes = (node: PackageTreeNodeData): PackageTreeNodeData[] => getTreeChildNodes(node, dependencyTreeData);
  const showPackageTrees = treeData.nodes.size || graph.dependencyManager.hasDependencies || config.features.BETA__demoMode;

  return (
    <ContextMenu
      className="explorer__content"
      disabled={isInGrammarMode || editorStore.isInViewerMode}
      content={<ExplorerContextMenu />}
      menuProps={{ elevation: 7 }}
    >
      <div data-testid={TEST_ID.EXPLORER_TREES} onClick={deselectTreeNode}>
        {editorStore.explorerTreeState.isBuilt && showPackageTrees &&
          <>
            {/* MAIN PROJECT TREE */}
            <TreeView
              components={{
                TreeNodeContainer: PackageTreeNodeContainer
              }}
              treeData={treeData}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={{
                disableContextMenu: isInGrammarMode || editorStore.isInViewerMode
              }}
            />
            {!config.features.BETA__demoMode && <ProjectConfig />}
            {/* SYSTEM TREE */}
            {Boolean(editorStore.graphState.systemModel.allElements.length) &&
              <TreeView
                components={{
                  TreeNodeContainer: PackageTreeNodeContainer
                }}
                treeData={systemTreeData}
                onNodeSelect={onSystemTreeNodeSelect}
                getChildNodes={getSystemTreeChildNodes}
                innerProps={{
                  disableContextMenu: true
                }}
              />
            }
            {/* LEGAL TREE (only in demo mode -> temp) */}
            {Boolean(editorStore.graphState.legalModel.allElements.length) && config.features.BETA__demoMode && <LegalExplorerTree />}
            {/* DEPENDENCY TREE */}
            {graph.dependencyManager.hasDependencies && !config.features.BETA__demoMode &&
              <TreeView
                components={{
                  TreeNodeContainer: PackageTreeNodeContainer
                }}
                treeData={dependencyTreeData}
                onNodeSelect={onDependencyTreeSelect}
                getChildNodes={getDependencyTreeChildNodes}
                innerProps={{
                  disableContextMenu: true
                }}
              />
            }
            {/* GENERATION SPECIFICATION */}
            {Boolean(graph.generationModel.allElements.length) && !config.features.BETA__demoMode &&
              <TreeView
                components={{
                  TreeNodeContainer: PackageTreeNodeContainer
                }}
                treeData={generationTreeData}
                onNodeSelect={onGenerationTreeNodeSelect}
                getChildNodes={getGenerationTreeChildNodes}
                innerProps={{
                  disableContextMenu: true
                }}
              />
            }
            <div></div>
            {/* FILE GENERATION SPECIFICATION */}
            {Boolean(editorStore.graphState.graphGenerationState.rootFileDirectory.children.length) && !config.features.BETA__demoMode &&
              <>
                <div className="explorer__content__separator" />
                <FileGenerationTree
                  selectedNode={editorStore.explorerTreeState.selectedNode}
                  directoryTreeData={generationFileTreeData}
                  onNodeSelect={onGenerationFileTreeNodeSelect}
                  getFileElementTreeChildNodes={getGenerationFileTreeChildNodes}
                />
              </>
            }
          </>
        }
        {editorStore.explorerTreeState.isBuilt && !showPackageTrees &&
          <div className="explorer__content--empty">
            <div className="explorer__content--empty__text">Your workspace is empty, you can add elements or load existing model/entites for quick adding</div>
            <button
              className="btn--dark explorer__content--empty__btn"
              onClick={openModelLoader}
            >Open Model Loader</button>
          </div>
        }
      </div>
    </ContextMenu>
  );
});

const ProjectExplorerActionPanel = observer((props: {
  disabled: boolean;
}) => {
  const { disabled } = props;
  const editorStore = useEditorStore();
  const isInGrammarMode = editorStore.isInGrammarTextMode;
  const showSearchModal = (): void => editorStore.setOpenElementSearchModal(true);
  // Explorer tree
  const selectedTreeNode = editorStore.explorerTreeState.selectedNode;
  const collapseTree = (): void => {
    const treeData = editorStore.explorerTreeState.getTreeData();
    treeData.nodes.forEach(node => {
      node.isOpen = false;
    });
    editorStore.explorerTreeState.setTreeData({ ...treeData });
  };
  const isImmutablePackageTreeNode = (node: PackageTreeNodeData): boolean => isGeneratedPackageTreeNode(node) || isSystemPackageTreeNode(node) || isDependencyTreeNode(node);
  const showModelLoader = (): void => editorStore.openState(editorStore.modelLoaderState);

  return (
    <div className="panel__header__actions">
      {!editorStore.isInViewerMode &&
        <button
          className="panel__header__action"
          disabled={disabled}
          title={'Open model loader (F2)'}
          onClick={showModelLoader}
        ><FaFileImport /></button>
      }
      <DropdownMenu
        disabled={disabled || isInGrammarMode || (selectedTreeNode && isImmutablePackageTreeNode(selectedTreeNode))}
        content={<ExplorerDropdownMenu />}
        menuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
          transformOrigin: { vertical: 'top', horizontal: 'left' },
          elevation: 7,
        }}
      >
        {!editorStore.isInViewerMode &&
          <button
            disabled={disabled || isInGrammarMode || (selectedTreeNode && isImmutablePackageTreeNode(selectedTreeNode))}
            className="panel__header__action"
            tabIndex={-1}
            title={'Create new element (Ctrl + Shift + N)'}
          ><FaPlus /></button>
        }
      </DropdownMenu>
      <button
        className="panel__header__action"
        disabled={disabled}
        onClick={collapseTree}
        tabIndex={-1}
        title={'Collapse all'}
      ><FaCompress /></button>
      <button
        className="panel__header__action"
        disabled={disabled}
        tabIndex={-1}
        onClick={showSearchModal}
        title={'Open element (Ctrl + P)'}
      ><FaSearch /></button>
    </div>
  );
});

export const Explorer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const sdlcState = editorStore.sdlcState;
  const isLoading = ((!editorStore.explorerTreeState.isBuilt && !editorStore.isInGrammarTextMode) || editorStore.graphState.isUpdatingGraph) && !editorStore.graphState.graph.failedToBuild;
  const showExplorerTrees = sdlcState.currentProject && sdlcState.currentWorkspace && editorStore.graphState.graph.isBuilt && editorStore.explorerTreeState.isBuilt;
  // conflict resolution
  const showConflictResolutionContent = editorStore.isInConflictResolutionMode && !editorStore.conflictResolutionState.hasResolvedAllConflicts;
  const goToConflictResolutionTab = (): void => editorStore.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
  const buildGrapnInConflictResolutionMode = (): void => {
    editorStore.conflictResolutionState.confirmHasResolvedAllConflicts();
    editorStore.conflictResolutionState.buildGraphInConflictResolutionMode().catch(applicationStore.alertIllegalUnhandledError);
  };

  return (
    <div className="panel explorer">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">EXPLORER</div>
        </div>
        {editorStore.isInViewerMode && <div className="panel__header__title side-bar__header__title__viewer-mode-badge"><FaLock />READ-ONLY</div>}
      </div>
      <div className="panel__content side-bar__content">
        <div className="panel explorer">
          <div className="panel__header explorer__header">
            <div className="panel__header__title">
              <div className="panel__header__title__label">{sdlcState.currentWorkspace && !editorStore.isInViewerMode ? 'workspace' : 'project'}</div>
              <div className="panel__header__title__content">
                {editorStore.isInViewerMode && (sdlcState.currentProject?.name ?? '(unknown) ')}
                {!editorStore.isInViewerMode && (sdlcState.currentWorkspace?.workspaceId ?? '(unknown) ')}
              </div>
            </div>
            <ProjectExplorerActionPanel disabled={!editorStore.explorerTreeState.isBuilt} />
          </div>
          {editorStore.explorerTreeState.isBuilt && <CreateNewElementModal />}
          <div className="panel__content explorer__content__container">
            {showConflictResolutionContent &&
              <>
                {!editorStore.conflictResolutionState.conflicts.length &&
                  <div className="explorer__content--empty">
                    <div className="explorer__content--empty__text">All conflicts have been resolved, you can build the graph now to start testing your changes</div>
                    <button
                      className="btn--dark btn--conflict btn--important explorer__content--empty__btn"
                      onClick={buildGrapnInConflictResolutionMode}
                    >Build Graph</button>
                  </div>
                }
                {Boolean(editorStore.conflictResolutionState.conflicts.length) &&
                  <div className="explorer__content--empty">
                    <div className="explorer__content--empty__text">Can&apos;t build graph as workspace contains merge conflicts, please resolve them before trying to build the graph again</div>
                    <button
                      className="btn--dark btn--conflict btn--important explorer__content--empty__btn"
                      onClick={goToConflictResolutionTab}
                    >Resolve Merge Conflicts</button>
                  </div>
                }
              </>
            }
            {!showConflictResolutionContent &&
              <>
                <PanelLoadingIndicator isLoading={isLoading} />
                {showExplorerTrees && <ExplorerTrees />}
                {!showExplorerTrees && editorStore.graphState.graph.failedToBuild &&
                  <BlankPanelContent>
                    <div className="explorer__content__failure-notice">
                      <div className="explorer__content__failure-notice__icon"><FaExclamationTriangle /></div>
                      <div className="explorer__content__failure-notice__text">Failed to build graph</div>
                    </div>
                  </BlankPanelContent>
                }
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
});
