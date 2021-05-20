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

import { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import type { RuntimeEditorState } from '../../../stores/editor-state/element-editor-state/RuntimeEditorState';
import {
  PackageableRuntimeEditorState,
  RuntimeEditorRuntimeTabState,
  IdentifiedConnectionsEditorTabState,
  IdentifiedConnectionsPerClassEditorTabState,
  IdentifiedConnectionsPerStoreEditorTabState,
} from '../../../stores/editor-state/element-editor-state/RuntimeEditorState';
import type { EditorStore } from '../../../stores/EditorStore';
import { useEditorStore } from '../../../stores/EditorStore';
import SplitPane from 'react-split-pane';
import type { TreeNodeContainerProps } from '@finos/legend-studio-components';
import {
  clsx,
  TreeView,
  ContextMenu,
  CustomSelectorInput,
  createFilter,
  BlankPanelContent,
  MenuContent,
  MenuContentItem,
  BlankPanelPlaceholder,
} from '@finos/legend-studio-components';
import {
  FaChevronDown,
  FaChevronRight,
  FaPlus,
  FaTimes,
  FaLongArrowAltRight,
  FaCog,
  FaCaretRight,
} from 'react-icons/fa';
import {
  getElementIcon,
  RuntimeIcon,
  ConnectionIcon,
  ModelStoreIcon,
  ClassIcon,
  MappingIcon,
} from '../../shared/Icon';
import type { RuntimeExplorerTreeNodeData } from '../../../stores/shared/TreeUtil';
import { ConnectionEditor } from './connection-editor/ConnectionEditor';
import type { UMLEditorElementDropTarget } from '../../../stores/shared/DnDUtil';
import {
  CORE_DND_TYPE,
  ElementDragSource,
} from '../../../stores/shared/DnDUtil';
import { useDrop } from 'react-dnd';
import {
  assertErrorThrown,
  getClass,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { ConnectionEditorState } from '../../../stores/editor-state/element-editor-state/ConnectionEditorState';
import { Dialog } from '@material-ui/core';
import type { PackageableElementSelectOption } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import {
  Connection,
  ConnectionPointer,
} from '../../../models/metamodels/pure/model/packageableElements/connection/Connection';
import {
  Runtime,
  IdentifiedConnection,
  RuntimePointer,
} from '../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { ModelStore } from '../../../models/metamodels/pure/model/packageableElements/store/modelToModel/model/ModelStore';
import { Mapping } from '../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { PackageableConnection } from '../../../models/metamodels/pure/model/packageableElements/connection/PackageableConnection';
import { JsonModelConnection } from '../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Store } from '../../../models/metamodels/pure/model/packageableElements/store/Store';
import { XmlModelConnection } from '../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { FlatDataConnection } from '../../../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import type { PackageableElementReference } from '../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { RelationalDatabaseConnection } from '../../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { useApplicationStore } from '../../../stores/ApplicationStore';

const getConnectionTooltipText = (connection: Connection): string => {
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
    return `Relational database connection \u2020 database store ${connectionValue.store.value.path}`;
  }
  throw new UnsupportedOperationError(
    `Can't get tooltip text for connection type '${getClass(connection).name}'`,
  );
};

const IdentifiedConnectionsPerStoreExplorerContextMenu = observer(
  (
    props: {
      identifiedConnection?: IdentifiedConnection;
      deleteIdentifiedConnection?: () => void;
      createNewIdentifiedConnection: () => void;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const {
      identifiedConnection,
      deleteIdentifiedConnection,
      createNewIdentifiedConnection,
    } = props;
    const remove = (): void => deleteIdentifiedConnection?.();

    return (
      <MenuContent ref={ref}>
        {identifiedConnection && (
          <MenuContentItem onClick={remove}>Delete</MenuContentItem>
        )}
        {!identifiedConnection && (
          <MenuContentItem onClick={createNewIdentifiedConnection}>
            Create a new connection for store
          </MenuContentItem>
        )}
      </MenuContent>
    );
  },
  { forwardRef: true },
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
          title={getConnectionTooltipText(identifiedConnection.connection)}
        >
          <div className="runtime-explorer__item__label__icon">
            <ConnectionIcon />
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
    return <RuntimeIcon />;
  } else if (node.data instanceof ModelStore) {
    return <ModelStoreIcon />;
  } else if (node.data instanceof Connection) {
    return <ConnectionIcon />;
  }
  return getElementIcon(editorStore, node.data);
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
        <FaChevronDown />
      ) : (
        <FaChevronRight />
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
          <div className="type-tree__expand-icon" onClick={onExpandIconClick}>
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
                <MappingIcon />
              </div>
              {/* TODO: handle when there are multiple mappings */}
              <div className="runtime-explorer__item__label__runtime__mapping__text">
                {runtimeEditorState.runtimeValue.mappings[0].value.name}
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
        : '(custom)';
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
                runtimeValue.generateIdentifiedConnectionId(),
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
    const [{ isRuntimeSubElementDragOver }, dropRuntimeSubElementRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CONNECTION,
          CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING,
        ],
        drop: (item: ElementDragSource): void =>
          handleDropRuntimeSubElement(item),
        collect: (monitor): { isRuntimeSubElementDragOver: boolean } => ({
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
      <div className="panel runtime-explorer">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">runtime</div>
            <div className="panel__header__title__content">{runtimeName}</div>
          </div>
        </div>
        <ContextMenu
          className="panel__content"
          disabled={true}
          menuProps={{ elevation: 7 }}
        >
          <div ref={dropRuntimeSubElementRef} className="dnd__dropzone">
            <div
              className={clsx({ dnd__overlay: isRuntimeSubElementDragOver })}
            />
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
          </div>
        </ContextMenu>
      </div>
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
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const runtimeValue = runtimeEditorState.runtimeValue;
    // TODO: add runtime connection id
    // connection pointer
    const isEmbeddedConnection = !(
      identifiedConnection.connection instanceof ConnectionPointer
    );
    const embeddedConnectionLabel = (
      <div className="runtime-connection-editor__connection-option--custom">
        <FaCog />
        <div className="runtime-connection-editor__connection-option--custom__label">
          (custom)
        </div>
      </div>
    );
    // only show custom connnection option when a connnection pointer is currently selected
    let connectionOptions = isEmbeddedConnection
      ? []
      : ([{ label: embeddedConnectionLabel }] as {
          label: string | React.ReactNode;
          value?: PackageableConnection;
        }[]);
    connectionOptions = connectionOptions.concat(
      currentRuntimeEditorTabState.packageableConnections.map(
        (packageableConnection) => ({
          label: packageableConnection.path,
          value: packageableConnection,
        }),
      ),
    );
    const selectedConnectionOption = {
      value: identifiedConnection.connection,
      label: isEmbeddedConnection
        ? embeddedConnectionLabel
        : guaranteeType(identifiedConnection.connection, ConnectionPointer)
            .packageableConnection.value.path,
    };
    const onConnectionSelectionChange = (val: {
      label: string | React.ReactNode;
      value?: PackageableConnection;
    }): void => {
      if (val.value === undefined) {
        let customConnection: Connection;
        try {
          customConnection =
            currentRuntimeEditorTabState.createNewCustomConnection();
        } catch (e: unknown) {
          assertErrorThrown(e);
          applicationStore.notifyWarning(e.message);
          return;
        }
        const newIdentifiedConnection = new IdentifiedConnection(
          runtimeValue.generateIdentifiedConnectionId(),
          customConnection,
        );
        runtimeValue.addIdentifiedConnection(newIdentifiedConnection);
        runtimeValue.deleteIdentifiedConnection(identifiedConnection);
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
          runtimeValue.generateIdentifiedConnectionId(),
          connectionPointer,
        );
        runtimeValue.addIdentifiedConnection(newIdentifiedConnection);
        runtimeValue.deleteIdentifiedConnection(identifiedConnection);
        currentRuntimeEditorTabState.openIdentifiedConnection(
          newIdentifiedConnection,
        );
      }
    };
    const visitConnection = (): void => {
      if (identifiedConnection.connection instanceof ConnectionPointer) {
        editorStore.openElement(
          identifiedConnection.connection.packageableConnection.value,
        );
      }
    };

    return (
      <div className="runtime-connection-editor">
        <div className="panel runtime-connection-editor__pointer">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__label">
                runtime connection
              </div>
            </div>
          </div>
          <div className="panel__content">
            <div className="runtime-connection-editor__connection-option">
              <div className="runtime-connection-editor__connection-option__label">
                <ConnectionIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown"
                disabled={isReadOnly}
                options={connectionOptions}
                onChange={onConnectionSelectionChange}
                value={selectedConnectionOption}
                darkMode={true}
              />
              {!isEmbeddedConnection && (
                <button
                  className="btn--dark btn--sm runtime-connection-editor__connection-option__visit-btn"
                  onClick={visitConnection}
                  tabIndex={-1}
                  title={'See connection'}
                >
                  <FaLongArrowAltRight />
                </button>
              )}
            </div>
          </div>
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
    const [{ isConnectionDragOver, dragItem }, dropConnectionRef] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_CONNECTION],
        drop: (item: ElementDragSource): void => handleDropConnection(item),
        collect: (
          monitor,
        ): { isConnectionDragOver: boolean; dragItem: unknown } => ({
          isConnectionDragOver: monitor.isOver({ shallow: true }),
          dragItem: monitor.getItem(),
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
        <SplitPane
          split="vertical"
          defaultSize={300}
          minSize={300}
          maxSize={-400}
        >
          <div className="panel runtime-explorer">
            <div className="panel__header">
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
                    <FaCaretRight />
                  </div>
                  <div className="runtime-store-connections-editor__model-store__class-icon">
                    <ClassIcon />
                  </div>
                  <div className="runtime-store-connections-editor__model-store__class-name">
                    {currentRuntimeEditorTabState.class.name}
                  </div>
                </div>
              )}
              <div className="panel__header__actions">
                <button
                  className="panel__header__action"
                  disabled={isReadOnly}
                  tabIndex={-1}
                  onClick={addNewConnection}
                  title="Add Connection..."
                >
                  <FaPlus />
                </button>
              </div>
            </div>
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
              <div ref={dropConnectionRef} className="dnd__dropzone">
                {Boolean(
                  currentRuntimeEditorTabState.identifiedConnections.length,
                ) && (
                  <>
                    <div
                      className={clsx({ dnd__overlay: isConnectionDragOver })}
                    />
                    <div className="panel__content__list">
                      {currentRuntimeEditorTabState.identifiedConnections.map(
                        (rtConnection) => (
                          <IdentifiedConnectionsPerStoreExplorerItem
                            key={rtConnection.uuid}
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
                  </>
                )}
                {!currentRuntimeEditorTabState.identifiedConnections.length && (
                  <BlankPanelPlaceholder
                    placeholderText="Add a connection"
                    onClick={addNewConnection}
                    clickActionType="add"
                    tooltipText="Drop a connection to add it to the list, or click to add an embedded connection"
                    dndProps={
                      isEmbeddedRuntime
                        ? undefined
                        : {
                            isDragOver: isConnectionDragOver,
                            canDrop: canDropConnection,
                          }
                    }
                    readOnlyProps={
                      !isReadOnly
                        ? undefined
                        : {
                            placeholderText: 'No connection',
                          }
                    }
                  />
                )}
              </div>
            </ContextMenu>
          </div>
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
            <div className="panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">
                    runtime connection
                  </div>
                </div>
              </div>
              <div className="panel__content">
                <BlankPanelContent>No connection selected</BlankPanelContent>
              </div>
            </div>
          )}
        </SplitPane>
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
    const runtimeValue = runtimeEditorState.runtimeValue;
    const mappingOptions = editorStore.graphState.graph.mappings
      .filter((m) => !runtimeValue.mappings.map((_m) => _m.value).includes(m))
      .map((m) => m.selectOption);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Mapping>): string =>
        option.value.path,
    });
    const selectedMappingOption = {
      value: mappingRef,
      label: mappingRef.value.name,
    };
    const changeMapping = (
      val: PackageableElementSelectOption<Mapping>,
    ): void => runtimeEditorState.changeMapping(mappingRef, val.value);
    const deleteMapping = (): void =>
      runtimeEditorState.deleteMapping(mappingRef);
    const visitMapping = (): void => editorStore.openElement(mappingRef.value);

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
          darkMode={true}
        />
        <button
          className="btn--dark btn__icon--dark"
          onClick={visitMapping}
          tabIndex={-1}
          title="Visit Mapping"
        >
          <FaLongArrowAltRight />
        </button>
        {!isReadOnly && (
          <button
            className="btn--dark btn__icon--dark btn--caution"
            disabled={runtimeValue.mappings.length < 2}
            onClick={deleteMapping}
            tabIndex={-1}
            title="Remove"
          >
            <FaTimes />
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
    const mappings = editorStore.graphState.graph.mappings.filter(
      (mapping) => !runtimeValue.mappings.map((m) => m.value).includes(mapping),
    );
    const allowAddingMapping = !isReadOnly && Boolean(mappings.length);
    const addMapping = (): void => {
      if (allowAddingMapping) {
        runtimeEditorState.addMapping(mappings[0]);
      }
    };
    const handleDropMapping = useCallback(
      (item: UMLEditorElementDropTarget): void => {
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
    const [{ isMappingDragOver }, dropMappingRef] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING],
        drop: (item: ElementDragSource): void => handleDropMapping(item),
        collect: (monitor): { isMappingDragOver: boolean } => ({
          isMappingDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropMapping],
    );

    return (
      <div className="panel runtime-explorer">
        <div className="panel__header"></div>
        <div
          ref={dropMappingRef}
          className="panel__content dnd__overlay__container"
        >
          <div
            className={clsx({ dnd__overlay: isMappingDragOver && !isReadOnly })}
          />
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
                    key={mappingRef.value.uuid}
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
        </div>
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
        <SplitPane
          split="vertical"
          defaultSize={300}
          minSize={300}
          maxSize={-700}
        >
          <RuntimeExplorer
            runtimeEditorState={runtimeEditorState}
            isReadOnly={isReadOnly}
          />
          <RuntimeEditorPanel
            runtimeEditorState={runtimeEditorState}
            isReadOnly={isReadOnly}
          />
        </SplitPane>
      </div>
    );
  },
);

export const PackageableRuntimeEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState = editorStore.getCurrentEditorState(
    PackageableRuntimeEditorState,
  );
  const isReadOnly = editorState.isReadOnly;
  return (
    <RuntimeEditor
      runtimeEditorState={editorState.runtimeEditorState}
      isReadOnly={isReadOnly}
    />
  );
});

export const EmbeddedRuntimeEditor = observer(
  (props: {
    runtimeEditorState?: RuntimeEditorState;
    isReadOnly: boolean;
    onClose: () => void;
  }) => {
    const { runtimeEditorState, onClose, isReadOnly } = props;
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
        <div className="modal modal--dark editor-modal embedded-runtime-editor">
          <div className="modal__header">
            <div className="modal__title">
              <div className="modal__title__icon">
                <FaCog />
              </div>
              <div className="modal__title__label">custom runtime</div>
            </div>
            <div className="modal__header__actions">
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={closeEditor}
              >
                <FaTimes />
              </button>
            </div>
          </div>
          <div className="modal__body modal__body--footless">
            <RuntimeEditor
              runtimeEditorState={runtimeEditorState}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      </Dialog>
    );
  },
);
