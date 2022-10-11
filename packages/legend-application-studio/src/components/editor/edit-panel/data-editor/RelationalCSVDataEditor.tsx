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

import { EDITOR_LANGUAGE } from '@finos/legend-application';
import {
  BlankPanelPlaceholder,
  clsx,
  ContextMenu,
  Dialog,
  MenuContent,
  MenuContentItem,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import type { RelationalCSVDataTable } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { forwardRef, useState } from 'react';
import type { RelationalCSVDataState } from '../../../../stores/editor-state/element-editor-state/data/EmbeddedDataState.js';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor.js';

const RelationalTableIdentifierModal = observer(
  (props: { dataState: RelationalCSVDataState; isReadOnly: boolean }) => {
    const { isReadOnly, dataState } = props;
    const tableIdentifierState = dataState.tableIdentifierState;
    const editableTable = tableIdentifierState.table;
    const closeModal = (): void => dataState.closeModal();
    const handleSubmit = (): void => {
      tableIdentifierState.handleSubmit();
      closeModal();
    };
    const changeTableValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      tableIdentifierState.setTableName(event.target.value);
    };
    const changeSchemaValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      tableIdentifierState.setSchemaName(event.target.value);
    };
    return (
      <Dialog
        open={dataState.showTableIdentifierModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={handleSubmit}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">
            {editableTable
              ? 'Rename Relational Data Table'
              : 'Add Relational Data Table'}{' '}
          </div>
          <div className="relational-data-editor__identifier">
            <div className="relational-data-editor__identifier__values">
              <input
                className="panel__content__form__section__input"
                disabled={isReadOnly}
                placeholder="schemaName"
                value={tableIdentifierState.schemaName}
                onChange={changeSchemaValue}
              />
            </div>
            <div className="relational-data-editor__identifier__values">
              <input
                className="relational-data-editor__identifier__values panel__content__form__section__input"
                disabled={isReadOnly}
                placeholder="tableName"
                value={tableIdentifierState.tableName}
                onChange={changeTableValue}
              />
            </div>
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={tableIdentifierState.isEditingDisabled || isReadOnly}
            >
              {editableTable ? 'Rename' : 'Add'}
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const RelationalCSVTableContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      dataState: RelationalCSVDataState;
      table: RelationalCSVDataTable;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { dataState, table } = props;
    const rename = (): void => dataState.openIdentifierModal(table);
    const remove = (): void => dataState.deleteTable(table);
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={remove}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

export const RelationalCSVDataEditor = observer(
  (props: { dataState: RelationalCSVDataState; isReadOnly: boolean }) => {
    const { dataState, isReadOnly } = props;
    const currentTableState = dataState.selectedTable;
    const openIdentifierModal = (): void => dataState.openIdentifierModal();
    const changeSelectedTable = (table: RelationalCSVDataTable): void => {
      dataState.changeSelectedTable(table);
    };
    const updateTableValues = (val: string): void => {
      currentTableState?.updateTableValues(val);
    };
    const [selectedTableFromContextMenu, setSelectedTableFromContextMenu] =
      useState<RelationalCSVDataTable | undefined>(undefined);
    const onContextMenuOpen = (table: RelationalCSVDataTable): void =>
      setSelectedTableFromContextMenu(table);
    const onContextMenuClose = (): void =>
      setSelectedTableFromContextMenu(undefined);
    const isTableActive = (table: RelationalCSVDataTable): boolean =>
      currentTableState?.table === table;
    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel minSize={30} size={300}>
          <div className="relational-data-editor">
            <div className="relational-data-editor__header">
              <div className="relational-data-editor__header__title">
                <div className="relational-data-editor__header__title__label">
                  Relational Table Explorer
                </div>
              </div>
              <div className="relational-data-editor__header__actions">
                <button
                  className="relational-data-editor__header__action"
                  onClick={openIdentifierModal}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title="Add Relational Table Data"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            <MenuContent className="relational-data-editor__content">
              {dataState.embeddedData.tables.map(
                (_table: RelationalCSVDataTable) => (
                  <ContextMenu
                    key={`${_table.table}.${_table.schema}`}
                    className={clsx(
                      'relational-data-editor-explorer__item',
                      {
                        'relational-data-editor-explorer__item--selected-from-context-menu':
                          !isTableActive(_table) &&
                          selectedTableFromContextMenu ===
                            currentTableState?.table,
                      },
                      {
                        'relational-data-editor-explorer__item--active':
                          isTableActive(_table),
                      },
                    )}
                    disabled={isReadOnly}
                    content={
                      <RelationalCSVTableContextMenu
                        dataState={dataState}
                        table={_table}
                      />
                    }
                    menuProps={{ elevation: 7 }}
                    onOpen={(): void => onContextMenuOpen(_table)}
                    onClose={(): void => onContextMenuClose()}
                  >
                    <button
                      className={clsx(
                        'relational-data-editor-explorer__item__label',
                      )}
                      onClick={(): void => changeSelectedTable(_table)}
                      tabIndex={-1}
                    >
                      <div className="relational-data-editor-explorer__item__label__text">
                        {`${_table.schema}.${_table.table}`}
                      </div>
                    </button>
                  </ContextMenu>
                ),
              )}
            </MenuContent>
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          <div className="relational-data-editor">
            <div className="relational-data-editor__header">
              <div className="relational-data-editor__header__title">
                <div className="relational-data-editor__header__title__label">
                  CSV Values
                </div>
              </div>
            </div>
            <div className="relational-data-editor__content">
              {currentTableState && (
                <div className="relational-data-editor__values">
                  <StudioTextInputEditor
                    inputValue={currentTableState.table.values}
                    updateInput={updateTableValues}
                    isReadOnly={isReadOnly}
                    language={EDITOR_LANGUAGE.TEXT}
                  />
                </div>
              )}
              {!currentTableState && (
                <BlankPanelPlaceholder
                  onClick={(): void => openIdentifierModal()}
                  text="Add a relational data table"
                  clickActionType="add"
                  tooltipText="Click to add new relational data table"
                />
              )}
              {dataState.showTableIdentifierModal && (
                <RelationalTableIdentifierModal
                  dataState={dataState}
                  isReadOnly={isReadOnly}
                />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
