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

import type { V1_PostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor.js';
import {
  createModelSchema,
  deserialize,
  custom,
  serialize,
  primitive,
  list,
} from 'serializr';
import {
  type V1_Mapper,
  V1_SchemaNameMapper,
  V1_TableNameMapper,
} from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper.js';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_MapperPostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_MapperPostProcessor.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import type { STO_Relational_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/STO_Relational_PureProtocolProcessorPlugin_Extension.js';
import { V1_INTERNAL__UnknownPostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_INTERNAL__UnknownPostProcessor.js';

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
  throw new UnsupportedOperationError(`Can't serialize mapper`, protocol);
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
  if (value instanceof V1_INTERNAL__UnknownPostProcessor) {
    return value.content;
  } else if (value instanceof V1_MapperPostProcessor) {
    return serialize(V1_mapperPostProcessorModelSchema, value);
  }
  const extraPostprocessorProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraConnectionPostProcessorProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraPostprocessorProtocolSerializers) {
    const postProcessorProtocolJson = serializer(value);
    if (postProcessorProtocolJson) {
      return postProcessorProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize post-processor: no compatible serializer available from plugins`,
    value,
  );
};

export const V1_deserializePostProcessor = (
  json: PlainObject<V1_PostProcessor>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PostProcessor => {
  switch (json._type) {
    case V1_PostProcessorType.MAPPER:
      return deserialize(V1_mapperPostProcessorModelSchema, json);
    default: {
      const extraPostprocessorProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraConnectionPostProcessorProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraPostprocessorProtocolDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }

      // Fall back to create unknown stub if not supported
      const protocol = new V1_INTERNAL__UnknownPostProcessor();
      protocol.content = json;
      return protocol;
    }
  }
};
