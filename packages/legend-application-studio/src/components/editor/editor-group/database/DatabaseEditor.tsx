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
import { useState } from 'react';
import {
  clsx,
  PanelContent,
  PanelLoadingIndicator,
  BlankPanelPlaceholder,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  PlusIcon,
  TrashIcon,
  Button,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Dialog,
  Modal,
  PanelFormTextField,
  CustomSelectorInput,
} from '@finos/legend-art';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';
import {
  type Schema,
  type Table,
  type Column,
  isElementReadOnly,
  RelationalDataType,
  Integer,
} from '@finos/legend-graph';
import {
  ColumnEditor,
  type RelationalDataTypeOption,
  RELATIONAL_DATA_TYPE_OPTIONS,
  getRelationalDataTypeOption,
} from './ColumnEditor.js';

const SchemaItem = observer(
  (props: {
    schema: Schema;
    editorState: DatabaseEditorState;
    isReadOnly: boolean;
  }) => {
    const { schema, editorState } = props;
    const isSelected = editorState.selectedSchema === schema;

    const selectSchema = (): void => {
      editorState.setSelectedSchema(isSelected ? undefined : schema);
    };

    const deleteSchema = (e: React.MouseEvent): void => {
      e.stopPropagation();
      editorState.deleteSchema(schema);
    };

    return (
      <div
        className={clsx('database-editor__schema-item', {
          'database-editor__schema-item--selected': isSelected,
        })}
        onClick={selectSchema}
      >
        <div className="database-editor__schema-item__name">{schema.name}</div>
        {!props.isReadOnly && (
          <button
            className="database-editor__item-delete-btn"
            onClick={deleteSchema}
            tabIndex={-1}
            title="Delete schema"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    );
  },
);

const TableItem = observer(
  (props: {
    table: Table;
    editorState: DatabaseEditorState;
    isReadOnly: boolean;
  }) => {
    const { table, editorState } = props;
    const isSelected = editorState.selectedTable === table;

    const selectTable = (): void => {
      editorState.setSelectedTable(isSelected ? undefined : table);
    };

    const deleteTable = (e: React.MouseEvent): void => {
      e.stopPropagation();
      editorState.deleteTable(table);
    };

    return (
      <div
        className={clsx('database-editor__table-item', {
          'database-editor__table-item--selected': isSelected,
        })}
        onClick={selectTable}
      >
        <div className="database-editor__table-item__name">{table.name}</div>
        {!props.isReadOnly && (
          <button
            className="database-editor__item-delete-btn"
            onClick={deleteTable}
            tabIndex={-1}
            title="Delete table"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    );
  },
);

const ColumnItem = observer(
  (props: {
    column: Column;
    editorState: DatabaseEditorState;
    isReadOnly: boolean;
  }) => {
    const { column, editorState } = props;
    const isSelected = editorState.selectedColumn === column;

    const selectColumn = (): void => {
      editorState.setSelectedColumn(isSelected ? undefined : column);
    };

    const deleteColumn = (e: React.MouseEvent): void => {
      e.stopPropagation();
      editorState.deleteColumn(column);
    };

    return (
      <div
        className={clsx('database-editor__column-item', {
          'database-editor__column-item--selected': isSelected,
        })}
        onClick={selectColumn}
      >
        <div className="database-editor__column-item__name">{column.name}</div>
        <div className="database-editor__column-item__type">
          {String(column.type)}
        </div>
        {!props.isReadOnly && (
          <button
            className="database-editor__item-delete-btn"
            onClick={deleteColumn}
            tabIndex={-1}
            title="Delete column"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    );
  },
);

const CreateSchemaModal = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const [schemaName, setSchemaName] = useState<string>('');
    const applicationStore = editorState.editorStore.applicationStore;

    const close = (): void => {
      editorState.setShowCreateSchemaModal(false);
      setSchemaName('');
    };

    const create = (): void => {
      if (schemaName.trim()) {
        editorState.addSchema(schemaName.trim());
        close();
      }
    };

    return (
      <Dialog
        open={editorState.showCreateSchemaModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader title="Create Schema" />
          <ModalBody>
            <PanelFormTextField
              name="Name"
              prompt="Schema name"
              value={schemaName}
              update={(value: string | undefined): void =>
                setSchemaName(value ?? '')
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button
              disabled={!schemaName.trim()}
              onClick={create}
              text="Create"
            />
            <Button onClick={close} text="Cancel" className="btn--secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const CreateTableModal = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const [tableName, setTableName] = useState<string>('');
    const applicationStore = editorState.editorStore.applicationStore;
    const schema = editorState.selectedSchema;

    const close = (): void => {
      editorState.setShowCreateTableModal(false);
      setTableName('');
    };

    const create = (): void => {
      if (schema && tableName.trim()) {
        editorState.addTable(schema, tableName.trim());
        close();
      }
    };

    return (
      <Dialog
        open={editorState.showCreateTableModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader title="Create Table" />
          <ModalBody>
            <PanelFormTextField
              name="Name"
              prompt="Table name"
              value={tableName}
              update={(value: string | undefined): void =>
                setTableName(value ?? '')
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button
              disabled={!tableName.trim() || !schema}
              onClick={create}
              text="Create"
            />
            <Button onClick={close} text="Cancel" className="btn--secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const CreateColumnModal = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const [columnName, setColumnName] = useState<string>('');
    const [columnType, setColumnType] = useState<RelationalDataType>(
      new Integer(),
    );
    const applicationStore = editorState.editorStore.applicationStore;
    const table = editorState.selectedTable;

    const close = (): void => {
      editorState.setShowCreateColumnModal(false);
      setColumnName('');
      setColumnType(new Integer());
    };

    const create = (): void => {
      if (table && columnName.trim()) {
        editorState.addColumn(table, columnName.trim(), columnType);
        close();
      }
    };

    const updateColumnType = (
      option: RelationalDataTypeOption | null,
    ): void => {
      if (option) {
        setColumnType(option.create());
      }
    };

    return (
      <Dialog
        open={editorState.showCreateColumnModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader title="Create Column" />
          <ModalBody>
            <PanelFormTextField
              name="Name"
              prompt="Column name"
              value={columnName}
              update={(value: string | undefined): void =>
                setColumnName(value ?? '')
              }
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Type
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown"
                options={RELATIONAL_DATA_TYPE_OPTIONS}
                onChange={updateColumnType}
                value={getRelationalDataTypeOption(columnType) ?? null}
                isClearable={false}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              disabled={!columnName.trim() || !table}
              onClick={create}
              text="Create"
            />
            <Button onClick={close} text="Cancel" className="btn--secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const DatabaseEditor = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const database = editorState.database;
    const isReadOnly = isElementReadOnly(database);

    const openCreateSchemaModal = (): void => {
      editorState.setShowCreateSchemaModal(true);
    };

    const openCreateTableModal = (): void => {
      editorState.setShowCreateTableModal(true);
    };

    const openCreateColumnModal = (): void => {
      editorState.setShowCreateColumnModal(true);
    };

    return (
      <div className="database-editor">
        {editorState.showCreateSchemaModal && (
          <CreateSchemaModal editorState={editorState} />
        )}
        {editorState.showCreateTableModal && (
          <CreateTableModal editorState={editorState} />
        )}
        {editorState.showCreateColumnModal && (
          <CreateColumnModal editorState={editorState} />
        )}
        <div className="database-editor__content">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel minSize={200}>
              <div className="database-editor__schemas-panel">
                <div className="database-editor__panel-header">
                  <div className="database-editor__panel-header__title">
                    Schemas
                  </div>
                  {!isReadOnly && (
                    <button
                      className="database-editor__panel-header__action"
                      onClick={openCreateSchemaModal}
                      tabIndex={-1}
                      title="Add schema"
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>
                <PanelContent>
                  <PanelLoadingIndicator
                    isLoading={editorState.isLoadingSchemas}
                  />
                  {!database.schemas.length && (
                    <BlankPanelPlaceholder
                      text="No schemas available"
                      tooltipText="No schemas available"
                    />
                  )}
                  {database.schemas.map((schema) => (
                    <SchemaItem
                      key={schema.name}
                      schema={schema}
                      editorState={editorState}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </PanelContent>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel minSize={200}>
              <div className="database-editor__tables-panel">
                <div className="database-editor__panel-header">
                  <div className="database-editor__panel-header__title">
                    Tables
                  </div>
                  {!isReadOnly && editorState.selectedSchema && (
                    <button
                      className="database-editor__panel-header__action"
                      onClick={openCreateTableModal}
                      tabIndex={-1}
                      title="Add table"
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>
                <PanelContent>
                  {!editorState.selectedSchema && (
                    <BlankPanelPlaceholder
                      text="Select a schema to view tables"
                      tooltipText="Select a schema to view tables"
                    />
                  )}
                  {editorState.selectedSchema &&
                    !editorState.selectedSchema.tables.length && (
                      <BlankPanelPlaceholder
                        text="No tables available in this schema"
                        tooltipText="No tables available in this schema"
                      />
                    )}
                  {editorState.selectedSchema?.tables.map((table) => (
                    <TableItem
                      key={table.name}
                      table={table}
                      editorState={editorState}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </PanelContent>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel minSize={200}>
              <div className="database-editor__columns-panel">
                <div className="database-editor__panel-header">
                  <div className="database-editor__panel-header__title">
                    Columns
                  </div>
                  {!isReadOnly && editorState.selectedTable && (
                    <button
                      className="database-editor__panel-header__action"
                      onClick={openCreateColumnModal}
                      tabIndex={-1}
                      title="Add column"
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>
                <PanelContent>
                  {!editorState.selectedTable && (
                    <BlankPanelPlaceholder
                      text="Select a table to view columns"
                      tooltipText="Select a table to view columns"
                    />
                  )}
                  {editorState.selectedTable &&
                    !editorState.selectedTable.columns.length && (
                      <BlankPanelPlaceholder
                        text="No columns available in this table"
                        tooltipText="No columns available in this table"
                      />
                    )}
                  {editorState.selectedTable?.columns.map((column) => {
                    const typedColumn = column as unknown as Column;
                    return (
                      <ColumnItem
                        key={guaranteeNonNullable(typedColumn.name)}
                        column={typedColumn}
                        editorState={editorState}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })}
                </PanelContent>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        {editorState.selectedColumn && (
          <ColumnEditor
            column={editorState.selectedColumn}
            isReadOnly={isReadOnly}
            onClose={() => editorState.setSelectedColumn(undefined)}
          />
        )}
      </div>
    );
  },
);
