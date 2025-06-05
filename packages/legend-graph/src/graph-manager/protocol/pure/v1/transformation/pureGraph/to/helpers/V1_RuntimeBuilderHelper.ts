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
  assertTrue,
  assertNonEmptyString,
  guaranteeType,
} from '@finos/legend-shared';
import {
  EngineRuntime,
  StoreConnections,
  IdentifiedConnection,
  ConnectionStores,
  SingleConnectionRuntime,
  LakehouseRuntime,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import {
  V1_LakehouseRuntime,
  V1_SingleConnectionEngineRuntime,
  type V1_EngineRuntime,
} from '../../../../model/packageableElements/runtime/V1_Runtime.js';
import { V1_buildConnection } from './V1_ConnectionBuilderHelper.js';
import { ConnectionPointer } from '../../../../../../../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import { PackageableElementExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';

export const V1_buildEngineRuntime = (
  runtime: V1_EngineRuntime,
  context: V1_GraphBuilderContext,
): EngineRuntime => {
  let runtimeValue: EngineRuntime;
  if (runtime instanceof V1_SingleConnectionEngineRuntime) {
    runtimeValue = new SingleConnectionRuntime();
  } else if (runtime instanceof V1_LakehouseRuntime) {
    let conPointer: ConnectionPointer | undefined;
    if (runtime.connectionPointer) {
      const connection = V1_buildConnection(
        runtime.connectionPointer,
        context,
        undefined,
      );
      conPointer = guaranteeType(
        connection,
        ConnectionPointer,
        `Connection in Connection store expected to be connection pointer`,
      );
    }
    runtimeValue = new LakehouseRuntime(
      runtime.environment,
      runtime.warehouse,
      conPointer,
    );
  } else {
    runtimeValue = new EngineRuntime();
  }
  runtimeValue.mappings = runtime.mappings.map((mapping) =>
    context.resolveMapping(mapping.path),
  );
  // NOTE: here we don't check if the mappings are fully covered by the runtime, we leave this job for the full compiler
  // and make this a validation check in the UI
  const connectionIds = new Set();
  // DEPRECATED
  runtime.connections.forEach((protocolStoreConnections) => {
    const store = context.resolveStore(protocolStoreConnections.store.path);
    const storeConnections = new StoreConnections(store);
    storeConnections.storeConnections =
      protocolStoreConnections.storeConnections.map((identifiedConnection) => {
        assertNonEmptyString(
          identifiedConnection.id,
          `Runtime connection 'id' field is missing`,
        );
        // make sure runtime connection IDs are unique
        assertTrue(
          !connectionIds.has(identifiedConnection.id),
          `Runtime connection ID must be unique`,
        );
        connectionIds.add(identifiedConnection.id);
        const connection = V1_buildConnection(
          identifiedConnection.connection,
          context,
          store,
        );
        return new IdentifiedConnection(identifiedConnection.id, connection);
      });
    runtimeValue.connections.push(storeConnections);
  });
  //
  runtimeValue.connectionStores = runtime.connectionStores.map((_conStore) => {
    const connection = V1_buildConnection(
      _conStore.connectionPointer,
      context,
      undefined,
    );
    const conPointer = guaranteeType(
      connection,
      ConnectionPointer,
      `Connection in Connection store expected to be connection pointer`,
    );
    const _val = new ConnectionStores(conPointer);
    _val.storePointers = _conStore.storePointers.map((storePtr) =>
      PackageableElementExplicitReference.create(
        context.graph.getStore(storePtr.path),
      ),
    );
    return _val;
  });
  return runtimeValue;
};
