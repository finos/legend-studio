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
import Dialog from '@material-ui/core/Dialog';
import {
  type TreeNodeContainerProps,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  PanelLoadingIndicator,
  SaveIcon,
  FireIcon,
  clsx,
  TreeView,
  SchemaIcon,
  TableIcon,
} from '@finos/legend-art';
import { useEffect } from 'react';
import {
  type DatabaseBuilderState,
  type DatabaseBuilderTreeData,
  type DatabaseBuilderTreeNodeData,
  ColumnDatabaseBuilderTreeNodeData,
  SchemaDatabaseBuilderTreeNodeData,
  TableDatabaseBuilderTreeNodeData,
} from '../../../../stores/editor-state/element-editor-state/connection/DatabaseBuilderState';
import {
  FaCircle,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaRegCircle,
} from 'react-icons/fa';
import { capitalize } from '@finos/legend-shared';
import { EDITOR_LANGUAGE } from '@finos/legend-application';
import {
  generateColumnTypeLabel,
  renderColumnTypeIcon,
} from '../../../../stores/editor-state/element-editor-state/mapping/relational/DatabaseEditorHelper';
import { flowResult } from 'mobx';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor';

const getNodeIcon = (node: DatabaseBuilderTreeNodeData): React.ReactNode => {
  if (node instanceof SchemaDatabaseBuilderTreeNodeData) {
    return <SchemaIcon />;
  } else if (node instanceof TableDatabaseBuilderTreeNodeData) {
    return <TableIcon />;
  } else if (node instanceof ColumnDatabaseBuilderTreeNodeData) {
    return renderColumnTypeIcon(node.column.type);
  }
  return null;
};

const DatabaseBuilderTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    DatabaseBuilderTreeNodeData,
    {
      toggleCheckedNode: (node: DatabaseBuilderTreeNodeData) => void;
      isPartiallySelected: (node: DatabaseBuilderTreeNodeData) => boolean;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { toggleCheckedNode, isPartiallySelected } = innerProps;
  const isExpandable =
    Boolean(!node.childrenIds || node.childrenIds.length) &&
    !(node instanceof ColumnDatabaseBuilderTreeNodeData);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <FaChevronDown />
    ) : (
      <FaChevronRight />
    )
  ) : (
    <div />
  );
  const nodeTypeIcon = getNodeIcon(node);
  const toggleCheck = (): void => toggleCheckedNode(node);
  const toggleExpandNode = (): void => {
    onNodeSelect?.(node);
    if (!isExpandable) {
      toggleCheck();
    }
  };

  const renderCheckedIcon = (
    node: DatabaseBuilderTreeNodeData,
  ): React.ReactNode => {
    if (node instanceof ColumnDatabaseBuilderTreeNodeData) {
      return null;
    } else if (isPartiallySelected(node)) {
      return <FaCircle />;
    } else if (node.isChecked) {
      return <FaCheckCircle />;
    }
    return <FaRegCircle />;
  };

  return (
    <div
      className={clsx('tree-view__node__container')}
      style={{
        paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon database-builder-tree__node__icon">
        <div
          className="database-builder-tree__expand-icon"
          onClick={toggleExpandNode}
        >
          {nodeExpandIcon}
        </div>
        <div
          className={clsx('database-builder-tree__checker-icon')}
          onClick={toggleCheck}
        >
          {renderCheckedIcon(node)}
        </div>
        <div
          className="database-builder-tree__type-icon"
          onClick={toggleExpandNode}
        >
          {nodeTypeIcon}
        </div>
      </div>
      <div
        className="tree-view__node__label database-builder-tree__node__label"
        onClick={toggleExpandNode}
      >
        {node.label}
        {node instanceof ColumnDatabaseBuilderTreeNodeData && (
          <div className="database-builder-tree__node__type">
            <div className="database-builder-tree__node__type__label">
              {generateColumnTypeLabel(node.column.type)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DatabaseBuilderExplorer = observer(
  (props: {
    treeData: DatabaseBuilderTreeData;
    isReadOnly: boolean;
    databaseBuilderState: DatabaseBuilderState;
  }) => {
    const { treeData, databaseBuilderState } = props;
    const onNodeSelect = (node: DatabaseBuilderTreeNodeData): void => {
      flowResult(databaseBuilderState.onNodeSelect(node, treeData)).catch(
        databaseBuilderState.editorStore.applicationStore
          .alertIllegalUnhandledError,
      );
    };

    const isPartiallySelected = (
      node: DatabaseBuilderTreeNodeData,
    ): boolean => {
      if (
        node instanceof SchemaDatabaseBuilderTreeNodeData &&
        !node.isChecked
      ) {
        return Boolean(
          databaseBuilderState
            .getChildNodes(node, treeData)
            ?.find((s) => s.isChecked === true),
        );
      }
      return false;
    };

    const getChildNodes = (
      node: DatabaseBuilderTreeNodeData,
    ): DatabaseBuilderTreeNodeData[] =>
      databaseBuilderState
        .getChildNodes(node, treeData)
        ?.sort((a, b) => a.label.localeCompare(b.label)) ?? [];

    const toggleCheckedNode = (node: DatabaseBuilderTreeNodeData): void => {
      databaseBuilderState.toggleCheckedNode(node, treeData);
    };
    return (
      <TreeView
        components={{
          TreeNodeContainer: DatabaseBuilderTreeNodeContainer,
        }}
        innerProps={{
          toggleCheckedNode,
          isPartiallySelected,
        }}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
      />
    );
  },
);

export const DatabaseBuilder = observer(
  (props: {
    databaseBuilderState: DatabaseBuilderState;
    isReadOnly: boolean;
  }) => {
    const { databaseBuilderState, isReadOnly } = props;
    const buildDb =
      databaseBuilderState.editorStore.applicationStore.guaranteeSafeAction(
        () => flowResult(databaseBuilderState.buildDatabaseWithTreeData()),
      );
    const saveOrUpdateDatabase = (): Promise<void> =>
      flowResult(databaseBuilderState.createOrUpdateDatabase());
    const closeModal = (): void => {
      databaseBuilderState.setShowModal(false);
    };
    const isExecutingAction =
      databaseBuilderState.isBuildingDatabase ||
      databaseBuilderState.isSavingDatabase;

    useEffect(() => {
      flowResult(databaseBuilderState.fetchSchemaDefinitions()).catch(
        databaseBuilderState.editorStore.applicationStore
          .alertIllegalUnhandledError,
      );
    }, [databaseBuilderState]);

    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      if (!databaseBuilderState.currentDatabase) {
        const stringValue = event.target.value;
        const updatedValue = stringValue ? stringValue : undefined;
        databaseBuilderState.setTargetDatabasePath(updatedValue ?? '');
      }
    };

    return (
      <Dialog
        open={databaseBuilderState.showModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <div className="modal modal--dark database-builder">
          <div className="database-builder__heading">
            <div className="database-builder__heading__label">
              Build Database
            </div>
          </div>
          <div className="database-builder__content">
            <PanelLoadingIndicator isLoading={isExecutingAction} />
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel size={450}>
                <div className="database-builder__config">
                  <div className="panel__header">
                    <div className="panel__header__title">
                      <div className="panel__header__title__label">
                        database explorer
                      </div>
                    </div>
                  </div>
                  <div className="panel__content database-builder__config__content">
                    <div className="panel__content__form__section">
                      <div className="panel__content__form__section__header__label">
                        {capitalize('target database path')}
                      </div>
                      <div className="panel__content__form__section__header__prompt">
                        {'path of target database'}
                      </div>
                      <input
                        className="panel__content__form__section__input"
                        spellCheck={false}
                        disabled={
                          isReadOnly ||
                          Boolean(databaseBuilderState.currentDatabase)
                        }
                        value={
                          databaseBuilderState.currentDatabase?.path ??
                          databaseBuilderState.targetDatabasePath
                        }
                        onChange={changeValue}
                      />
                    </div>
                    {databaseBuilderState.treeData && (
                      <DatabaseBuilderExplorer
                        treeData={databaseBuilderState.treeData}
                        isReadOnly={false}
                        databaseBuilderState={databaseBuilderState}
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
                      <div className="panel__header__title__label">builder</div>
                    </div>
                    <div className="panel__header__actions">
                      <button
                        className="panel__header__action"
                        disabled={isReadOnly || isExecutingAction}
                        tabIndex={-1}
                        onClick={buildDb}
                        title={'Build Database...'}
                      >
                        <FireIcon />
                      </button>
                      <button
                        className="panel__header__action"
                        disabled={isReadOnly || isExecutingAction}
                        tabIndex={-1}
                        onClick={saveOrUpdateDatabase}
                        title={
                          databaseBuilderState.currentDatabase
                            ? 'Update database...'
                            : 'Import database...'
                        }
                      >
                        <SaveIcon />
                      </button>
                    </div>
                  </div>
                  <div className="panel__content">
                    <StudioTextInputEditor
                      language={EDITOR_LANGUAGE.PURE}
                      inputValue={databaseBuilderState.databaseGrammarCode}
                      isReadOnly={true}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </Dialog>
    );
  },
);
