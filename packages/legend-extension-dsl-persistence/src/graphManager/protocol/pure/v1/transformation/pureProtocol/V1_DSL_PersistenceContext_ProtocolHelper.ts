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

import { V1_PersistenceContext } from '../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceContext.js';
import {
  V1_DefaultPersistencePlatform,
  type V1_PersistencePlatform,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_PersistencePlatform.js';
import {
  V1_ConnectionValue,
  V1_PrimitiveTypeValue,
  V1_ServiceParameter,
  type V1_ServiceParameterValue,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceParameter.js';
import type { DSL_Persistence_PureProtocolProcessorPlugin_Extension } from '../../../DSL_Persistence_PureProtocolProcessorPlugin_Extension.js';
import {
  type PureProtocolProcessorPlugin,
  V1_deserializeConnectionValue,
  V1_deserializeValueSpecification,
  V1_serializeConnectionValue,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import {
  deserializeArray,
  type PlainObject,
  serializeArray,
  UnsupportedOperationError,
  usingConstantValueSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  type ModelSchema,
  primitive,
  serialize,
  SKIP,
} from 'serializr';

/**********
 * persistence platfrom
 **********/

enum V1_PersistencePlatformType {
  DEFAULT = 'default',
}

const V1_defaultPersistencePlatformModelSchema = createModelSchema(
  V1_DefaultPersistencePlatform,
  {
    _type: usingConstantValueSchema(V1_PersistencePlatformType.DEFAULT),
  },
);

export const V1_serializePersistencePlatform = (
  protocol: V1_PersistencePlatform,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_PersistencePlatform> => {
  if (protocol instanceof V1_DefaultPersistencePlatform) {
    return serialize(V1_defaultPersistencePlatformModelSchema, protocol);
  }
  const extraPersistencePlatformProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Persistence_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraPersistencePlatformProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraPersistencePlatformProtocolSerializers) {
    const persistencePlatformProtocolJson = serializer(protocol);
    if (persistencePlatformProtocolJson) {
      return persistencePlatformProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize persistence platform: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializePersistencePlatform = (
  json: PlainObject<V1_PersistencePlatform>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PersistencePlatform => {
  switch (json._type) {
    case V1_PersistencePlatformType.DEFAULT:
      return deserialize(V1_defaultPersistencePlatformModelSchema, json);
    default: {
      const extraPersistencePlatformProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Persistence_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraPersistencePlatformProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraPersistencePlatformProtocolDeserializers) {
        const persistencePlatformProtocol = deserializer(json);
        if (persistencePlatformProtocol) {
          return persistencePlatformProtocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize persistence platform of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

/**********
 * service parameters
 **********/

enum V1_ServiceParameterValueType {
  PRIMITIVE_TYPE_VALUE = 'primitiveTypeValue',
  CONNECTION_VALUE = 'connectionValue',
}

const V1_primitiveTypeValueModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PrimitiveTypeValue> =>
  createModelSchema(V1_PrimitiveTypeValue, {
    _type: usingConstantValueSchema(
      V1_ServiceParameterValueType.PRIMITIVE_TYPE_VALUE,
    ),
    primitiveType: custom(
      (val) => V1_serializeValueSpecification(val, plugins),
      (val) => V1_deserializeValueSpecification(val, plugins),
    ),
  });

const V1_connectionValueModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ConnectionValue> =>
  createModelSchema(V1_ConnectionValue, {
    _type: usingConstantValueSchema(
      V1_ServiceParameterValueType.CONNECTION_VALUE,
    ),
    connection: custom(
      (val) => (val ? V1_serializeConnectionValue(val, true, plugins) : SKIP),
      (val) => V1_deserializeConnectionValue(val, true, plugins),
    ),
  });

export const V1_serializeServiceParameterValue = (
  protocol: V1_ServiceParameterValue,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ServiceParameterValue> => {
  if (protocol instanceof V1_PrimitiveTypeValue) {
    return serialize(V1_primitiveTypeValueModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_ConnectionValue) {
    return serialize(V1_connectionValueModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize service parameter value`,
    protocol,
  );
};

export const V1_deserializeServiceParameterValue = (
  json: PlainObject<V1_ServiceParameterValue>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ServiceParameterValue => {
  switch (json._type) {
    case V1_ServiceParameterValueType.PRIMITIVE_TYPE_VALUE:
      return deserialize(V1_primitiveTypeValueModelSchema(plugins), json);
    case V1_ServiceParameterValueType.CONNECTION_VALUE:
      return deserialize(V1_connectionValueModelSchema(plugins), json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize service parameter value '${json._type}'`,
      );
  }
};

const V1_serviceParameterModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ServiceParameter> =>
  createModelSchema(V1_ServiceParameter, {
    name: primitive(),
    value: custom(
      (val) => V1_serializeServiceParameterValue(val, plugins),
      (val) => V1_deserializeServiceParameterValue(val, plugins),
    ),
  });

/**********
 * persistence context
 **********/

export const V1_PERSISTENCE_CONTEXT_ELEMENT_PROTOCOL_TYPE =
  'persistenceContext';

export const V1_persistenceContextModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PersistenceContext> =>
  createModelSchema(V1_PersistenceContext, {
    _type: usingConstantValueSchema(
      V1_PERSISTENCE_CONTEXT_ELEMENT_PROTOCOL_TYPE,
    ),
    name: primitive(),
    package: primitive(),
    persistence: primitive(),
    platform: custom(
      (val) => V1_serializePersistencePlatform(val, plugins),
      (val) => V1_deserializePersistencePlatform(val, plugins),
    ),
    serviceParameters: custom(
      (val) =>
        serializeArray(
          val,
          (v: V1_ServiceParameter) =>
            serialize(V1_serviceParameterModelSchema(plugins), v),
          {
            skipIfEmpty: true,
            INTERNAL__forceReturnEmptyInTest: true,
          },
        ),
      (val) =>
        deserializeArray(
          val,
          (v) => deserialize(V1_serviceParameterModelSchema(plugins), v),
          {
            skipIfEmpty: false,
          },
        ),
    ),
    sinkConnection: custom(
      (val) => (val ? V1_serializeConnectionValue(val, true, plugins) : SKIP),
      (val) => V1_deserializeConnectionValue(val, true, plugins),
    ),
  });
