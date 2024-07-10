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
import { DataCubeGridClientServerSideDataSource } from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridQuerySnapshotAnalyzer.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

class DataCubeGridDatasourceConfiguration {
  readonly limit?: number | undefined;

  constructor(input: {
    snapshot?: DataCubeQuerySnapshot | undefined;
    queryConfiguration?: DataCubeConfiguration | undefined;
  }) {
    const { snapshot } = input;
    this.limit = snapshot?.data.limit;
  }

  get hashCode(): string {
    return hashArray([`limit: ${this.limit ?? ''}`]);
  }
}

export class DataCubeGridState extends DataCubeQuerySnapshotSubscriber {
  private _client?: GridApi | undefined;
  clientDataSource: DataCubeGridClientServerSideDataSource;
  clientLicenseKey?: string | undefined;

  isPaginationEnabled = false;
  scrollHintText = '';
  datasourceConfiguration: DataCubeGridDatasourceConfiguration;
  queryConfiguration: DataCubeConfiguration;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      clientDataSource: observable,
      datasourceConfiguration: observable,
      queryConfiguration: observable,

      clientLicenseKey: observable,
      setClientLicenseKey: action,

      isPaginationEnabled: observable,
      setPaginationEnabled: action,

      scrollHintText: observable,
      setScrollHintText: action,
    });

    this.datasourceConfiguration = new DataCubeGridDatasourceConfiguration({});
    this.queryConfiguration = new DataCubeConfiguration();
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setClientLicenseKey(val: string): void {
    this.clientLicenseKey = val;
  }

  setPaginationEnabled(val: boolean): void {
    this.isPaginationEnabled = val;

    // hard reset the grid, this will force the grid to fetch data again
    // NOTE: if we don't fully reset the datasource, and say we just turned on pagination,
    // for how many page that we loaded when pagination is off, the datasource
    // will fire that many data fetch operations which is expensive.
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setScrollHintText(val: string): void {
    this.scrollHintText = val;
  }

  get client(): GridApi {
    return guaranteeNonNullable(this._client, 'Grid client is not configured');
  }

  configureClient(val: GridApi | undefined): void {
    this._client = val;
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
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
    this.client.updateGridOptions(gridOptions);
  }

  override async initialize(): Promise<void> {
    this.setClientLicenseKey(
      await this.dataCube.replStore.client.getGridClientLicenseKey(),
    );
  }
}
