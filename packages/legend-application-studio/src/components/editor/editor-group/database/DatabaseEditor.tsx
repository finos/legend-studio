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
  clsx,
  PanelContent,
  PanelLoadingIndicator,
  BlankPanelPlaceholder,
} from '@finos/legend-art';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';
import {
  type Schema,
  type Table,
  type Column,
  isElementReadOnly,
} from '@finos/legend-graph';
import { ColumnEditor } from './ColumnEditor.js';

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

    return (
      <div
        className={clsx('database-editor__schema-item', {
          'database-editor__schema-item--selected': isSelected,
        })}
        onClick={selectSchema}
      >
        <div className="database-editor__schema-item__name">{schema.name}</div>
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

    return (
      <div
        className={clsx('database-editor__table-item', {
          'database-editor__table-item--selected': isSelected,
        })}
        onClick={selectTable}
      >
        <div className="database-editor__table-item__name">{table.name}</div>
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
      </div>
    );
  },
);

export const DatabaseEditor = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const database = editorState.database;
    const isReadOnly = isElementReadOnly(database);

    return (
      <div className="database-editor">
        <div className="database-editor__content">
          <div className="database-editor__schemas-panel">
            <div className="database-editor__panel-header">
              <div className="database-editor__panel-header__title">
                Schemas
              </div>
            </div>
            <PanelContent>
              <PanelLoadingIndicator isLoading={editorState.isLoadingSchemas} />
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
          <div className="database-editor__tables-panel">
            <div className="database-editor__panel-header">
              <div className="database-editor__panel-header__title">Tables</div>
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
          <div className="database-editor__columns-panel">
            <div className="database-editor__panel-header">
              <div className="database-editor__panel-header__title">
                Columns
              </div>
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
