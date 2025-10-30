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

import {
  BlankPanelPlaceholder,
  clsx,
  ContextMenu,
  CustomSelectorInput,
  Dialog,
  MenuContent,
  MenuContentItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelFormBooleanField,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  UploadIcon,
} from '@finos/legend-art';
import {
  type Table,
  getAllTablesFromDatabase,
  RelationalCSVDataTable,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { forwardRef, useState } from 'react';
import type { RelationalCSVDataState } from '../../../../stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import {
  relationalData_addTable,
  relationalData_setTableName,
  relationalData_setTableSchemaName,
} from '../../../../stores/graph-modifier/DSL_Data_GraphModifierHelper.js';
import { createMockDataForMappingElementSource } from '../../../../stores/editor/utils/MockDataUtils.js';

export interface TableOption {
  value: Table;
  label: string;
}

const RelationalTableIdentifierEditor = observer(
  (props: { dataState: RelationalCSVDataState; isReadOnly: boolean }) => {
    const { isReadOnly, dataState } = props;
    const applicationStore = dataState.editorStore.applicationStore;
    const resolvedDb = dataState.database;
    const existingDataTable = dataState.tableToEdit;

    // table
    const [schemaName, setSchemaName] = useState<string | undefined>(
      existingDataTable?.schema,
    );
    const [tableName, setTableName] = useState<string | undefined>(
      existingDataTable?.table,
    );
    // selectors if db provided
    const tables = resolvedDb
      ? getAllTablesFromDatabase(resolvedDb)
      : undefined;
    const [dbTable, setDbTable] = useState<Table | undefined>(tables?.[0]);
    const [includeBare, setIncludeBare] = useState(true);
    const showFullPath = resolvedDb && resolvedDb.schemas.length > 2;
    const tableOptions =
      tables?.map((_t) => ({
        label: showFullPath ? `${_t.schema.name}.${_t.name}` : `${_t.name}`,
        value: _t,
      })) ?? [];
    const onTableChange = (val: TableOption | null): void => {
      setDbTable(val?.value);
    };
    const selectedTable = dbTable
      ? {
          label: showFullPath
            ? `${dbTable.schema.name}.${dbTable.name}`
            : `${dbTable.name}`,
          value: dbTable,
        }
      : undefined;
    const closeModal = (): void => dataState.closeModal();
    const changeSchemaValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setSchemaName(event.target.value);
    };
    const changeTableValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setTableName(event.target.value);
    };
    const toggleIncludeBare = (): void => {
      setIncludeBare(!includeBare);
    };
    const useSelector = resolvedDb && !existingDataTable;
    const isDisabled = useSelector ? !dbTable : !(schemaName && tableName);

    const handleSubmit = (): void => {
      const newTable = new RelationalCSVDataTable();
      newTable.values = '';
      const editTable = existingDataTable ?? newTable;
      const _schemaName = useSelector ? dbTable?.schema.name : schemaName;
      const _name = useSelector ? dbTable?.name : tableName;
      relationalData_setTableSchemaName(editTable, _schemaName ?? '');
      relationalData_setTableName(editTable, _name ?? '');
      if (!existingDataTable && dbTable && includeBare) {
        editTable.values = createMockDataForMappingElementSource(
          dbTable,
          dataState.editorStore,
        );
      }
      if (!existingDataTable) {
        relationalData_addTable(dataState.embeddedData, editTable);
        dataState.changeSelectedTable(editTable);
      }
      closeModal();
    };
    return (
      <Dialog
        open={dataState.showTableIdentifierModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: {
            classes: { root: 'search-modal__inner-container' },
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">
            {existingDataTable
              ? 'Rename Relational Data Table'
              : 'Add Relational Data Table'}
          </div>
          <div className="relational-data-editor__identifier">
            {resolvedDb && !existingDataTable ? (
              <>
                <div className="panel__content__form__section">
                  <div className="panel__content__form__section__header__label">
                    Table
                  </div>
                  <div className="explorer__new-element-modal__driver">
                    <CustomSelectorInput
                      className="explorer__new-element-modal__driver__dropdown"
                      options={tableOptions}
                      onChange={onTableChange}
                      value={selectedTable}
                      isClearable={false}
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                    />
                  </div>
                </div>
                <PanelFormBooleanField
                  isReadOnly={isReadOnly}
                  value={includeBare}
                  name="Include Columns and First Row"
                  prompt="Will include table columns and first row using table definition"
                  update={toggleIncludeBare}
                />
              </>
            ) : (
              <>
                <div className="relational-data-editor__identifier__values">
                  <input
                    className="panel__content__form__section__input"
                    disabled={isReadOnly}
                    placeholder="schemaName"
                    value={schemaName}
                    onChange={changeSchemaValue}
                  />
                </div>
                <div className="relational-data-editor__identifier__values">
                  <input
                    className="relational-data-editor__identifier__values panel__content__form__section__input"
                    disabled={isReadOnly}
                    placeholder="tableName"
                    value={tableName}
                    onChange={changeTableValue}
                  />
                </div>
              </>
            )}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={isDisabled || isReadOnly}
            >
              {existingDataTable ? 'Rename' : 'Add'}
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

const ImportModal = observer(
  (props: { dataState: RelationalCSVDataState; isReadOnly: boolean }) => {
    const { isReadOnly, dataState } = props;
    const applicationStore = dataState.editorStore.applicationStore;
    const [csv, setCSV] = useState('');
    const closeModal = (): void => dataState.closeCSVModal();
    const importVal = (): void => {
      dataState.importCSV(csv);
      setCSV('');
      closeModal();
    };
    const changeCSV: React.ChangeEventHandler<
      HTMLTextAreaElement | HTMLInputElement
    > = (event) => {
      setCSV(event.target.value);
    };
    return (
      <Dialog
        open={dataState.showImportCSVModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: {
            classes: { root: 'search-modal__inner-container' },
          },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="relational-data-editor__import"
        >
          <ModalHeader title="Import CSV" />
          <ModalBody>
            <textarea
              className="relational-data-editor__import__textarea"
              spellCheck={false}
              placeholder="CSV Text"
              value={csv}
              onChange={changeCSV}
              disabled={isReadOnly}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Import"
              title="Create new query"
              onClick={importVal}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
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
    const showCSVModal = (): void => dataState.setShowImportCsvModal(true);

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_DATA_RELATIONAL_EDITOR,
    );
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
                  className="schema-set-panel__header__action"
                  onClick={showCSVModal}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title="Import CSV"
                >
                  <UploadIcon />
                </button>
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
                  <CodeEditor
                    inputValue={currentTableState.table.values}
                    updateInput={updateTableValues}
                    isReadOnly={isReadOnly}
                    language={CODE_EDITOR_LANGUAGE.TEXT}
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
                <RelationalTableIdentifierEditor
                  dataState={dataState}
                  isReadOnly={isReadOnly}
                />
              )}
              {dataState.showImportCSVModal && (
                <ImportModal dataState={dataState} isReadOnly={isReadOnly} />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
