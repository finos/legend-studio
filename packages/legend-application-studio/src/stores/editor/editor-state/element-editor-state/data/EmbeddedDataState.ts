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
  type EmbeddedData,
  type ModelData,
  DataElement,
  RelationalCSVData,
  type Database,
  type RelationalCSVDataTable,
  DataElementReference,
  ExternalFormatData,
  ModelStoreData,
  ModelEmbeddedData,
  type RelationElement,
  RelationElementsData,
  RelationRowTestData,
  observe_RelationRowTestData,
  observe_RelationElement,
} from '@finos/legend-graph';
import {
  ContentType,
  guaranteeNonEmptyString,
  tryToFormatLosslessJSONString,
  UnsupportedOperationError,
  uuid,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../../extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  dataElementReference_setDataElement,
  externalFormatData_setContentType,
  externalFormatData_setData,
  relationalData_addTable,
  relationalData_deleteData,
  relationalData_setTableValues,
} from '../../../../graph-modifier/DSL_Data_GraphModifierHelper.js';
import { EmbeddedDataType } from '../../ExternalFormatState.js';
import { TEMPORARY__createRelationalDataFromCSV } from '../../../utils/TestableUtils.js';

export const createEmbeddedData = (
  type: string,
  editorStore: EditorStore,
): EmbeddedData => {
  if (type === EmbeddedDataType.EXTERNAL_FORMAT_DATA) {
    const externalFormatData = new ExternalFormatData();
    externalFormatData_setData(externalFormatData, '');
    externalFormatData_setContentType(
      externalFormatData,
      guaranteeNonEmptyString(
        editorStore.graphState.graphGenerationState.externalFormatState
          .formatContentTypes[0],
      ),
    );
    return externalFormatData;
  } else if (type === EmbeddedDataType.RELATIONAL_CSV) {
    const relational = new RelationalCSVData();
    return relational;
  } else if (type === EmbeddedDataType.RELATION_ELEMENTS_DATA) {
    const testData = new RelationElementsData();
    return testData;
  } else if (type === EmbeddedDataType.MODEL_STORE_DATA) {
    const modelStoreData = new ModelStoreData();
    return modelStoreData;
  } else {
    const extraEmbeddedDataCreator = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
          ).getExtraEmbeddedDataCreators?.() ?? [],
      );
    for (const creator of extraEmbeddedDataCreator) {
      const embeddedData = creator(type);
      if (embeddedData) {
        return embeddedData;
      }
    }
    throw new UnsupportedOperationError(
      `Can't create embedded data: no compatible creators available from plugins`,
      type,
    );
  }
};

export abstract class EmbeddedDataState {
  editorStore: EditorStore;
  embeddedData: EmbeddedData;

  constructor(editorStore: EditorStore, embeddedData: EmbeddedData) {
    this.editorStore = editorStore;
    this.embeddedData = embeddedData;
  }

  abstract label(): string;
}

export class ExternalFormatDataState extends EmbeddedDataState {
  override embeddedData: ExternalFormatData;
  canEditContentType = true;

  constructor(editorStore: EditorStore, embeddedData: ExternalFormatData) {
    super(editorStore, embeddedData);
    makeObservable(this, {
      format: action,
      canEditContentType: observable,
    });
    this.embeddedData = embeddedData;
  }

  label(): string {
    return 'External Format Data';
  }

  setCanEditoContentType(val: boolean): void {
    this.canEditContentType = val;
  }

  get supportsFormatting(): boolean {
    return this.embeddedData.contentType === ContentType.APPLICATION_JSON;
  }

  format(): void {
    externalFormatData_setData(
      this.embeddedData,
      tryToFormatLosslessJSONString(this.embeddedData.data),
    );
  }
}

export abstract class ModelDataState {
  readonly uuid = uuid();
  readonly modelStoreDataState: ModelStoreDataState;
  modelData: ModelData;

  constructor(modelData: ModelData, modelStoreDataState: ModelStoreDataState) {
    this.modelStoreDataState = modelStoreDataState;
    this.modelData = modelData;
  }
}

