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

import { observer } from 'mobx-react-lite';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  CustomSelectorInput,
  type SelectComponent,
  createFilter,
  PURE_ConnectionIcon,
  BlankPanelPlaceholder,
  PanelDropZone,
  PanelLoadingIndicator,
  PURE_DatabaseIcon,
  SyncIcon,
} from '@finos/legend-art';
import { useCallback, useEffect, useRef } from 'react';
import {
  useApplicationStore,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  PackageableConnection,
  RelationalDatabaseConnection,
} from '@finos/legend-graph';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { PANEL_MODE } from '../../../stores/editor/EditorConfig.js';
import { useDrag, useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
} from '../../../stores/editor/utils/DnDUtils.js';
import {
  DatabaseSchemaExplorer,
  DatabaseSchemaExplorerTreeNodeContainer,
  type DatabaseSchemaExplorerTreeNodeContainerProps,
} from '../editor-group/connection-editor/DatabaseSchemaExplorer.js';
import { DatabaseSchemaExplorerTreeTableNodeData } from '../../../stores/editor/editor-state/element-editor-state/connection/DatabaseBuilderState.js';
import {
  buildRelationalDatabaseConnectionOption,
  type RelationalDatabaseConnectionOption,
} from '../editor-group/connection-editor/RelationalDatabaseConnectionEditor.js';
import { SQLPlaygroundEditorResultPanel } from '@finos/legend-lego/sql-playground';

const DATABASE_NODE_DND_TYPE = 'DATABASE_NODE_DND_TYPE';
type DatabaseNodeDragType = { text: string };

const SQLPlaygroundDatabaseSchemaExplorerTreeNodeContainer = observer(
  (props: DatabaseSchemaExplorerTreeNodeContainerProps) => {
    const { node } = props;
    const ref = useRef(null);

    const [, dragConnector] = useDrag<DatabaseNodeDragType>(
      () => ({
        type: DATABASE_NODE_DND_TYPE,
        item: {
          text:
            node instanceof DatabaseSchemaExplorerTreeTableNodeData
              ? `${node.owner.name}.${node.label}`
              : node.label,
        },
      }),
      [node],
    );
    dragConnector(ref);

    return <DatabaseSchemaExplorerTreeNodeContainer {...props} ref={ref} />;
  },
);

type SQLPlaygroundPanelDropTarget = ElementDragSource;

