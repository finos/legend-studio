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
  debounce,
  guaranteeNonNullable,
  type DebouncedFunc,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { GridApi } from 'ag-grid-community';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import {
  DataCubeGridClientServerSideDataSource,
  INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE,
  INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID,
  INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE,
  INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_PAGINATION,
  computeHashCodeForDataFetchManualTrigger,
} from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotController } from '../../services/DataCubeQuerySnapshotService.js';
import type { DataCubeQuerySnapshot } from '../../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridConfigurationBuilder.js';
import { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { DataCubeGridControllerState } from './DataCubeGridControllerState.js';
import { DataCubeGridClientExportEngine } from './DataCubeGridClientExportEngine.js';
import { DataCubeSettingKey } from '../../../__lib__/DataCubeSetting.js';

/**
 * This query editor state is responsible for syncing the internal state of ag-grid
 * server-side row model data source with the data cube query state. When new snapshot
 * is published, this editor will translate parts of the snapshot into ag-grid grid
 * configuration to update; on the other hand, when the grid is interacted with in a way
 * that impacts the data state of the server-side row model datasource (e.g. filter, sort
 * pivot, etc.), getRows() is called, a new snapshot is published.
 * See https://www.ag-grid.com/javascript-data-grid/server-side-model-datasource/#implementing-the-server-side-datasource
 *
 * NOTE: The server-side row model data source state is not 1-1 with data cube query state
 * so we need the {@link DataCubeGridControllerState} to bridge this gap. For example,
 * interactions like column pinning, column resizing, etc. are not handled by server-side
 * row model datasource, so without the companion grid controller, these changes will not
 * trigger publishing a new snapshot, hence not propagated.
 */
export class DataCubeGridState extends DataCubeQuerySnapshotController {
  private readonly _view: DataCubeViewState;

  readonly controller: DataCubeGridControllerState;

  readonly exportEngine: DataCubeGridClientExportEngine;
  private _client?: GridApi | undefined;
  clientDataSource: DataCubeGridClientServerSideDataSource;

  queryConfiguration: DataCubeConfiguration;
  rowLimit?: number | undefined;
  isPaginationEnabled = INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_PAGINATION;
  scrollHintText?: string | undefined;
  // As we resize columns dynamically to fit their content, virtual columns are being rendered
  // and resized as user scrolls horizontally, this can cause performance issues, so we debounce.
  debouncedAutoResizeColumns?: DebouncedFunc<() => void>;

  constructor(view: DataCubeViewState) {
    super(view.engine, view.settingService, view.snapshotService);

    makeObservable(this, {
      clientDataSource: observable,

      queryConfiguration: observable,

      rowLimit: observable,

      isPaginationEnabled: observable,
      setPaginationEnabled: action,

      scrollHintText: observable,
      setScrollHintText: action,

      applySnapshot: action,
    });

    this._view = view;
    this.controller = new DataCubeGridControllerState(this._view);
    this.exportEngine = new DataCubeGridClientExportEngine(this);
    this.queryConfiguration = new DataCubeConfiguration();
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(
      this,
      this._view,
    );
  }

  setPaginationEnabled(val: boolean) {
    this.isPaginationEnabled = val;

    // hard reset the grid, this will force the grid to fetch data again
    // NOTE: if we don't fully reset the datasource, and say we just turned on pagination,
    // for how many page that we loaded when pagination is off, the datasource
    // will fire that many data fetch operations which is expensive.
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(
      this,
      this._view,
    );
    // NOTE: ag-grid uses the cache block size as page size, so it's important to set this
    // in corresponding to the pagination setting, else it would cause unexpected scrolling behavior
    this.client.updateGridOptions({
      cacheBlockSize: val
        ? INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE
        : INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE,
    });
  }

  setScrollHintText(val: string | undefined) {
    this.scrollHintText = val;
  }

  get isClientConfigured() {
    return Boolean(this._client);
  }

  get client() {
    return guaranteeNonNullable(this._client, 'Grid client is not configured');
  }

  configureClient(val: GridApi | undefined) {
    this._client = val;
    this.debouncedAutoResizeColumns = debounce(
      () => val?.autoSizeAllColumns(),
      100,
    );
  }

  override getSnapshotSubscriberName() {
    return 'grid';
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ) {
    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    this.queryConfiguration = configuration;
    this.rowLimit = snapshot.data.limit;

    const gridOptions = generateGridOptionsFromSnapshot(
      snapshot,
      configuration,
      this._view,
    );
    if (
      this._settingService.getBooleanValue(
        DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
      )
    ) {
      this._engine.debugProcess(`New Grid Options`, [
        'Grid Options',
        gridOptions,
      ]);
    }
    this.client.updateGridOptions({
      ...gridOptions,
      rowBuffer: this._settingService.getNumericValue(
        DataCubeSettingKey.GRID_CLIENT__ROW_BUFFER,
      ),
      purgeClosedRowNodes: this._settingService.getBooleanValue(
        DataCubeSettingKey.GRID_CLIENT__PURGE_CLOSED_ROW_NODES,
      ),
      // NOTE: ag-grid uses the cache block size as page size, so it's important to set this
      // in corresponding to the pagination setting, else it would cause unexpected scrolling behavior
      cacheBlockSize: this.isPaginationEnabled
        ? INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE
        : INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE,
    });

    // NOTE: when there are changes that affect the data query specification but cannot be captured
    // in the grid client options, we will need to manually trigger data fetching by updating the
    // following hash code which is computed from those parts of the new snapshot then making use of
    // the filter configuration mechanism to trigger getRows() method of server-side row model data source
    this.client.setFilterModel({
      [INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID]: {
        type: 'equals',
        filter: computeHashCodeForDataFetchManualTrigger(
          snapshot,
          configuration,
        ),
      },
    });
  }
}
