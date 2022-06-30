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
  V1_serializeConnectionValue,
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
  PRIMITIVE_TYPE_VALUE = 'primitiveType',
  CONNECTION_VALUE = 'connection',
}

const V1_primitiveTypeValueModelSchema = createModelSchema(
  V1_PrimitiveTypeValue,
  {},
);

const V1_connectionValueModelSchema = createModelSchema(V1_ConnectionValue, {});

export const V1_serializeServiceParameterValue = (
  protocol: V1_ServiceParameterValue,
): PlainObject<V1_ServiceParameterValue> => {
  if (protocol instanceof V1_PrimitiveTypeValue) {
    return serialize(V1_primitiveTypeValueModelSchema, protocol);
  } else if (protocol instanceof V1_ConnectionValue) {
    return serialize(V1_connectionValueModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize service parameter value`,
    protocol,
  );
};

export const V1_deserializeServiceParameterValue = (
  json: PlainObject<V1_ServiceParameterValue>,
): V1_ServiceParameterValue => {
  switch (json._type) {
    case V1_ServiceParameterValueType.PRIMITIVE_TYPE_VALUE:
      return deserialize(V1_primitiveTypeValueModelSchema, json);
    case V1_ServiceParameterValueType.CONNECTION_VALUE:
      return deserialize(V1_connectionValueModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize service parameter value '${json._type}'`,
      );
  }
};

const V1_serviceParameterModelSchema = createModelSchema(V1_ServiceParameter, {
  name: primitive(),
  value: custom(
    (val) => V1_serializeServiceParameterValue(val),
    (val) => V1_deserializeServiceParameterValue(val),
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
            serialize(V1_serviceParameterModelSchema, v),
          {
            skipIfEmpty: true,
            INTERNAL__forceReturnEmptyInTest: true,
          },
        ),
      (val) =>
        deserializeArray(
          val,
          (v) => deserialize(V1_serviceParameterModelSchema, v),
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
