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
} from 'serializr';
import type { PlainObject } from '@finos/legend-shared';
import {
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_packageableElementPointerDeserializerSchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';
import { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_Runtime } from '../../../model/packageableElements/runtime/V1_Runtime';
import {
  V1_EngineRuntime,
  V1_IdentifiedConnection,
  V1_LegacyRuntime,
  V1_RuntimePointer,
  V1_StoreConnections,
} from '../../../model/packageableElements/runtime/V1_Runtime';
import {
  V1_serializeConnectionValue,
  V1_deserializeConnectionValue,
} from './V1_ConnectionSerializationHelper';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';

export const V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE = 'runtime';

export enum V1_RuntimeType {
  RUNTIME_POINTER = 'runtimePointer',
  LEGACY_RUNTIME = 'legacyRuntime',
  ENGINE_RUNTIME = 'engineRuntime',
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
    mappings: list(
      usingModelSchema(V1_packageableElementPointerDeserializerSchema),
    ),
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
  createModelSchema(V1_StoreConnections, {
    store: usingModelSchema(V1_packageableElementPointerDeserializerSchema),
    storeConnections: list(object(V1_IdentifiedConnection)),
  });
  createModelSchema(V1_EngineRuntime, {
    _type: usingConstantValueSchema(V1_RuntimeType.ENGINE_RUNTIME),
    connections: list(object(V1_StoreConnections)),
    mappings: list(
      usingModelSchema(V1_packageableElementPointerDeserializerSchema),
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
  throw new UnsupportedOperationError(`Can't serialize runtime`, protocol);
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
      (val) => serialize(V1_EngineRuntime, val),
      (val) => deserialize(V1_EngineRuntime, val),
    ),
  },
);
