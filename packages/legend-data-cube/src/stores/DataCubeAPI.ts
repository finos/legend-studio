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

import type { DataCubeQuery } from './core/model/DataCubeQuery.js';
import type { DataCubeSource } from './core/model/DataCubeSource.js';
import type { DataCubeState } from './DataCubeState.js';
import type { DataCubeViewState } from './view/DataCubeViewState.js';

/**
 * This is the API exposed externally by DataCube to restrict access to certain
 * internal components and functionalities.
 */
export interface DataCubeAPI {
  /**
   * Get the processed source of the DataCube.
   */
  getProcessedSource(): DataCubeSource | undefined;
  /**
   * Generates the data cube query (including the query, configuration, and source)
   * from the latest state of the DataCube.
   */
  generateDataCubeQuery(): Promise<DataCubeQuery>;
  /**
   * Retries all failed data fetches and rerender the grid.
   */
  retryFailedDataFetches(): void;
  /**
   * (Force) reload/rerender the DataCube component.
   *
   * This is often used when updating settings that requires a restart.
   */
  reload(): void;
}

/**
 * This implementation wraps around DataCube state to expose a cleaner API to clients.
 * It also provides a typing-hack for core components to access advanced functionalities,
 * e.g. access to the internals of DataCube view state, grid client, etc., which should
 * not be exposed externally via the public interface.
 */
export class INTERNAL__DataCubeAPI implements DataCubeAPI {
  private readonly _dataCube: DataCubeState;

  constructor(dataCube: DataCubeState) {
    this._dataCube = dataCube;
  }

  _runTaskForEachView(runner: (view: DataCubeViewState) => void) {
    // TODO: When we support multi-view (i.e. multiple instances of DataCubes) we would need
    // to traverse through and update the configurations of all of their grid clients
    runner(this._dataCube.view);
  }

  // ----------------------------- API -----------------------------

  getProcessedSource() {
    return this._dataCube.view.getOriginalSource();
  }

  generateDataCubeQuery() {
    return this._dataCube.view.generateDataCubeQuery();
  }

  retryFailedDataFetches() {
    this._runTaskForEachView((view) => {
      view.grid.client.retryServerSideLoads();
    });
  }

  reload() {
    this._dataCube.reload();
  }
}
