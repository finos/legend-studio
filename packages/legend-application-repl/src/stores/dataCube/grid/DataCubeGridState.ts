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

import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { ColumnApi, GridApi } from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeGridClientServerSideDataSource } from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridQuerySnapshotAnalyzer.js';

export class DataCubeGridState extends DataCubeQuerySnapshotSubscriber {
  private _client?: GridApi | undefined;
  clientDataSource: DataCubeGridClientServerSideDataSource;
  clientLicenseKey?: string | undefined;
  isPaginationEnabled = false;
  isLoading = false;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      clientDataSource: observable,

      clientLicenseKey: observable,
      setClientLicenseKey: action,
      isPaginationEnabled: observable,
      setPaginationEnabled: action,
      generateCSVFile: action,
      generateExcelFile: action,
      //add_email
    });

    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setClientLicenseKey(val: string): void {
    this.clientLicenseKey = val;
  }

  setPaginationEnabled(val: boolean): void {
    this.isPaginationEnabled = val;

    // When pagination is toggled off, we don't need to reset the grid since data is
    // already loaded data will still be there, but we need to collapse all expanded
    // row groupings since the data there are now stale.
    // Maybe, we can handle this transition more elegantly by refreshing data for all
    // expanded row groupings as well, but for now, we opt for the simple mechanics.
    if (!this.isPaginationEnabled) {
      this.client.collapseAll();
      this.client.refreshServerSide();
    } else {
      // When pagination is toggled on, we simply reset the grid to clear all data and reset scroll;
      // otherwise each page that we already loaded when pagination is off will get refetched by
      // server-side data source, which is expensive.
      this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
    }
  }

  configureClient(val: GridApi | undefined): void {
    this._client = val;
  }

  get client(): GridApi {
    return guaranteeNonNullable(this._client, 'Grid client is not configured');
  }

  override async applySnapshot(snapshot: DataCubeQuerySnapshot): Promise<void> {
    const gridOptions = generateGridOptionsFromSnapshot(snapshot);
    this.client.updateGridOptions(gridOptions);
  }

  override async initialize(): Promise<void> {
    this.setClientLicenseKey(
      await this.dataCube.replStore.client.getGridClientLicenseKey(),
    );
  }

  generateCSVFile = () => {
    console.log('csv generated');
    if (this._client) {
      this._client.exportDataAsCsv();
    } else {
      console.error('Grid API not set');
    }
  };

  generateExcelFile = () => {
    console.log('excel converted to file');
    if (this._client) {
      this._client.exportDataAsExcel();
    } else {
      console.error('Grid API not set');
    }
  };
}
