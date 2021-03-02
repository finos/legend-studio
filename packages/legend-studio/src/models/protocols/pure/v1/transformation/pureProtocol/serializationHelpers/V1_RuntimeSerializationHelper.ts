/**
 * Copyright 2020 Goldman Sachs
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
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  usingConstantValueSchema,
  getClass,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import { V1_packageableElementPointerDeserrializerSchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';
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

export const V1_legacyRuntimeModelSchema = createModelSchema(V1_LegacyRuntime, {
  _type: usingConstantValueSchema(V1_RuntimeType.LEGACY_RUNTIME),
  connections: list(
    custom(
      (val) => V1_serializeConnectionValue(val, true),
      (val) => V1_deserializeConnectionValue(val, true),
    ),
  ),
  mappings: list(
    usingModelSchema(V1_packageableElementPointerDeserrializerSchema),
  ),
});

export const V1_identifiedConnectionModelSchema = createModelSchema(
  V1_IdentifiedConnection,
  {
    connection: custom(
      (val) => V1_serializeConnectionValue(val, true),
      (val) => V1_deserializeConnectionValue(val, true),
    ),
    id: primitive(),
  },
);

export const V1_storeConnectionModelSchema = createModelSchema(
  V1_StoreConnections,
  {
    store: usingModelSchema(V1_packageableElementPointerDeserrializerSchema),
    storeConnections: list(
      usingModelSchema(V1_identifiedConnectionModelSchema),
    ),
  },
);

export const V1_engineRuntimeModelSchema = createModelSchema(V1_EngineRuntime, {
  _type: usingConstantValueSchema(V1_RuntimeType.ENGINE_RUNTIME),
  connections: list(usingModelSchema(V1_storeConnectionModelSchema)),
  mappings: list(
    usingModelSchema(V1_packageableElementPointerDeserrializerSchema),
  ),
});

export const V1_serializeRuntime = (
  protocol: V1_Runtime,
): PlainObject<V1_Runtime> => {
  if (protocol instanceof V1_EngineRuntime) {
    return serialize(V1_engineRuntimeModelSchema, protocol);
  } else if (protocol instanceof V1_RuntimePointer) {
    return serialize(V1_runtimePointerModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize runtime of type '${getClass(protocol).name}'`,
  );
};

export const V1_packageableRuntimeModelSchema = createModelSchema(
  V1_PackageableRuntime,
  {
    _type: usingConstantValueSchema(
      V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
    ),
    name: primitive(),
    package: primitive(),
    runtimeValue: usingModelSchema(V1_engineRuntimeModelSchema),
  },
);
