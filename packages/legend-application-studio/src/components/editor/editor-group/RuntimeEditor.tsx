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

import { useState, useEffect, useCallback, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type RuntimeEditorState,
  PackageableRuntimeEditorState,
  RuntimeEditorRuntimeTabState,
  IdentifiedConnectionsEditorTabState,
  IdentifiedConnectionsPerClassEditorTabState,
  IdentifiedConnectionsPerStoreEditorTabState,
} from '../../../stores/editor/editor-state/element-editor-state/RuntimeEditorState.js';
import type { EditorStore } from '../../../stores/editor/EditorStore.js';
import {
  clsx,
  Dialog,
  type TreeNodeContainerProps,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TreeView,
  ContextMenu,
  CustomSelectorInput,
  createFilter,
  BlankPanelContent,
  MenuContent,
  MenuContentItem,
  BlankPanelPlaceholder,
  PURE_RuntimeIcon,
  PURE_ConnectionIcon,
  PURE_ModelStoreIcon,
  PURE_ClassIcon,
  PURE_MappingIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TimesIcon,
  LongArrowRightIcon,
  CogIcon,
  CaretRightIcon,
  PanelDropZone,
  Panel,
  PanelContent,
  PanelHeader,
  ModalHeader,
  ModalTitle,
  ModalHeaderActions,
  ModalBody,
  Modal,
  PanelHeaderActions,
  PanelHeaderActionItem,
} from '@finos/legend-art';
import { getElementIcon } from '../../ElementIconUtils.js';
import type { RuntimeExplorerTreeNodeData } from '../../../stores/editor/utils/TreeUtils.js';
import { ConnectionEditor } from './connection-editor/ConnectionEditor.js';
import {
  type UMLEditorElementDropTarget,
  CORE_DND_TYPE,
  ElementDragSource,
} from '../../../stores/editor/utils/DnDUtils.js';
import { useDrop } from 'react-dnd';
import { assertErrorThrown } from '@finos/legend-shared';
import type { ConnectionEditorState } from '../../../stores/editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  type PackageableElementReference,
  Connection,
  ConnectionPointer,
  Runtime,
  IdentifiedConnection,
  RuntimePointer,
  ModelStore,
  Mapping,
  Class,
  Store,
  PackageableConnection,
  JsonModelConnection,
  XmlModelConnection,
  FlatDataConnection,
  RelationalDatabaseConnection,
  PackageableElementExplicitReference,
  ModelChainConnection,
  generateIdentifiedConnectionId,
} from '@finos/legend-graph';
import {
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import {
  runtime_addIdentifiedConnection,
  runtime_deleteIdentifiedConnection,
} from '../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { CUSTOM_LABEL } from '../../../stores/editor/NewElementState.js';

const getConnectionTooltipText = (
  connection: Connection,
  editorStore: EditorStore,
): string => {
  const connectionValue =
    connection instanceof ConnectionPointer
      ? connection.packageableConnection.value.connectionValue
      : connection;
  if (connectionValue instanceof JsonModelConnection) {
    return `JSON model connection \u2022 Class ${connectionValue.class.value.path}`;
  } else if (connectionValue instanceof XmlModelConnection) {
    return `XML model connection \u2022 Class ${connectionValue.class.value.path}`;
  } else if (connectionValue instanceof FlatDataConnection) {
    return `Flat-data connection \u2022 Flat-data store ${connectionValue.store.value.path}`;
  } else if (connectionValue instanceof RelationalDatabaseConnection) {
    return connectionValue.store
      ? `Relational database connection \u2020 database store ${connectionValue.store.value.path}`
      : `Relational database connection`;
  } else if (connectionValue instanceof ModelChainConnection) {
    return `Model chain connection \u2022`;
  }
  const extraConnectionToolTipTexts = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
        ).getExtraRuntimeConnectionTooltipTextBuilders?.() ?? [],
    );
  for (const builder of extraConnectionToolTipTexts) {
    const tooltipText = builder(connectionValue);
    if (tooltipText) {
      return tooltipText;
    }
  }
  return `Unknown connection`;
};

const IdentifiedConnectionsPerStoreExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      identifiedConnection?: IdentifiedConnection;
      deleteIdentifiedConnection?: () => void;
      createNewIdentifiedConnection: () => void;
    }
  >(function IdentifiedConnectionsPerStoreExplorerContextMenu(props, ref) {
    const {
      identifiedConnection,
      deleteIdentifiedConnection,
      createNewIdentifiedConnection,
    } = props;
    const remove = (): void => deleteIdentifiedConnection?.();

    return (
      <MenuContent ref={ref}>
        {identifiedConnection && (
          <MenuContentItem onClick={remove}>Remove</MenuContentItem>
        )}
        {!identifiedConnection && (
          <MenuContentItem onClick={createNewIdentifiedConnection}>
            Create a new connection for store
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

export const IdentifiedConnectionsPerStoreExplorerItem = observer(
  (props: {
    identifiedConnection: IdentifiedConnection;
    currentRuntimeEditorTabState: IdentifiedConnectionsEditorTabState;
    isActive: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      identifiedConnection,
      currentRuntimeEditorTabState,
      isActive,
      isReadOnly,
    } = props;
    const editorStore = useEditorStore();
    const openConnection = (): void =>
      currentRuntimeEditorTabState.openIdentifiedConnection(
        identifiedConnection,
      );
    const deleteConnection = (): void =>
      currentRuntimeEditorTabState.deleteIdentifiedConnection(
        identifiedConnection,
      );
    const openNewConnectionModal = (): void =>
      currentRuntimeEditorTabState.addIdentifiedConnection();
    // context menu
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    return (
      <ContextMenu
        className={clsx(
          'runtime-explorer__item',
          {
            'context-menu__trigger--on-menu-open':
              !isActive && isSelectedFromContextMenu,
          },
          { 'runtime-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <IdentifiedConnectionsPerStoreExplorerContextMenu
            identifiedConnection={identifiedConnection}
            deleteIdentifiedConnection={deleteConnection}
            createNewIdentifiedConnection={openNewConnectionModal}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className="runtime-explorer__item__label runtime-explorer__item__label--simple"
          onClick={openConnection}
          tabIndex={-1}
          title={getConnectionTooltipText(
            identifiedConnection.connection,
            editorStore,
          )}
        >
          <div className="runtime-explorer__item__label__icon">
            <PURE_ConnectionIcon />
          </div>
          {/* TODO: we might want to add connection type label here */}
          <div className="runtime-explorer__item__label__text">
            {identifiedConnection.id}
          </div>
        </button>
      </ContextMenu>
    );
  },
);

const getRuntimeExplorerTreeNodeIcon = (
  editorStore: EditorStore,
  node: RuntimeExplorerTreeNodeData,
): React.ReactNode => {
  if (node.data instanceof Runtime) {
    return <PURE_RuntimeIcon />;
  } else if (node.data instanceof ModelStore) {
    return <PURE_ModelStoreIcon />;
  } else if (node.data instanceof Connection) {
    return <PURE_ConnectionIcon />;
  }
  return getElementIcon(node.data, editorStore);
};

const getRuntimeExplorerTreeNodeTooltipText = (
  node: RuntimeExplorerTreeNodeData,
): string | undefined => {
  if (node.data instanceof Runtime) {
    return ''; // number of mapping and stores
  } else if (node.data instanceof ModelStore) {
    return '';
  } else if (node.data instanceof Store) {
    /* do nothing */
  } else if (node.data instanceof Class) {
    // return `JSON model connection \u2022 Class ${connectionValue.class.path}`;
  }
  return undefined;
};

const RuntimeExplorerTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      RuntimeExplorerTreeNodeData,
      {
        isReadOnly: boolean;
        runtimeEditorState: RuntimeEditorState;
        onNodeExpand: (node: RuntimeExplorerTreeNodeData) => void;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { runtimeEditorState, onNodeExpand } = innerProps;
    const editorStore = useEditorStore();
    const isExpandable = Boolean(node.childrenIds?.length);
    const nodeExpandIcon = isExpandable ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const selectNode = (): void => onNodeSelect?.(node);
    const onExpandIconClick = (): void => onNodeExpand(node);
    // Selection
    const isActive = runtimeEditorState.isTreeNodeSelected(node);

    return (
      <div
        className={clsx(
          'tree-view__node__container runtime-explorer__tree__node__container',
          { 'runtime-explorer__item--active': isActive },
        )}
        onClick={selectNode}
        style={{
          paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
          display: 'flex',
        }}
      >
        <button
          className="runtime-explorer__item__label"
          tabIndex={-1}
          title={getRuntimeExplorerTreeNodeTooltipText(node)}
        >
          <div
            className="tree-view__node__expand-icon"
            onClick={onExpandIconClick}
          >
            {nodeExpandIcon}
          </div>
          <div className="runtime-explorer__item__label__icon">
            {getRuntimeExplorerTreeNodeIcon(editorStore, node)}
          </div>
          {node.data instanceof Runtime && (
            <>
              <div className="runtime-explorer__item__label__text">
                {node.label} ~
              </div>
              <div className="runtime-explorer__item__label__runtime__mapping__icon">
                <PURE_MappingIcon />
              </div>
              {/* TODO: handle when there are multiple mappings */}
              <div className="runtime-explorer__item__label__runtime__mapping__text">
                {runtimeEditorState.runtimeValue.mappings.length
                  ? (
                      runtimeEditorState.runtimeValue
                        .mappings[0] as PackageableElementReference<Mapping>
                    ).value.name
                  : '(no mapping)'}
              </div>
            </>
          )}
          {node.data instanceof Store && (
            <div className="runtime-explorer__item__label__text">
              {node.label}
            </div>
          )}
          {node.data instanceof Class && (
            <div className="runtime-explorer__item__label__text">
              {node.label}
            </div>
          )}
        </button>
      </div>
    );
  },
);

const RuntimeExplorer = observer(
  (props: { runtimeEditorState: RuntimeEditorState; isReadOnly: boolean }) => {
    const { runtimeEditorState, isReadOnly } = props;
    const runtime = runtimeEditorState.runtime;
    const runtimeValue = runtimeEditorState.runtimeValue;
    const runtimeName =
      runtime instanceof RuntimePointer
        ? runtime.packageableRuntime.value.name
        : CUSTOM_LABEL;
    // explorer tree data
    const treeData = runtimeEditorState.explorerTreeData;
    const onNodeSelect = (node: RuntimeExplorerTreeNodeData): void =>
      runtimeEditorState.onExplorerTreeNodeSelect(node);
    const onNodeExpand = (node: RuntimeExplorerTreeNodeData): void =>
      runtimeEditorState.onExplorerTreeNodeExpand(node);
    const getTreeChildNodes = (
      node: RuntimeExplorerTreeNodeData,
    ): RuntimeExplorerTreeNodeData[] =>
      runtimeEditorState.getExplorerTreeChildNodes(node);
    // DnD
    const handleDropRuntimeSubElement = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (!isReadOnly) {
          if (element instanceof PackageableConnection) {
            runtimeEditorState.addIdentifiedConnection(
              new IdentifiedConnection(
                generateIdentifiedConnectionId(runtimeValue),
                new ConnectionPointer(
                  PackageableElementExplicitReference.create(element),
                ),
              ),
            );
          } else if (element instanceof Mapping) {
            runtimeEditorState.addMapping(element);
          }
        }
      },
      [isReadOnly, runtimeEditorState, runtimeValue],
    );
    const [{ isRuntimeSubElementDragOver }, dropConnector] = useDrop<
      ElementDragSource,
      void,
      { isRuntimeSubElementDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CONNECTION,
          CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING,
        ],
        drop: (item) => handleDropRuntimeSubElement(item),
        collect: (monitor) => ({
          isRuntimeSubElementDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropRuntimeSubElement],
    );

    useEffect(() => {
      runtimeEditorState.decorateRuntimeConnections();
      runtimeEditorState.reprocessCurrentTabState();
      runtimeEditorState.reprocessRuntimeExplorerTree();
      return (): void => runtimeEditorState.cleanUpDecoration();
    }, [runtimeEditorState]);

    return (
      <Panel className="runtime-explorer">
        <PanelHeader title="runtime">
          <div className="panel__header__title__content">{runtimeName}</div>
        </PanelHeader>
        <PanelContent>
          <PanelDropZone
            dropTargetConnector={dropConnector}
            isDragOver={isRuntimeSubElementDragOver}
          >
            <div className="panel__content__list">
              <TreeView
                components={{
                  TreeNodeContainer: RuntimeExplorerTreeNodeContainer,
                }}
                treeData={treeData}
                onNodeSelect={onNodeSelect}
                getChildNodes={getTreeChildNodes}
                innerProps={{
                  isReadOnly,
                  runtimeEditorState,
                  onNodeExpand,
                }}
              />
            </div>
          </PanelDropZone>
        </PanelContent>
      </Panel>
    );
  },
);

const IdentifiedConnectionEditor = observer(
  (props: {
    runtimeEditorState: RuntimeEditorState;
    currentRuntimeEditorTabState: IdentifiedConnectionsEditorTabState;
    connectionEditorState: ConnectionEditorState;
    identifiedConnection: IdentifiedConnection;
    isReadOnly: boolean;
  }) => {
    const {
      runtimeEditorState,
      currentRuntimeEditorTabState,
      connectionEditorState,
      identifiedConnection,
      isReadOnly,
    } = props;
    const applicationStore = useApplicationStore();
    const runtimeValue = runtimeEditorState.runtimeValue;
    // TODO: add runtime connection ID
    // connection pointer
    const isEmbeddedConnection = !(
      identifiedConnection.connection instanceof ConnectionPointer
    );
    const embeddedConnectionLabel = (
      <div className="runtime-connection-editor__connection-option--custom">
        <CogIcon />
        <div className="runtime-connection-editor__connection-option--custom__label">
          {CUSTOM_LABEL}
        </div>
      </div>
    );
    // only show custom connnection option when a connnection pointer is currently selected
    let connectionOptions = isEmbeddedConnection
      ? []
      : ([{ label: embeddedConnectionLabel }] as {
          label: string | React.ReactNode;
          value: PackageableConnection;
        }[]);
    connectionOptions = connectionOptions.concat(
      currentRuntimeEditorTabState.packageableConnections.map(
        (packageableConnection) => ({
          label: packageableConnection.path,
          value: packageableConnection,
        }),
      ),
    );
    const selectedConnectionOption =
      identifiedConnection.connection instanceof ConnectionPointer
        ? {
            value: identifiedConnection.connection.packageableConnection.value,
            label: isEmbeddedConnection
              ? embeddedConnectionLabel
              : identifiedConnection.connection.packageableConnection.value
                  .path,
          }
        : null;
    const editorStore = useEditorStore();
    const onConnectionSelectionChange = (val: {
      label: string | React.ReactNode;
      value?: PackageableConnection;
    }): void => {
      if (val.value === undefined) {
        let customConnection: Connection;
        try {
          customConnection =
            currentRuntimeEditorTabState.createDefaultConnection();
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notificationService.notifyWarning(error.message);
          return;
        }
        const newIdentifiedConnection = new IdentifiedConnection(
          generateIdentifiedConnectionId(runtimeValue),
          customConnection,
        );
        runtime_addIdentifiedConnection(
          runtimeValue,
          newIdentifiedConnection,
          editorStore.changeDetectionState.observerContext,
        );
        runtime_deleteIdentifiedConnection(runtimeValue, identifiedConnection);
        currentRuntimeEditorTabState.openIdentifiedConnection(
          newIdentifiedConnection,
        );
      } else if (
        val.value instanceof PackageableConnection &&
        (!(identifiedConnection.connection instanceof ConnectionPointer) ||
          val.value !==
            identifiedConnection.connection.packageableConnection.value)
      ) {
        const connectionPointer = new ConnectionPointer(
          PackageableElementExplicitReference.create(val.value),
        );
        const newIdentifiedConnection = new IdentifiedConnection(
          generateIdentifiedConnectionId(runtimeValue),
          connectionPointer,
        );
        runtime_addIdentifiedConnection(
          runtimeValue,
          newIdentifiedConnection,
          editorStore.changeDetectionState.observerContext,
        );
        runtime_deleteIdentifiedConnection(runtimeValue, identifiedConnection);
        currentRuntimeEditorTabState.openIdentifiedConnection(
          newIdentifiedConnection,
        );
      }
    };
    const visitConnection = (): void => {
      if (identifiedConnection.connection instanceof ConnectionPointer) {
        editorStore.graphEditorMode.openElement(
          identifiedConnection.connection.packageableConnection.value,
        );
      }
    };

    return (
      <div className="runtime-connection-editor">
        <div className="panel runtime-connection-editor__pointer">
          <PanelHeader title="runtime connection" />
          <PanelContent>
            <div className="runtime-connection-editor__connection-option">
              <div className="runtime-connection-editor__connection-option__label">
                <PURE_ConnectionIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown"
                disabled={isReadOnly}
                options={connectionOptions}
                onChange={onConnectionSelectionChange}
                value={selectedConnectionOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
              {!isEmbeddedConnection && (
                <button
                  className="btn--dark btn--sm runtime-connection-editor__connection-option__visit-btn"
                  onClick={visitConnection}
                  tabIndex={-1}
                  title="See connection"
                >
                  <LongArrowRightIcon />
                </button>
              )}
            </div>
          </PanelContent>
        </div>
        <div className="runtime-connection-editor__embedded">
          <ConnectionEditor
            connectionEditorState={connectionEditorState}
            disableChangingStore={true}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    );
  },
);

const IdentifiedConnectionsPerStoreEditor = observer(
  (props: {
    runtimeEditorState: RuntimeEditorState;
    currentRuntimeEditorTabState: IdentifiedConnectionsEditorTabState;
    isReadOnly: boolean;
  }) => {
    const { isReadOnly, currentRuntimeEditorTabState, runtimeEditorState } =
      props;
    const isEmbeddedRuntime = runtimeEditorState.isEmbeddedRuntime;
    const connectionEditorState =
      currentRuntimeEditorTabState.getConnectionEditorState();
    const identifiedConnection =
      currentRuntimeEditorTabState.identifiedConnectionEditorState
        ?.idenfitiedConnection;
    // explorer
    const addNewConnection = (): void =>
      currentRuntimeEditorTabState.addIdentifiedConnection();
    // DnD
    const handleDropConnection = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (
          !isReadOnly &&
          element instanceof PackageableConnection &&
          currentRuntimeEditorTabState.packageableConnections.includes(element)
        ) {
          currentRuntimeEditorTabState.addIdentifiedConnection(element);
        }
      },
      [currentRuntimeEditorTabState, isReadOnly],
    );
    const [{ isConnectionDragOver, dragItem }, dropConnector] = useDrop<
      ElementDragSource,
      void,
      { isConnectionDragOver: boolean; dragItem: ElementDragSource | null }
    >(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_CONNECTION],
        drop: (item) => handleDropConnection(item),
        collect: (
          monitor,
        ): {
          isConnectionDragOver: boolean;
          dragItem: ElementDragSource | null;
        } => ({
          isConnectionDragOver: monitor.isOver({ shallow: true }),
          dragItem: monitor.getItem<ElementDragSource | null>(),
        }),
      }),
      [handleDropConnection],
    );
    const canDropConnection =
      !isReadOnly &&
      dragItem instanceof ElementDragSource &&
      dragItem.data.packageableElement instanceof PackageableConnection &&
      currentRuntimeEditorTabState.packageableConnections.includes(
        dragItem.data.packageableElement,
      );

    return (
      <div className="runtime-store-connections-editor">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={300} minSize={300}>
            <Panel className="runtime-explorer">
              <PanelHeader>
                {currentRuntimeEditorTabState instanceof
                  IdentifiedConnectionsPerStoreEditorTabState && (
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">store</div>
                    <div className="panel__header__title__content">
                      {currentRuntimeEditorTabState.store.name}
                    </div>
                  </div>
                )}
                {currentRuntimeEditorTabState instanceof
                  IdentifiedConnectionsPerClassEditorTabState && (
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">store</div>
                    <div className="panel__header__title__content">
                      ModelStore
                    </div>
                    <div className="runtime-store-connections-editor__model-store__arrow-icon">
                      <CaretRightIcon />
                    </div>
                    <div className="runtime-store-connections-editor__model-store__class-icon">
                      <PURE_ClassIcon />
                    </div>
                    <div className="runtime-store-connections-editor__model-store__class-name">
                      {currentRuntimeEditorTabState.class.name}
                    </div>
                  </div>
                )}
                <PanelHeaderActions>
                  <PanelHeaderActionItem
                    disabled={isReadOnly}
                    onClick={addNewConnection}
                    title="Add Connection..."
                  >
                    <PlusIcon />
                  </PanelHeaderActionItem>
                </PanelHeaderActions>
              </PanelHeader>
              <ContextMenu
                className="panel__content"
                disabled={isReadOnly}
                content={
                  <IdentifiedConnectionsPerStoreExplorerContextMenu
                    createNewIdentifiedConnection={addNewConnection}
                  />
                }
                menuProps={{ elevation: 7 }}
              >
                <PanelDropZone
                  dropTargetConnector={dropConnector}
                  isDragOver={isConnectionDragOver}
                >
                  {Boolean(
                    currentRuntimeEditorTabState.identifiedConnections.length,
                  ) && (
                    <div className="panel__content__list">
                      {currentRuntimeEditorTabState.identifiedConnections.map(
                        (rtConnection) => (
                          <IdentifiedConnectionsPerStoreExplorerItem
                            key={rtConnection._UUID}
                            identifiedConnection={rtConnection}
                            currentRuntimeEditorTabState={
                              currentRuntimeEditorTabState
                            }
                            isActive={rtConnection === identifiedConnection}
                            isReadOnly={isReadOnly}
                          />
                        ),
                      )}
                    </div>
                  )}
                  {!currentRuntimeEditorTabState.identifiedConnections
                    .length && (
                    <BlankPanelPlaceholder
                      text="Add a connection"
                      onClick={addNewConnection}
                      clickActionType="add"
                      tooltipText="Drop a connection to add it to the list, or click to add an embedded connection"
                      isDropZoneActive={
                        isEmbeddedRuntime ? undefined : canDropConnection
                      }
                      disabled={isReadOnly}
                      previewText="No connection"
                    />
                  )}
                </PanelDropZone>
              </ContextMenu>
            </Panel>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            {connectionEditorState && identifiedConnection && (
              <IdentifiedConnectionEditor
                runtimeEditorState={runtimeEditorState}
                currentRuntimeEditorTabState={currentRuntimeEditorTabState}
                connectionEditorState={connectionEditorState}
                identifiedConnection={identifiedConnection}
                isReadOnly={isReadOnly}
              />
            )}
            {(!connectionEditorState || !identifiedConnection) && (
              <Panel>
                <PanelHeader title="runtime connection" />
                <PanelContent>
                  <BlankPanelContent>No connection selected</BlankPanelContent>
                </PanelContent>
              </Panel>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

const RuntimeMappingEditor = observer(
  (props: {
    runtimeEditorState: RuntimeEditorState;
    mappingRef: PackageableElementReference<Mapping>;
    isReadOnly: boolean;
  }) => {
    const { runtimeEditorState, mappingRef, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const runtimeValue = runtimeEditorState.runtimeValue;
    const mappingOptions = editorStore.graphManagerState.graph.ownMappings
      .filter((m) => !runtimeValue.mappings.map((_m) => _m.value).includes(m))
      .map(buildElementOption);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: {
        data: PackageableElementOption<Mapping>;
      }): string => option.data.value.path,
    });
    const selectedMappingOption = {
      value: mappingRef.value,
      label: mappingRef.value.name,
    };
    const changeMapping = (val: PackageableElementOption<Mapping>): void =>
      runtimeEditorState.changeMapping(mappingRef, val.value);
    const deleteMapping = (): void =>
      runtimeEditorState.deleteMapping(mappingRef);
    const visitMapping = (): void =>
      editorStore.graphEditorMode.openElement(mappingRef.value);

    return (
      <div className="panel__content__form__section__list__item--customized runtime-mapping-editor">
        <CustomSelectorInput
          className="runtime-mapping-editor__mapping"
          disabled={isReadOnly}
          options={mappingOptions}
          onChange={changeMapping}
          value={selectedMappingOption}
          placeholder="Choose a class"
          filterOption={filterOption}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
        <button
          className="btn--dark btn__icon--dark"
          onClick={visitMapping}
          tabIndex={-1}
          title="Visit Mapping"
        >
          <LongArrowRightIcon />
        </button>
        {!isReadOnly && (
          <button
            className="btn--dark btn__icon--dark btn--caution"
            disabled={runtimeValue.mappings.length < 2}
            onClick={deleteMapping}
            tabIndex={-1}
            title="Remove"
          >
            <TimesIcon />
          </button>
        )}
      </div>
    );
  },
);

const RuntimeGeneralEditor = observer(
  (props: {
    runtimeEditorState: RuntimeEditorState;
    runtimeEditorTabState: RuntimeEditorRuntimeTabState;
    isReadOnly: boolean;
  }) => {
    const { runtimeEditorState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const runtime = runtimeEditorState.runtime;
    const runtimeValue = runtimeEditorState.runtimeValue;
    const isRuntimeEmbedded = !(runtime instanceof RuntimePointer);
    // mappings
    const mappings = editorStore.graphManagerState.graph.ownMappings.filter(
      (mapping) => !runtimeValue.mappings.map((m) => m.value).includes(mapping),
    );
    const allowAddingMapping = !isReadOnly && Boolean(mappings.length);
    const addMapping = (): void => {
      if (allowAddingMapping) {
        runtimeEditorState.addMapping(mappings[0] as Mapping);
      }
    };
    const handleDropMapping = useCallback(
      (item: UMLEditorElementDropTarget) => {
        const element = item.data.packageableElement;
        if (
          !isReadOnly &&
          // Have to be a mapping
          element instanceof Mapping &&
          // Must not be an already specified mapping
          !runtimeValue.mappings.map((m) => m.value).includes(element)
        ) {
          runtimeEditorState.addMapping(element);
        }
      },
      [isReadOnly, runtimeEditorState, runtimeValue.mappings],
    );
    const [{ isMappingDragOver }, dropConnector] = useDrop<
      ElementDragSource,
      void,
      { isMappingDragOver: boolean }
    >(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING],
        drop: (item) => handleDropMapping(item),
        collect: (monitor) => ({
          isMappingDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropMapping],
    );

    return (
      <div className="panel runtime-explorer">
        <PanelHeader />
        <PanelContent>
          <PanelDropZone
            dropTargetConnector={dropConnector}
            isDragOver={isMappingDragOver && !isReadOnly}
          >
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Mappings
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Specifies the list of mappings covered by this runtime
                </div>
                <div className="panel__content__form__section__list">
                  {runtimeValue.mappings.map((mappingRef) => (
                    <RuntimeMappingEditor
                      key={mappingRef.value._UUID}
                      runtimeEditorState={runtimeEditorState}
                      mappingRef={mappingRef}
                      isReadOnly={isReadOnly || isRuntimeEmbedded}
                    />
                  ))}
                  {!isRuntimeEmbedded && (
                    <div className="panel__content__form__section__list__new-item__add">
                      <button
                        className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                        disabled={!allowAddingMapping}
                        tabIndex={-1}
                        onClick={addMapping}
                        title="Add Mapping"
                      >
                        Add Value
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PanelDropZone>
        </PanelContent>
      </div>
    );
  },
);

const RuntimeEditorPanel = observer(
  (props: { runtimeEditorState: RuntimeEditorState; isReadOnly: boolean }) => {
    const { runtimeEditorState, isReadOnly } = props;
    const currentRuntimeEditorTabState = runtimeEditorState.currentTabState;
    if (
      currentRuntimeEditorTabState instanceof
      IdentifiedConnectionsEditorTabState
    ) {
      return (
        <IdentifiedConnectionsPerStoreEditor
          key={runtimeEditorState.uuid}
          runtimeEditorState={runtimeEditorState}
          currentRuntimeEditorTabState={currentRuntimeEditorTabState}
          isReadOnly={isReadOnly}
        />
      );
    } else if (
      currentRuntimeEditorTabState instanceof RuntimeEditorRuntimeTabState
    ) {
      return (
        <RuntimeGeneralEditor
          key={runtimeEditorState.uuid}
          runtimeEditorState={runtimeEditorState}
          runtimeEditorTabState={currentRuntimeEditorTabState}
          isReadOnly={isReadOnly}
        />
      );
    }
    return <div />; // no need for splash screen since will always show at least a tab
  },
);

export const RuntimeEditor = observer(
  (props: { runtimeEditorState: RuntimeEditorState; isReadOnly: boolean }) => {
    const { runtimeEditorState, isReadOnly } = props;

    return (
      <div className="runtime-editor">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={300} minSize={300}>
            <RuntimeExplorer
              runtimeEditorState={runtimeEditorState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            <RuntimeEditorPanel
              runtimeEditorState={runtimeEditorState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const PackageableRuntimeEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    PackageableRuntimeEditorState,
  );
  const isReadOnly = editorState.isReadOnly;

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.RUNTIME_EDITOR,
  );

  return (
    <RuntimeEditor
      runtimeEditorState={editorState.runtimeEditorState}
      isReadOnly={isReadOnly}
    />
  );
});

export const EmbeddedRuntimeEditor = observer(
  (props: {
    runtimeEditorState?: RuntimeEditorState | undefined;
    isReadOnly: boolean;
    onClose: () => void;
  }) => {
    const { runtimeEditorState, onClose, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const closeEditor = (): void => onClose();
    if (!runtimeEditorState) {
      return null;
    }
    return (
      <Dialog
        open={Boolean(runtimeEditorState)}
        onClose={closeEditor}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal embedded-runtime-editor"
        >
          <ModalHeader>
            <ModalTitle icon={<CogIcon />} title="custom runtime" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={closeEditor}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody className="modal__body--footless">
            <RuntimeEditor
              runtimeEditorState={runtimeEditorState}
              isReadOnly={isReadOnly}
            />
          </ModalBody>
        </Modal>
      </Dialog>
    );
  },
);
