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
  StopWatch,
  type DebouncedFunc,
} from '@finos/legend-shared';
import { action, makeObservable, observable, runInAction } from 'mobx';
import type { GridApi } from 'ag-grid-community';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import {
  DataCubeGridClientServerSideDataSource,
  INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE,
  INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID,
  INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE,
  INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_PAGINATION,
  computeHashCodeForDataFetchManualTrigger,
  INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_CACHING,
} from './DataCubeGridClientEngine.js';
import { DataCubeSnapshotController } from '../../services/DataCubeSnapshotService.js';
import type { DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridConfigurationBuilder.js';
import { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { DataCubeGridControllerState } from './DataCubeGridControllerState.js';
import { DataCubeGridClientExportEngine } from './DataCubeGridClientExportEngine.js';
import { DataCubeSettingKey } from '../../../__lib__/DataCubeSetting.js';
import { DEFAULT_ALERT_WINDOW_CONFIG } from '../../services/DataCubeLayoutService.js';
import { AlertType } from '../../services/DataCubeAlertService.js';
import { DataCubeGridMode } from '../../core/DataCubeQueryEngine.js';
import { DataCubeEvent } from '../../../__lib__/DataCubeEvent.js';
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
export class DataCubeGridState extends DataCubeSnapshotController {
  private readonly _view: DataCubeViewState;

  readonly controller: DataCubeGridControllerState;

  readonly exportEngine: DataCubeGridClientExportEngine;
  private _client?: GridApi | undefined;
  clientDataSource: DataCubeGridClientServerSideDataSource;

  configuration: DataCubeConfiguration = new DataCubeConfiguration();
  rowLimit?: number | undefined;
  isPaginationEnabled = INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_PAGINATION;
  isCachingEnabled = INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_CACHING;
  scrollHintText?: string | undefined;
  // As we resize columns dynamically to fit their content, virtual columns are being rendered
  // and resized as user scrolls horizontally, this can cause performance issues, so we debounce.
  debouncedAutoResizeColumns?: DebouncedFunc<() => void>;

  constructor(view: DataCubeViewState) {
    super(view.engine, view.settingService, view.snapshotService);

    makeObservable(this, {
      clientDataSource: observable,

      configuration: observable,

      rowLimit: observable,

      isPaginationEnabled: observable,
      setPaginationEnabled: action,

      isCachingEnabled: observable,
      setCachingEnabled: action,

      scrollHintText: observable,
      setScrollHintText: action,

      applySnapshot: action,
    });

    this._view = view;
    this.controller = new DataCubeGridControllerState(this._view);
    this.exportEngine = new DataCubeGridClientExportEngine(this);
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

    this._engine.sendTelemetry(
      val
        ? DataCubeEvent.PAGINATION_ENABLE__SUCCESS
        : DataCubeEvent.PAGINATION_DISABLE__SUCCESS,
      this._engine.getDataFromSource(this._view.getInitialSource()),
    );
  }

  async setCachingEnabled(
    val: boolean,
    options?: {
      suppressWarning?: boolean | undefined;
    },
  ) {
    if (val === this.isCachingEnabled) {
      return;
    }

    // disable caching
    if (val === false) {
      const stopWatch = new StopWatch();
      await this._view.disposeCache();

      runInAction(() => {
        this.isCachingEnabled = val;

        // hard reset the grid, this will force the grid to fetch data again
        this.clientDataSource = new DataCubeGridClientServerSideDataSource(
          this,
          this._view,
        );
      });

      this._engine.sendTelemetry(DataCubeEvent.CACHING_DISABLE__SUCCESS, {
        ...this._engine.getDataFromSource(this._view.getInitialSource()),
        timings: this._engine.finalizeTimingRecord(stopWatch),
      });

      return;
    }

    // enable caching
    const run = async () => {
      const stopWatch = new StopWatch();
      await this._view.initializeCache();

      // only update value if cache processing succeeds
      if (this._view.processCacheState.hasSucceeded) {
        runInAction(() => {
          this.isCachingEnabled = val;

          // hard reset the grid, this will force the grid to fetch data again
          this.clientDataSource = new DataCubeGridClientServerSideDataSource(
            this,
            this._view,
          );
        });
      }

      this._engine.sendTelemetry(DataCubeEvent.CACHING_ENABLE__SUCCESS, {
        ...this._engine.getDataFromSource(this._view.getInitialSource()),
        timings: this._engine.finalizeTimingRecord(stopWatch),
      });
    };

    // TODO?: we might want to do a quick check here for the amount of data the cache
    // will handle, so maybe fire a COUNT query to check for the number of records
    // and check that against a threshold, we will need to alter the prompt below accordingly.
    if (
      this._settingService.getBooleanValue(
        DataCubeSettingKey.GRID_CLIENT__SHOW_CACHE_PERFORMANCE_WARNING,
      ) &&
      !options?.suppressWarning
    ) {
      this._view.alertService.alert({
        message: `Confirm you want to proceed with caching`,
        text: `When enabled, the source dataset will be cached locally in order to boost query performance. But depending on computational resource available to your environment, sometimes, caching can negatively impact the overall performance, and can even lead to crashes.\n\nOverall, caching is still an experimental feature where we only support queries with simple execution plans, certain queries might not work, in which case, you can abort by turning off caching.\n\nDo you still want to proceed?`,
        type: AlertType.WARNING,
        actions: [
          {
            label: 'Abort',
            handler: () => {},
          },
          {
            label: 'Proceed',
            handler: () => {
              run().catch((error) =>
                this._view.alertService.alertUnhandledError(error),
              );
            },
          },
          {
            label: 'Dismiss Warning and Proceed',
            handler: () => {
              this._view.settingService.updateValue(
                this._view.dataCube.api,
                DataCubeSettingKey.GRID_CLIENT__SHOW_CACHE_PERFORMANCE_WARNING,
                false,
              );
              run().catch((error) =>
                this._view.alertService.alertUnhandledError(error),
              );
            },
          },
        ],
        windowConfig: {
          ...DEFAULT_ALERT_WINDOW_CONFIG,
          width: 600,
          height: 300,
          minWidth: 300,
          minHeight: 150,
        },
      });
    } else {
      await run();
    }
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

  async configureClient(val: GridApi | undefined) {
    this._client = val;
    this.debouncedAutoResizeColumns = debounce(
      () => val?.autoSizeAllColumns(),
      100,
    );

    // reapply latest snapshot when grid client is configured
    // this happens during initialization/switching between grid modes
    const latestSnapshot = this.getLatestSnapshot();
    if (latestSnapshot) {
      await this.applySnapshot(latestSnapshot, undefined);
    }
  }

  override getSnapshotSubscriberName() {
    return 'grid';
  }

  override async applySnapshot(
    snapshot: DataCubeSnapshot,
    previousSnapshot: DataCubeSnapshot | undefined,
  ) {
    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    this.configuration = configuration;

    // Only proceed if the grid mode is standard, else the client won't be populated properly
    // and we cannot continue anyway.
    if (
      configuration.gridMode !== DataCubeGridMode.STANDARD ||
      // NOTE: have to make sure the grid API client has been properly configured before proceeding
      !this._client ||
      this._client.isDestroyed()
    ) {
      return;
    }

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