export class ModelEmbeddedDataState extends ModelDataState {
  override modelData: ModelEmbeddedData;
  embeddedDataState: EmbeddedDataState;

  constructor(
    modelData: ModelEmbeddedData,
    modelStoreDataState: ModelStoreDataState,
  ) {
    super(modelData, modelStoreDataState);
    this.modelData = modelData;
    this.embeddedDataState = buildEmbeddedDataEditorState(
      this.modelData.data,
      this.modelStoreDataState.editorStore,
    );
  }
}

export class UnsupportedModelDataState extends ModelDataState {}

export class ModelStoreDataState extends EmbeddedDataState {
  override embeddedData: ModelStoreData;
  modelDataStates: ModelDataState[] = [];
  hideClass = false;

  constructor(
    editorStore: EditorStore,
    embeddedData: ModelStoreData,
    hideClass?: boolean,
  ) {
    super(editorStore, embeddedData);
    makeObservable(this, {
      hideClass: observable,
      modelDataStates: observable,
      buildStates: action,
    });
    this.embeddedData = embeddedData;
    this.modelDataStates = this.buildStates();
    this.hideClass = Boolean(hideClass);
  }

  label(): string {
    return 'Model Store Data';
  }

  buildStates(): ModelDataState[] {
    return (
      this.embeddedData.modelData?.map((modelData) => {
        if (modelData instanceof ModelEmbeddedData) {
          return new ModelEmbeddedDataState(modelData, this);
        }
        return new UnsupportedModelDataState(modelData, this);
      }) ?? []
    );
  }
}

export class RelationElementState {
  relationElement: RelationElement;

  constructor(relationElement: RelationElement) {
    makeObservable(this, {
      relationElement: observable,
      addColumn: action,
      removeColumn: action,
      updateColumn: action,
      addRow: action,
      removeRow: action,
      updateRow: action,
      clearAllData: action,
      importCSV: action,
    });
    this.relationElement = relationElement;
    this.relationElement = observe_RelationElement(relationElement);
  }

  addColumn(name: string): void {
    this.relationElement.columns.push(name);
    this.relationElement.rows.forEach((row) => {
      row.values.push('');
    });
  }

  removeColumn(index: number): void {
    const columnToRemove = this.relationElement.columns[index];
    if (columnToRemove) {
      this.relationElement.columns.splice(index, 1);
      this.relationElement.rows.forEach((row) => {
        row.values.splice(index, 1);
      });
    }
  }

  updateColumn(index: number, name: string): void {
    const oldName = this.relationElement.columns[index];
    if (oldName && oldName !== name) {
      this.relationElement.columns[index] = name;
    }
  }

  addRow(): void {
    const row = new RelationRowTestData();
    row.values = [];
    const newRow = observe_RelationRowTestData(row);
    this.relationElement.columns.forEach((col) => {
      newRow.values.push('');
    });
    this.relationElement.rows.push(newRow);
  }

  removeRow(index: number): void {
    this.relationElement.rows.splice(index, 1);
  }

  updateRow(rowIndex: number, columnIndex: number, value: string): void {
    if (this.relationElement.rows[rowIndex]) {
      this.relationElement.rows[rowIndex].values[columnIndex] = value;
    }
  }

  clearAllData(): void {
    this.relationElement.rows.splice(0);
  }

  exportJSON(): string {
    return JSON.stringify(
      {
        columns: this.relationElement.columns,
        data: this.relationElement.rows,
      },
      null,
      2,
    );
  }

  exportSQL(): string {
    if (
      this.relationElement.columns.length === 0 ||
      this.relationElement.rows.length === 0
    ) {
      return '';
    }

    const tableName = 'test_data';
    const defaultDataType = 'VARCHAR(1000)';
    const columnDefs = this.relationElement.columns
      .map((col) => `${col} ${defaultDataType}`)
      .join(', ');
    const createTable = `CREATE TABLE ${tableName} (${columnDefs});`;

    const insertStatements = this.relationElement.rows.map((row) => {
      const values = this.relationElement.columns
        .map((col, colIndex) => {
          const value = row.values[colIndex] ?? '';
          if (value !== '') {
            return `'${value.replace(/'/g, "''")}'`;
          }
          return 'NULL';
        })
        .join(', ');
      return `INSERT INTO ${tableName} VALUES (${values});`;
    });

    return [createTable, '', ...insertStatements].join('\n');
  }

