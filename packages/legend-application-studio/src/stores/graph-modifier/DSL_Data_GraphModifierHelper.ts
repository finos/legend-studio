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
  type DataElement,
  type EmbeddedData,
  type ObserverContext,
  type ExternalFormatData,
  type ModelStoreData,
  type Class,
  type Type,
  type DataElementReference,
  type RelationalCSVDataTable,
  type RelationalCSVData,
  type ModelData,
  type PackageableElementReference,
  type ModelEmbeddedData,
  observe_EmbeddedData,
  observe_DataElement,
  observe_RelationalDataTable,
  PackageableElementExplicitReference,
  observe_ModelData,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';

export const dataElement_setEmbeddedData = action(
  (
    dataElement: DataElement,
    value: EmbeddedData,
    context: ObserverContext,
  ): void => {
    dataElement.data = observe_EmbeddedData(value, context);
  },
);

export const externalFormatData_setContentType = action(
  (externalFormatData: ExternalFormatData, value: string): void => {
    externalFormatData.contentType = value;
  },
);

export const externalFormatData_setData = action(
  (externalFormatData: ExternalFormatData, value: string): void => {
    externalFormatData.data = value;
  },
);

export const relationalData_setTableValues = action(
  (data: RelationalCSVDataTable, values: string): void => {
    data.values = values;
  },
);

export const relationalData_setTableSchemaName = action(
  (data: RelationalCSVDataTable, value: string): void => {
    data.schema = value;
  },
);

export const relationalData_addTable = action(
  (data: RelationalCSVData, val: RelationalCSVDataTable): void => {
    addUniqueEntry(data.tables, observe_RelationalDataTable(val));
  },
);

export const relationalData_setTableName = action(
  (data: RelationalCSVDataTable, value: string): void => {
    data.table = value;
  },
);

export const relationalData_deleteData = action(
  (data: RelationalCSVData, val: RelationalCSVDataTable): void => {
    deleteEntry(data.tables, val);
  },
);

export const dataElementReference_setDataElement = action(
  (
    dataElementReference: DataElementReference,
    value: DataElement,
    context: ObserverContext,
  ): void => {
    dataElementReference.dataElement =
      PackageableElementExplicitReference.create(
        observe_DataElement(value, context),
      );
  },
);

// Model Store
export const modelStoreData_addModelData = action(
  (
    modelStoreData: ModelStoreData,
    value: ModelData,
    context: ObserverContext,
  ): void => {
    const entries = modelStoreData.modelData ?? [];
    if (!modelStoreData.modelData) {
      modelStoreData.modelData = entries;
    }
    addUniqueEntry(entries, observe_ModelData(value, context));
  },
);

export const modelStoreData_setDataModelModel = action(
  (modelData: ModelData, val: PackageableElementReference<Type>): void => {
    modelData.model = val;
  },
);

export const modelStoreData_deleteModelData = action(
  (modelStoreData: ModelStoreData, value: ModelData): void => {
    if (modelStoreData.modelData) {
      deleteEntry(modelStoreData.modelData, value);
    }
  },
);

export const modelStoreData_setModelDataClass = action(
  (modelData: ModelData, val: PackageableElementReference<Class>): void => {
    modelData.model = val;
  },
);

export const modelStoreData_setModelDataData = action(
  (modelData: ModelEmbeddedData, val: EmbeddedData): void => {
    modelData.data = val;
  },
);
