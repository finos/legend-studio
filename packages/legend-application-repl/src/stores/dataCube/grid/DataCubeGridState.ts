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

import { guaranteeNonNullable, hashArray } from '@finos/legend-shared';
import { action, makeObservable, observable, runInAction } from 'mobx';
import type { GridApi } from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import {
  DataCubeGridClientServerSideDataSource,
  INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE,
  INTERNAL__GRID_CLIENT_FILTER_TRIGGER_COLUMN_ID,
  INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE,
} from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotController } from '../core/DataCubeQuerySnapshotManager.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridConfigurationBuilder.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeGridControllerState } from './DataCubeGridControllerState.js';
import { DataCubeGridClientExportEngine } from './DataCubeGridClientExportEngine.js';

class DataCubeGridDatasourceConfiguration {
  readonly limit?: number | undefined;

  constructor(input: {
    snapshot?: DataCubeQuerySnapshot | undefined;
    queryConfiguration?: DataCubeConfiguration | undefined;
  }) {
    const { snapshot } = input;
    this.limit = snapshot?.data.limit;
  }

  get hashCode() {
    return hashArray([`limit: ${this.limit ?? ''}`]);
  }
}

export class DataCubeGridState extends DataCubeQuerySnapshotController {
  readonly controller!: DataCubeGridControllerState;
  readonly exportEngine!: DataCubeGridClientExportEngine;
  private _client?: GridApi | undefined;

  clientDataSource: DataCubeGridClientServerSideDataSource;

  isPaginationEnabled = false;
  scrollHintText?: string | undefined;
  datasourceConfiguration: DataCubeGridDatasourceConfiguration;
  queryConfiguration: DataCubeConfiguration;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      clientDataSource: observable,
      datasourceConfiguration: observable,
      queryConfiguration: observable,

      isPaginationEnabled: observable,
      setPaginationEnabled: action,

      scrollHintText: observable,
      setScrollHintText: action,
    });

    this.controller = new DataCubeGridControllerState(this.dataCube);
    this.exportEngine = new DataCubeGridClientExportEngine(this);
    this.datasourceConfiguration = new DataCubeGridDatasourceConfiguration({});
    this.queryConfiguration = new DataCubeConfiguration();
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setPaginationEnabled(val: boolean) {
    this.isPaginationEnabled = val;

    // hard reset the grid, this will force the grid to fetch data again
    // NOTE: if we don't fully reset the datasource, and say we just turned on pagination,
    // for how many page that we loaded when pagination is off, the datasource
    // will fire that many data fetch operations which is expensive.
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
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

  get client() {
    return guaranteeNonNullable(this._client, 'Grid client is not configured');
  }

  configureClient(val: GridApi | undefined) {
    this._client = val;
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ) {
    const existingExtraConfiguration = this.datasourceConfiguration;
    const queryConfiguration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );

    // NOTE: if one of the change affects the structure of the data cube but cannot be captured
    // in the grid client options, we will need to manually reset the grid by resetting the
    // datasource to ensure we don't fetch the result twice while forcing the data to be refreshed
    runInAction(() => {
      this.datasourceConfiguration = new DataCubeGridDatasourceConfiguration({
        snapshot,
        queryConfiguration,
      });
      this.queryConfiguration = queryConfiguration;
    });
    if (
      existingExtraConfiguration.hashCode !==
      this.datasourceConfiguration.hashCode
    ) {
      // reset the entire grid
      this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
    }

    const gridOptions = generateGridOptionsFromSnapshot(
      snapshot,
      queryConfiguration,
      this.dataCube,
    );
    this.client.updateGridOptions({
      ...gridOptions,
      // NOTE: ag-grid uses the cache block size as page size, so it's important to set this
      // in corresponding to the pagination setting, else it would cause unexpected scrolling behavior
      cacheBlockSize: this.isPaginationEnabled
        ? INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE
        : INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE,
    });
    // NOTE: change the value to the hashcode of the filter to trigger data fetch when filter is modified
    this.client.setFilterModel({
      [INTERNAL__GRID_CLIENT_FILTER_TRIGGER_COLUMN_ID]: {
        type: 'equals',
        filter: snapshot.hashCode,
      },
    });
  }
}
