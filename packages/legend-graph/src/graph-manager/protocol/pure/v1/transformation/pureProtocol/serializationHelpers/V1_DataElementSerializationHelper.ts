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
  type PlainObject,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  customListWithSchema,
  optionalCustomList,
  isString,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  type ModelSchema,
  primitive,
  serialize,
  optional,
  list,
  raw,
} from 'serializr';
import type { DSL_Data_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Data_PureProtocolProcessorPlugin_Extension.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import {
  type V1_EmbeddedData,
  type V1_ModelData,
  V1_ExternalFormatData,
  V1_ModelStoreData,
  V1_DataElementReference,
  V1_ModelEmbeddedData,
  V1_ModelInstanceData,
  V1_RelationElementsData,
  V1_RelationRowTestData,
  V1_RelationElement,
} from '../../../model/data/V1_EmbeddedData.js';
import {
  V1_RelationalCSVData,
  V1_RelationalCSVDataTable,
} from '../../../model/data/V1_RelationalCSVData.js';
import { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement.js';
import {
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
  V1_packageableElementPointerModelSchema,
} from './V1_CoreSerializationHelper.js';
import { V1_INTERNAL__UnknownEmbeddedData } from '../../../model/data/V1_INTERNAL__UnknownEmbeddedData.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';

export const V1_DATA_ELEMENT_PROTOCOL_TYPE = 'dataElement';

enum ModelDataType {
  MODEL_EMBEDDED_DATA = 'modelEmbeddedData',
  MODEL_INSTANCE_DATA = 'modelInstanceData',
}

export enum V1_EmbeddedDataType {
  MODEL_STORE_DATA = 'modelStore',
  RELATION_ELEMENTS_DATA = 'relationAccessor',
  EXTERNAL_FORMAT_DATA = 'externalFormat',
  DATA_ELEMENT_REFERENCE = 'reference',
  RELATIONAL_DATA = 'relationalCSVData',
}

const V1_dataModelDataSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ModelEmbeddedData> =>
  createModelSchema(V1_ModelEmbeddedData, {
    _type: usingConstantValueSchema(ModelDataType.MODEL_EMBEDDED_DATA),
    data: custom(
      (val) => V1_serializeEmbeddedDataType(val, plugins),
      (val) => V1_deserializeEmbeddedDataType(val, plugins),
    ),
    model: primitive(),
  });

const V1_dataModelInstanceDataSchema = createModelSchema(V1_ModelInstanceData, {
  _type: usingConstantValueSchema(ModelDataType.MODEL_INSTANCE_DATA),
  instances: raw(),
  model: primitive(),
});

const V1_serializeModelData = (
  protocol: V1_ModelData,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ModelData> => {
  if (protocol instanceof V1_ModelInstanceData) {
    return serialize(V1_dataModelInstanceDataSchema, protocol);
  } else if (protocol instanceof V1_ModelEmbeddedData) {
    return serialize(V1_dataModelDataSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize model data`, protocol);
};

const V1_deserializeModelData = (
  json: PlainObject<V1_ModelData>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ModelData => {
  switch (json._type) {
    case ModelDataType.MODEL_EMBEDDED_DATA:
      return deserialize(V1_dataModelDataSchema(plugins), json);
    case ModelDataType.MODEL_INSTANCE_DATA:
      return deserialize(V1_dataModelInstanceDataSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize assertion status of type '${json._type}'`,
      );
  }
};

export const V1_modelStoreDataModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ModelStoreData> =>
  createModelSchema(V1_ModelStoreData, {
    _type: usingConstantValueSchema(V1_EmbeddedDataType.MODEL_STORE_DATA),
    modelData: optionalCustomList(
      (value: V1_ModelData) => V1_serializeModelData(value, plugins),
      (value: PlainObject<V1_ModelData>) =>
        V1_deserializeModelData(value, plugins),
    ),
  });

export const V1_relationRowTestDataModelSchema = createModelSchema(
  V1_RelationRowTestData,
  {
    values: list(primitive()),
  },
);

export const V1_relationElementModelSchema = createModelSchema(
  V1_RelationElement,
  {
    paths: list(primitive()),
    columns: list(primitive()),
    rows: list(usingModelSchema(V1_relationRowTestDataModelSchema)),
  },
);

export const V1_relationElementsDataModelSchema = createModelSchema(
  V1_RelationElementsData,
  {
    _type: usingConstantValueSchema(V1_EmbeddedDataType.RELATION_ELEMENTS_DATA),
    relationElements: list(usingModelSchema(V1_relationElementModelSchema)),
  },
);

export const V1_externalFormatDataModelSchema = createModelSchema(
  V1_ExternalFormatData,
  {
    _type: usingConstantValueSchema(V1_EmbeddedDataType.EXTERNAL_FORMAT_DATA),
    contentType: primitive(),
    data: primitive(),
  },
);

const V1_serializeDataElementReferenceValue = (
  json: PlainObject<V1_PackageableElementPointer> | string,
): V1_PackageableElementPointer => {
  // For backward compatible: see https://github.com/finos/legend-engine/pull/2621
  if (isString(json)) {
    return new V1_PackageableElementPointer(
      PackageableElementPointerType.DATA,
      json,
    );
  }
  return deserialize(V1_packageableElementPointerModelSchema, json);
};

export const V1_dataElementReferenceModelSchema = createModelSchema(
  V1_DataElementReference,
  {
    _type: usingConstantValueSchema(V1_EmbeddedDataType.DATA_ELEMENT_REFERENCE),
    dataElement: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) => V1_serializeDataElementReferenceValue(val),
    ),
  },
);

const V1_relationalDataTableModelSchema = createModelSchema(
  V1_RelationalCSVDataTable,
  {
    schema: optional(primitive()),
    table: primitive(),
    values: primitive(),
  },
);

const V1_relationalDataModelSchema = createModelSchema(V1_RelationalCSVData, {
  _type: usingConstantValueSchema(V1_EmbeddedDataType.RELATIONAL_DATA),
  tables: list(usingModelSchema(V1_relationalDataTableModelSchema)),
});

export function V1_serializeEmbeddedDataType(
  protocol: V1_EmbeddedData,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_EmbeddedData> {
  if (protocol instanceof V1_INTERNAL__UnknownEmbeddedData) {
    return protocol.content;
  } else if (protocol instanceof V1_ExternalFormatData) {
    return serialize(V1_externalFormatDataModelSchema, protocol);
  } else if (protocol instanceof V1_RelationElementsData) {
    return serialize(V1_relationElementsDataModelSchema, protocol);
  } else if (protocol instanceof V1_ModelStoreData) {
    return serialize(V1_modelStoreDataModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_DataElementReference) {
    return serialize(V1_dataElementReferenceModelSchema, protocol);
  } else if (protocol instanceof V1_RelationalCSVData) {
    return serialize(V1_relationalDataModelSchema, protocol);
  }
  const extraEmbeddedDataSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Data_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraEmbeddedDataProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraEmbeddedDataSerializers) {
    const embeddedDataProtocolJson = serializer(protocol);
    if (embeddedDataProtocolJson) {
      return embeddedDataProtocolJson;
    }
  }

  throw new UnsupportedOperationError(
    `Can't serialize embedded data: no compatible serializer available from plugins`,
    protocol,
  );
}

export function V1_deserializeEmbeddedDataType(
  json: PlainObject<V1_EmbeddedData>,
  plugins: PureProtocolProcessorPlugin[],
): V1_EmbeddedData {
  switch (json._type) {
    case V1_EmbeddedDataType.EXTERNAL_FORMAT_DATA:
      return deserialize(V1_externalFormatDataModelSchema, json);
    case V1_EmbeddedDataType.MODEL_STORE_DATA:
      return deserialize(V1_modelStoreDataModelSchema(plugins), json);
    case V1_EmbeddedDataType.DATA_ELEMENT_REFERENCE:
      return deserialize(V1_dataElementReferenceModelSchema, json);
    case V1_EmbeddedDataType.RELATIONAL_DATA:
      return deserialize(V1_relationalDataModelSchema, json);
    case V1_EmbeddedDataType.RELATION_ELEMENTS_DATA:
      return deserialize(V1_relationElementsDataModelSchema, json);
    default: {
      const extraEmbeddedDataProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Data_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraEmbeddedDataProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraEmbeddedDataProtocolDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }

      // Fall back to create unknown stub if not supported
      const protocol = new V1_INTERNAL__UnknownEmbeddedData();
      protocol.content = json;
      return protocol;
    }
  }
}

export const V1_dataElementModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataElement> =>
  createModelSchema(V1_DataElement, {
    _type: usingConstantValueSchema(V1_DATA_ELEMENT_PROTOCOL_TYPE),
    data: custom(
      (val) => V1_serializeEmbeddedDataType(val, plugins),
      (val) => V1_deserializeEmbeddedDataType(val, plugins),
    ),
    name: primitive(),
    package: primitive(),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  });
