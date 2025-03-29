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

import { action, computed, makeObservable, observable } from 'mobx';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type PackageableElement,
  Database,
  RelationalDataType,
  Schema,
  Table,
  Column,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';

export class DatabaseEditorState extends ElementEditorState {
  selectedSchema: Schema | undefined;
  selectedTable: Table | undefined;
  selectedColumn: Column | undefined;
  isLoadingSchemas = false;
  showCreateSchemaModal = false;
  showCreateTableModal = false;
  showCreateColumnModal = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedSchema: observable,
      selectedTable: observable,
      selectedColumn: observable,
      isLoadingSchemas: observable,
      showCreateSchemaModal: observable,
      showCreateTableModal: observable,
      showCreateColumnModal: observable,
      database: computed,
      setSelectedSchema: action,
      setSelectedTable: action,
      setSelectedColumn: action,
      setIsLoadingSchemas: action,
      setShowCreateSchemaModal: action,
      setShowCreateTableModal: action,
      setShowCreateColumnModal: action,
      addSchema: action,
      addTable: action,
      addColumn: action,
      deleteSchema: action,
      deleteTable: action,
      deleteColumn: action,
    });
  }

  get database(): Database {
    return guaranteeType(
      this.element,
      Database,
      'Element inside database editor state must be a database',
    );
  }

  setSelectedSchema(schema: Schema | undefined): void {
    this.selectedSchema = schema;
    this.selectedTable = undefined;
    this.selectedColumn = undefined;
  }

  setSelectedTable(table: Table | undefined): void {
    this.selectedTable = table;
    this.selectedColumn = undefined;
  }

  setSelectedColumn(column: Column | undefined): void {
    this.selectedColumn = column;
  }

  setIsLoadingSchemas(isLoading: boolean): void {
    this.isLoadingSchemas = isLoading;
  }

  setShowCreateSchemaModal(show: boolean): void {
    this.showCreateSchemaModal = show;
  }

  setShowCreateTableModal(show: boolean): void {
    this.showCreateTableModal = show;
  }

  setShowCreateColumnModal(show: boolean): void {
    this.showCreateColumnModal = show;
  }

  addSchema(name: string): void {
    const schema = new Schema(name, this.database);
    this.database.schemas.push(schema);
    this.setSelectedSchema(schema);
  }

  addTable(schema: Schema, name: string): void {
    const table = new Table(name, schema);
    schema.tables.push(table);
    this.setSelectedTable(table);
  }

  addColumn(table: Table, name: string, type: RelationalDataType): void {
    const column = new Column();
    column.name = name;
    column.type = type;
    table.columns.push(column);
    this.setSelectedColumn(column);
  }

  deleteSchema(schema: Schema): void {
    const index = this.database.schemas.indexOf(schema);
    if (index !== -1) {
      this.database.schemas.splice(index, 1);
      if (this.selectedSchema === schema) {
        this.setSelectedSchema(undefined);
      }
    }
  }

  deleteTable(table: Table): void {
    if (this.selectedSchema) {
      const index = this.selectedSchema.tables.indexOf(table);
      if (index !== -1) {
        this.selectedSchema.tables.splice(index, 1);
        if (this.selectedTable === table) {
          this.setSelectedTable(undefined);
        }
      }
    }
  }

  deleteColumn(column: Column): void {
    if (this.selectedTable) {
      const index = this.selectedTable.columns.indexOf(column);
      if (index !== -1) {
        this.selectedTable.columns.splice(index, 1);
        if (this.selectedColumn === column) {
          this.setSelectedColumn(undefined);
        }
      }
    }
  }

  reprocess(
    newElement: Database,
    editorStore: EditorStore,
  ): DatabaseEditorState {
    const databaseEditorState = new DatabaseEditorState(
      editorStore,
      newElement,
    );
    return databaseEditorState;
  }
}