export const SQLPlaygroundPanel = observer(() => {
  const editorStore = useEditorStore();
  const playgroundState = editorStore.studioSqlPlaygroundState;
  const applicationStore = useApplicationStore();

  // connection
  const connectionSelectorRef = useRef<SelectComponent>(null);
  const connectionFilterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: { data: RelationalDatabaseConnectionOption }): string =>
      option.data.value.path,
  });
  const connectionOptions = editorStore.graphManagerState.usableConnections
    .filter(
      (connection) =>
        connection.connectionValue instanceof RelationalDatabaseConnection,
    )
    .map(buildRelationalDatabaseConnectionOption);
  const selectedConnectionOption = playgroundState.connection
    ? buildRelationalDatabaseConnectionOption(playgroundState.connection)
    : null;
  const changeConnection = (val: RelationalDatabaseConnectionOption): void => {
    if (val.value === playgroundState.connection) {
      return;
    }
    playgroundState.setConnection(val.value);
  };
  const onPickConnection = (): void => {
    editorStore.setQuickInputState({
      title: 'Connection picker',
      placeholder: 'Select a connection...',
      options: connectionOptions,
      getSearchValue: (option: RelationalDatabaseConnectionOption): string =>
        option.value.path,
      onSelect: changeConnection,
    });
  };

  const handleConnectionDrop = useCallback(
    (item: SQLPlaygroundPanelDropTarget): void => {
      if (item.data.packageableElement instanceof PackageableConnection) {
        if (
          item.data.packageableElement.connectionValue instanceof
          RelationalDatabaseConnection
        ) {
          playgroundState.setConnection(item.data.packageableElement);
        } else {
          applicationStore.notificationService.notifyWarning(
            `Can't use SQL playground with non-relational database connection`,
          );
        }
      }
    },
    [playgroundState, applicationStore],
  );
  const [{ isConnectionDragOver }, dropConnector] = useDrop<
    ElementDragSource,
    void,
    { isConnectionDragOver: boolean }
  >(
    () => ({
      accept: CORE_DND_TYPE.PROJECT_EXPLORER_CONNECTION,
      drop: (item) => handleConnectionDrop(item),
      collect: (monitor) => ({
        isConnectionDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleConnectionDrop],
  );

  const updateDatabase = (): void => {
    if (playgroundState.schemaExplorerState) {
      flowResult(playgroundState.schemaExplorerState.updateDatabase()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };

  useEffect(() => {
    if (playgroundState.schemaExplorerState) {
      flowResult(
        playgroundState.schemaExplorerState.fetchDatabaseMetadata(),
      ).catch(applicationStore.alertUnhandledError);
    }
  }, [playgroundState, applicationStore, playgroundState.schemaExplorerState]);

  useEffect(() => {
    playgroundState.fetchSchemaMetaData();
  }, [playgroundState]);

  useConditionedApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SQL_PLAYGROUND,
    editorStore.activePanelMode === PANEL_MODE.SQL_PLAYGROUND,
  );
  return (
    <PanelDropZone
      isDragOver={isConnectionDragOver}
      dropTargetConnector={dropConnector}
    >
      <div className="sql-playground">
        {playgroundState.connection && (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={300}>
              <div className="sql-playground__config">
                <div className="sql-playground__config__setup">
                  <div className="sql-playground__config__connection-selector">
                    <div className="sql-playground__config__connection-selector__icon">
                      <PURE_ConnectionIcon />
                    </div>
                    <CustomSelectorInput
                      inputRef={connectionSelectorRef}
                      className="sql-playground__config__connection-selector__input"
                      options={connectionOptions}
                      onChange={changeConnection}
                      value={selectedConnectionOption}
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                      placeholder="Choose a connection..."
                      filterOption={connectionFilterOption}
                    />
                  </div>
                  <div className="sql-playground__config__database-selector">
                    <div className="sql-playground__config__database-selector__icon">
                      <PURE_DatabaseIcon />
                    </div>
                    <CustomSelectorInput
                      inputRef={connectionSelectorRef}
                      className="sql-playground__config__database-selector__input"
                      options={connectionOptions}
                      onChange={changeConnection}
                      value={selectedConnectionOption}
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                      placeholder="Choose a connection..."
                      filterOption={connectionFilterOption}
                    />
                    <button
                      className="sql-playground__config__database-selector__update-btn btn--sm btn--dark"
                      disabled={!playgroundState.database}
                      onClick={updateDatabase}
                      title="Update database"
                    >
                      <SyncIcon />
                    </button>
                  </div>
                </div>
                <div className="sql-playground__config__schema-explorer">
                  <PanelLoadingIndicator
                    isLoading={Boolean(
                      playgroundState.schemaExplorerState?.isGeneratingDatabase,
                    )}
                  />
                  {playgroundState.schemaExplorerState?.treeData && (
                    <DatabaseSchemaExplorer
                      treeData={playgroundState.schemaExplorerState.treeData}
                      schemaExplorerState={playgroundState.schemaExplorerState}
                      treeNodeContainerComponent={
                        SQLPlaygroundDatabaseSchemaExplorerTreeNodeContainer
                      }
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel>
              <div className="panel sql-playground__sql-editor">
                <SQLPlaygroundEditorResultPanel
                  playgroundState={playgroundState}
                  advancedMode={true}
                  enableDarkMode={true}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {!playgroundState.connection && (
          <BlankPanelPlaceholder
            onClick={onPickConnection}
            clickActionType="add"
            text="Pick a connection to start"
            tooltipText="Drop a connection to start..."
            isDropZoneActive={isConnectionDragOver}
          />
        )}
      </div>
    </PanelDropZone>
  );
});
