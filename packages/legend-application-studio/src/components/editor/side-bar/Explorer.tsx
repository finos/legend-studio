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
  MenuContentDivider,
  createFilter,
  CustomSelectorInput,
  type SelectComponent,
  LevelDownIcon,
  CaretDownIcon,
  PURE_ClassIcon,
  CodeIcon,
} from '@finos/legend-art';
import { getElementIcon, getElementTypeIcon } from '../../ElementIconUtils.js';
import {
  getElementTypeLabel,
  CreateNewElementModal,
} from './CreateNewElementModal.js';
import { useDrag } from 'react-dnd';
import { ElementDragSource } from '../../../stores/editor/utils/DnDUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import {
  ACTIVITY_MODE,
  GRAPH_EDITOR_MODE,
} from '../../../stores/editor/EditorConfig.js';
import { getTreeChildNodes } from '../../../stores/editor/utils/PackageTreeUtils.js';
import type { PackageTreeNodeData } from '../../../stores/editor/utils/TreeUtils.js';
import {
  type FileSystemTreeNodeData,
  getFileSystemChildNodes,
} from '../../../stores/editor/utils/FileSystemTreeUtils.js';
import { FileSystemTree } from '../editor-group/element-generation-editor/FileSystemViewer.js';
import {
  generateViewEntityRoute,
  generateViewProjectByGAVRoute,
} from '../../../__lib__/LegendStudioNavigation.js';
import {
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  isNonNullable,
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
import {
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../../stores/editor/utils/ModelClassifierUtils.js';
import { useLegendStudioApplicationStore } from '../../LegendStudioFrameworkProvider.js';
import { queryClass } from '../editor-group/uml-editor/ClassQueryBuilder.js';
import { createViewSDLCProjectHandler } from '../../../stores/editor/DependencyProjectViewerHelper.js';
import {
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  CLASS_MOCK_DATA_GENERATION_FORMAT,
  createMockDataForClassWithFormat,
} from '../../../stores/editor/utils/MockDataUtils.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';

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
  const [canRenameElement, setCanRenameElement] = useState(false);
  const [
    elementRenameValidationErrorMessage,
    setElementRenameValidationErrorMessage,
  ] = useState('');
  const pathInputRef = useRef<HTMLInputElement>(null);
  const changePath: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ): void => {
    const currentValue = event.target.value;
    setPath(currentValue);
    const isElementPathNonEmpty = currentValue !== '';
    const isNotTopLevelElement =
      element instanceof Package ||
      currentValue.includes(ELEMENT_PATH_DELIMITER);
    const isValidElementPath =
      (element instanceof Package && isValidPath(currentValue)) ||
      isValidFullPath(currentValue);
    let existingElement =
      editorStore.graphManagerState.graph.getNullableElement(
        currentValue,
        true,
      );
    existingElement =
      existingElement instanceof Package
        ? isMainGraphElement(existingElement)
          ? existingElement
          : undefined
        : existingElement;
    const isElementUnique = !existingElement || existingElement === element;
    const errorMessage = !isElementPathNonEmpty
      ? `Element path cannot be empty`
      : !isNotTopLevelElement
      ? `Creating top level element is not allowed`
      : !isValidElementPath
      ? `Element path is not valid`
      : !isElementUnique
      ? `Element of the same path already existed`
      : '';
    setElementRenameValidationErrorMessage(errorMessage);
    setCanRenameElement(
      isElementPathNonEmpty &&
        isNotTopLevelElement &&
        isValidElementPath &&
        isElementUnique,
    );
  };

  const rename = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (element && canRenameElement) {
      explorerTreeState.setElementToRename(undefined);
      flowResult(
        editorStore.graphEditorMode.renameElement(
          element,
          element instanceof ConcreteFunctionDefinition
            ? path + getFunctionSignature(element)
            : path,
        ),
      )
        .then(() => {
          setCanRenameElement(false);
          setElementRenameValidationErrorMessage('');
        })
        .catch(applicationStore.alertUnhandledError);
    }
  };
  const abort = (): void => {
    setCanRenameElement(false);
    setElementRenameValidationErrorMessage('');
    explorerTreeState.setElementToRename(undefined);
  };
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
        <div className="modal__title">Rename Element</div>
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
        <div className="search-modal__actions">
          <button type="button" className="btn btn--dark" onClick={abort}>
            Cancel
          </button>
          <button
            className="btn btn--dark"
            disabled={!canRenameElement}
            onClick={rename}
          >
            Rename
          </button>
        </div>
      </form>
    </Dialog>
  );
});

const GENERATION_DEFAULT_DEPTH = 100;
const GENERATION_DEFAULT_FORMAT = CLASS_MOCK_DATA_GENERATION_FORMAT.JSON;
const getMockDataEditorLanguage = (
  format: CLASS_MOCK_DATA_GENERATION_FORMAT,
): CODE_EDITOR_LANGUAGE => {
  switch (format) {
    case CLASS_MOCK_DATA_GENERATION_FORMAT.JSON:
      return CODE_EDITOR_LANGUAGE.JSON;
    case CLASS_MOCK_DATA_GENERATION_FORMAT.XML:
      return CODE_EDITOR_LANGUAGE.XML;
    case CLASS_MOCK_DATA_GENERATION_FORMAT.YAML:
      return CODE_EDITOR_LANGUAGE.YAML;
    default:
      return CODE_EDITOR_LANGUAGE.TEXT;
  }
};

