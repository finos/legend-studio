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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  PlusIcon,
  LockIcon,
  KeyIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  PanelContent,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalFooterButton,
  InputWithInlineValidation,
  PURE_DatabaseIcon,
  PURE_DatabaseSchemaIcon,
  PURE_DatabaseTableIcon,
} from '@finos/legend-art';
import {
  type Column,
  type Schema,
  type Table,
  stringifyDataType,
} from '@finos/legend-graph';
import {
  DatabaseEditorState,
  COLUMN_DATA_TYPES,
  SIZE_REQUIRED_TYPES,
  PRECISION_SCALE_TYPES,
} from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { renderColumnTypeIcon } from '../connection-editor/DatabaseEditorHelper.js';

// ----------------------------------------
// Schema Tree Explorer (Left panel - SSMS-style)
// ----------------------------------------

// ----------------------------------------
// Table Tree Node (defined before SchemaTreeNode to avoid forward reference)
// ----------------------------------------

const TableTreeNode: React.FC<{
  table: Table;
  state: DatabaseEditorState;
  isReadOnly: boolean;
}> = observer(function TableTreeNode({ table, state, isReadOnly }) {
  const isSelected = state.selectedTable === table;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(table.name);

  const selectTable = (): void => {
    state.setSelectedTable(table);
  };

  const handleRenameSubmit = (): void => {
    state.renameTable(table, renamingValue);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  return (
    <ContextMenu
      className="database-editor__tree__node__context-menu"
      content={
        !isReadOnly ? (
          <MenuContent>
            <MenuContentItem
              onClick={(): void => {
                state.setSelectedTable(table);
                state.openCreateColumnModal();
              }}
            >
              Add Column
            </MenuContentItem>
            <MenuContentItem
              onClick={(): void => {
                setRenamingValue(table.name);
                setIsRenaming(true);
              }}
            >
              Rename
            </MenuContentItem>
            <MenuContentItem onClick={(): void => state.deleteTable(table)}>
              Delete
            </MenuContentItem>
          </MenuContent>
        ) : (
          <MenuContent>
            <div />
          </MenuContent>
        )
      }
    >
      <div
        className={clsx('database-editor__tree__node__container', {
          'database-editor__tree__node__container--selected': isSelected,
        })}
        onClick={selectTable}
        style={{ paddingLeft: 28 }}
      >
        <div className="database-editor__tree__node__type-icon">
          <PURE_DatabaseTableIcon />
        </div>
        {isRenaming ? (
          <input
            className="database-editor__tree__node__rename-input"
            value={renamingValue}
            onChange={(e): void => setRenamingValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            autoFocus={true}
            onClick={(e): void => e.stopPropagation()}
          />
        ) : (
          <div className="database-editor__tree__node__label">{table.name}</div>
        )}
      </div>
    </ContextMenu>
  );
});

// ----------------------------------------
// Schema Tree Node
// ----------------------------------------

const SchemaTreeNode: React.FC<{
  schema: Schema;
  state: DatabaseEditorState;
  isReadOnly: boolean;
}> = observer(function SchemaTreeNode({ schema, state, isReadOnly }) {
  const isSelected = state.selectedSchema === schema;
  const isExpanded = isSelected;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(schema.name);

  const selectSchema = (): void => {
    if (state.selectedSchema === schema && isExpanded) {
      // Toggle collapse
      state.setSelectedSchema(undefined);
    } else {
      state.setSelectedSchema(schema);
    }
  };

  const handleRenameSubmit = (): void => {
    state.renameSchema(schema, renamingValue);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  return (
    <div className="database-editor__tree__node">
      <ContextMenu
        className="database-editor__tree__node__context-menu"
        content={
          !isReadOnly ? (
            <MenuContent>
              <MenuContentItem
                onClick={(): void => {
                  state.setSelectedSchema(schema);
                  state.openCreateTableModal();
                }}
              >
                Add Table
              </MenuContentItem>
              <MenuContentItem
                onClick={(): void => {
                  setRenamingValue(schema.name);
                  setIsRenaming(true);
                }}
              >
                Rename
              </MenuContentItem>
              <MenuContentItem onClick={(): void => state.deleteSchema(schema)}>
                Delete
              </MenuContentItem>
            </MenuContent>
          ) : (
            <MenuContent>
              <div />
            </MenuContent>
          )
        }
      >
        <div
          className={clsx('database-editor__tree__node__container', {
            'database-editor__tree__node__container--selected': isSelected,
          })}
          onClick={selectSchema}
        >
          <div className="database-editor__tree__node__expand-icon">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </div>
          <div className="database-editor__tree__node__type-icon">
            <PURE_DatabaseSchemaIcon />
          </div>
          {isRenaming ? (
            <input
              className="database-editor__tree__node__rename-input"
              value={renamingValue}
              onChange={(e): void => setRenamingValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              autoFocus={true}
              onClick={(e): void => e.stopPropagation()}
            />
          ) : (
            <div className="database-editor__tree__node__label">
              {schema.name}
            </div>
          )}
          <div className="database-editor__tree__node__info">
            {schema.tables.length} table{schema.tables.length !== 1 ? 's' : ''}
          </div>
        </div>
      </ContextMenu>
      {isExpanded && (
        <div className="database-editor__tree__node__children">
          {schema.tables.map((table) => (
            <TableTreeNode
              key={table.name}
              table={table}
              state={state}
              isReadOnly={isReadOnly}
            />
          ))}
          {schema.tables.length === 0 && (
            <div className="database-editor__tree__node__empty">No tables</div>
          )}
        </div>
      )}
    </div>
  );
});

// ----------------------------------------
// Column Form (shared between create & edit modals)
// ----------------------------------------

const ColumnFormFields: React.FC<{
  columnName: string;
  setColumnName: (val: string) => void;
  columnType: string;
  setColumnType: (val: string) => void;
  columnSize: number;
  setColumnSize: (val: number) => void;
  columnNullable: boolean;
  setColumnNullable: (val: boolean) => void;
  columnPrecision: number;
  setColumnPrecision: (val: number) => void;
  columnScale: number;
  setColumnScale: (val: number) => void;
  nameError?: string | undefined;
}> = observer(function ColumnFormFields({
  columnName,
  setColumnName,
  columnType,
  setColumnType,
  columnSize,
  setColumnSize,
  columnNullable,
  setColumnNullable,
  columnPrecision,
  setColumnPrecision,
  columnScale,
  setColumnScale,
  nameError,
}) {
  const showSize = (SIZE_REQUIRED_TYPES as readonly string[]).includes(
    columnType,
  );
  const showPrecisionScale = (
    PRECISION_SCALE_TYPES as readonly string[]
  ).includes(columnType);

  return (
    <div className="database-editor__column-form">
      <div className="database-editor__column-form__field">
        <label className="database-editor__column-form__label">Name</label>
        <InputWithInlineValidation
          className="database-editor__column-form__input input--dark"
          value={columnName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setColumnName(e.target.value)
          }
          placeholder="Column name"
          error={nameError}
        />
      </div>
      <div className="database-editor__column-form__field">
        <label className="database-editor__column-form__label">Type</label>
        <select
          className="database-editor__column-form__select input--dark"
          value={columnType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
            setColumnType(e.target.value)
          }
        >
          {COLUMN_DATA_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      {showSize && (
        <div className="database-editor__column-form__field">
          <label className="database-editor__column-form__label">Size</label>
          <input
            className="database-editor__column-form__input database-editor__column-form__input--number input--dark"
            type="number"
            min={1}
            value={columnSize}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              setColumnSize(parseInt(e.target.value, 10) || 1)
            }
          />
        </div>
      )}
      {showPrecisionScale && (
        <>
          <div className="database-editor__column-form__field">
            <label className="database-editor__column-form__label">
              Precision
            </label>
            <input
              className="database-editor__column-form__input database-editor__column-form__input--number input--dark"
              type="number"
              min={1}
              value={columnPrecision}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setColumnPrecision(parseInt(e.target.value, 10) || 1)
              }
            />
          </div>
          <div className="database-editor__column-form__field">
            <label className="database-editor__column-form__label">Scale</label>
            <input
              className="database-editor__column-form__input database-editor__column-form__input--number input--dark"
              type="number"
              min={0}
              value={columnScale}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setColumnScale(parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
        </>
      )}
      <div className="database-editor__column-form__field database-editor__column-form__field--checkbox">
        <label className="database-editor__column-form__label">Nullable</label>
        <input
          type="checkbox"
          checked={columnNullable}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setColumnNullable(e.target.checked)
          }
        />
      </div>
    </div>
  );
});

// ----------------------------------------
// Create Schema Modal
// ----------------------------------------

const CreateSchemaModal: React.FC<{
  state: DatabaseEditorState;
}> = observer(function CreateSchemaModal({ state }) {
  const handleCreate = (): void => {
    state.addSchema();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  const nameError =
    state.newSchemaName.trim() &&
    state.database.schemas.find((s) => s.name === state.newSchemaName.trim())
      ? 'Schema name already exists'
      : undefined;

  return (
    <Dialog
      open={state.isCreatingSchema}
      onClose={(): void => state.closeModals()}
    >
      <Modal className="database-editor__modal" darkMode={true}>
        <ModalHeader>
          <ModalTitle title="Create Schema" />
        </ModalHeader>
        <ModalBody>
          <div className="database-editor__column-form__field">
            <label className="database-editor__column-form__label">
              Schema Name
            </label>
            <InputWithInlineValidation
              className="database-editor__column-form__input input--dark"
              value={state.newSchemaName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                state.setNewSchemaName(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Enter schema name"
              autoFocus={true}
              error={nameError}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            text="Create"
            onClick={handleCreate}
            disabled={!state.newSchemaName.trim() || !!nameError}
          />
          <ModalFooterButton
            text="Cancel"
            onClick={(): void => state.closeModals()}
            type="secondary"
          />
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});

// ----------------------------------------
// Create Table Modal
// ----------------------------------------

const CreateTableModal: React.FC<{
  state: DatabaseEditorState;
}> = observer(function CreateTableModal({ state }) {
  const handleCreate = (): void => {
    state.addTable();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  const nameError =
    state.newTableName.trim() &&
    state.selectedSchema?.tables.find(
      (t) => t.name === state.newTableName.trim(),
    )
      ? 'Table name already exists'
      : undefined;

  return (
    <Dialog
      open={state.isCreatingTable}
      onClose={(): void => state.closeModals()}
    >
      <Modal className="database-editor__modal" darkMode={true}>
        <ModalHeader>
          <ModalTitle
            title={`Create Table in '${state.selectedSchema?.name ?? ''}'`}
          />
        </ModalHeader>
        <ModalBody>
          <div className="database-editor__column-form__field">
            <label className="database-editor__column-form__label">
              Table Name
            </label>
            <InputWithInlineValidation
              className="database-editor__column-form__input input--dark"
              value={state.newTableName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                state.setNewTableName(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Enter table name"
              autoFocus={true}
              error={nameError}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            text="Create"
            onClick={handleCreate}
            disabled={!state.newTableName.trim() || !!nameError}
          />
          <ModalFooterButton
            text="Cancel"
            onClick={(): void => state.closeModals()}
            type="secondary"
          />
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});

// ----------------------------------------
// Create Column Modal
// ----------------------------------------

const CreateColumnModal: React.FC<{
  state: DatabaseEditorState;
}> = observer(function CreateColumnModal({ state }) {
  const handleCreate = (): void => {
    state.addColumn();
  };

  return (
    <Dialog
      open={state.isCreatingColumn}
      onClose={(): void => state.closeModals()}
    >
      <Modal className="database-editor__modal" darkMode={true}>
        <ModalHeader>
          <ModalTitle
            title={`Add Column to '${state.selectedTable?.name ?? ''}'`}
          />
        </ModalHeader>
        <ModalBody>
          <ColumnFormFields
            columnName={state.newColumnName}
            setColumnName={(val): void => state.setNewColumnName(val)}
            columnType={state.newColumnType}
            setColumnType={(val): void => state.setNewColumnType(val)}
            columnSize={state.newColumnSize}
            setColumnSize={(val): void => state.setNewColumnSize(val)}
            columnNullable={state.newColumnNullable}
            setColumnNullable={(val): void => state.setNewColumnNullable(val)}
            columnPrecision={state.newColumnPrecision}
            setColumnPrecision={(val): void => state.setNewColumnPrecision(val)}
            columnScale={state.newColumnScale}
            setColumnScale={(val): void => state.setNewColumnScale(val)}
          />
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            text="Add Column"
            onClick={handleCreate}
            disabled={!state.newColumnName.trim()}
          />
          <ModalFooterButton
            text="Cancel"
            onClick={(): void => state.closeModals()}
            type="secondary"
          />
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});

// ----------------------------------------
// Edit Column Modal
// ----------------------------------------

const EditColumnModal: React.FC<{
  state: DatabaseEditorState;
}> = observer(function EditColumnModal({ state }) {
  const handleUpdate = (): void => {
    state.updateColumn();
  };

  return (
    <Dialog
      open={state.isEditingColumn}
      onClose={(): void => state.closeModals()}
    >
      <Modal className="database-editor__modal" darkMode={true}>
        <ModalHeader>
          <ModalTitle title="Edit Column" />
        </ModalHeader>
        <ModalBody>
          <ColumnFormFields
            columnName={state.editColumnName}
            setColumnName={(val): void => state.setEditColumnName(val)}
            columnType={state.editColumnType}
            setColumnType={(val): void => state.setEditColumnType(val)}
            columnSize={state.editColumnSize}
            setColumnSize={(val): void => state.setEditColumnSize(val)}
            columnNullable={state.editColumnNullable}
            setColumnNullable={(val): void => state.setEditColumnNullable(val)}
            columnPrecision={state.editColumnPrecision}
            setColumnPrecision={(val): void =>
              state.setEditColumnPrecision(val)
            }
            columnScale={state.editColumnScale}
            setColumnScale={(val): void => state.setEditColumnScale(val)}
          />
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            text="Update"
            onClick={handleUpdate}
            disabled={!state.editColumnName.trim()}
          />
          <ModalFooterButton
            text="Cancel"
            onClick={(): void => state.closeModals()}
            type="secondary"
          />
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});

// ----------------------------------------
// Column Grid (Right panel - SSMS-style table designer)
// ----------------------------------------

const ColumnRow: React.FC<{
  column: Column;
  isPrimaryKey: boolean;
  state: DatabaseEditorState;
  isReadOnly: boolean;
}> = observer(function ColumnRow({ column, isPrimaryKey, state, isReadOnly }) {
  return (
    <ContextMenu
      className="database-editor__column-grid__row-context"
      content={
        !isReadOnly ? (
          <MenuContent>
            <MenuContentItem
              onClick={(): void => state.openEditColumnModal(column)}
            >
              Edit Column
            </MenuContentItem>
            <MenuContentItem
              onClick={(): void => state.toggleColumnPrimaryKey(column)}
            >
              {isPrimaryKey ? 'Remove from Primary Key' : 'Add to Primary Key'}
            </MenuContentItem>
            <MenuContentItem onClick={(): void => state.deleteColumn(column)}>
              Delete Column
            </MenuContentItem>
          </MenuContent>
        ) : (
          <MenuContent>
            <div />
          </MenuContent>
        )
      }
    >
      <div
        className={clsx('database-editor__column-grid__row', {
          'database-editor__column-grid__row--selected':
            state.selectedColumn === column,
        })}
        onClick={(): void => state.setSelectedColumn(column)}
        onDoubleClick={(): void => {
          if (!isReadOnly) {
            state.openEditColumnModal(column);
          }
        }}
      >
        <div className="database-editor__column-grid__cell database-editor__column-grid__cell--pk">
          {isPrimaryKey && (
            <KeyIcon className="database-editor__column-grid__pk-icon" />
          )}
        </div>
        <div className="database-editor__column-grid__cell database-editor__column-grid__cell--name">
          {column.name}
        </div>
        <div className="database-editor__column-grid__cell database-editor__column-grid__cell--type">
          <div className="database-editor__column-grid__type-icon">
            {renderColumnTypeIcon(column.type)}
          </div>
          <span>{stringifyDataType(column.type)}</span>
        </div>
        <div className="database-editor__column-grid__cell database-editor__column-grid__cell--nullable">
          {column.nullable ? 'Yes' : 'No'}
        </div>
      </div>
    </ContextMenu>
  );
});

const ColumnGrid: React.FC<{
  state: DatabaseEditorState;
  isReadOnly: boolean;
}> = observer(function ColumnGrid({ state, isReadOnly }) {
  const table = state.selectedTable;

  if (!table) {
    return (
      <div className="database-editor__column-grid__placeholder">
        <div className="database-editor__column-grid__placeholder__text">
          Select a table to view its columns
        </div>
      </div>
    );
  }

  const columns = table.columns.filter(
    (c): c is Column => 'name' in c && 'type' in c,
  );

  return (
    <div className="database-editor__column-grid">
      <div className="database-editor__column-grid__header-bar">
        <div className="database-editor__column-grid__header-title">
          <PURE_DatabaseTableIcon />
          <span className="database-editor__column-grid__header-title__text">
            {state.selectedSchema?.name}.{table.name}
          </span>
        </div>
        {!isReadOnly && (
          <button
            className="database-editor__header__action btn--dark btn--sm"
            onClick={(): void => state.openCreateColumnModal()}
            title="Add Column"
          >
            <PlusIcon />
            <span>Add Column</span>
          </button>
        )}
      </div>
      <div className="database-editor__column-grid__table">
        <div className="database-editor__column-grid__header">
          <div className="database-editor__column-grid__cell database-editor__column-grid__cell--pk database-editor__column-grid__cell--header">
            PK
          </div>
          <div className="database-editor__column-grid__cell database-editor__column-grid__cell--name database-editor__column-grid__cell--header">
            Column Name
          </div>
          <div className="database-editor__column-grid__cell database-editor__column-grid__cell--type database-editor__column-grid__cell--header">
            Data Type
          </div>
          <div className="database-editor__column-grid__cell database-editor__column-grid__cell--nullable database-editor__column-grid__cell--header">
            Nullable
          </div>
        </div>
        <div className="database-editor__column-grid__body">
          {columns.map((column) => (
            <ColumnRow
              key={column.name}
              column={column}
              isPrimaryKey={table.primaryKey.includes(column)}
              state={state}
              isReadOnly={isReadOnly}
            />
          ))}
          {columns.length === 0 && (
            <div className="database-editor__column-grid__empty">
              No columns defined.{' '}
              {!isReadOnly &&
                'Right-click or use the button above to add columns.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ----------------------------------------
// Schema Explorer (Left panel)
// ----------------------------------------

const DatabaseSchemaExplorerPanel: React.FC<{
  state: DatabaseEditorState;
  isReadOnly: boolean;
}> = observer(function DatabaseSchemaExplorerPanel({ state, isReadOnly }) {
  return (
    <div className="database-editor__explorer">
      <div className="database-editor__explorer__header">
        <div className="database-editor__explorer__header__title">
          <PURE_DatabaseIcon />
          <span>Schemas</span>
        </div>
        {!isReadOnly && (
          <button
            className="database-editor__header__action btn--dark btn--sm"
            onClick={(): void => state.openCreateSchemaModal()}
            title="Add Schema"
          >
            <PlusIcon />
          </button>
        )}
      </div>
      <PanelContent>
        <div className="database-editor__tree">
          {state.database.schemas.map((schema) => (
            <SchemaTreeNode
              key={schema.name}
              schema={schema}
              state={state}
              isReadOnly={isReadOnly}
            />
          ))}
          {state.database.schemas.length === 0 && (
            <div className="database-editor__tree__empty">
              No schemas defined.
              {!isReadOnly && ' Click + to add a schema.'}
            </div>
          )}
        </div>
      </PanelContent>
    </div>
  );
});

// ----------------------------------------
// Main Database Editor
// ----------------------------------------

export const DatabaseEditor = observer(() => {
  const editorStore = useEditorStore();
  const dbEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DatabaseEditorState);
  const isReadOnly = dbEditorState.isReadOnly;
  const database = dbEditorState.database;

  return (
    <div className="database-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">database</div>
            <div className="panel__header__title__content">{database.name}</div>
          </div>
        </div>
        <div className="panel__content database-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={280} minSize={200}>
              <DatabaseSchemaExplorerPanel
                state={dbEditorState}
                isReadOnly={isReadOnly}
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-light-grey-400)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={400}>
              <ColumnGrid state={dbEditorState} isReadOnly={isReadOnly} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
      {/* Modals */}
      {dbEditorState.isCreatingSchema && (
        <CreateSchemaModal state={dbEditorState} />
      )}
      {dbEditorState.isCreatingTable && (
        <CreateTableModal state={dbEditorState} />
      )}
      {dbEditorState.isCreatingColumn && (
        <CreateColumnModal state={dbEditorState} />
      )}
      {dbEditorState.isEditingColumn && (
        <EditColumnModal state={dbEditorState} />
      )}
    </div>
  );
});
