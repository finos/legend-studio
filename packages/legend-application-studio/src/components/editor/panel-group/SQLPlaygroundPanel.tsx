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
  Dialog,
  type TreeNodeContainerProps,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  PanelLoadingIndicator,
  clsx,
  TreeView,
  PURE_DatabaseSchemaIcon,
  PURE_DatabaseTableIcon,
  CircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  EmptyCircleIcon,
  PanelContent,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalHeaderActions,
  TimesIcon,
  ModalFooterButton,
  BlankPanelContent,
  KeyIcon,
  Panel,
} from '@finos/legend-art';
import { useEffect } from 'react';
import { noop } from '@finos/legend-shared';
import {
  useApplicationStore,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { stringifyDataType } from '@finos/legend-graph';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  DatabaseSchemaExplorerTreeColumnNodeData,
  DatabaseSchemaExplorerTreeSchemaNodeData,
  DatabaseSchemaExplorerTreeTableNodeData,
  type DatabaseSchemaExplorerTreeData,
  type DatabaseSchemaExplorerTreeNodeData,
  type SQLPlaygroundPanelState,
} from '../../../stores/editor/panel-group/SQLPlaygroundPanelState.js';
import { renderColumnTypeIcon } from '../editor-group/connection-editor/DatabaseEditorHelper.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  ACTIVITY_MODE,
  PANEL_MODE,
} from '../../../stores/editor/EditorConfig.js';

const getDatabaseSchemaNodeIcon = (
  node: DatabaseSchemaExplorerTreeNodeData,
): React.ReactNode => {
  if (node instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
    return (
      <div className="sql-playground__database-schema-explorer-tree__icon--schema">
        <PURE_DatabaseSchemaIcon />
      </div>
    );
  } else if (node instanceof DatabaseSchemaExplorerTreeTableNodeData) {
    return (
      <div className="sql-playground__database-schema-explorer-tree__icon--table">
        <PURE_DatabaseTableIcon />
      </div>
    );
  } else if (node instanceof DatabaseSchemaExplorerTreeColumnNodeData) {
    return renderColumnTypeIcon(node.column.type);
  }
  return null;
};

const DatabaseSchemaExplorerTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    DatabaseSchemaExplorerTreeNodeData,
    {
      // empty
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  // const { toggleCheckedNode, isPartiallySelected } = innerProps;
  const isExpandable =
    Boolean(!node.childrenIds || node.childrenIds.length) &&
    !(node instanceof DatabaseSchemaExplorerTreeColumnNodeData);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );
  const nodeTypeIcon = getDatabaseSchemaNodeIcon(node);
  const toggleExpandNode = (): void => onNodeSelect?.(node);
  const isPrimaryKeyColumn =
    node instanceof DatabaseSchemaExplorerTreeColumnNodeData &&
    node.owner.primaryKey.includes(node.column);

  return (
    <div
      className={clsx('tree-view__node__container')}
      style={{
        paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
      onClick={toggleExpandNode}
    >
      <div className="tree-view__node__icon sql-playground__database-schema-explorer-tree__node__icon__group">
        <div className="sql-playground__database-schema-explorer-tree__expand-icon">
          {nodeExpandIcon}
        </div>
        <div
          className="sql-playground__database-schema-explorer-tree__type-icon"
          onClick={toggleExpandNode}
        >
          {nodeTypeIcon}
        </div>
      </div>
      <div className="tree-view__node__label sql-playground__database-schema-explorer-tree__node__label">
        {node.label}
        {node instanceof DatabaseSchemaExplorerTreeColumnNodeData && (
          <div className="sql-playground__database-schema-explorer-tree__node__type">
            <div className="sql-playground__database-schema-explorer-tree__node__type__label">
              {stringifyDataType(node.column.type)}
            </div>
          </div>
        )}
        {isPrimaryKeyColumn && (
          <div
            className="sql-playground__database-schema-explorer-tree__node__pk"
            title="Primary Key"
          >
            <KeyIcon />
          </div>
        )}
      </div>
    </div>
  );
};

export const DatabaseSchemaExplorer = observer(
  (props: {
    treeData: DatabaseSchemaExplorerTreeData;
    playgroundState: SQLPlaygroundPanelState;
  }) => {
    const { treeData, playgroundState } = props;
    const applicationStore = useApplicationStore();
    const onNodeSelect = (node: DatabaseSchemaExplorerTreeNodeData): void => {
      flowResult(playgroundState.onNodeSelect(node, treeData)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    const getChildNodes = (
      node: DatabaseSchemaExplorerTreeNodeData,
    ): DatabaseSchemaExplorerTreeNodeData[] =>
      playgroundState
        .getChildNodes(node, treeData)
        ?.sort((a, b) => a.label.localeCompare(b.label)) ?? [];

    return (
      <TreeView
        className="sql-playground__database-schema-explorer-tree"
        components={{
          TreeNodeContainer: DatabaseSchemaExplorerTreeNodeContainer,
        }}
        innerProps={{}}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
      />
    );
  },
);

export const SQLPlaygroundPanel = observer(() => {
  const editorStore = useEditorStore();
  const playgroundState = editorStore.sqlPlaygroundState;
  const applicationStore = useApplicationStore();
  // const buildDb = applicationStore.guardUnhandledError(() =>
  //   flowResult(playgroundState.buildDatabaseWithTreeData()),
  // );
  // const saveOrUpdateDatabase = applicationStore.guardUnhandledError(() =>
  //   flowResult(playgroundState.createOrUpdateDatabase()),
  // );
  // const closeModal = (): void => {
  //   playgroundState.setShowModal(false);
  //   playgroundState.editorStore.explorerTreeState.setDatabaseBuilderState(
  //     undefined,
  //   );
  // };
  // const isExecutingAction =
  //   playgroundState.isBuildingDatabase || playgroundState.isSavingDatabase;

  // const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
  //   if (!playgroundState.currentDatabase) {
  //     const stringValue = event.target.value;
  //     const updatedValue = stringValue ? stringValue : undefined;
  //     playgroundState.setTargetDatabasePath(updatedValue ?? '');
  //   }
  // };

  useEffect(() => {
    flowResult(playgroundState.fetchDatabaseMetadata()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [playgroundState, applicationStore]);

  useConditionedApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SQL_PLAYGROUND,
    editorStore.activePanelMode === PANEL_MODE.SQL_PLAYGROUND,
  );

  return (
    <Panel className="sql-playground-panel">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={450}>
          <div className="database-builder__config">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">
                  schema explorer
                </div>
              </div>
            </div>
            <div className="panel__content database-builder__config__content">
              {playgroundState.treeData && (
                <DatabaseSchemaExplorer
                  treeData={playgroundState.treeData}
                  playgroundState={playgroundState}
                />
              )}
            </div>
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter />
        <ResizablePanel>
          <div className="panel database-builder__generated">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">
                  database model
                </div>
              </div>
            </div>
            <PanelContent>
              <div className="database-builder__modeller">
                {/* <div className="panel__content__form__section database-builder__modeller__path">
                  <div className="panel__content__form__section__header__label">
                    Target Database Path
                  </div>
                  <input
                    className="panel__content__form__section__input"
                    spellCheck={false}
                    disabled={
                      isReadOnly || Boolean(playgroundState.currentDatabase)
                    }
                    value={
                      playgroundState.currentDatabase?.path ??
                      playgroundState.targetDatabasePath
                    }
                    onChange={changeValue}
                  />
                </div> */}
                {/* <div className="database-builder__modeller__preview">
                  {playgroundState.databaseGrammarCode && (
                    <CodeEditor
                      language={CODE_EDITOR_LANGUAGE.PURE}
                      inputValue={playgroundState.databaseGrammarCode}
                      isReadOnly={true}
                    />
                  )}
                  {!playgroundState.databaseGrammarCode && (
                    <BlankPanelContent>
                      No database model generated
                    </BlankPanelContent>
                  )}
                </div> */}
              </div>
            </PanelContent>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      {/* <PanelContent className="sql-playground__content"></PanelContent> */}
    </Panel>
  );
});