const SampleDataGenerator = observer(() => {
  const editorStore = useEditorStore();
  const explorerTreeState = editorStore.explorerTreeState;
  const selectedClass = explorerTreeState.classToGenerateSampleData;
  const [format, setFormat] = useState(GENERATION_DEFAULT_FORMAT);
  const [depth, setDepth] = useState(GENERATION_DEFAULT_DEPTH);
  const [resultText, setResultText] = useState('');

  const changeDepth: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setDepth(parseInt(event.target.value, 10));
  };

  // class
  const classSelectorRef = useRef<SelectComponent>(null);
  const elementFilterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: PackageableElementOption<Class>): string =>
      option.value.path,
  });
  const classOptions = editorStore.graphManagerState.usableClasses.map(
    (_class) => ({
      value: _class,
      label: _class.name,
    }),
  );
  const selectedClassOption = selectedClass
    ? {
        value: selectedClass,
        label: selectedClass.name,
      }
    : null;
  const changeClass = (val: PackageableElementOption<Class>): void => {
    if (val.value === selectedClass) {
      return;
    }
    explorerTreeState.setClassToGenerateSampleData(val.value);
  };

  useEffect(() => {
    if (selectedClass) {
      setResultText(
        createMockDataForClassWithFormat(selectedClass, format, depth),
      );
    }
  }, [selectedClass, format, depth]);

  const abort = (): void => {
    setFormat(GENERATION_DEFAULT_FORMAT);
    setDepth(GENERATION_DEFAULT_DEPTH);
    explorerTreeState.setClassToGenerateSampleData(undefined);
  };
  const regenerate = (): void => {
    if (selectedClass) {
      setResultText(
        createMockDataForClassWithFormat(selectedClass, format, depth),
      );
    }
  };
  const onEnter = (): void => classSelectorRef.current?.focus();

  return (
    <Dialog
      open={Boolean(selectedClass)}
      onClose={abort}
      TransitionProps={{
        onEnter: onEnter,
      }}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark search-modal explorer__element-renamer">
        <div className="modal__title">Generate Sample Data</div>
        <div className="sample-data-generator__controller">
          <div
            className="sample-data-generator__controller__icon"
            title="class"
          >
            <PURE_ClassIcon />
          </div>
          <CustomSelectorInput
            ref={classSelectorRef}
            className="sample-data-generator__controller__class-selector"
            options={classOptions}
            onChange={changeClass}
            value={selectedClassOption}
            darkMode={true}
            filterOption={elementFilterOption}
            formatOptionLabel={getPackageableElementOptionFormatter({
              darkMode: true,
            })}
          />
          <div
            className="sample-data-generator__controller__icon"
            title="format"
          >
            <CodeIcon />
          </div>
          <DropdownMenu
            className="sample-data-generator__controller__format-selector"
            title="Choose Element Type..."
            content={
              <MenuContent className="sample-data-generator__controller__format-selector__options">
                {Object.values(CLASS_MOCK_DATA_GENERATION_FORMAT).map((val) => (
                  <MenuContentItem
                    key={val}
                    className="sample-data-generator__controller__format-selector__option"
                    onClick={() => setFormat(val)}
                  >
                    {val}
                  </MenuContentItem>
                ))}
              </MenuContent>
            }
          >
            <div className="sample-data-generator__controller__format-selector__label">
              {format}
            </div>
            <div className="sample-data-generator__controller__format-selector__dropdown-indicator">
              <CaretDownIcon />
            </div>
          </DropdownMenu>
          <div
            className="sample-data-generator__controller__icon"
            title="depth"
          >
            <LevelDownIcon />
          </div>
          <input
            className="input input--dark sample-data-generator__controller__depth"
            value={depth}
            type="number"
            onChange={changeDepth}
          />
        </div>
        <div className="sample-data-generator__result">
          <CodeEditor
            inputValue={resultText}
            isReadOnly={true}
            hideGutter={true}
            language={getMockDataEditorLanguage(format)}
          />
        </div>
        <div className="search-modal__actions">
          <button type="button" className="btn btn--dark" onClick={abort}>
            Cancel
          </button>
          <button className="btn btn--dark" onClick={regenerate}>
            Regenerate
          </button>
        </div>
      </div>
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
    const applicationStore = useLegendStudioApplicationStore();
    const extraExplorerContextMenuItems = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraExplorerContextMenuItemRendererConfigurations?.() ??
          [],
      )
      .map((config) => {
        const action = config.renderer(editorStore, node?.packageableElement);
        if (!action) {
          return null;
        }
        return <Fragment key={config.key}>{action}</Fragment>;
      })
      .filter(isNonNullable);
    const projectId = editorStore.sdlcState.currentProject?.projectId;
    const isReadOnly = editorStore.isInViewerMode || Boolean(nodeIsImmutable);
    const isDependencyProjectElement =
      node && isDependencyElement(node.packageableElement);
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
    const generateSampleData = editorStore.applicationStore.guardUnhandledError(
      async () => {
        if (node?.packageableElement instanceof Class) {
          editorStore.explorerTreeState.setClassToGenerateSampleData(
            node.packageableElement,
          );
        }
      },
    );
    const removeElement = (): void => {
      if (node) {
        flowResult(
          editorStore.graphEditorMode.deleteElement(node.packageableElement),
        ).catch(applicationStore.alertUnhandledError);
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
        applicationStore.navigationService.navigator.visitAddress(
          applicationStore.navigationService.navigator.generateAddress(
            generateViewEntityRoute(projectId, node.packageableElement.path),
          ),
        );
      }
    };
    const copyPath = (): void => {
      if (node) {
        applicationStore.clipboardService
          .copyTextToClipboard(node.packageableElement.path)
          .then(() =>
            applicationStore.notificationService.notifySuccess(
              'Copied element path to clipboard',
            ),
          )
          .catch(applicationStore.alertUnhandledError);
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
          applicationStore.clipboardService
            .copyTextToClipboard(
              applicationStore.navigationService.navigator.generateAddress(
                editorStore.editorMode.generateDependencyElementLink(
                  node.packageableElement.path,
                  dependency,
                ),
              ),
            )
            .then(() =>
              applicationStore.notificationService.notifySuccess(
                'Copied workspace element link to clipboard',
              ),
            )
            .catch(applicationStore.alertUnhandledError);
        } else {
          applicationStore.clipboardService
            .copyTextToClipboard(
              applicationStore.navigationService.navigator.generateAddress(
                editorStore.editorMode.generateElementLink(
                  node.packageableElement.path,
                ),
              ),
            )
            .then(() =>
              applicationStore.notificationService.notifySuccess(
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
          applicationStore.clipboardService
            .copyTextToClipboard(
              applicationStore.navigationService.navigator.generateAddress(
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
              applicationStore.notificationService.notifySuccess(
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
        applicationStore.navigationService.navigator.visitAddress(
          applicationStore.navigationService.navigator.generateAddress(
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
          {node && (
            <>
              <MenuContentItem onClick={renameElement}>
                <MenuContentItemBlankIcon />
                <MenuContentItemLabel>Rename</MenuContentItemLabel>
              </MenuContentItem>
              <MenuContentItem onClick={removeElement}>
                <MenuContentItemBlankIcon />
                <MenuContentItemLabel>Remove</MenuContentItemLabel>
              </MenuContentItem>
            </>
          )}
        </MenuContent>
      );
    }

    if (!node) {
      return null;
    }
    return (
      <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
        {node.packageableElement instanceof Class && (
          <>
            <MenuContentItem onClick={buildQuery}>Query...</MenuContentItem>
            <MenuContentItem onClick={generateSampleData}>
              Generate Sample Data...
            </MenuContentItem>
            <MenuContentDivider />
          </>
        )}
        {extraExplorerContextMenuItems}
        {Boolean(extraExplorerContextMenuItems.length) && (
          <MenuContentDivider />
        )}
        {!isReadOnly && (
          <>
            <MenuContentItem onClick={renameElement}>Rename</MenuContentItem>
            <MenuContentItem onClick={removeElement}>Remove</MenuContentItem>
          </>
        )}
        <MenuContentDivider />
        {!editorStore.isInViewerMode && !isDependencyProjectElement && (
          <MenuContentItem onClick={openElementInViewerMode}>
            View in Project
          </MenuContentItem>
        )}
        <MenuContentItem onClick={copyPath}>Copy Path</MenuContentItem>
        <MenuContentItem onClick={copyWorkspaceElementLink}>
          Copy Link
        </MenuContentItem>
        {isDependencyProjectElement && (
          <MenuContentItem onClick={copySDLCProjectLink}>
            Copy SDLC Project Link
          </MenuContentItem>
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
      : isDependencyElement(node.packageableElement)
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
            {node.label}
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
  const { isInViewerMode } = editorStore;
  const isInGrammarTextMode =
    editorStore.graphEditorMode.mode === GRAPH_EDITOR_MODE.GRAMMAR_TEXT;
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
      disabled={isInGrammarTextMode || isInViewerMode}
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
                  disableContextMenu: isInGrammarTextMode,
                }}
              />
              <ElementRenamer />
              <SampleDataGenerator />
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
  const isInGrammarMode =
    editorStore.graphEditorMode.mode === GRAPH_EDITOR_MODE.GRAMMAR_TEXT;
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
            isInGrammarMode ||
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
      editorStore.graphEditorMode.mode !== GRAPH_EDITOR_MODE.GRAMMAR_TEXT) ||
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
      editorStore.graphEditorMode.mode === GRAPH_EDITOR_MODE.GRAMMAR_TEXT ||
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
                      {`Can't build graph as workspace contains merge conflicts, please resolve them before trying to build the graph again`}
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
