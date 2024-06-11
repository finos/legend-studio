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

import { guaranteeNonNullable, type GeneratorFn } from '@finos/legend-shared';
import { flow, makeObservable, observable } from 'mobx';
import type { GridApi } from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeGridClientServerSideDataSource } from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridQuerySnapshotAnalyzer.js';

export class DataCubeGridState extends DataCubeQuerySnapshotSubscriber {
  readonly dataCubeState!: DataCubeState;

  private _client?: GridApi | undefined;
  readonly clientDataSource: DataCubeGridClientServerSideDataSource;
  clientLicenseKey?: string | undefined;

  constructor(dataCubeState: DataCubeState) {
    super(dataCubeState.snapshotManager);

    makeObservable(this, {
      clientLicenseKey: observable,
      initialize: flow,
    });

    this.dataCubeState = dataCubeState;
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  configureClient(val: GridApi | undefined): void {
    this._client = val;
  }

  get client(): GridApi {
    return guaranteeNonNullable(this._client, 'Grid client is not configured');
  }

  *initialize(): GeneratorFn<void> {
    this.clientLicenseKey =
      (yield this.dataCubeState.editorStore.client.getGridClientLicenseKey()) as string;
  }

  override async applySnapshot(snapshot: DataCubeQuerySnapshot): Promise<void> {
    const gridOptions = generateGridOptionsFromSnapshot(snapshot);
    this.client.updateGridOptions(gridOptions);
  }
}
