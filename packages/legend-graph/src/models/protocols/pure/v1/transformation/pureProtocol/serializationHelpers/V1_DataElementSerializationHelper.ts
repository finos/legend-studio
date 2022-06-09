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
  deserializeArray,
  type PlainObject,
  serializeArray,
  UnsupportedOperationError,
  usingConstantValueSchema,
  serializeMap,
  deserializeMap,
  usingModelSchema,
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
} from 'serializr';
import type { DSLData_PureProtocolProcessorPlugin_Extension } from '../../../../DSLData_PureProtocolProcessorPlugin_Extension.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import {
  type V1_EmbeddedData,
  V1_ExternalFormatData,
  V1_ModelStoreData,
  V1_DataElementReference,
} from '../../../model/data/V1_EmbeddedData.js';
import {
  V1_RelationalData,
  V1_RelationalDataTable,
  V1_RelationalDataTableColumn,
  V1_RelationalDataTableRow,
} from '../../../model/data/V1_RelationalData.js';
import { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement.js';
import {
  V1_stereotypePtrSchema,
  V1_taggedValueSchema,
} from './V1_DomainSerializationHelper.js';

export const V1_DATA_ELEMENT_PROTOCOL_TYPE = 'dataElement';

export enum V1_EmbeddedDataType {
  MODEL_STORE_DATA = 'modelStore',
  EXTERNAL_FORMAT_DATA = 'externalFormat',
  DATA_ELEMENT_REFERENCE = 'reference',
  RELATIONAL_DATA = 'relationalData',
}

export const V1_modelStoreDataModelSchema = createModelSchema(
  V1_ModelStoreData,
  {
    _type: usingConstantValueSchema(V1_EmbeddedDataType.MODEL_STORE_DATA),
    instances: custom(
      (val) => serializeMap(val, (v) => v),
      (val) => deserializeMap(val, (v) => v),
    ),
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

export const V1_dataElementReferenceModelSchema = createModelSchema(
  V1_DataElementReference,
  {
    _type: usingConstantValueSchema(V1_EmbeddedDataType.DATA_ELEMENT_REFERENCE),
    dataElement: primitive(),
  },
);

export const V1_relationalDataTableColumnSchema = createModelSchema(
  V1_RelationalDataTableColumn,
  {
    value: primitive(),
  },
);

export const V1_relationalDataTableRowModelSchema = createModelSchema(
  V1_RelationalDataTableRow,
  {
    values: primitive(),
  },
);

const V1_relationalDataTableModelSchema = createModelSchema(
  V1_RelationalDataTable,
  {
    columns: list(usingModelSchema(V1_relationalDataTableColumnSchema)),
    rows: list(usingModelSchema(V1_relationalDataTableRowModelSchema)),
    schemaName: optional(primitive()),
    tableName: primitive(),
  },
);

const V1_relationalDataModelSchema = createModelSchema(V1_RelationalData, {
  _type: usingConstantValueSchema(V1_EmbeddedDataType.RELATIONAL_DATA),
  tables: list(usingModelSchema(V1_relationalDataTableModelSchema)),
});

export const V1_serializeEmbeddedDataType = (
  protocol: V1_EmbeddedData,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_EmbeddedData> => {
  if (protocol instanceof V1_ExternalFormatData) {
    return serialize(V1_externalFormatDataModelSchema, protocol);
  } else if (protocol instanceof V1_ModelStoreData) {
    return serialize(V1_modelStoreDataModelSchema, protocol);
  } else if (protocol instanceof V1_DataElementReference) {
    return serialize(V1_dataElementReferenceModelSchema, protocol);
  } else if (protocol instanceof V1_RelationalData) {
    return serialize(V1_relationalDataModelSchema, protocol);
  }
  const extraEmbeddedDataSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSLData_PureProtocolProcessorPlugin_Extension
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
};

export const V1_deserializeEmbeddedDataType = (
  json: PlainObject<V1_EmbeddedData>,
  plugins: PureProtocolProcessorPlugin[],
): V1_EmbeddedData => {
  switch (json._type) {
    case V1_EmbeddedDataType.EXTERNAL_FORMAT_DATA:
      return deserialize(V1_externalFormatDataModelSchema, json);
    case V1_EmbeddedDataType.MODEL_STORE_DATA:
      return deserialize(V1_modelStoreDataModelSchema, json);
    case V1_EmbeddedDataType.DATA_ELEMENT_REFERENCE:
      return deserialize(V1_dataElementReferenceModelSchema, json);
    case V1_EmbeddedDataType.RELATIONAL_DATA:
      return deserialize(V1_relationalDataModelSchema, json);
    default: {
      const extraEmbeddedDataProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSLData_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraEmbeddedDataProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraEmbeddedDataProtocolDeserializers) {
        const embeddedDataProtocol = deserializer(json);
        if (embeddedDataProtocol) {
          return embeddedDataProtocol;
        }
      }

      throw new UnsupportedOperationError(
        `Can't deserialize embedded data of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

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
    stereotypes: custom(
      (values) =>
        serializeArray(
          values,
          (value) => serialize(V1_stereotypePtrSchema, value),
          {
            skipIfEmpty: true,
            INTERNAL__forceReturnEmptyInTest: true,
          },
        ),
      (values) =>
        deserializeArray(
          values,
          (v) => deserialize(V1_stereotypePtrSchema, v),
          {
            skipIfEmpty: false,
          },
        ),
    ),
    taggedValues: custom(
      (values) =>
        serializeArray(
          values,
          (value) => serialize(V1_taggedValueSchema, value),
          {
            skipIfEmpty: true,
            INTERNAL__forceReturnEmptyInTest: true,
          },
        ),
      (values) =>
        deserializeArray(values, (v) => deserialize(V1_taggedValueSchema, v), {
          skipIfEmpty: false,
        }),
    ),
  });
