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
} from '@finos/legend-art';
import { useEffect } from 'react';
import {
  type DatabaseBuilderState,
  type DatabaseBuilderTreeData,
  type DatabaseBuilderTreeNodeData,
  ColumnDatabaseBuilderTreeNodeData,
  SchemaDatabaseBuilderTreeNodeData,
  TableDatabaseBuilderTreeNodeData,
} from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseBuilderState.js';
import { noop } from '@finos/legend-shared';
import {
  useApplicationStore,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { renderColumnTypeIcon } from './DatabaseEditorHelper.js';
import { flowResult } from 'mobx';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { stringifyDataType } from '@finos/legend-graph';

const getDatabaseSchemaNodeIcon = (
  node: DatabaseBuilderTreeNodeData,
): React.ReactNode => {
  if (node instanceof SchemaDatabaseBuilderTreeNodeData) {
    return (
      <div className="database-builder-tree__icon--schema">
        <PURE_DatabaseSchemaIcon />
      </div>
    );
  } else if (node instanceof TableDatabaseBuilderTreeNodeData) {
    return (
      <div className="database-builder-tree__icon--table">
        <PURE_DatabaseTableIcon />
      </div>
    );
  } else if (node instanceof ColumnDatabaseBuilderTreeNodeData) {
    return renderColumnTypeIcon(node.column.type);
  }
  return null;
};

const DatabaseBuilderTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      DatabaseBuilderTreeNodeData,
      {
        toggleCheckedNode: (node: DatabaseBuilderTreeNodeData) => void;
        isPartiallySelected: (node: DatabaseBuilderTreeNodeData) => boolean;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { toggleCheckedNode, isPartiallySelected } = innerProps;
    const isExpandable =
      Boolean(!node.childrenIds || node.childrenIds.length) &&
      !(node instanceof ColumnDatabaseBuilderTreeNodeData);
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
    const toggleExpandNode = (): void => {
      onNodeSelect?.(node);
      if (!isExpandable) {
        toggleCheckedNode(node);
      }
    };
    const isPrimaryKeyColumn =
      node instanceof ColumnDatabaseBuilderTreeNodeData &&
      node.owner.primaryKey.includes(node.column);

    const renderCheckedIcon = (
      _node: DatabaseBuilderTreeNodeData,
    ): React.ReactNode => {
      if (_node instanceof ColumnDatabaseBuilderTreeNodeData) {
        return null;
      } else if (isPartiallySelected(_node)) {
        return <CircleIcon />;
      } else if (_node.isChecked) {
        return <CheckCircleIcon />;
      }
      return <EmptyCircleIcon />;
    };

    return (
      <div
        className={clsx('tree-view__node__container')}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
        onClick={toggleExpandNode}
      >
        <div className="tree-view__node__icon database-builder-tree__node__icon__group">
          <div className="database-builder-tree__expand-icon">
            {nodeExpandIcon}
          </div>
          <div
            className={clsx('database-builder-tree__checker-icon')}
            onClick={(event) => {
              event.stopPropagation();
              toggleCheckedNode(node);
            }}
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
        <div className="tree-view__node__label database-builder-tree__node__label">
          {node.label}
          {node instanceof ColumnDatabaseBuilderTreeNodeData && (
            <div className="database-builder-tree__node__type">
              <div className="database-builder-tree__node__type__label">
                {stringifyDataType(node.column.type)}
              </div>
            </div>
          )}
          {isPrimaryKeyColumn && (
            <div
              className="database-builder-tree__node__pk"
              title="Primary Key"
            >
              <KeyIcon />
            </div>
          )}
        </div>
      </div>
    );
  },
);

export const DatabaseBuilderExplorer = observer(
  (props: {
    treeData: DatabaseBuilderTreeData;
    isReadOnly: boolean;
    databaseBuilderState: DatabaseBuilderState;
  }) => {
    const { treeData, databaseBuilderState } = props;
    const applicationStore = useApplicationStore();
    const onNodeSelect = (node: DatabaseBuilderTreeNodeData): void => {
      flowResult(databaseBuilderState.onNodeSelect(node, treeData)).catch(
        applicationStore.alertUnhandledError,
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
        className="database-builder-tree"
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
    const applicationStore = useApplicationStore();
    const preview = applicationStore.guardUnhandledError(() =>
      flowResult(databaseBuilderState.previewDatabaseModel()),
    );
    const saveOrUpdateDatabase = applicationStore.guardUnhandledError(() =>
      flowResult(databaseBuilderState.createOrUpdateDatabase()),
    );
    const closeModal = (): void => {
      databaseBuilderState.setShowModal(false);
      databaseBuilderState.editorStore.explorerTreeState.setDatabaseBuilderState(
        undefined,
      );
    };
    const isExecutingAction =
      databaseBuilderState.isBuildingDatabase ||
      databaseBuilderState.isSavingDatabase;

    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      if (!databaseBuilderState.currentDatabase) {
        const stringValue = event.target.value;
        const updatedValue = stringValue ? stringValue : undefined;
        databaseBuilderState.setTargetDatabasePath(updatedValue ?? '');
      }
    };

    useEffect(() => {
      flowResult(databaseBuilderState.fetchDatabaseMetadata()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [databaseBuilderState, applicationStore]);

    useConditionedApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATABASE_BUILDER,
      databaseBuilderState.showModal,
    );

    return (
      <Dialog
        open={databaseBuilderState.showModal}
        onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
        classes={{ container: 'search-modal__container' }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container database-builder__container',
          },
        }}
      >
        <Modal darkMode={true} className="database-builder">
          <ModalHeader>
            <ModalTitle title="Database Builder" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={closeModal}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody className="database-builder__content">
            <PanelLoadingIndicator isLoading={isExecutingAction} />
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
                      <div className="panel__header__title__label">
                        database model
                      </div>
                    </div>
                  </div>
                  <PanelContent>
                    <div className="database-builder__modeller">
                      <div className="panel__content__form__section database-builder__modeller__path">
                        <div className="panel__content__form__section__header__label">
                          Target Database Path
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
                      <div className="database-builder__modeller__preview">
                        {databaseBuilderState.databaseGrammarCode && (
                          <CodeEditor
                            language={CODE_EDITOR_LANGUAGE.PURE}
                            inputValue={
                              databaseBuilderState.databaseGrammarCode
                            }
                            isReadOnly={true}
                          />
                        )}
                        {!databaseBuilderState.databaseGrammarCode && (
                          <BlankPanelContent>
                            No database preview
                          </BlankPanelContent>
                        )}
                      </div>
                    </div>
                  </PanelContent>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={preview}
              title="Preview database model..."
            >
              Preview
            </ModalFooterButton>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={saveOrUpdateDatabase}
            >
              {databaseBuilderState.currentDatabase
                ? 'Update Database'
                : 'Build Database'}
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
