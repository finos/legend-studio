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
  createModelSchema,
  primitive,
  list,
  custom,
  serialize,
  deserialize,
  object,
  optional,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_packageableElementPointerModelSchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime.js';
import {
  type V1_Runtime,
  V1_EngineRuntime,
  V1_IdentifiedConnection,
  V1_LegacyRuntime,
  V1_RuntimePointer,
  V1_StoreConnections,
  V1_ConnectionStores,
  V1_SingleConnectionEngineRuntime,
  V1_LakehouseRuntime,
} from '../../../model/packageableElements/runtime/V1_Runtime.js';
import {
  V1_serializeConnectionValue,
  V1_deserializeConnectionValue,
  V1_connectionPointerModelSchema,
} from './V1_ConnectionSerializationHelper.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';

export const V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE = 'runtime';

export enum V1_RuntimeType {
  RUNTIME_POINTER = 'runtimePointer',
  LEGACY_RUNTIME = 'legacyRuntime',
  ENGINE_RUNTIME = 'engineRuntime',
  SINGLE_ENGINE_RUNTIME = 'localEngineRuntime',
  LAKEHOUSE_RUNTIME = 'LakehouseRuntime',
}

export const V1_runtimePointerModelSchema = createModelSchema(
  V1_RuntimePointer,
  {
    _type: usingConstantValueSchema(V1_RuntimeType.RUNTIME_POINTER),
    runtime: primitive(),
  },
);

export const V1_setupLegacyRuntimeSerialization = (
  plugins: PureProtocolProcessorPlugin[],
): void => {
  createModelSchema(V1_LegacyRuntime, {
    _type: usingConstantValueSchema(V1_RuntimeType.LEGACY_RUNTIME),
    connections: list(
      custom(
        (val) => V1_serializeConnectionValue(val, true, plugins),
        (val) => V1_deserializeConnectionValue(val, true, plugins),
      ),
    ),
    mappings: list(usingModelSchema(V1_packageableElementPointerModelSchema)),
  });
};

export const V1_setupEngineRuntimeSerialization = (
  plugins: PureProtocolProcessorPlugin[],
): void => {
  createModelSchema(V1_IdentifiedConnection, {
    connection: custom(
      (val) => V1_serializeConnectionValue(val, true, plugins),
      (val) => V1_deserializeConnectionValue(val, true, plugins),
    ),
    id: primitive(),
  });
  createModelSchema(V1_ConnectionStores, {
    connectionPointer: usingModelSchema(V1_connectionPointerModelSchema),
    storePointers: list(
      usingModelSchema(V1_packageableElementPointerModelSchema),
    ),
  });
  createModelSchema(V1_StoreConnections, {
    store: usingModelSchema(V1_packageableElementPointerModelSchema),
    storeConnections: list(object(V1_IdentifiedConnection)),
  });
  createModelSchema(V1_EngineRuntime, {
    _type: usingConstantValueSchema(V1_RuntimeType.ENGINE_RUNTIME),
    connectionStores: list(object(V1_ConnectionStores)),
    connections: list(object(V1_StoreConnections)),
    mappings: list(usingModelSchema(V1_packageableElementPointerModelSchema)),
  });
  createModelSchema(V1_SingleConnectionEngineRuntime, {
    _type: usingConstantValueSchema(V1_RuntimeType.SINGLE_ENGINE_RUNTIME),
    connectionStores: list(object(V1_ConnectionStores)),
    connections: list(object(V1_StoreConnections)),
    mappings: list(usingModelSchema(V1_packageableElementPointerModelSchema)),
  });
  createModelSchema(V1_LakehouseRuntime, {
    _type: usingConstantValueSchema(V1_RuntimeType.LAKEHOUSE_RUNTIME),
    connectionStores: list(object(V1_ConnectionStores)),
    connections: list(object(V1_StoreConnections)),
    mappings: list(usingModelSchema(V1_packageableElementPointerModelSchema)),
    environment: optional(primitive()),
    warehouse: optional(primitive()),
    connectionPointer: optional(
      usingModelSchema(V1_connectionPointerModelSchema),
    ),
  });
};

export const V1_serializeRuntime = (
  protocol: V1_Runtime,
): PlainObject<V1_Runtime> => {
  if (protocol instanceof V1_EngineRuntime) {
    return serialize(V1_EngineRuntime, protocol);
  } else if (protocol instanceof V1_RuntimePointer) {
    return serialize(V1_runtimePointerModelSchema, protocol);
  }
  // NOTE: we don't want to serialize legacy runtime as we no longer want to circulate it any further
  throw new UnsupportedOperationError(`Can't serialize runtime`, protocol);
};

export const V1_deserializeRuntime = (
  json: PlainObject<V1_Runtime>,
): V1_Runtime => {
  switch (json._type) {
    case V1_RuntimeType.RUNTIME_POINTER:
      return deserialize(V1_runtimePointerModelSchema, json);
    case V1_RuntimeType.ENGINE_RUNTIME:
      return deserialize(V1_EngineRuntime, json);
    case V1_RuntimeType.LEGACY_RUNTIME:
    case undefined:
      return deserialize(V1_LegacyRuntime, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deeserialize runtime of type '${json._type}'`,
      );
  }
};

export const V1_serializeRuntimeValue = (
  protocol: V1_EngineRuntime,
): PlainObject<V1_EngineRuntime> => {
  if (protocol instanceof V1_SingleConnectionEngineRuntime) {
    return serialize(V1_SingleConnectionEngineRuntime, protocol);
  } else if (protocol instanceof V1_LakehouseRuntime) {
    return serialize(V1_LakehouseRuntime, protocol);
  }
  return serialize(V1_EngineRuntime, protocol);
};

export const V1_deserializeRuntimeValue = (
  json: PlainObject<V1_Runtime>,
): V1_EngineRuntime => {
  if (json._type === V1_RuntimeType.SINGLE_ENGINE_RUNTIME) {
    return deserialize(V1_SingleConnectionEngineRuntime, json);
  } else if (json._type === V1_RuntimeType.LAKEHOUSE_RUNTIME) {
    return deserialize(V1_LakehouseRuntime, json);
  }
  return deserialize(V1_EngineRuntime, json);
};

export const V1_packageableRuntimeModelSchema = createModelSchema(
  V1_PackageableRuntime,
  {
    _type: usingConstantValueSchema(
      V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
    ),
    name: primitive(),
    package: primitive(),
    runtimeValue: custom(
      (val) => V1_serializeRuntimeValue(val),
      (val) => V1_deserializeRuntimeValue(val),
    ),
  },
);
