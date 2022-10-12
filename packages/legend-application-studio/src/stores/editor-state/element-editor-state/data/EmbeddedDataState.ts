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
  type Class,
  type DataElement,
  DataElementReference,
  ExternalFormatData,
  ModelStoreData,
  RelationalCSVData,
  RelationalCSVDataTable,
} from '@finos/legend-graph';
import {
  ContentType,
  guaranteeNonEmptyString,
  tryToFormatLosslessJSONString,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  dataElementReference_setDataElement,
  externalFormatData_setContentType,
  externalFormatData_setData,
  modelStoreData_setInstance,
  relationalData_addTable,
  relationalData_deleteData,
  relationalData_setTableName,
  relationalData_setTableSchemaName,
  relationalData_setTableValues,
} from '../../../shared/modifier/DSL_Data_GraphModifierHelper.js';
import { EmbeddedDataType } from '../../ExternalFormatState.js';

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
  } else if (type === EmbeddedDataType.MODEL_STORE_DATA) {
    const modelStoreData = new ModelStoreData();
    modelStoreData_setInstance(modelStoreData, new Map<Class, object>());
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

  constructor(editorStore: EditorStore, embeddedData: ExternalFormatData) {
    super(editorStore, embeddedData);
    makeObservable(this, {
      format: action,
    });
    this.embeddedData = embeddedData;
  }

  label(): string {
    return 'ExternalFormat Data';
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

export class ModelStoreDataState extends EmbeddedDataState {
  override embeddedData: ModelStoreData;

  constructor(editorStore: EditorStore, embeddedData: ModelStoreData) {
    super(editorStore, embeddedData);
    this.embeddedData = embeddedData;
  }

  label(): string {
    return 'ModelStore Data';
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

export class IdentifierTableState {
  table: RelationalCSVDataTable | undefined;
  dataState: RelationalCSVDataState;
  schemaName = '';
  tableName = '';

  constructor(dataState: RelationalCSVDataState) {
    this.dataState = dataState;
    makeObservable(this, {
      dataState: observable,
      schemaName: observable,
      tableName: observable,
      table: observable,
      setTableName: action,
      setSchemaName: action,
      setTable: action,
      handleSubmit: action,
    });
  }

  setTable(table: RelationalCSVDataTable | undefined): void {
    this.table = table;
    if (table) {
      this.tableName = table.table;
      this.schemaName = table.schema;
    }
  }

  setTableName(val: string): void {
    this.tableName = val;
  }

  setSchemaName(val: string): void {
    this.schemaName = val;
  }

  get isEditingDisabled(): boolean {
    if (!(this.tableName && this.schemaName)) {
      return true;
    }
    return Boolean(
      this.dataState.embeddedData.tables.find(
        (t) =>
          `${t.table}.${t.schema}` === `${this.tableName}.${this.schemaName}`,
      ),
    );
  }

  handleSubmit(): void {
    const table = this.table ?? new RelationalCSVDataTable();
    relationalData_setTableSchemaName(table, this.schemaName);
    relationalData_setTableName(table, this.tableName);
    if (!this.table) {
      table.values = '';
      relationalData_addTable(this.dataState.embeddedData, table);
      this.dataState.changeSelectedTable(table);
    }
  }
}

export class RelationalCSVDataState extends EmbeddedDataState {
  override embeddedData: RelationalCSVData;
  showTableIdentifierModal = false;
  tableIdentifierState: IdentifierTableState;
  selectedTable: RelationalCSVDataTableState | undefined;

  constructor(editorStore: EditorStore, embeddedData: RelationalCSVData) {
    super(editorStore, embeddedData);
    makeObservable(this, {
      selectedTable: observable,
      showTableIdentifierModal: observable,
      deleteTable: observable,
      tableIdentifierState: observable,
      resetSelectedTable: action,
      changeSelectedTable: action,
      closeModal: action,
      openIdentifierModal: action,
    });
    this.embeddedData = embeddedData;
    this.tableIdentifierState = new IdentifierTableState(this);
    this.resetSelectedTable();
  }

  openIdentifierModal(renameTable?: RelationalCSVDataTable | undefined): void {
    this.showTableIdentifierModal = true;
    this.tableIdentifierState.setTable(renameTable);
  }

  closeModal(): void {
    this.tableIdentifierState.setSchemaName('');
    this.tableIdentifierState.setTableName('');
    this.showTableIdentifierModal = false;
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

export class DataElementReferenceState extends EmbeddedDataState {
  override embeddedData: DataElementReference;
  embeddedDataValueState: EmbeddedDataState;

  constructor(editorStore: EditorStore, embeddedData: DataElementReference) {
    super(editorStore, embeddedData);
    this.embeddedData = embeddedData;
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

  buildValueState(): EmbeddedDataState {
    return buildEmbeddedDataEditorState(
      this.embeddedData.dataElement.value.data,
      this.editorStore,
    );
  }
}

export class UnsupportedDataState extends EmbeddedDataState {
  label(): string {
    return 'Unsupported embedded data';
  }
}

export function buildEmbeddedDataEditorState(
  _embeddedData: EmbeddedData,
  editorStore: EditorStore,
): EmbeddedDataState {
  const embeddedData = _embeddedData;
  if (embeddedData instanceof ExternalFormatData) {
    return new ExternalFormatDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof ModelStoreData) {
    return new ModelStoreDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof RelationalCSVData) {
    return new RelationalCSVDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof DataElementReference) {
    return new DataElementReferenceState(editorStore, embeddedData);
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
