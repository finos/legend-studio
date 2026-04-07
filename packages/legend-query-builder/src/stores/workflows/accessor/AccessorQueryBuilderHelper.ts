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
  type AccessorOwner,
  type GraphManagerState,
  type PackageableRuntime,
  IngestDefinition,
  Database,
  DataProduct,
  EngineRuntime,
  LakehouseRuntime,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';

export const getCompatibleRuntimesFromAccessorOwner = (
  accessorOwner: AccessorOwner,
  graphManagerState: GraphManagerState,
): PackageableRuntime[] => {
  if (accessorOwner instanceof DataProduct) {
    throw new UnsupportedOperationError(
      `DataProduct is not supported as an accessor owner`,
    );
  }
  if (accessorOwner instanceof IngestDefinition) {
    return graphManagerState.usableRuntimes.filter(
      (runtime) => runtime.runtimeValue instanceof LakehouseRuntime,
    );
  } else if (accessorOwner instanceof Database) {
    return graphManagerState.usableRuntimes.filter(
      (runtime) =>
        runtime.runtimeValue instanceof EngineRuntime &&
        !(runtime.runtimeValue instanceof LakehouseRuntime) &&
        runtime.runtimeValue.mappings.length === 0,
    );
  }
  return [];
};
