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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  type PackageableElement,
  Database,
  Schema,
  Table,
  Column,
  type RelationalDataType,
  VarChar,
  Char,
  Integer,
  BigInt as BigIntType,
  SmallInt,
  TinyInt,
  Float as FloatType,
  Double,
  Real,
  Decimal,
  Numeric,
  Bit,
  Binary,
  VarBinary,
  Date as DateType,
  Timestamp,
  SemiStructured,
  Json,
  Other,
  stringifyDataType,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';

export enum DATABASE_EDITOR_TAB {
  SCHEMAS = 'SCHEMAS',
  JOINS = 'JOINS',
  FILTERS = 'FILTERS',
}

export class DatabaseEditorState extends ElementEditorState {
  selectedTab = DATABASE_EDITOR_TAB.SCHEMAS;
  selectedSchema: Schema | undefined;
  selectedTable: Table | undefined;
  selectedColumn: Column | undefined;

  // Modal state for create/edit operations
  isCreatingSchema = false;
  isCreatingTable = false;
  isCreatingColumn = false;
  isEditingColumn = false;

  // Form values for new items
  newSchemaName = '';
  newTableName = '';
  newColumnName = '';
  newColumnType = 'VARCHAR';
  newColumnSize = 256;
  newColumnNullable = true;
  newColumnPrecision = 10;
  newColumnScale = 2;

