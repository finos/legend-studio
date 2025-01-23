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

export enum DataCubeSettingKey {
  DEBUGGER__ENABLE_DEBUG_MODE = 'dataCube.debugger.enableDebugMode',
  DEBUGGER__USE_DEV_CLIENT_PROTOCOL_VERSION = 'dataCube.debugger.useDevClientProtocolVersion',
  DEBUGGER__ACTION__RELOAD = 'dataCube.debugger.action.reload',
  GRID_CLIENT__ROW_BUFFER = 'dataCube.grid.rowBuffer',
  GRID_CLIENT__PURGE_CLOSED_ROW_NODES = 'dataCube.grid.purgeClosedRowNodes',
  GRID_CLIENT__SUPPRESS_LARGE_DATASET_WARNING = 'dataCube.grid.suppressLargeDatasetWarning',
  GRID_CLIENT__ACTION__RETRY_FAILED_DATA_FETCHES = 'dataCube.grid.action.retryFailedDataFetches',
}
