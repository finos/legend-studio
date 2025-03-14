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

import { action, makeObservable, observable } from 'mobx';
import type { DataCubeViewState } from './DataCubeViewState.js';
import { DataCubeSnapshotController } from '../services/DataCubeSnapshotService.js';
import type { DataCubeSnapshot } from '../core/DataCubeSnapshot.js';
import { DataCubeConfiguration } from '../core/model/DataCubeConfiguration.js';

/**
 * Unlike other query editor state, this state does not support making any
 * modification to the query, it simplies subscribe to extract information
 * from the latest snapshot to help display latest static info about the query.
 */
export class DataCubeInfoState extends DataCubeSnapshotController {
  private readonly _view: DataCubeViewState;

  configuration = new DataCubeConfiguration();
  name = '';
  // TODO: filter preview text

  constructor(view: DataCubeViewState) {
    super(view.engine, view.settingService, view.snapshotService);

    makeObservable(this, {
      configuration: observable,

      name: observable,

      applySnapshot: action,
    });

    this._view = view;
  }

  override getSnapshotSubscriberName() {
    return 'info';
  }

  override async applySnapshot(
    snapshot: DataCubeSnapshot,
    previousSnapshot: DataCubeSnapshot | undefined,
  ) {
    const data = snapshot.data;
    const configuration = DataCubeConfiguration.serialization.fromJson(
      data.configuration,
    );
    this.configuration = configuration;

    if (configuration.name !== this.name) {
      this.name = configuration.name;
      // TODO: make sure we only call this for the main view of data cube when we support multi views
      this._view.dataCube.options?.onNameChanged?.({
        api: this._view.dataCube.api,
        name: this.name,
        source: this._view.source,
      });
    }

    // TODO: filter preview text
  }
}
