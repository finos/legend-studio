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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type EmbeddedData,
  type ModelData,
  DataElementReference,
  ExternalFormatData,
  ModelStoreData,
  ModelEmbeddedData,
  ModelInstanceData,
} from '../../../../../../../graph/metamodel/pure/data/EmbeddedData.js';
import {
  type RelationalCSVDataTable,
  RelationalCSVData,
} from '../../../../../../../graph/metamodel/pure/data/RelationalCSVData.js';
import { DataElement } from '../../../../../../../graph/metamodel/pure/packageableElements/data/DataElement.js';
import type { DSL_Data_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Data_PureProtocolProcessorPlugin_Extension.js';
import {
  type V1_EmbeddedData,
  type V1_ModelData,
  V1_DataElementReference,
  V1_ExternalFormatData,
  V1_ModelStoreData,
  V1_ModelEmbeddedData,
  V1_ModelInstanceData,
} from '../../../model/data/V1_EmbeddedData.js';
import {
  V1_RelationalCSVData,
  V1_RelationalCSVDataTable,
} from '../../../model/data/V1_RelationalCSVData.js';
import { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement.js';
import {
  V1_initPackageableElement,
  V1_transformElementReferencePointer,
} from './V1_CoreTransformerHelper.js';
import {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './V1_DomainTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import { INTERNAL__UnknownEmbeddedData } from '../../../../../../../graph/metamodel/pure/data/INTERNAL__UnknownEmbeddedData.js';
import { V1_INTERNAL__UnknownEmbeddedData } from '../../../model/data/V1_INTERNAL__UnknownEmbeddedData.js';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';

// ----------------------------------------------- DATA ----------------------------------------

const V1_transformModelInstanceData = (
  element: ModelInstanceData,
): V1_ModelInstanceData => {
  const val = new V1_ModelInstanceData();
  val.model = element.model.valueForSerialization ?? '';
  val.instances = element.instances;
  return val;
};

const V1_transformModelEmbeddedData = (
  element: ModelEmbeddedData,
  context: V1_GraphTransformerContext,
): V1_ModelEmbeddedData => {
  const val = new V1_ModelEmbeddedData();
  val.data = V1_transformEmbeddedData(element.data, context);
  val.model = element.model.valueForSerialization ?? '';
  return val;
};

const V1_transformModelData = (
  element: ModelData,
  context: V1_GraphTransformerContext,
): V1_ModelData => {
  if (element instanceof ModelInstanceData) {
    return V1_transformModelInstanceData(element);
  } else if (element instanceof ModelEmbeddedData) {
    return V1_transformModelEmbeddedData(element, context);
  }
  throw new UnsupportedOperationError('Model Data type not supported');
};

const V1_transformModelStoreData = (
  element: ModelStoreData,
  context: V1_GraphTransformerContext,
): V1_ModelStoreData => {
  const modelStoreDataElement = new V1_ModelStoreData();
  if (element.modelData?.length) {
    modelStoreDataElement.modelData = element.modelData.map((m) =>
      V1_transformModelData(m, context),
    );
  }
  return modelStoreDataElement;
};

export const V1_transformExternalFormatData = (
  element: ExternalFormatData,
): V1_ExternalFormatData => {
  const externalFormatDataElement = new V1_ExternalFormatData();
  externalFormatDataElement.contentType = element.contentType;
  externalFormatDataElement.data = element.data;
  return externalFormatDataElement;
};

const V1_transformDataElementReference = (
  element: DataElementReference,
  context: V1_GraphTransformerContext,
): V1_DataElementReference => {
  const dataElementReference = new V1_DataElementReference();
  const val = element.dataElement.value;
  if (val instanceof DataElement) {
    dataElementReference.dataElement = V1_transformElementReferencePointer(
      PackageableElementPointerType.DATA,
      element.dataElement,
    );
    return dataElementReference;
  }
  const extraEmbeddedDataTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Data_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraElementPointerTypes?.() ?? [],
  );
  let type: string | undefined;
  for (const transformer of extraEmbeddedDataTransformers) {
    type = transformer(val);
    if (type) {
      break;
    }
  }
  if (!type) {
    throw new UnsupportedOperationError(
      `No packagable pointer found for element: ${element.dataElement.valueForSerialization}`,
    );
  }
  dataElementReference.dataElement = V1_transformElementReferencePointer(
    type,
    element.dataElement,
  );
  return dataElementReference;
};

const V1_transformRelationalCSVDataTable = (
  element: RelationalCSVDataTable,
): V1_RelationalCSVDataTable => {
  const table = new V1_RelationalCSVDataTable();
  table.table = element.table;
  table.schema = element.schema;
  table.values = element.values;
  return table;
};

const V1_transformRelationalCSVData = (
  element: RelationalCSVData,
): V1_RelationalCSVData => {
  const data = new V1_RelationalCSVData();
  data.tables = element.tables.map(V1_transformRelationalCSVDataTable);
  return data;
};

export function V1_transformEmbeddedData(
  metamodel: EmbeddedData,
  context: V1_GraphTransformerContext,
): V1_EmbeddedData {
  if (metamodel instanceof INTERNAL__UnknownEmbeddedData) {
    const protocol = new V1_INTERNAL__UnknownEmbeddedData();
    protocol.content = metamodel.content;
    return protocol;
  } else if (metamodel instanceof ModelStoreData) {
    return V1_transformModelStoreData(metamodel, context);
  } else if (metamodel instanceof ExternalFormatData) {
    return V1_transformExternalFormatData(metamodel);
  } else if (metamodel instanceof DataElementReference) {
    return V1_transformDataElementReference(metamodel, context);
  } else if (metamodel instanceof RelationalCSVData) {
    return V1_transformRelationalCSVData(metamodel);
  }
  const extraEmbeddedDataTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Data_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraEmbeddedDataTransformers?.() ?? [],
  );
  for (const transformer of extraEmbeddedDataTransformers) {
    const protocol = transformer(metamodel, context);
    if (protocol) {
      return protocol;
    }
  }

  throw new UnsupportedOperationError(
    `Can't transform embedded data: no compatible transformer available from plugins`,
    metamodel,
  );
}

export const V1_transformDataElement = (
  element: DataElement,
  context: V1_GraphTransformerContext,
): V1_DataElement => {
  const dataElement = new V1_DataElement();
  V1_initPackageableElement(dataElement, element);
  dataElement.stereotypes = element.stereotypes.map(V1_transformStereotype);
  dataElement.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  dataElement.data = V1_transformEmbeddedData(element.data, context);
  return dataElement;
};
