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

import { Fragment, useRef, useEffect, useState, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type TreeNodeContainerProps,
  clsx,
  Dialog,
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
  ProjectConfigurationIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CompressIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  LockIcon,
  ExclamationTriangleIcon,
  SearchIcon,
  FileImportIcon,
  SettingsEthernetIcon,
} from '@finos/legend-art';
import {
  getElementIcon,
  getElementTypeIcon,
} from '../../shared/ElementIconUtils.js';
import {
  getElementTypeLabel,
  CreateNewElementModal,
} from './CreateNewElementModal.js';
import { useDrag } from 'react-dnd';
import { ElementDragSource } from '../../../stores/shared/DnDUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID.js';
import { ACTIVITY_MODE } from '../../../stores/EditorConfig.js';
import {
  generatePackageableElementTreeNodeDataLabel,
  getTreeChildNodes,
} from '../../../stores/shared/PackageTreeUtils.js';
import type { PackageTreeNodeData } from '../../../stores/shared/TreeUtils.js';
import {
  type FileSystemTreeNodeData,
  getFileSystemChildNodes,
} from '../../../stores/shared/FileSystemTreeUtils.js';
import { FileSystemTree } from '../edit-panel/element-generation-editor/FileSystemViewer.js';
import {
  generateViewEntityRoute,
  generateViewProjectByGAVRoute,
} from '../../../stores/LegendStudioRouter.js';
import {
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  toTitleCase,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  ELEMENT_PATH_DELIMITER,
  ROOT_PACKAGE_NAME,
  Package,
  isValidFullPath,
  isValidPath,
  isGeneratedElement,
  isSystemElement,
  isDependencyElement,
  isElementReadOnly,
  ConcreteFunctionDefinition,
  Class,
  isMainGraphElement,
  getFunctionSignature,
  getFunctionNameWithPath,
  getElementRootPackage,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../../stores/shared/ModelClassifierUtils.js';
import { useLegendStudioApplicationStore } from '../../LegendStudioBaseStoreProvider.js';
import { queryClass } from '../edit-panel/uml-editor/ClassQueryBuilder.js';
import { createViewSDLCProjectHandler } from '../../../stores/DependencyProjectViewerHelper.js';
import {
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';

const ElementRenamer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const explorerTreeState = editorStore.explorerTreeState;
  const element = explorerTreeState.elementToRename;
  const [path, setPath] = useState(
    (element instanceof ConcreteFunctionDefinition
      ? getFunctionNameWithPath(element)
      : element?.path) ?? '',
  );
  const pathInputRef = useRef<HTMLInputElement>(null);
  const changePath: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ): void => setPath(event.target.value);

  const isElementPathNonEmpty = path !== '';
  const isNotTopLevelElement =
    element instanceof Package || path.includes(ELEMENT_PATH_DELIMITER);
  const isValidElementPath =
    (element instanceof Package && isValidPath(path)) || isValidFullPath(path);
  let existingElement = editorStore.graphManagerState.graph.getNullableElement(
    path,
    true,
  );
  existingElement =
    existingElement instanceof Package
      ? isMainGraphElement(existingElement)
        ? existingElement
        : undefined
      : existingElement;
  const isElementUnique = !existingElement || existingElement === element;
  const elementRenameValidationErrorMessage = !isElementPathNonEmpty
    ? `Element path cannot be empty`
    : !isNotTopLevelElement
    ? `Creating top level element is not allowed`
    : !isValidElementPath
    ? `Element path is not valid`
    : !isElementUnique
    ? `Element of the same path already existed`
    : undefined;
  const canRenameElement =
    isElementPathNonEmpty &&
    isNotTopLevelElement &&
    isValidElementPath &&
    isElementUnique;

  const close = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (element && canRenameElement) {
      explorerTreeState.setElementToRename(undefined);
      flowResult(
        editorStore.renameElement(
          element,
          element instanceof ConcreteFunctionDefinition
            ? path + getFunctionSignature(element)
            : path,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }
  };

  const abort = (): void => explorerTreeState.setElementToRename(undefined);
  const onEnter = (): void => pathInputRef.current?.focus();

  useEffect(() => {
    if (element) {
      setPath(
        element instanceof ConcreteFunctionDefinition
          ? getFunctionNameWithPath(element)
          : element.path,
      );
    }
  }, [element]);

  return (
    <Dialog
      open={Boolean(element)}
      onClose={abort}
      TransitionProps={{
        onEnter: onEnter,
      }}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <form className="modal modal--dark search-modal explorer__element-renamer">
        <div className="input-group">
          <input
            className="input-group__input input--dark explorer__element-renamer__input"
            ref={pathInputRef}
            value={path}
            placeholder="Enter element path"
            onChange={changePath}
          />
          {elementRenameValidationErrorMessage && (
            <div className="input-group__error-message">
              {elementRenameValidationErrorMessage}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="explorer__element-renamer__close-btn"
          onClick={close}
        />
      </form>
    </Dialog>
  );
});

const ExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      node?: PackageTreeNodeData | undefined;
      nodeIsImmutable?: boolean | undefined;
    }
  >(function ExplorerContextMenu(props, ref) {
    const { node, nodeIsImmutable } = props;
    const editorStore = useEditorStore();
    const isInGrammarMode = editorStore.isInGrammarTextMode;
    const applicationStore = useLegendStudioApplicationStore();
    const extraExplorerContextMenuItems = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraExplorerContextMenuItemRendererConfigurations?.() ??
          [],
      )
      .map((config) => (
        <Fragment key={config.key}>
          {config.renderer(editorStore, node?.packageableElement)}
        </Fragment>
      ));
    const projectId = editorStore.sdlcState.currentProject?.projectId;
    const isReadOnly = editorStore.isInViewerMode || Boolean(nodeIsImmutable);
    const isDependencyProjectElement =
      node &&
      isDependencyElement(
        node.packageableElement,
        editorStore.graphManagerState.graph,
      );
    const _package = node
      ? node.packageableElement instanceof Package
        ? node.packageableElement
        : undefined
      : editorStore.graphManagerState.graph.root;
    const elementTypes = ([PACKAGEABLE_ELEMENT_TYPE.PACKAGE] as string[])
      .concat(editorStore.getSupportedElementTypes())
      .filter(
        // NOTE: we can only create package in root
        (type) =>
          _package !== editorStore.graphManagerState.graph.root ||
          type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
      );

    // actions
    const buildQuery = editorStore.applicationStore.guardUnhandledError(
      async () => {
        if (node?.packageableElement instanceof Class) {
          await queryClass(node.packageableElement, editorStore);
        }
      },
    );
    const removeElement = (): void => {
      if (node) {
        flowResult(editorStore.deleteElement(node.packageableElement)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const renameElement = (): void => {
      if (node) {
        editorStore.explorerTreeState.setElementToRename(
          node.packageableElement,
        );
      }
    };
    const openElementInViewerMode = (): void => {
      if (node && projectId) {
        applicationStore.navigator.visitAddress(
          applicationStore.navigator.generateAddress(
            generateViewEntityRoute(projectId, node.packageableElement.path),
          ),
        );
      }
    };
    const copyWorkspaceElementLink = (): void => {
      if (node) {
        const dependency =
          editorStore.projectConfigurationEditorState.projectConfiguration?.projectDependencies.find(
            (dep) =>
              dep.projectId ===
              getElementRootPackage(node.packageableElement).name,
          );
        if (dependency) {
          applicationStore
            .copyTextToClipboard(
              applicationStore.navigator.generateAddress(
                editorStore.editorMode.generateDependencyElementLink(
                  node.packageableElement.path,
                  dependency,
                ),
              ),
            )
            .then(() =>
              applicationStore.notifySuccess(
                'Copied workspace element link to clipboard',
              ),
            )
            .catch(applicationStore.alertUnhandledError);
        } else {
          applicationStore
            .copyTextToClipboard(
              applicationStore.navigator.generateAddress(
                editorStore.editorMode.generateElementLink(
                  node.packageableElement.path,
                ),
              ),
            )
            .then(() =>
              applicationStore.notifySuccess(
                'Copied workspace element link to clipboard',
              ),
            )
            .catch(applicationStore.alertUnhandledError);
        }
      }
    };
    const copySDLCProjectLink = (): void => {
      if (node) {
        const dependency =
          editorStore.projectConfigurationEditorState.projectConfiguration?.projectDependencies.find(
            (dep) =>
              dep.projectId ===
              getElementRootPackage(node.packageableElement).name,
          );
        if (dependency) {
          applicationStore
            .copyTextToClipboard(
              applicationStore.navigator.generateAddress(
                generateViewProjectByGAVRoute(
                  guaranteeNonNullable(dependency.groupId),
                  guaranteeNonNullable(dependency.artifactId),
                  dependency.versionId === MASTER_SNAPSHOT_ALIAS
                    ? SNAPSHOT_VERSION_ALIAS
                    : dependency.versionId,
                ),
              ),
            )
            .then(() =>
              applicationStore.notifySuccess(
                'Copied SDLC project link to clipboard',
              ),
            )
            .catch(applicationStore.alertUnhandledError);
        }
      }
    };
    const createNewElement =
      (type: string): (() => void) =>
      (): void =>
        editorStore.newElementState.openModal(type, _package);
    const isDependencyProjectRoot = (): boolean =>
      node?.packageableElement instanceof Package &&
      editorStore.graphManagerState.graph.dependencyManager.roots.includes(
        node.packageableElement,
      );
    const viewProject = (): void => {
      const projectDependency =
        editorStore.projectConfigurationEditorState.projectConfiguration?.projectDependencies.find(
          (dep) => dep.projectId === node?.packageableElement.name,
        );
      if (projectDependency && !projectDependency.isLegacyDependency) {
        applicationStore.navigator.visitAddress(
          applicationStore.navigator.generateAddress(
            generateViewProjectByGAVRoute(
              guaranteeNonNullable(projectDependency.groupId),
              guaranteeNonNullable(projectDependency.artifactId),
              projectDependency.versionId === MASTER_SNAPSHOT_ALIAS
                ? SNAPSHOT_VERSION_ALIAS
                : projectDependency.versionId,
            ),
          ),
        );
      }
    };
    const viewSDLCProject = (): void => {
      const dependency =
        editorStore.projectConfigurationEditorState.projectConfiguration?.projectDependencies.find(
          (dep) => dep.projectId === node?.packageableElement.name,
        );
      if (dependency) {
        createViewSDLCProjectHandler(
          applicationStore,
          editorStore.depotServerClient,
        )(
          guaranteeNonEmptyString(dependency.groupId),
          guaranteeNonEmptyString(dependency.artifactId),
        ).catch(applicationStore.alertUnhandledError);
      }
    };

    if (isDependencyProjectRoot()) {
      return (
        <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
          <MenuContentItem onClick={viewProject}>
            <MenuContentItemLabel>View Project</MenuContentItemLabel>
          </MenuContentItem>
          {node && (
            <MenuContentItem onClick={viewSDLCProject}>
              <MenuContentItemLabel>View SDLC Project</MenuContentItemLabel>
            </MenuContentItem>
          )}
        </MenuContent>
      );
    }

    if (_package && !isReadOnly) {
      return (
        <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
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
          <MenuContentItem onClick={renameElement}>
            <MenuContentItemBlankIcon />
            <MenuContentItemLabel>Rename</MenuContentItemLabel>
          </MenuContentItem>
          {node && (
            <MenuContentItem onClick={removeElement}>
              <MenuContentItemBlankIcon />
              <MenuContentItemLabel>Remove</MenuContentItemLabel>
            </MenuContentItem>
          )}
        </MenuContent>
      );
    }

    return (
      <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
        {!isInGrammarMode && (
          <MenuContentItem onClick={buildQuery}>Query...</MenuContentItem>
        )}
        {extraExplorerContextMenuItems}
        {!isReadOnly && node && (
          <>
            <MenuContentItem onClick={renameElement}>Rename</MenuContentItem>

            <MenuContentItem onClick={removeElement}>Remove</MenuContentItem>
          </>
        )}
        {node && !isInGrammarMode && (
          <>
            {!editorStore.isInViewerMode && !isDependencyProjectElement && (
              <MenuContentItem onClick={openElementInViewerMode}>
                View in Project
              </MenuContentItem>
            )}
            <MenuContentItem onClick={copyWorkspaceElementLink}>
              Copy Link
            </MenuContentItem>
            {isDependencyProjectElement && (
              <MenuContentItem onClick={copySDLCProjectLink}>
                Copy SDLC Project Link
              </MenuContentItem>
            )}
          </>
        )}
      </MenuContent>
    );
  }),
);

const ProjectConfig = observer(() => {
  const editorStore = useEditorStore();
  const openConfigurationEditor = (): void =>
    editorStore.tabManagerState.openTab(
      editorStore.projectConfigurationEditorState,
    );
  const isSelected =
    editorStore.tabManagerState.currentTab ===
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
        title="Project configuration"
      >
        config
      </button>
    </div>
  );
});

const PackageTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      PackageTreeNodeData,
      { disableContextMenu: boolean; isContextImmutable?: boolean }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const editorStore = useEditorStore();
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const { disableContextMenu, isContextImmutable } = innerProps;
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
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    );

    const iconPackageColor = isGeneratedElement(node.packageableElement)
      ? 'color--generated'
      : isSystemElement(node.packageableElement)
      ? 'color--system'
      : isDependencyElement(
          node.packageableElement,
          editorStore.graphManagerState.graph,
        )
      ? 'color--dependency'
      : '';

    const nodeIcon = isPackage ? (
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
      getElementIcon(editorStore, node.packageableElement)
    );
    const selectNode = (): void => onNodeSelect?.(node);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    return (
      <ContextMenu
        content={
          <ExplorerContextMenu
            node={node}
            nodeIsImmutable={isContextImmutable}
          />
        }
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
            {generatePackageableElementTreeNodeDataLabel(
              node.packageableElement,
              node,
            )}
          </button>
        </div>
      </ContextMenu>
    );
  },
);

