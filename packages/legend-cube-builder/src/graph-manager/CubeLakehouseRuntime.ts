/**
 * Copyright (c) 2026-present, Goldman Sachs
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

/**
 * The lakehouse runtimes, by the kind the engine's protocol names them
 * (legend-graph's subtypes of the base lakehouse runtime): a Databricks one
 * will be another (PLAN §11.12)
 */
export enum CubeLakehouseRuntimeKind {
  LAKEHOUSE = 'LakehouseRuntime',
  SINGLE_STORE = 'LakehouseSingleStoreRuntime',
}

/** The runtime Cube writes for a data product or ingest cube (PLAN §6.8) */
export const CUBE_LAKEHOUSE_RUNTIME_KIND = CubeLakehouseRuntimeKind.LAKEHOUSE;

/**
 * The engine's database type each lakehouse runtime routes to (PLAN §11.12):
 * every `LakehouseRuntime` to Snowflake, for now (user, 2026-10-11); a
 * SingleStore runtime to SingleStore, the engine's `MemSQL`. The one place to
 * change when the routing changes or a runtime is added.
 */
const LAKEHOUSE_DATABASE_TYPES: ReadonlyMap<string, string> = new Map([
  [CubeLakehouseRuntimeKind.LAKEHOUSE, 'Snowflake'],
  [CubeLakehouseRuntimeKind.SINGLE_STORE, 'MemSQL'],
]);

/** The database type a lakehouse runtime of the kind runs on; none for a kind Cube doesn't know */
export const getLakehouseDatabaseType = (kind: string): string | undefined =>
  LAKEHOUSE_DATABASE_TYPES.get(kind);