  exportCSV(): string {
    const headers = this.relationElement.columns.map((col) => col);
    const csvLines = [headers.join(',')];

    this.relationElement.rows.forEach((row) => {
      const values = headers.map((header, headerIndex) => {
        const value = row.values[headerIndex] ?? '';
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  importCSV(csvContent: string): void {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) {
      return;
    }

    const firstLine = lines[0];
    if (!firstLine) {
      return;
    }

    const headers = this.parseCSVLine(firstLine);
    this.relationElement.columns = headers;

    this.relationElement.rows = lines.slice(1).map((line) => {
      const values = this.parseCSVLine(line);
      const row = new RelationRowTestData();
      row.values = [];
      headers.forEach((header, index) => {
        row.values[index] = values[index] ?? '';
      });
      return observe_RelationRowTestData(row);
    });
  }
}

export class RelationElementsDataState extends EmbeddedDataState {
  override embeddedData: RelationElementsData;
  showImportCSVModal = false;
  showNewRelationElementModal = false;
  activeRelationElement: RelationElementState | undefined;
  relationElementStates: RelationElementState[];

  constructor(editorStore: EditorStore, embeddedData: RelationElementsData) {
    super(editorStore, embeddedData);
    makeObservable(this, {
      embeddedData: observable,
      showImportCSVModal: observable,
      showNewRelationElementModal: observable,
      activeRelationElement: observable,
      setActiveRelationElement: action,
      setShowImportCSVModal: action,
      setShowNewRelationElementModal: action,
      addRelationElement: action,
    });
    this.embeddedData = embeddedData;
    this.relationElementStates = embeddedData.relationElements.map(
      (relationElement) => new RelationElementState(relationElement),
    );
    this.activeRelationElement = this.relationElementStates[0];
  }

  label(): string {
    return 'Relation Elements Test Data';
  }

  setActiveRelationElement(val: RelationElementState | undefined): void {
    this.activeRelationElement = val;
  }

  addRelationElement(relationElement: RelationElement): void {
    const newElementState = new RelationElementState(relationElement);
    this.relationElementStates.push(newElementState);
    this.embeddedData.relationElements.push(relationElement);
    this.setActiveRelationElement(newElementState);
  }

  setShowImportCSVModal(show: boolean): void {
    this.showImportCSVModal = show;
  }

  setShowNewRelationElementModal(show: boolean): void {
    this.showNewRelationElementModal = show;
  }
}

export class RelationalCSVDataTableState {
  readonly editorStore: EditorStore;
  table: RelationalCSVDataTable;
  constructor(table: RelationalCSVDataTable, editorStore: EditorStore) {
    this.table = table;
    this.editorStore = editorStore;

    makeObservable(this, {
      table: observable,
      updateTableValues: action,
    });
  }

  updateTableValues(val: string): void {
    relationalData_setTableValues(this.table, val);
  }
}

export class RelationalCSVDataState extends EmbeddedDataState {
  override embeddedData: RelationalCSVData;
  selectedTable: RelationalCSVDataTableState | undefined;
  showImportCSVModal = false;
  database: Database | undefined;

  //
  showTableIdentifierModal = false;
  tableToEdit: RelationalCSVDataTable | undefined;

  constructor(editorStore: EditorStore, embeddedData: RelationalCSVData) {
    super(editorStore, embeddedData);
    makeObservable(this, {
      selectedTable: observable,
      showTableIdentifierModal: observable,
      deleteTable: observable,
      showImportCSVModal: observable,
      database: observable,
      resetSelectedTable: action,
      changeSelectedTable: action,
      setDatabase: action,
      closeModal: action,
      openIdentifierModal: action,
      setShowImportCsvModal: action,
      closeCSVModal: action,
      importCSV: action,
    });
    this.embeddedData = embeddedData;
    this.resetSelectedTable();
  }

  setShowImportCsvModal(val: boolean): void {
    this.showImportCSVModal = val;
  }

  setDatabase(val: Database | undefined): void {
    this.database = val;
  }

  openIdentifierModal(renameTable?: RelationalCSVDataTable | undefined): void {
    this.showTableIdentifierModal = true;
    this.tableToEdit = renameTable;
  }

  closeCSVModal(): void {
    this.showImportCSVModal = false;
  }

  closeModal(): void {
    this.showTableIdentifierModal = false;
    this.tableToEdit = undefined;
  }

  importCSV(val: string): void {
    const generated = TEMPORARY__createRelationalDataFromCSV(val);
    generated.tables.forEach((t) =>
      relationalData_addTable(this.embeddedData, t),
    );
    this.resetSelectedTable();
  }

  resetSelectedTable(): void {
    const table = this.embeddedData.tables[0];
    if (table) {
      this.selectedTable = new RelationalCSVDataTableState(
        table,
        this.editorStore,
      );
    } else {
      this.selectedTable = undefined;
    }
  }

  deleteTable(val: RelationalCSVDataTable): void {
    relationalData_deleteData(this.embeddedData, val);
    if (this.selectedTable?.table === val) {
      this.resetSelectedTable();
    }
  }

  changeSelectedTable(val: RelationalCSVDataTable): void {
    this.selectedTable = new RelationalCSVDataTableState(val, this.editorStore);
  }

  label(): string {
    return 'Relational Data';
  }
}
export interface EmbeddedDataStateOption {
  hideSource?: boolean;
}
export class UnsupportedDataState extends EmbeddedDataState {
  label(): string {
    return 'Unsupported embedded data';
  }
}

export class DataElementReferenceState extends EmbeddedDataState {
  override embeddedData: DataElementReference;
  embeddedDataValueState: EmbeddedDataState;
  options?: EmbeddedDataStateOption | undefined;

  constructor(
    editorStore: EditorStore,
    embeddedData: DataElementReference,
    options?: EmbeddedDataStateOption,
  ) {
    super(editorStore, embeddedData);
    this.embeddedData = embeddedData;
    this.options = options;
    this.embeddedDataValueState = this.buildValueState();
  }

  label(): string {
    return 'Data Element Reference';
  }

  setDataElement(dataElement: DataElement): void {
    dataElementReference_setDataElement(
      this.embeddedData,
      dataElement,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.embeddedDataValueState = this.buildValueState();
  }

  buildValueState(options?: EmbeddedDataStateOption): EmbeddedDataState {
    const packagableEl = this.embeddedData.dataElement.value;
    if (packagableEl instanceof DataElement) {
      return buildEmbeddedDataEditorState(
        packagableEl.data,
        this.editorStore,
        this.options,
      );
    }
    return new UnsupportedDataState(this.editorStore, this.embeddedData);
  }
}

export function buildEmbeddedDataEditorState(
  _embeddedData: EmbeddedData,
  editorStore: EditorStore,
  options?: EmbeddedDataStateOption,
): EmbeddedDataState {
  const embeddedData = _embeddedData;
  if (embeddedData instanceof ExternalFormatData) {
    return new ExternalFormatDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof ModelStoreData) {
    return new ModelStoreDataState(
      editorStore,
      embeddedData,
      options?.hideSource,
    );
  } else if (embeddedData instanceof RelationalCSVData) {
    return new RelationalCSVDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof RelationElementsData) {
    return new RelationElementsDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof DataElementReference) {
    return new DataElementReferenceState(editorStore, embeddedData, options);
  } else {
    const extraEmbeddedDataEditorStateBuilders = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
          ).getExtraEmbeddedDataEditorStateBuilders?.() ?? [],
      );
    for (const stateBuilder of extraEmbeddedDataEditorStateBuilders) {
      const state = stateBuilder(editorStore, embeddedData);
      if (state) {
        return state;
      }
    }
    return new UnsupportedDataState(editorStore, embeddedData);
  }
}
