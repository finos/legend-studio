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

import { makeObservable, observable, action } from 'mobx';
import type { DataCubeState } from './DataCubeState.js';

export enum DataCubeSettingKey {
  ENABLE_DEBUG_MODE = 'engine.enableDebugMode',
  GRID_CLIENT_ROW_BUFFER = 'engine.grid-client.rowBuffer',
  GRID_CLIENT_PURGE_CLOSED_ROW_NODES = 'engine.grid-client.purgeClosedRowNodes',
  GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING = 'engine.grid-client.suppressLargeDatasetWarning',
}

export const DEFAULT_SETTINGS = {
  [DataCubeSettingKey.ENABLE_DEBUG_MODE]: false,
  [DataCubeSettingKey.GRID_CLIENT_ROW_BUFFER]: 50,
  [DataCubeSettingKey.GRID_CLIENT_PURGE_CLOSED_ROW_NODES]: false,
  [DataCubeSettingKey.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING]: false,
};

export class DataCubeSettings {
  readonly dataCube: DataCubeState;

  constructor(dataCube: DataCubeState) {
    makeObservable(this, {
      enableDebugMode: observable,
      setEnableDebugMode: action,

      gridClientRowBuffer: observable,
      setGridClientRowBuffer: action,

      gridClientPurgeClosedRowNodes: observable,
      setGridClientPurgeClosedRowNodes: action,

      gridClientSuppressLargeDatasetWarning: observable,
      setGridClientSuppressLargeDatasetWarning: action,
    });

    this.dataCube = dataCube;
  }

  enableDebugMode = DEFAULT_SETTINGS[DataCubeSettingKey.ENABLE_DEBUG_MODE];
  gridClientRowBuffer =
    DEFAULT_SETTINGS[DataCubeSettingKey.GRID_CLIENT_ROW_BUFFER];
  gridClientPurgeClosedRowNodes =
    DEFAULT_SETTINGS[DataCubeSettingKey.GRID_CLIENT_PURGE_CLOSED_ROW_NODES];
  gridClientSuppressLargeDatasetWarning =
    DEFAULT_SETTINGS[
      DataCubeSettingKey.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING
    ];

  setEnableDebugMode(value: boolean) {
    this.enableDebugMode = value;
    this.dataCube.onSettingChanged?.(
      DataCubeSettingKey.ENABLE_DEBUG_MODE,
      value,
    );
  }

  setGridClientRowBuffer(value: number) {
    this.gridClientRowBuffer = value;
    this.dataCube.onSettingChanged?.(
      DataCubeSettingKey.GRID_CLIENT_ROW_BUFFER,
      value,
    );
    this.propagateGridOptionUpdates();
  }

  setGridClientPurgeClosedRowNodes(value: boolean) {
    this.gridClientPurgeClosedRowNodes = value;
    this.dataCube.onSettingChanged?.(
      DataCubeSettingKey.GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
      value,
    );
    this.propagateGridOptionUpdates();
  }

  setGridClientSuppressLargeDatasetWarning(value: boolean) {
    this.gridClientSuppressLargeDatasetWarning = value;
    this.dataCube.onSettingChanged?.(
      DataCubeSettingKey.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
      value,
    );
  }

  private propagateGridOptionUpdates() {
    this.dataCube.runTaskForEachView((view) => {
      view.grid.client.updateGridOptions({
        rowBuffer: this.gridClientRowBuffer,
        purgeClosedRowNodes: this.gridClientPurgeClosedRowNodes,
      });
    });
  }
}
