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

export type DataCubeSettingValue =
  | string
  | number
  | boolean
  | object
  | undefined;

export type DataCubeSettingValues = {
  [key: string]: DataCubeSettingValue;
};

export enum DataCubeSettingGroup {
  DEBUG = 'Debug',
  GRID = 'Grid',
}

export enum DataCubeSettingType {
  BOOLEAN = 'boolean',
  NUMERIC = 'numeric',
  STRING = 'string',
  ACTION = 'action',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataCubeSetting<T extends DataCubeSettingValue = any> = {
  key: string;
  title: string;
  group: string;
  type: DataCubeSettingType;
  defaultValue: T;
  action?: ((newValue: T) => void) | undefined;
  description?: string | undefined;
  valueOptional?: boolean | undefined;
  requiresReload?: boolean | undefined;
  // numeric value specifics - TODO: we might want to break these downw to separate types
  numericValueMin?: number | undefined;
  numericValueMax?: number | undefined;
  numericValueStep?: number | undefined;
};

export enum DataCubeSettingKey {
  DEBUGGER__ENABLE_DEBUG_MODE = 'dataCube.debugger.enableDebugMode',
  GRID_CLIENT__ROW_BUFFER = 'dataCube.grid-client.rowBuffer',
  GRID_CLIENT__PURGE_CLOSED_ROW_NODES = 'dataCube.grid-client.purgeClosedRowNodes',
  GRID_CLIENT__SUPPRESS_LARGE_DATASET_WARNING = 'dataCube.grid-client.suppressLargeDatasetWarning',
  GRID_CLIENT__ACTION__REFRESH_FAILED_DATA_FETCHES = 'dataCube.grid-client.action.refreshFailedDataFetches',
}
