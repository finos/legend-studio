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

import { assertTrue, assertNonEmptyString } from '@finos/legend-shared';
import {
  EngineRuntime,
  StoreConnections,
  IdentifiedConnection,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_EngineRuntime } from '../../../../model/packageableElements/runtime/V1_Runtime.js';
import { V1_buildConnection } from './V1_ConnectionBuilderHelper.js';

export const V1_buildEngineRuntime = (
  runtime: V1_EngineRuntime,
  context: V1_GraphBuilderContext,
): EngineRuntime => {
  const runtimeValue = new EngineRuntime();
  runtimeValue.mappings = runtime.mappings.map((mapping) =>
    context.resolveMapping(mapping.path),
  );
  // NOTE: here we don't check if the mappings are fully covered by the runtime, we leave this job for the full compiler
  // and make this a validation check in the UI
  const connectionIds = new Set();
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
        // make sure connection are indexed by store properly
        assertTrue(
          connection.store.value === store.value,
          `Runtime connections must be correctly indexed by store`,
        );
        return new IdentifiedConnection(identifiedConnection.id, connection);
      });
    runtimeValue.connections.push(storeConnections);
  });
  return runtimeValue;
};
