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
  ConnectionPointer,
  type PackageableConnection,
  type PackageableRuntime,
  type ObserverContext,
  PackageableElementExplicitReference,
  LakehouseRuntime,
  LakehouseSingleStoreRuntime,
} from '@finos/legend-graph';
import { action } from 'mobx';
import { packageableRuntime_setRuntimeValue } from './DSL_Mapping_GraphModifierHelper.js';

export const lakehouseRuntime_setWarehouse = action(
  (runtime: LakehouseRuntime, warehouse: string | undefined) => {
    runtime.warehouse = warehouse;
  },
);

export const lakehouseRuntime_setConnection = action(
  (
    runtime: LakehouseRuntime,
    connection: PackageableConnection | undefined,
  ) => {
    runtime.connectionPointer =
      connection !== undefined
        ? new ConnectionPointer(
            PackageableElementExplicitReference.create(connection),
          )
        : undefined;
  },
);

export enum LakehouseComputeEngine {
  SNOWFLAKE = 'SNOWFLAKE',
  SINGLE_STORE = 'SINGLE_STORE',
}

/**
 * Vendor product names, so they are spelled the way the vendor spells them --
 * `prettyCONSTName` cannot produce "SingleStore" from any all-caps constant.
 */
export const LAKEHOUSE_COMPUTE_ENGINE_LABEL: Record<
  LakehouseComputeEngine,
  string
> = {
  [LakehouseComputeEngine.SNOWFLAKE]: 'Snowflake',
  [LakehouseComputeEngine.SINGLE_STORE]: 'SingleStore',
};

export const getLakehouseComputeEngine = (
  runtimeValue: LakehouseRuntime | LakehouseSingleStoreRuntime,
): LakehouseComputeEngine =>
  runtimeValue instanceof LakehouseRuntime
    ? LakehouseComputeEngine.SNOWFLAKE
    : LakehouseComputeEngine.SINGLE_STORE;

/**
 * Swaps the concrete Lakehouse runtime class backing `packageableRuntime`
 * between `LakehouseRuntime` (Snowflake) and `LakehouseSingleStoreRuntime`.
 * These are distinct classes with distinct wire `_type`s, not a flag on one
 * class, so switching compute engine means constructing a new instance --
 * `environment` carries over, `warehouse`/`connectionPointer` naturally fall
 * away (or reset to undefined) since the target class may not have them.
 */
export const lakehouseRuntime_setComputeEngine = action(
  (
    packageableRuntime: PackageableRuntime,
    computeEngine: LakehouseComputeEngine,
    observerContext: ObserverContext,
  ): LakehouseRuntime | LakehouseSingleStoreRuntime => {
    const current = packageableRuntime.runtimeValue;
    const environment =
      current instanceof LakehouseRuntime ||
      current instanceof LakehouseSingleStoreRuntime
        ? current.environment
        : undefined;
    const next =
      computeEngine === LakehouseComputeEngine.SNOWFLAKE
        ? new LakehouseRuntime(environment)
        : new LakehouseSingleStoreRuntime(environment);
    packageableRuntime_setRuntimeValue(
      packageableRuntime,
      next,
      observerContext,
    );
    return next;
  },
);
