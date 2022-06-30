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

import { V1_PersistenceContext } from '../../model/packageableElements/persistence/V1_DSLPersistence_PersistenceContext.js';
import { V1_PersistencePlatform } from '../../model/packageableElements/persistence/V1_DSLPersistence_PersistencePlatform.js';
import {
  V1_ConnectionValue,
  V1_PrimitiveTypeValue,
  V1_ServiceParameter,
  type V1_ServiceParameterValue,
} from '../../model/packageableElements/persistence/V1_DSLPersistence_ServiceParameter.js';
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

const PERSISTENCE_PLATFORM_DEFAULT_TYPE = 'default';

const V1_persistencePlatformModelSchema = createModelSchema(
  V1_PersistencePlatform,
  {
    _type: usingConstantValueSchema(PERSISTENCE_PLATFORM_DEFAULT_TYPE),
  },
);

/**********
 * service parameters
 **********/

enum V1_ServiceParameterValueType {
  PRIMITIVE_TYPE_VALUE = 'primitiveTypeValue',
  CONNECTION_VALUE = 'connectionValue',
}

const V1_primitiveTypeValueModelSchema = createModelSchema(
  V1_PrimitiveTypeValue,
  {
    _type: usingConstantValueSchema(
      V1_ServiceParameterValueType.PRIMITIVE_TYPE_VALUE,
    ),
    primitiveType: custom(
      (val) => V1_serializeValueSpecification(val),
      (val) => V1_deserializeValueSpecification(val),
    ),
  },
);

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
    return serialize(V1_primitiveTypeValueModelSchema, protocol);
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
      return deserialize(V1_primitiveTypeValueModelSchema, json);
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
): ModelSchema<V1_ServiceParameterValue> =>
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
      (val) => serialize(V1_persistencePlatformModelSchema, val),
      (val) => deserialize(V1_persistencePlatformModelSchema, val),
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