const ExplorerDropdownMenu = observer(() => {
  const editorStore = useEditorStore();
  const _package = editorStore.explorerTreeState.getSelectedNodePackage();
  const createNewElement =
    (type: string): (() => void) =>
    (): void =>
      editorStore.newElementState.openModal(type, _package);

  const elementTypes = ([PACKAGEABLE_ELEMENT_TYPE.PACKAGE] as string[])
    .concat(
      editorStore.isInGrammarTextMode &&
        !editorStore.grammarModeManagerState.isInDefaultTextMode
        ? ([PACKAGEABLE_ELEMENT_TYPE.PACKAGEABLE_ELEMENT] as string[])
        : [],
    )
    .concat(editorStore.getSupportedElementTypes())
    .filter(
      // NOTE: we can only create package in root
      (type) =>
        _package !== editorStore.graphManagerState.graph.root ||
        type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
    );

  return (
    <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
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
});

const ExplorerTrees = observer(() => {
  const editorStore = useEditorStore();
  const { isInGrammarTextMode, isInViewerMode } = editorStore;
  const openModelImport = (): void =>
    editorStore.tabManagerState.openTab(editorStore.modelImporterState);
  const graph = editorStore.graphManagerState.graph;
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
  const onGenerationFileTreeNodeSelect = (node: FileSystemTreeNodeData): void =>
    editorStore.graphState.graphGenerationState.onTreeNodeSelect(
      node,
      generationFileTreeData,
    );
  const getGenerationFileTreeChildNodes = (
    node: FileSystemTreeNodeData,
  ): FileSystemTreeNodeData[] =>
    getFileSystemChildNodes(node, generationFileTreeData);

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
    getTreeChildNodes(editorStore, node, dependencyTreeData, true);
  const showPackageTrees =
    treeData.nodes.size || graph.dependencyManager.hasDependencies;

  return (
    <ContextMenu
      className="explorer__content"
      disabled={
        isInViewerMode ||
        (editorStore.isInGrammarTextMode &&
          !editorStore.grammarModeManagerState.isInDefaultTextMode)
      }
      content={<ExplorerContextMenu />}
      menuProps={{ elevation: 7 }}
    >
      <div data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_TREES}>
        {editorStore.explorerTreeState.buildState.hasCompleted &&
          showPackageTrees && (
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
                    isInGrammarTextMode &&
                    editorStore.grammarModeManagerState.isInDefaultTextMode,
                }}
              />
              <ElementRenamer />
              {editorStore.projectConfigurationEditorState
                .projectConfiguration && <ProjectConfig />}
              {/* SYSTEM TREE */}
              {Boolean(
                editorStore.graphManagerState.systemModel.allOwnElements.length,
              ) && (
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
              {graph.dependencyManager.hasDependencies && (
                <TreeView
                  components={{
                    TreeNodeContainer: PackageTreeNodeContainer,
                  }}
                  treeData={dependencyTreeData}
                  onNodeSelect={onDependencyTreeSelect}
                  getChildNodes={getDependencyTreeChildNodes}
                  innerProps={{
                    disableContextMenu: isInGrammarTextMode,
                    isContextImmutable: true,
                  }}
                />
              )}
              {/* GENERATION SPECIFICATION */}
              {Boolean(graph.generationModel.allOwnElements.length) && (
                <TreeView
                  components={{
                    TreeNodeContainer: PackageTreeNodeContainer,
                  }}
                  treeData={generationTreeData}
                  onNodeSelect={onGenerationTreeNodeSelect}
                  getChildNodes={getGenerationTreeChildNodes}
                  innerProps={{
                    disableContextMenu: isInGrammarTextMode,
                    isContextImmutable: true,
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
                  <FileSystemTree
                    selectedNode={editorStore.explorerTreeState.selectedNode}
                    directoryTreeData={generationFileTreeData}
                    onNodeSelect={onGenerationFileTreeNodeSelect}
                    getFileElementTreeChildNodes={
                      getGenerationFileTreeChildNodes
                    }
                  />
                </>
              )}
            </>
          )}
        {editorStore.explorerTreeState.buildState.hasCompleted &&
          !showPackageTrees && (
            <div className="explorer__content--empty">
              <div className="explorer__content--empty__text">
                Your workspace is empty, you can add elements or load existing
                model/entites for quick adding
              </div>
              <button
                className="btn--dark explorer__content--empty__btn"
                onClick={openModelImport}
              >
                Open Model Importer
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
  const showModelImporter = (): void =>
    editorStore.tabManagerState.openTab(editorStore.modelImporterState);
  const openConfigurationEditor = (): void =>
    editorStore.tabManagerState.openTab(
      editorStore.projectConfigurationEditorState,
    );

  return (
    <div className="panel__header__actions">
      {!editorStore.isInViewerMode && (
        <button
          className="panel__header__action"
          disabled={disabled}
          title="Open Model Importer (F2)"
          onClick={showModelImporter}
        >
          <FileImportIcon />
        </button>
      )}
      <button
        className="panel__header__action panel__header__action--config"
        disabled={disabled}
        title="Project Configuration Panel"
        onClick={openConfigurationEditor}
      >
        <SettingsEthernetIcon />
      </button>
      {!editorStore.isInViewerMode && (
        <DropdownMenu
          className="panel__header__action"
          title="New Element... (Ctrl + Shift + N)"
          disabled={
            disabled ||
            (editorStore.isInGrammarTextMode &&
              editorStore.grammarModeManagerState.isInDefaultTextMode) ||
            (selectedTreeNode &&
              isElementReadOnly(selectedTreeNode.packageableElement))
          }
          content={<ExplorerDropdownMenu />}
          menuProps={{
            anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
            transformOrigin: { vertical: 'top', horizontal: 'left' },
            elevation: 7,
          }}
        >
          <PlusIcon />
        </DropdownMenu>
      )}
      <button
        className="panel__header__action"
        disabled={disabled}
        onClick={collapseTree}
        tabIndex={-1}
        title="Collapse All"
      >
        <CompressIcon />
      </button>
      <button
        className="panel__header__action"
        disabled={disabled}
        tabIndex={-1}
        onClick={showSearchModal}
        title="Open Element... (Ctrl + P)"
      >
        <SearchIcon />
      </button>
    </div>
  );
});

export const Explorer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const sdlcState = editorStore.sdlcState;
  const isLoading =
    ((!editorStore.explorerTreeState.buildState.hasCompleted &&
      !editorStore.isInGrammarTextMode) ||
      editorStore.graphState.isUpdatingGraph) &&
    !editorStore.graphManagerState.graphBuildState.hasFailed;
  const showExplorerTrees =
    editorStore.graphManagerState.graphBuildState.hasSucceeded &&
    editorStore.explorerTreeState.buildState.hasCompleted &&
    // NOTE: if not in viewer mode, we would only show the explorer tree
    // when graph is properly observed to make sure edit after that can trigger
    // change detection. Realistically, this doesn't not affect user as they
    // don't edit elements that fast in form mode, but this could throw off
    // test runner
    (editorStore.isInViewerMode ||
      editorStore.isInGrammarTextMode ||
      editorStore.changeDetectionState.graphObserveState.hasSucceeded);
  // conflict resolution
  const showConflictResolutionContent =
    editorStore.isInConflictResolutionMode &&
    !editorStore.conflictResolutionState.hasResolvedAllConflicts;
  const goToConflictResolutionTab = (): void =>
    editorStore.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
  const buildGrapnInConflictResolutionMode = (): void => {
    editorStore.conflictResolutionState.confirmHasResolvedAllConflicts();
    flowResult(
      editorStore.conflictResolutionState.buildGraphInConflictResolutionMode(),
    ).catch(applicationStore.alertUnhandledError);
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
            <LockIcon />
            READ-ONLY
          </div>
        )}
      </div>
      <div className="panel__content side-bar__content">
        <div className="panel explorer">
          <div className="panel__header explorer__header">
            <div className="panel__header__title">
              {sdlcState.currentProject && (
                <>
                  <div className="panel__header__title__label">
                    {sdlcState.currentWorkspace && !editorStore.isInViewerMode
                      ? 'workspace'
                      : 'project'}
                  </div>
                  <div className="panel__header__title__content">
                    {editorStore.isInViewerMode &&
                      sdlcState.currentProject.name}
                    {!editorStore.isInViewerMode &&
                      (sdlcState.currentWorkspace?.workspaceId ?? '(unknown) ')}
                  </div>
                </>
              )}
            </div>
            <ProjectExplorerActionPanel
              disabled={!editorStore.explorerTreeState.buildState.hasCompleted}
            />
          </div>
          {editorStore.explorerTreeState.buildState.hasCompleted && (
            <CreateNewElementModal />
          )}
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
                  !editorStore.graphManagerState.graphBuildState.hasFailed && (
                    <div className="explorer__content__progress-msg">
                      {editorStore.initState.message ??
                        editorStore.graphManagerState.systemBuildState
                          .message ??
                        editorStore.graphManagerState.dependenciesBuildState
                          .message ??
                        editorStore.graphManagerState.generationsBuildState
                          .message ??
                        editorStore.graphManagerState.graphBuildState.message ??
                        editorStore.changeDetectionState.graphObserveState
                          .message}
                    </div>
                  )}
                {!showExplorerTrees &&
                  editorStore.graphManagerState.graphBuildState.hasFailed && (
                    <BlankPanelContent>
                      <div className="explorer__content__failure-notice">
                        <div className="explorer__content__failure-notice__icon">
                          <ExclamationTriangleIcon />
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
