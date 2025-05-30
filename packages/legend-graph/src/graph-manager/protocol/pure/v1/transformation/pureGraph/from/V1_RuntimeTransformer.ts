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

import { UnsupportedOperationError } from '@finos/legend-shared';
import type { PackageableRuntime } from '../../../../../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import {
  EngineRuntime,
  RuntimePointer,
  type StoreConnections,
  type Runtime,
  SingleConnectionRuntime,
  LakehouseRuntime,
} from '../../../../../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import {
  V1_initPackageableElement,
  V1_transformElementReferencePointer,
} from './V1_CoreTransformerHelper.js';
import { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime.js';
import {
  type V1_Runtime,
  V1_EngineRuntime,
  V1_StoreConnections,
  V1_IdentifiedConnection,
  V1_RuntimePointer,
  V1_ConnectionStores,
  V1_SingleConnectionEngineRuntime,
  V1_LakehouseRuntime,
} from '../../../model/packageableElements/runtime/V1_Runtime.js';
import {
  V1_transformConnection,
  V1_transformConnectionPointer,
} from './V1_ConnectionTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';

const transformStoreConnections = (
  element: StoreConnections,
  context: V1_GraphTransformerContext,
): V1_StoreConnections => {
  const connections = new V1_StoreConnections();
  connections.store = V1_transformElementReferencePointer(
    PackageableElementPointerType.STORE,
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
  let runtime: V1_EngineRuntime;
  if (element instanceof SingleConnectionRuntime) {
    runtime = new V1_SingleConnectionEngineRuntime();
  } else if (element instanceof LakehouseRuntime) {
    const lakehouseRuntime = new V1_LakehouseRuntime();
    lakehouseRuntime.ingestEnv = element.ingestEnv;
    lakehouseRuntime.warehouse = element.warehouse;
    runtime = lakehouseRuntime;
  } else {
    runtime = new V1_EngineRuntime();
  }

  runtime.connections = element.connections.map((connection) =>
    transformStoreConnections(connection, context),
  );
  runtime.mappings = element.mappings.map((e) =>
    V1_transformElementReferencePointer(
      PackageableElementPointerType.MAPPING,
      e,
    ),
  );
  runtime.connectionStores = element.connectionStores.map((connection) => {
    const val = new V1_ConnectionStores();
    val.connectionPointer = V1_transformConnectionPointer(
      connection.connectionPointer,
    );
    val.storePointers = connection.storePointers.map((s) =>
      V1_transformElementReferencePointer(
        PackageableElementPointerType.STORE,
        s,
      ),
    );
    return val;
  });
  return runtime;
};

const transformRunTimePointer = (
  element: RuntimePointer,
): V1_RuntimePointer => {
  const runtime = new V1_RuntimePointer();
  runtime.runtime = element.packageableRuntime.valueForSerialization ?? '';
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
