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

import { UnsupportedOperationError } from '@finos/legend-studio-shared';
import type { PackageableRuntime } from '../../../../../../metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import {
  EngineRuntime,
  RuntimePointer,
} from '../../../../../../metamodels/pure/model/packageableElements/runtime/Runtime';
import type {
  StoreConnections,
  Runtime,
} from '../../../../../../metamodels/pure/model/packageableElements/runtime/Runtime';
import { V1_PackageableElementPointerType } from '../../../model/packageableElements/V1_PackageableElement';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
  V1_transformElementReferencePointer,
} from './V1_CoreTransformerHelpers';
import { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_Runtime } from '../../../model/packageableElements/runtime/V1_Runtime';
import {
  V1_EngineRuntime,
  V1_StoreConnections,
  V1_IdentifiedConnection,
  V1_RuntimePointer,
} from '../../../model/packageableElements/runtime/V1_Runtime';
import { V1_transformConnection } from './V1_ConnectionTransformer';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext';

const transformStoreConnections = (
  element: StoreConnections,
  context: V1_GraphTransformerContext,
): V1_StoreConnections => {
  const connections = new V1_StoreConnections();
  connections.store = V1_transformElementReferencePointer(
    V1_PackageableElementPointerType.STORE,
    element.store,
  );
  connections.storeConnections = element.storeConnections.map((value) => {
    const conn = new V1_IdentifiedConnection();
    conn.connection = V1_transformConnection(value.connection, true, context);
    conn.id = value.id;
    return conn;
  });
  return connections;
};

const transformEngineRuntime = (
  element: EngineRuntime,
  context: V1_GraphTransformerContext,
): V1_EngineRuntime => {
  const runtime = new V1_EngineRuntime();
  runtime.connections = element.connections.map((connection) =>
    transformStoreConnections(connection, context),
  );
  runtime.mappings = element.mappings.map((e) =>
    V1_transformElementReferencePointer(
      V1_PackageableElementPointerType.MAPPING,
      e,
    ),
  );
  return runtime;
};

const transformRunTimePointer = (
  element: RuntimePointer,
): V1_RuntimePointer => {
  const runtime = new V1_RuntimePointer();
  runtime.runtime = V1_transformElementReference(element.packageableRuntime);
  return runtime;
};

export const V1_transformRuntime = (
  metamodel: Runtime,
  context: V1_GraphTransformerContext,
): V1_Runtime => {
  if (metamodel instanceof EngineRuntime) {
    return transformEngineRuntime(metamodel, context);
  } else if (metamodel instanceof RuntimePointer) {
    return transformRunTimePointer(metamodel);
  }
  throw new UnsupportedOperationError(`Can't transform runtime`, metamodel);
};

export const V1_transformPackageableRuntime = (
  element: PackageableRuntime,
  context: V1_GraphTransformerContext,
): V1_PackageableRuntime => {
  const runtime = new V1_PackageableRuntime();
  V1_initPackageableElement(runtime, element);
  runtime.runtimeValue = transformEngineRuntime(element.runtimeValue, context);
  return runtime;
};
