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
import type { GridApi } from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeGridClientServerSideDataSource } from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridQuerySnapshotAnalyzer.js';

export class DataCubeGridState extends DataCubeQuerySnapshotSubscriber {
  private _client?: GridApi | undefined;
  readonly clientDataSource: DataCubeGridClientServerSideDataSource;
  clientLicenseKey?: string | undefined;

  constructor(dataCubeState: DataCubeState) {
    super(dataCubeState);

    makeObservable(this, {
      clientLicenseKey: observable,
      setClientLicenseKey: action,
    });

    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setClientLicenseKey(val: string): void {
    this.clientLicenseKey = val;
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
}
