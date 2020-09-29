/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { list, createSimpleSchema, custom, serialize, primitive, alias } from 'serializr';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { IdentifiedConnection as MM_IdentifiedConnection, StoreConnections as MM_StoreConnections, Runtime as MM_Runtime, EngineRuntime as MM_EngineRuntime, RuntimePointer as MM_RuntimePointer } from 'MM/model/packageableElements/runtime/Runtime';
import { PackageableElementType, PackageableElementPointerType } from 'V1/model/packageableElements/PackageableElement';
import { RuntimeType } from 'V1/model/packageableElements/runtime/Runtime';
import { constant, packagePathSerializer, SKIP_FN, usingModelSchema, elementReferencePointerSerializer, elementReferenceSerializer } from './CoreSerializerHelper';
import { serializeConnection } from './ConnectionSerializer';

const storeConnectionsSchema = createSimpleSchema({
  store: elementReferencePointerSerializer(PackageableElementPointerType.STORE),
  storeConnections: list(custom((value: MM_IdentifiedConnection) => ({
    connection: serializeConnection(value.connection, true),
    id: value.id,
  }), SKIP_FN)),
});

const engineRuntimeSerializationSchema = createSimpleSchema({
  _type: constant(RuntimeType.ENGINE_RUNTIME),
  connections: custom((values: MM_StoreConnections[]) => values.filter(value => !value.isStub).map(value => serialize(storeConnectionsSchema, value)), SKIP_FN),
  mappings: list(elementReferencePointerSerializer(PackageableElementPointerType.MAPPING)),
});

const runtimePointerSerializationSchema = createSimpleSchema({
  _type: constant(RuntimeType.RUNTIME_POINTER),
  packageableRuntime: alias('runtime', elementReferenceSerializer),
});

export const serializeRuntime = (value: MM_Runtime): Record<PropertyKey, unknown> => {
  if (value instanceof MM_EngineRuntime) {
    return serialize(engineRuntimeSerializationSchema, value);
  } else if (value instanceof MM_RuntimePointer) {
    return serialize(runtimePointerSerializationSchema, value);
  }
  throw new UnsupportedOperationError(`Can't serialize unsupported runtime type '${value.constructor.name}'`);
};

export const packageableRuntimeSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.RUNTIME),
  name: primitive(),
  package: packagePathSerializer,
  runtimeValue: usingModelSchema(engineRuntimeSerializationSchema),
});