  // Edit column form values
  editColumnName = '';
  editColumnType = 'VARCHAR';
  editColumnSize = 256;
  editColumnNullable = true;
  editColumnPrecision = 10;
  editColumnScale = 2;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      selectedSchema: observable,
      selectedTable: observable,
      selectedColumn: observable,
      isCreatingSchema: observable,
      isCreatingTable: observable,
      isCreatingColumn: observable,
      isEditingColumn: observable,
      newSchemaName: observable,
      newTableName: observable,
      newColumnName: observable,
      newColumnType: observable,
      newColumnSize: observable,
      newColumnNullable: observable,
      newColumnPrecision: observable,
      newColumnScale: observable,
      editColumnName: observable,
      editColumnType: observable,
      editColumnSize: observable,
      editColumnNullable: observable,
      editColumnPrecision: observable,
      editColumnScale: observable,
      database: computed,
      setSelectedTab: action,
      setSelectedSchema: action,
      setSelectedTable: action,
      setSelectedColumn: action,
      setIsCreatingSchema: action,
      setIsCreatingTable: action,
      setIsCreatingColumn: action,
      setIsEditingColumn: action,
      setNewSchemaName: action,
      setNewTableName: action,
      setNewColumnName: action,
      setNewColumnType: action,
      setNewColumnSize: action,
      setNewColumnNullable: action,
      setNewColumnPrecision: action,
      setNewColumnScale: action,
      setEditColumnName: action,
      setEditColumnType: action,
      setEditColumnSize: action,
      setEditColumnNullable: action,
      setEditColumnPrecision: action,
      setEditColumnScale: action,
      addSchema: action,
      deleteSchema: action,
      renameSchema: action,
      addTable: action,
      deleteTable: action,
      renameTable: action,
      addColumn: action,
      deleteColumn: action,
      updateColumn: action,
      toggleColumnPrimaryKey: action,
      openCreateSchemaModal: action,
      openCreateTableModal: action,
      openCreateColumnModal: action,
      openEditColumnModal: action,
      closeModals: action,
    });

    guaranteeType(
      element,
      Database,
      'Element inside database editor state must be a Database',
    );

    // Auto-select first schema if available
    if (this.database.schemas.length > 0) {
      this.selectedSchema = this.database.schemas[0];
      if (this.selectedSchema && this.selectedSchema.tables.length > 0) {
        this.selectedTable = this.selectedSchema.tables[0];
      }
    }
  }

  get database(): Database {
    return guaranteeType(
      this.element,
      Database,
      'Element inside database editor state must be a Database',
    );
  }

  // Setters
  setSelectedTab(tab: DATABASE_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  setSelectedSchema(schema: Schema | undefined): void {
    this.selectedSchema = schema;
    this.selectedTable = undefined;
    this.selectedColumn = undefined;
    if (schema && schema.tables.length > 0) {
      this.selectedTable = schema.tables[0];
    }
  }

  setSelectedTable(table: Table | undefined): void {
    this.selectedTable = table;
    this.selectedColumn = undefined;
  }

  setSelectedColumn(column: Column | undefined): void {
    this.selectedColumn = column;
  }

  setIsCreatingSchema(val: boolean): void {
    this.isCreatingSchema = val;
  }

  setIsCreatingTable(val: boolean): void {
    this.isCreatingTable = val;
  }

  setIsCreatingColumn(val: boolean): void {
    this.isCreatingColumn = val;
  }

  setIsEditingColumn(val: boolean): void {
    this.isEditingColumn = val;
  }

  setNewSchemaName(val: string): void {
    this.newSchemaName = val;
  }

  setNewTableName(val: string): void {
    this.newTableName = val;
  }

  setNewColumnName(val: string): void {
    this.newColumnName = val;
  }

  setNewColumnType(val: string): void {
    this.newColumnType = val;
  }

  setNewColumnSize(val: number): void {
    this.newColumnSize = val;
  }

  setNewColumnNullable(val: boolean): void {
    this.newColumnNullable = val;
  }

  setNewColumnPrecision(val: number): void {
    this.newColumnPrecision = val;
  }

  setNewColumnScale(val: number): void {
    this.newColumnScale = val;
  }

  setEditColumnName(val: string): void {
    this.editColumnName = val;
  }

  setEditColumnType(val: string): void {
    this.editColumnType = val;
  }

  setEditColumnSize(val: number): void {
    this.editColumnSize = val;
  }

  setEditColumnNullable(val: boolean): void {
    this.editColumnNullable = val;
  }

  setEditColumnPrecision(val: number): void {
    this.editColumnPrecision = val;
  }

  setEditColumnScale(val: number): void {
    this.editColumnScale = val;
  }

  // Modal openers
  openCreateSchemaModal(): void {
    this.newSchemaName = '';
    this.isCreatingSchema = true;
  }

  openCreateTableModal(): void {
    this.newTableName = '';
    this.isCreatingTable = true;
  }

  openCreateColumnModal(): void {
    this.newColumnName = '';
    this.newColumnType = 'VARCHAR';
    this.newColumnSize = 256;
    this.newColumnNullable = true;
    this.newColumnPrecision = 10;
    this.newColumnScale = 2;
    this.isCreatingColumn = true;
  }

  openEditColumnModal(column: Column): void {
    this.selectedColumn = column;
    this.editColumnName = column.name;
    this.editColumnType = this.getColumnTypeName(column.type);
    this.editColumnNullable = column.nullable ?? true;
    if (column.type instanceof VarChar) {
      this.editColumnSize = column.type.size;
    }
    this.isEditingColumn = true;
  }

  closeModals(): void {
    this.isCreatingSchema = false;
    this.isCreatingTable = false;
    this.isCreatingColumn = false;
    this.isEditingColumn = false;
  }

  // CRUD Operations

  addSchema(): void {
    if (!this.newSchemaName.trim()) {
      return;
    }
    // Check for duplicates
    if (
      this.database.schemas.find((s) => s.name === this.newSchemaName.trim())
    ) {
      return;
    }
    const schema = new Schema(this.newSchemaName.trim(), this.database);
    this.database.schemas.push(schema);
    this.selectedSchema = schema;
    this.selectedTable = undefined;
    this.selectedColumn = undefined;
    this.closeModals();
  }

  deleteSchema(schema: Schema): void {
    const idx = this.database.schemas.indexOf(schema);
    if (idx !== -1) {
      this.database.schemas.splice(idx, 1);
      if (this.selectedSchema === schema) {
        this.selectedSchema =
          this.database.schemas.length > 0
            ? this.database.schemas[0]
            : undefined;
        this.selectedTable = undefined;
        this.selectedColumn = undefined;
      }
    }
  }

  renameSchema(schema: Schema, newName: string): void {
    if (
      newName.trim() &&
      !this.database.schemas.find(
        (s) => s !== schema && s.name === newName.trim(),
      )
    ) {
      schema.name = newName.trim();
    }
  }

  addTable(): void {
    if (!this.selectedSchema || !this.newTableName.trim()) {
      return;
    }
    // Check for duplicates
    if (
      this.selectedSchema.tables.find(
        (t) => t.name === this.newTableName.trim(),
      )
    ) {
      return;
    }
    const table = new Table(this.newTableName.trim(), this.selectedSchema);
    this.selectedSchema.tables.push(table);
    this.selectedTable = table;
    this.selectedColumn = undefined;
    this.closeModals();
  }

  deleteTable(table: Table): void {
    if (!this.selectedSchema) {
      return;
    }
    const idx = this.selectedSchema.tables.indexOf(table);
    if (idx !== -1) {
      this.selectedSchema.tables.splice(idx, 1);
      if (this.selectedTable === table) {
        this.selectedTable =
          this.selectedSchema.tables.length > 0
            ? this.selectedSchema.tables[0]
            : undefined;
        this.selectedColumn = undefined;
      }
    }
  }

  renameTable(table: Table, newName: string): void {
    if (!this.selectedSchema) {
      return;
    }
    if (
      newName.trim() &&
      !this.selectedSchema.tables.find(
        (t) => t !== table && t.name === newName.trim(),
      )
    ) {
      table.name = newName.trim();
    }
  }

  addColumn(): void {
    if (!this.selectedTable || !this.newColumnName.trim()) {
      return;
    }
    // Check for duplicates
    const existingColumns = this.selectedTable.columns.filter(
      (c): c is Column => c instanceof Column,
    );
    if (existingColumns.find((c) => c.name === this.newColumnName.trim())) {
      return;
    }
    const column = new Column();
    column.name = this.newColumnName.trim();
    column.owner = this.selectedTable;
    column.type = this.createDataType(
      this.newColumnType,
      this.newColumnSize,
      this.newColumnPrecision,
      this.newColumnScale,
    );
    column.nullable = this.newColumnNullable;
    this.selectedTable.columns.push(column);
    this.closeModals();
  }

  deleteColumn(column: Column): void {
    if (!this.selectedTable) {
      return;
    }
    const idx = this.selectedTable.columns.indexOf(column);
    if (idx !== -1) {
      this.selectedTable.columns.splice(idx, 1);
      // Also remove from primary key if present
      const pkIdx = this.selectedTable.primaryKey.indexOf(column);
      if (pkIdx !== -1) {
        this.selectedTable.primaryKey.splice(pkIdx, 1);
      }
      if (this.selectedColumn === column) {
        this.selectedColumn = undefined;
      }
    }
  }

  updateColumn(): void {
    if (!this.selectedColumn || !this.editColumnName.trim()) {
      return;
    }
    this.selectedColumn.name = this.editColumnName.trim();
    this.selectedColumn.type = this.createDataType(
      this.editColumnType,
      this.editColumnSize,
      this.editColumnPrecision,
      this.editColumnScale,
    );
    this.selectedColumn.nullable = this.editColumnNullable;
    this.closeModals();
  }

  toggleColumnPrimaryKey(column: Column): void {
    if (!this.selectedTable) {
      return;
    }
    const pkIdx = this.selectedTable.primaryKey.indexOf(column);
    if (pkIdx !== -1) {
      this.selectedTable.primaryKey.splice(pkIdx, 1);
    } else {
      this.selectedTable.primaryKey.push(column);
    }
  }

  // Helpers

  getColumnTypeName(type: RelationalDataType): string {
    // Extract just the type name (without size/precision)
    const full = stringifyDataType(type);
    const parenIdx = full.indexOf('(');
    return parenIdx !== -1 ? full.substring(0, parenIdx) : full;
  }

  createDataType(
    typeName: string,
    size: number,
    precision: number,
    scale: number,
  ): RelationalDataType {
    switch (typeName.toUpperCase()) {
      case 'VARCHAR':
        return new VarChar(size);
      case 'CHAR':
        return new Char(size);
      case 'INTEGER':
        return new Integer();
      case 'BIGINT':
        return new BigIntType();
      case 'SMALLINT':
        return new SmallInt();
      case 'TINYINT':
        return new TinyInt();
      case 'FLOAT':
        return new FloatType();
      case 'DOUBLE':
        return new Double();
      case 'REAL':
        return new Real();
      case 'DECIMAL':
        return new Decimal(precision, scale);
      case 'NUMERIC':
        return new Numeric(precision, scale);
      case 'BIT':
        return new Bit();
      case 'BINARY':
        return new Binary(size);
      case 'VARBINARY':
        return new VarBinary(size);
      case 'DATE':
        return new DateType();
      case 'TIMESTAMP':
        return new Timestamp();
      case 'SEMISTRUCTURED':
        return new SemiStructured();
      case 'JSON':
        return new Json();
      case 'OTHER':
        return new Other();
      default:
        return new VarChar(size);
    }
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): DatabaseEditorState {
    return new DatabaseEditorState(editorStore, newElement);
  }
}

/**
 * Supported column data types for the editor UI
 */
export const COLUMN_DATA_TYPES = [
  'VARCHAR',
  'CHAR',
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'FLOAT',
  'DOUBLE',
  'REAL',
  'DECIMAL',
  'NUMERIC',
  'BIT',
  'BINARY',
  'VARBINARY',
  'DATE',
  'TIMESTAMP',
  'SEMISTRUCTURED',
  'JSON',
  'OTHER',
] as const;

/**
 * Data types that require a size parameter
 */
export const SIZE_REQUIRED_TYPES = [
  'VARCHAR',
  'CHAR',
  'BINARY',
  'VARBINARY',
] as const;

/**
 * Data types that require precision and scale parameters
 */
export const PRECISION_SCALE_TYPES = ['DECIMAL', 'NUMERIC'] as const;
