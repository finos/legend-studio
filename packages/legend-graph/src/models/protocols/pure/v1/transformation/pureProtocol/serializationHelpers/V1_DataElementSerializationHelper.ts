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
  deseralizeMap,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  type ModelSchema,
  primitive,
  serialize,
} from 'serializr';
import type { EmbeddedData_PureProtocolProcessorPlugin_Extension } from '../../../../EmbeddedData_PureProtocolProcessorPlugin_Extension';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';
import {
  type V1_EmbeddedData,
  V1_ExternalFormatData,
  V1_ModelStoreData,
  V1_DataElementReference,
} from '../../../model/data/V1_EmbeddedData';
import { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement';
import type { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr';
import {
  V1_stereotypePtrSchema,
  V1_taggedValueSchema,
} from './V1_DomainSerializationHelper';

export const V1_DATA_ELEMENT_PROTOCOL_TYPE = 'dataElement';

export enum V1_EmbeddedDataType {
  MODEL_STORE_DATA = 'modelStore',
  EXTERNAL_FORMAT_DATA = 'externalFormat',
  DATA_ELEMENT_REFERENCE = 'reference',
}

export const V1_modelStoreDataModelSchema = createModelSchema(
  V1_ModelStoreData,
  {
    _type: usingConstantValueSchema(V1_EmbeddedDataType.MODEL_STORE_DATA),
    instances: custom(
      (val) => serializeMap(val),
      (val) => deseralizeMap(val),
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
  }
  const extraEmbeddedDataSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as EmbeddedData_PureProtocolProcessorPlugin_Extension
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
    default: {
      const extraEmbeddedDataProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as EmbeddedData_PureProtocolProcessorPlugin_Extension
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
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (v: V1_StereotypePtr) => deserialize(V1_stereotypePtrSchema, v),
          false,
        ),
    ),
    taggedValues: custom(
      (values) =>
        serializeArray(
          values,
          (value) => serialize(V1_taggedValueSchema, value),
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (v: V1_StereotypePtr) => deserialize(V1_taggedValueSchema, v),
          false,
        ),
    ),
  });
