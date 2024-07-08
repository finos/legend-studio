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

import type { LegendREPLApplicationStore } from './LegendREPLBaseStore.js';
import { REPLServerClient } from '../server/REPLServerClient.js';
import { NetworkClient } from '@finos/legend-shared';
import { makeObservable, observable } from 'mobx';
import { DataCubeState } from './dataCube/DataCubeState.js';
import { DataCubeInfrastructure } from './dataCube/DataCubeInfrastructure.js';

export class REPLStore {
  readonly applicationStore: LegendREPLApplicationStore;
  readonly client: REPLServerClient;

  dataCubeInfrastructure!: DataCubeInfrastructure;
  // TODO: when we support multi-view, we would need to support multiple states
  dataCube!: DataCubeState;

  constructor(applicationStore: LegendREPLApplicationStore) {
    makeObservable(this, {
      dataCube: observable,
    });
    this.applicationStore = applicationStore;
    this.client = new REPLServerClient(
      new NetworkClient({
        baseUrl: this.applicationStore.config.useDynamicREPLServer
          ? window.location.origin +
            this.applicationStore.config.baseAddress.replace('/repl/', '')
          : this.applicationStore.config.replUrl,
      }),
    );
    this.dataCubeInfrastructure = new DataCubeInfrastructure(this);
    this.dataCube = new DataCubeState(this);
  }
}
