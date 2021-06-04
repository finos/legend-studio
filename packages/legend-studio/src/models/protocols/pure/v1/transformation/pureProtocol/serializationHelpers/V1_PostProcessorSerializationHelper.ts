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

import type { V1_PostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor';
import {
  createModelSchema,
  deserialize,
  custom,
  serialize,
  primitive,
  list,
} from 'serializr';
import type { V1_Mapper } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper';
import {
  V1_SchemaNameMapper,
  V1_TableNameMapper,
} from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  usingConstantValueSchema,
  getClass,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import { V1_MapperPostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_MapperPostProcessor';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';

enum V1_MapperType {
  TABLE = 'table',
  SCHEMA = 'schema',
}

enum V1_PostProcessorType {
  MAPPER = 'mapper',
}

const V1_schemaNameMapperModelSchema = createModelSchema(V1_SchemaNameMapper, {
  _type: usingConstantValueSchema(V1_MapperType.SCHEMA),
  from: primitive(),
  to: primitive(),
});

const V1_tableNameMapperModelSchema = createModelSchema(V1_TableNameMapper, {
  _type: usingConstantValueSchema(V1_MapperType.TABLE),
  from: primitive(),
  schema: usingModelSchema(V1_schemaNameMapperModelSchema),
  to: primitive(),
});

export const V1_serializeMapper = (
  protocol: V1_Mapper,
): PlainObject<V1_Mapper> => {
  if (protocol instanceof V1_TableNameMapper) {
    return serialize(V1_tableNameMapperModelSchema, protocol);
  } else if (protocol instanceof V1_SchemaNameMapper) {
    return serialize(V1_schemaNameMapperModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize mapper of type '${getClass(protocol).name}'`,
  );
};

export const V1_deserializeMapper = (
  json: PlainObject<V1_Mapper>,
): V1_Mapper => {
  switch (json._type) {
    case V1_MapperType.TABLE:
      return deserialize(V1_tableNameMapperModelSchema, json);
    case V1_MapperType.SCHEMA:
      return deserialize(V1_schemaNameMapperModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize mapper of type '${json._type}'`,
      );
  }
};

const V1_mapperPostProcessorModelSchema = createModelSchema(
  V1_MapperPostProcessor,
  {
    _type: usingConstantValueSchema(V1_PostProcessorType.MAPPER),
    mappers: list(
      custom(
        (val) => V1_serializeMapper(val),
        (val) => V1_deserializeMapper(val),
      ),
    ),
  },
);

export const V1_serializePostProcessor = (
  value: V1_PostProcessor,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_PostProcessor> => {
  if (value instanceof V1_MapperPostProcessor) {
    return serialize(V1_mapperPostProcessorModelSchema, value);
  }
  const extraPostprocessorProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraConnectionPostProcessorProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraPostprocessorProtocolSerializers) {
    const postprocessorProtocolJson = serializer(value);
    if (postprocessorProtocolJson) {
      return postprocessorProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize post-processor of type '${
      getClass(value).name
    }'. No compatible serializer available from plugins.`,
  );
};

export const V1_deserializePostProcessor = (
  value: PlainObject<V1_PostProcessor>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PostProcessor => {
  switch (value._type) {
    case V1_PostProcessorType.MAPPER:
      return deserialize(V1_mapperPostProcessorModelSchema, value);
    default: {
      const extraPostprocessorProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraConnectionPostProcessorProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraPostprocessorProtocolDeserializers) {
        const postprocessorProtocol = deserializer(value);
        if (postprocessorProtocol) {
          return postprocessorProtocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize post-processor of type '${value._type}'. No compatible deserializer available from plugins.`,
      );
    }
  }
};
